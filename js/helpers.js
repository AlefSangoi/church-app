(function() {
  var startX = 0;
  var sidebar = document.getElementById('sidebar');
  sidebar.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
  sidebar.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - startX;
    if (dx < -60) toggleSidebar(true); // swipe esquerda = fechar
  }, { passive: true });
})();

// Botao colapsar sidebar (apenas desktop)
document.getElementById('btn-collapse').addEventListener('click', function() {
  if (isMobile()) return; // no mobile não usa collapse de ícones
  var sidebar = document.getElementById('sidebar');
  var main = document.getElementById('main-content');
  sidebar.classList.toggle('collapsed');
  main.style.marginLeft = sidebar.classList.contains('collapsed') ? '64px' : '240px';
  var arrow = this.querySelector('span');
  arrow.innerHTML = sidebar.classList.contains('collapsed') ? '&#8250;' : '&#8249;';
});

// Logo click = ir para agenda
document.getElementById('sidebar-logo-btn').addEventListener('click', function() {
  showPageSafe('agenda');
  toggleSidebar(true);
});

// =============================================
// MEUS CULTOS NA SIDEBAR
// =============================================
function carregarMeusCultos() {
  if (!currentUser || !currentProfile) return;
  var r = currentProfile.role;
  if (r === 'visitante') {
    document.getElementById('meus-cultos-section').style.display = 'none';
    return;
  }
  document.getElementById('meus-cultos-section').style.display = 'block';

  var hoje = new Date().toISOString().slice(0, 10);
  var nome = (currentProfile.name || '').toLowerCase().trim();
  if (!nome) return;

  sb.from('services')
    .select('id, title, date, time, color, service_teams(*)')
    .eq('church_id', currentProfile.church_id)
    .gte('date', hoje)
    .order('date', { ascending: true })
    .limit(120)
    .then(function(res) {
      if (!res.data) return;

      var meusCultos = res.data.filter(function(s) {
        var t = s.service_teams && s.service_teams[0];
        if (!t) return false;
        // Busca em TODOS os campos de texto da equipe
        var campos = [
          t.worship_pastor, t.worship_band, t.worship_leader, t.worship_vocais, t.worship_teclado,
          t.worship_violao, t.worship_guitarra, t.worship_bateria, t.worship_baixo, t.worship_outros,
          t.sound_operator, t.sound_operators,
          t.projection_operator, t.projection_operators,
          t.lighting_operator, t.live_operator, t.live_operators, t.notes
        ];
        // Busca por nome completo E primeiro nome
        var primeiroNome = nome.split(' ')[0];
        return campos.some(function(c) {
          if (!c) return false;
          var cLower = c.toLowerCase();
          // Normalizar acentos para comparação
          var cNorm = cLower.normalize('NFD').replace(/[̀-ͯ]/g,'');
          var nomeNorm = nome.normalize('NFD').replace(/[̀-ͯ]/g,'');
          var primeiroNorm = primeiroNome.normalize('NFD').replace(/[̀-ͯ]/g,'');
          return cNorm.indexOf(nomeNorm) !== -1 ||
                 (primeiroNome.length >= 3 && cNorm.indexOf(primeiroNorm) !== -1);
        });
      });

      sb.from('service_confirmations')
        .select('service_id, status')
        .eq('user_id', currentUser.id)
        .then(function(confRes) {
          var confirms = {};
          (confRes.data || []).forEach(function(c) { confirms[c.service_id] = c.status; });

          var pendentes = 0;
          var html = '';

          if (meusCultos.length === 0) {
            html = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px">Nenhum culto com seu nome</div>';
          } else {
            meusCultos.slice(0, 8).forEach(function(s) {
              var status = confirms[s.id] || 'pending';
              if (status === 'pending') pendentes++;
              var color = s.color || '#f59e0b';
              var dt = new Date(s.date + 'T00:00:00');
              var dateLabel = dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
              var badgeClass = 'mc-' + status;
              var badgeLabel = { confirmed: 'Vou', declined: 'Falta', pending: 'Pendente' }[status] || status;
              html += '<div class="mc-item" data-id="' + s.id + '">' +
                '<div class="mc-dot" style="background:' + color + '"></div>' +
                '<div class="mc-info">' +
                  '<div class="mc-date">' + dateLabel + ' ' + (s.time || '').slice(0, 5) + '</div>' +
                  '<div class="mc-name">' + s.title + '</div>' +
                '</div>' +
                '<span class="mc-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
              '</div>';
            });
            if (meusCultos.length > 8) {
              html += '<div style="font-size:11px;color:var(--muted);text-align:center;padding:6px">+' + (meusCultos.length - 8) + ' cultos</div>';
            }
          }

          document.getElementById('meus-cultos-list').innerHTML = html;
          atualizarBadgePendentes(pendentes);

          document.querySelectorAll('.mc-item[data-id]').forEach(function(el) {
            el.addEventListener('click', function() {
              openServiceModal(this.getAttribute('data-id'));
            });
          });
        });
    });
}


function atualizarBadgePendentes(count) {
  // Remove badge antigo
  document.querySelectorAll('.nav-badge').forEach(function(b){ b.remove(); });
  if (count <= 0) return;
  // Adiciona badge no item Agenda
  var agendaBtn = document.querySelector('.nav-item[data-page="agenda"]');
  if (agendaBtn) {
    var badge = document.createElement('span');
    badge.className = 'nav-badge';
    badge.textContent = count;
    agendaBtn.appendChild(badge);
  }
}

// Click overlay to close modals
document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) this.classList.add('hidden');
  });
});

// ESC fecha qualquer modal aberto
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;

  // 1. Fecha modal dinâmico de Notificar WA
  var notifModal = document.getElementById('modal-notificar-wa');
  if (notifModal) { notifModal.remove(); return; }

  // 2. Fecha modal de planos
  var planosModal = document.getElementById('modal-planos');
  if (planosModal) { planosModal.remove(); return; }

  // 3. Fecha modal de escala em massa
  var massaModal = document.getElementById('modal-escala-massa');
  if (massaModal) { massaModal.remove(); return; }

  // 4. Fecha modal de culto (tem função própria)
  var serviceModal = document.getElementById('service-modal');
  if (serviceModal && !serviceModal.classList.contains('hidden')) {
    closeServiceModal(); return;
  }

  // 5. Fecha qualquer outro modal-overlay visível
  var modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
  if (modals.length > 0) {
    modals[modals.length - 1].classList.add('hidden');
    return;
  }

  // 6. ESC também fecha o sidebar no mobile
  if (isMobile()) toggleSidebar(true);
});

// =============================================
// HELPERS
// =============================================
function roleLabel(r) {
  var map = { admin: 'Administrador', lider: 'Lider', voluntario: 'Voluntario', visitante: 'Visitante' };
  return map[r] || r;
}

// =============================================
// DASHBOARD
// =============================================
function initDashboard() {
  var hoje = new Date();
  document.getElementById('dash-mes').value = hoje.getMonth() + 1;
  document.getElementById('dash-ano').value = hoje.getFullYear();
  document.getElementById('btn-dash-load').addEventListener('click', carregarDashboard);
  carregarDashboard();
}

function carregarDashboard() {
  var mes  = parseInt(document.getElementById('dash-mes').value);
  var ano  = parseInt(document.getElementById('dash-ano').value);
  var mm   = String(mes).padStart(2,'0');
  var ini  = ano + '-' + mm + '-01';
  var fim  = ano + '-' + mm + '-' + new Date(ano, mes, 0).getDate();

  sb.from('services').select('id, title, location, service_type_key, color')
    .gte('date', ini).lte('date', fim).then(function(sRes) {
      var cultos = sRes.data || [];
      document.getElementById('dc-total').textContent = cultos.length;

      var porTipo = {};
      cultos.forEach(function(c) {
        var k = (c.title || '') + '|' + (c.location || '');
        if (!porTipo[k]) porTipo[k] = { title: c.title, location: c.location, color: c.color, count: 0, ids: [] };
        porTipo[k].count++;
        porTipo[k].ids.push(c.id);
      });

      var ids = cultos.map(function(c){ return c.id; });
      if (ids.length === 0) {
        document.getElementById('dc-confirmados').textContent = 0;
        document.getElementById('dc-ausencias').textContent = 0;
        document.getElementById('dc-pendentes').textContent = 0;
        document.getElementById('dash-tipos-body').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted)">Nenhum culto neste mes</td></tr>';
        document.getElementById('dash-vol-body').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">Nenhum dado</td></tr>';
        renderCharts(0, 0, 0, [], []);
        return;
      }

      sb.from('service_confirmations').select('service_id, user_id, status')
        .in('service_id', ids).then(function(cRes) {
          var confs = cRes.data || [];
          var totalConf = confs.filter(function(c){ return c.status==='confirmed'; }).length;
          var totalAus  = confs.filter(function(c){ return c.status==='declined'; }).length;
          var totalPend = ids.length - totalConf - totalAus;
          document.getElementById('dc-confirmados').textContent = totalConf;
          document.getElementById('dc-ausencias').textContent = totalAus;
          document.getElementById('dc-pendentes').textContent = totalPend;

          // Tabela tipos
          var tipoRows = Object.values(porTipo).sort(function(a,b){ return b.count-a.count; });
          document.getElementById('dash-tipos-body').innerHTML = tipoRows.map(function(t) {
            var conf = confs.filter(function(c){ return t.ids.indexOf(c.service_id)!==-1 && c.status==='confirmed'; }).length;
            return '<tr>' +
              '<td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+(t.color||'#f59e0b')+';margin-right:8px"></span><strong>'+t.title+'</strong></td>' +
              '<td style="color:var(--muted)">'+t.location+'</td>' +
              '<td><strong>'+t.count+'</strong></td>' +
              '<td style="color:var(--green)">'+conf+'</td>' +
            '</tr>';
          }).join('');

          // Graficos
          renderCharts(totalConf, totalAus, totalPend, tipoRows, confs);

          // Tabela voluntarios
          sb.from('profiles').select('id, name, role, department')
            .in('role', ['voluntario','lider']).then(function(pRes) {
              var pessoas = pRes.data || [];
              var deptLabel = { louvor:'Louvor', som:'Som', projecao:'Proj', iluminacao:'Luz', live:'Live' };
              var rows = pessoas.map(function(p) {
                var pConfs = confs.filter(function(c){ return c.user_id === p.id; });
                var pConf  = pConfs.filter(function(c){ return c.status==='confirmed'; }).length;
                var pAus   = pConfs.filter(function(c){ return c.status==='declined'; }).length;
                var taxa   = ids.length > 0 ? Math.round(pConf/ids.length*100) : 0;
                return { name: p.name, dept: deptLabel[p.department]||'-', conf: pConf, aus: pAus, total: ids.length, taxa: taxa };
              }).sort(function(a,b){ return b.conf-a.conf; });

              document.getElementById('dash-vol-body').innerHTML = rows.length === 0
                ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">Nenhum voluntario</td></tr>'
                : rows.map(function(r) {
                  return '<tr>' +
                    '<td><strong>'+r.name+'</strong></td>' +
                    '<td style="color:var(--muted)">'+r.dept+'</td>' +
                    '<td style="color:var(--green)">'+r.conf+'</td>' +
                    '<td style="color:var(--red)">'+r.aus+'</td>' +
                    '<td style="color:var(--accent)">'+r.taxa+'%</td>' +
                    '<td><div class="presenca-bar"><div class="presenca-fill" style="width:'+r.taxa+'%"></div></div></td>' +
                  '</tr>';
                }).join('');
            });
        });
    });
}

var chartPizza = null;
var chartBarras = null;

function renderCharts(conf, aus, pend, tipoRows, confs) {
  // Destruir charts anteriores
  if (chartPizza) { chartPizza.destroy(); chartPizza = null; }
  if (chartBarras) { chartBarras.destroy(); chartBarras = null; }

  var ctxPizza = document.getElementById('chart-pizza');
  var ctxBarras = document.getElementById('chart-barras');
  if (!ctxPizza || !ctxBarras || typeof Chart === 'undefined') return;

  // Pizza: distribuicao de presencas
  chartPizza = new Chart(ctxPizza.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Confirmados', 'Ausencias', 'Pendentes'],
      datasets: [{
        data: [conf, aus, pend],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
        borderColor: '#11141e',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e8eaf6', font: { size: 12 } } }
      },
      cutout: '65%'
    }
  });

  // Barras: cultos por tipo
  var labels = tipoRows.map(function(t){ return t.title.length > 16 ? t.title.slice(0,15)+'.' : t.title; });
  var counts = tipoRows.map(function(t){ return t.count; });
  var colors = tipoRows.map(function(t){ return t.color || '#f59e0b'; });

  chartBarras = new Chart(ctxBarras.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Qtd no mes',
        data: counts,
        backgroundColor: colors.map(function(c){ return c + 'bb'; }),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#6b7280', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    }
  });
}

// ==============================================
// DASHBOARD DO LIDER (Minha Equipe)
// ==============================================
function carregarLiderDash() {
  var mes = parseInt(document.getElementById('lider-dash-mes').value);
  var ano = parseInt(document.getElementById('lider-dash-ano').value);
  var mm  = String(mes).padStart(2,'0');
  var ini = ano + '-' + mm + '-01';
  var fim = ano + '-' + mm + '-' + new Date(ano, mes, 0).getDate();
  var dept = currentProfile.department;
  var isAdmin = currentProfile.role === 'admin';

  // Buscar voluntarios do departamento (ou todos se admin)
  var query = sb.from('profiles').select('id, name, phone, department').in('role', ['voluntario','lider']);
  if (!isAdmin && dept) query = query.eq('department', dept);

  query.then(function(pRes) {
    var pessoas = pRes.data || [];
    if (pessoas.length === 0) {
      document.getElementById('lider-vol-body').innerHTML =
        '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">Nenhum voluntario no departamento</td></tr>';
      return;
    }

    var pessoaIds = pessoas.map(function(p){ return p.id; });

    // Buscar cultos do mes para contar confirmacoes
    sb.from('services').select('id').gte('date', ini).lte('date', fim).then(function(sRes) {
      var servicoIds = (sRes.data || []).map(function(s){ return s.id; });
      var totalCultos = servicoIds.length;
      if (totalCultos === 0) {
        document.getElementById('lider-vol-body').innerHTML =
          '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">Nenhum culto neste mes</td></tr>';
        return;
      }

      sb.from('service_confirmations').select('user_id, status')
        .in('user_id', pessoaIds)
        .in('service_id', servicoIds)
        .then(function(cRes) {
          var confs = cRes.data || [];
          var deptLabel = { louvor:'Louvor', som:'Som', projecao:'Proj', iluminacao:'Iluminacao', live:'Live' };

          var rows = pessoas.map(function(p) {
            var pConfs = confs.filter(function(c){ return c.user_id === p.id; });
            var nConf  = pConfs.filter(function(c){ return c.status === 'confirmed'; }).length;
            var nAus   = pConfs.filter(function(c){ return c.status === 'declined'; }).length;
            var nPend  = totalCultos - nConf - nAus;
            var taxa   = Math.round(nConf / totalCultos * 100);
            var phoneClean = (p.phone || '').replace(/[^0-9]/g, '');
            var waBtn = phoneClean
              ? '<a href="https://wa.me/55' + phoneClean + '?text=Oi%20' + encodeURIComponent(p.name) + '%2C%20voce%20consegue%20ir%20ao%20culto%3F" target="_blank" class="btn btn-success btn-sm">&#128242;</a>'
              : '';
            return { html: '<tr>' +
              '<td><strong>' + p.name + '</strong>' + (p.phone ? '<div style="font-size:11px;color:var(--muted)">' + p.phone + '</div>' : '<div style="font-size:11px;color:var(--red)">Sem telefone</div>') + '</td>' +
              '<td style="color:var(--green)">' + nConf + '</td>' +
              '<td style="color:var(--red)">' + nAus + '</td>' +
              '<td style="color:var(--accent)">' + nPend + '</td>' +
              '<td>' + taxa + '%</td>' +
              '<td><div class="presenca-bar"><div class="presenca-fill" style="width:' + taxa + '%"></div></div></td>' +
              '<td style="white-space:nowrap">' + waBtn +
                '<button class="btn btn-secondary btn-sm" style="margin-left:4px" ' +
                'data-uid="' + p.id + '" data-name="' + p.name + '" data-email="' + (p.email||'') + '" ' +
                'data-role="' + (p.role||'voluntario') + '" data-dept="' + (p.department||'') + '" data-phone="' + (p.phone||'') + '" ' +
                'onclick-lider-edit>Editar</button>' +
              '</td>' +
            '</tr>', conf: nConf };
          });

          rows.sort(function(a,b){ return b.conf - a.conf; });
          document.getElementById('lider-vol-body').innerHTML = rows.map(function(r){ return r.html; }).join('');

          // Listener para editar liderado
          document.querySelectorAll('[onclick-lider-edit]').forEach(function(btn) {
            btn.addEventListener('click', function() {
              openEditUserModal(
                this.getAttribute('data-uid'), this.getAttribute('data-name'),
                this.getAttribute('data-email'), this.getAttribute('data-role'),
                this.getAttribute('data-dept'), this.getAttribute('data-phone')
              );
            });
          });
        });
    });
  });
}


function parseList(str) {
  if (!str) return [];
  return str.split('|').map(function(s){ return s.trim(); }).filter(Boolean);
}
function joinList(arr) {
  return arr.filter(Boolean).join('|');
}

function parseMusicasRepertorio(texto) {
  if (!texto) return [];
  var linhas = texto.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  return linhas.map(function(linha) {
    // Tenta extrair tom: letra sozinha entre parenteses ex: (E) ou letras como E, D, A no final
    var tomMatch = linha.match(/\(([A-Gb#m]+)\)\s*$/);
    var tom = tomMatch ? tomMatch[1] : '';
    var resto = linha.replace(/\([A-Gb#m]+\)\s*$/, '').trim();
    // Tenta separar musica do artista por " ( " ou " - "
    var artistaMatch = resto.match(/^(.+?)\s+\(\s*(.+?)\s*\)\s*$/);
    if (artistaMatch) {
      return { titulo: artistaMatch[1].trim(), artista: artistaMatch[2].trim(), tom: tom };
    }
    return { titulo: resto, artista: '', tom: tom };
  });
}

// =============================================

// =============================================
// BOTTOM NAV MOBILE
// =============================================
(function() {
  var bnItems = document.querySelectorAll('.bn-item[data-page]');
  bnItems.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var page = this.getAttribute('data-page');
      if (page === 'page-profile-trigger') {
        showPageSafe('profile');
      } else {
        showPageSafe(page);
      }
      bnItems.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      // fecha sidebar se estiver aberta
      toggleSidebar(true);
    });
  });

  // Sincronizar bottom nav com showPageSafe
  var _origShowPage = window.showPageSafe;
  window.showPageSafe = function(page) {
    if (_origShowPage) _origShowPage(page);
    bnItems.forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-page') === page);
    });
  };
})();

// =============================================
// SELECT DE USUARIOS NOS CAMPOS DE EQUIPE
// =============================================
window._profilesCache = null;

function carregarUsuariosParaSelects() {
  if (!currentProfile || !currentProfile.church_id) return;
  // Usa cache se já carregou
  if (window._profilesCache) {
    preencherSelects(window._profilesCache);
    return;
  }
  sb.from('profiles')
    .select('id, name, role')
    .eq('church_id', currentProfile.church_id)
    .eq('status', 'approved')
    .order('name')
    .then(function(res) {
      window._profilesCache = res.data || [];
      preencherSelects(window._profilesCache);
    });
}

function preencherSelects(profiles) {
  var selectIds = [
    'new-svc-pastor-select', 'new-svc-band-select',
    'new-svc-sound-select', 'new-svc-projection-select',
    'new-svc-lighting-select', 'new-svc-live-select'
  ];
  selectIds.forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    // Manter primeira opção
    var first = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(first);
    profiles.forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name + (p.role && p.role !== 'voluntario' ? ' (' + p.role + ')' : '');
      sel.appendChild(opt);
    });
    // Ao selecionar, preenche o input de texto correspondente
    var inputId = id.replace('-select', '');
    sel.addEventListener('change', function() {
      if (!this.value) return;
      var inp = document.getElementById(inputId);
      if (inp) {
        inp.value = this.value;
        this.value = ''; // reset select
      }
    });
  });
}
window.carregarUsuariosParaSelects = carregarUsuariosParaSelects;

// =============================================
// PWA - REGISTRAR SERVICE WORKER
// =============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      console.log('SW registrado:', reg.scope);
    }).catch(function(err) {
      console.log('SW erro:', err);
    });
  });
}

// Expor globalmente
window.initDashboard        = initDashboard;
window.carregarDashboard    = carregarDashboard;
window.carregarMeusCultos   = carregarMeusCultos;
window.carregarLiderDash    = carregarLiderDash;
window.atualizarBadgePendentes = atualizarBadgePendentes;
window.showPageSafe         = showPageSafe;
window.isMobile             = isMobile;
window.toggleSidebar        = toggleSidebar;
window.parseList            = parseList;
window.joinList             = joinList;
window.parseMusicasRepertorio = parseMusicasRepertorio;
window.getChurchSlug        = getChurchSlug;
window.getInviteToken       = getInviteToken;
window.escHtml              = escHtml;
window.escAttr              = escAttr;
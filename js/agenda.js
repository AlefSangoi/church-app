// CALENDAR
// =============================================
function renderCalendar() {
  var year  = currentMonth.getFullYear();
  var month = currentMonth.getMonth();
  var label = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  document.getElementById('month-label').textContent = label.charAt(0).toUpperCase() + label.slice(1);

  var grid = document.getElementById('calendar-grid');
  var days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  var html = days.map(function(h) { return '<div class="cal-header">' + h + '</div>'; }).join('');

  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var today = new Date();
  var svcs = servicesForMonth(year, month);

  for (var i = 0; i < firstDay; i++) {
    html += '<div class="cal-day other-month"></div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d);
    var mm = String(month + 1).padStart(2, '0');
    var dd = String(d).padStart(2, '0');
    var dateStr = year + '-' + mm + '-' + dd;
    var daySvcs = svcs.filter(function(s) { return s.date === dateStr; });

    // Ordenar por horario
    daySvcs.sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); });

    // Pills dos eventos (max 3, depois "+N")
    var MAX_PILLS = 3;
    var pills = '';
    daySvcs.slice(0, MAX_PILLS).forEach(function(s) {
      var color = s.color || '#f59e0b';
      var hora = s.time ? s.time.slice(0,5) : '';
      // Titulo abreviado
      var titulo = s.title || '';
      if (titulo.length > 14) titulo = titulo.slice(0,13) + '.';
      pills += '<span class="cal-event-pill" style="background:' + color + 'cc" data-id="' + s.id + '">' +
        hora + ' ' + titulo + '</span>';
    });
    if (daySvcs.length > MAX_PILLS) {
      pills += '<span class="cal-more">+' + (daySvcs.length - MAX_PILLS) + ' mais</span>';
    }

    html += '<div class="cal-day' + (isToday ? ' today' : '') + '" data-date="' + dateStr + '">' +
      '<div class="day-num">' + d + '</div>' + pills + '</div>';
  }

  grid.innerHTML = html;

  // Event delegation unica para o calendario
  grid.onclick = function(e) {
    var pill = e.target.closest('.cal-event-pill');
    if (pill && pill.getAttribute('data-id')) {
      e.stopPropagation();
      openServiceModal(pill.getAttribute('data-id'));
      return;
    }
    var day = e.target.closest('.cal-day[data-date]');
    if (day) {
      filterDay(day.getAttribute('data-date'));
    }
  };
}

function filterDay(dateStr) {
  // Destacar o dia clicado
  document.querySelectorAll('.cal-day.selected').forEach(function(el){ el.classList.remove('selected'); });
  var dayEl = document.querySelector('.cal-day[data-date="' + dateStr + '"]');
  if (dayEl) dayEl.classList.add('selected');

  var daySvcs = allServices.filter(function(s) { return s.date === dateStr; });
  var d = new Date(dateStr + 'T00:00:00');
  var label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('services-section-label').textContent = 'Cultos - ' + label;
  document.getElementById('services-list').classList.remove('hidden');
  document.getElementById('btn-toggle-cultos').textContent = 'Ver todos do mes';
  renderServiceCards(daySvcs, 'services-list');
}

function renderServices() {
  // Nao mostra automaticamente - usuario clica no dia ou no botao
  document.getElementById('services-section-label').textContent = 'Clique em um dia para ver os cultos';
  document.getElementById('services-list').classList.add('hidden');
  // Ouvir botao "ver todos"
  var btnToggle = document.getElementById('btn-toggle-cultos');
  btnToggle.onclick = function() {
    var year = currentMonth.getFullYear();
    var month = currentMonth.getMonth();
    var svcs = servicesForMonth(year, month);
    document.getElementById('services-section-label').textContent = 'Todos os cultos do mes';
    document.getElementById('services-list').classList.remove('hidden');
    renderServiceCards(svcs, 'services-list');
    this.textContent = 'Ocultar';
    this.onclick = function() {
      document.getElementById('services-list').classList.add('hidden');
      document.getElementById('services-section-label').textContent = 'Clique em um dia para ver os cultos';
      this.textContent = 'Ver todos do mes';
      this.onclick = null;
      renderServices();
    };
  };
}

function renderServiceCards(svcs, containerId) {
  containerId = containerId || 'services-list';
  var el = document.getElementById(containerId);
  if (!svcs || svcs.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="icon">&#128197;</div><h4>Nenhum culto encontrado</h4><p>Adicione cultos pela administracao</p></div>';
    return;
  }
  el.innerHTML = svcs.map(function(s) { return serviceCardHTML(s); }).join('');
  el.onclick = function(e) {
    var card = e.target.closest('.service-card');
    if (card && card.getAttribute('data-id')) {
      openServiceModal(card.getAttribute('data-id'));
    }
  };
}

function serviceCardHTML(s) {
  var team = (s.service_teams && s.service_teams[0]) || {};
  var color = s.color || '#f59e0b';
  var dateObj = new Date(s.date + 'T00:00:00');
  var dateLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  var timeLabel = s.time ? s.time.slice(0, 5) : '--:--';
  var statusMap = { scheduled: 'Agendado', completed: 'Realizado', cancelled: 'Cancelado' };
  var st = s.status || 'scheduled';

  // Renderiza lista de pessoas - usa campo multi (|) ou campo simples como fallback
  function tvList(multiField, singleField) {
    var raw = team[multiField] || team[singleField] || '';
    if (!raw) return '<div class="team-value team-empty">A definir</div>';
    var lista = raw.split('|').map(function(n){ return n.trim(); }).filter(Boolean);
    if (lista.length === 0) return '<div class="team-value team-empty">A definir</div>';
    return '<div class="team-value">' +
      lista.map(function(n) {
        return '<span style="display:inline-block;background:rgba(255,255,255,.06);border-radius:4px;padding:1px 6px;margin:1px 2px;font-size:12px;">' + n + '</span>';
      }).join('') +
    '</div>';
  }

  // Louvor: banda + instrumentistas resumido
  function tvLouvor() {
    var banda = team.worship_band || '';
    var partes = [];
    ['worship_vocais','worship_teclado','worship_violao','worship_guitarra','worship_bateria','worship_baixo','worship_outros'].forEach(function(k){
      if (team[k]) {
        team[k].split('|').forEach(function(n){ if (n.trim()) partes.push(n.trim()); });
      }
    });
    if (!banda && partes.length === 0) return '<div class="team-value team-empty">A definir</div>';
    var html = '';
    if (banda) html += '<div style="font-size:12px;font-weight:700;margin-bottom:2px">' + banda + '</div>';
    if (partes.length > 0) {
      html += '<div>' + partes.map(function(n){
        return '<span style="display:inline-block;background:rgba(255,255,255,.06);border-radius:4px;padding:1px 6px;margin:1px 2px;font-size:11px;">' + n + '</span>';
      }).join('') + '</div>';
    }
    return '<div class="team-value">' + html + '</div>';
  }

  return '<div class="service-card" style="--card-color:' + color + '" data-id="' + s.id + '">' +
    '<div class="card-meta">' +
      '<span class="card-date">&#128197; ' + dateLabel + ' &middot; ' + timeLabel + '</span>' +
      '<span class="card-status status-' + st + '">' + (statusMap[st] || st) + '</span>' +
    '</div>' +
    '<div class="card-title">' + s.title + '</div>' +
    '<div class="card-location">&#128205; ' + s.location + '</div>' +
    (team.worship_pastor ? '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">&#128591; ' + team.worship_pastor + '</div>' : '') +
    '<div class="card-team">' +
      '<div class="team-item" style="grid-column:span 2"><span class="team-icon">&#127925;</span><div><div class="team-label">Louvor</div>' + tvLouvor() + '</div></div>' +
      '<div class="team-item"><span class="team-icon">&#128266;</span><div><div class="team-label">Som</div>' + tvList('sound_operators','sound_operator') + '</div></div>' +
      '<div class="team-item"><span class="team-icon">&#128250;</span><div><div class="team-label">LED/Proj</div>' + tvList('projection_operators','projection_operator') + '</div></div>' +
      '<div class="team-item"><span class="team-icon">&#128161;</span><div><div class="team-label">Iluminacao</div>' + tvList('','lighting_operator') + '</div></div>' +
      '<div class="team-item"><span class="team-icon">&#127909;</span><div><div class="team-label">Live</div>' + tvList('live_operators','live_operator') + '</div></div>' +
    '</div></div>';
}

// =============================================
// SERVICE DETAIL MODAL
// =============================================
function openServiceModal(id) {
  var s = allServices.find(function(x) { return x.id === id; });
  if (!s) return;
  var team = (s.service_teams && s.service_teams[0]) || {};
  var r = currentProfile.role;
  var dept = currentProfile.department;
  var dateObj = new Date(s.date + 'T00:00:00');
  var dateLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  document.getElementById('svc-modal-title').textContent = s.title;

  var body = '<p style="color:var(--muted);font-size:14px;margin-bottom:20px">' +
    '&#128197; ' + dateLabel + ' &nbsp;&middot;&nbsp; &#8987; ' + (s.time ? s.time.slice(0,5) : '--:--') +
    ' &nbsp;&middot;&nbsp; &#128205; ' + s.location + '</p>';

  // EQUIPE EXPANDIDA
  try {
    body += renderEquipeEdit(team, r, dept);
  } catch(err) {
    console.error('Erro renderEquipeEdit:', err);
    body += '<div style="color:var(--muted);font-size:13px;padding:12px">Erro ao carregar equipe.</div>';
  }

  if (team.notes) {
    body += '<div class="equipe-section" style="font-size:14px">' +
      '<div class="equipe-section-title">&#128221; Observacoes</div>' +
      team.notes + '</div>';
  }

  document.getElementById('svc-modal-body').innerHTML = body;

  // Event delegation para botoes de adicionar pessoa (evita onclick inline)
  document.getElementById('svc-modal-body').addEventListener('click', function(e) {
    var btn = e.target.closest('.add-pessoa-btn');
    if (btn) {
      addPessoa(btn.getAttribute('data-section'), btn.getAttribute('data-field'));
    }
    var rem = e.target.closest('.remove-pessoa');
    if (rem) {
      rem.closest('.pessoa-tag').remove();
    }
  });

  // Confirmacao de presenca - somente para o proprio usuario E somente se estiver na escala
  if (currentUser && (r === 'voluntario' || r === 'lider' || r === 'admin')) {
    // Verificar se o usuario esta escalado: comparar nome do perfil com os campos da equipe
    var camposEscala = [
      team.worship_band, team.worship_leader, team.worship_vocais,
      team.worship_teclado, team.worship_violao, team.worship_guitarra, team.worship_bateria,
      team.worship_baixo, team.worship_outros,
      team.sound_operator, team.sound_operators,
      team.projection_operator, team.projection_operators,
      team.lighting_operator, team.live_operator, team.live_operators
    ];
    var nomesEscalados = [];
    camposEscala.forEach(function(v) {
      if (!v) return;
      v.split('|').forEach(function(n) { var t = n.trim(); if (t) nomesEscalados.push(t.toLowerCase()); });
    });
    var meuNome = (currentProfile.name || '').toLowerCase().trim();
    var estouEscalado = meuNome && nomesEscalados.some(function(n) {
      return n === meuNome || n.indexOf(meuNome) !== -1 || meuNome.indexOf(n) !== -1;
    });

    // Admin vê sempre; voluntario/lider só se estiver escalado
    if (estouEscalado || r === 'admin') {
      sb.from('service_confirmations').select('*')
        .eq('service_id', id).eq('user_id', currentUser.id).maybeSingle()
        .then(function(res) {
          var status = (res.data && res.data.status) || 'pending';
          var statusColors = {
            confirmed: 'color:var(--green)',
            declined: 'color:var(--red)',
            pending: 'color:var(--accent)'
          };
          var statusLabel = { confirmed: 'Confirmado - Voce marcou que vai!', declined: 'Ausente - Voce marcou que nao vai', pending: 'Pendente - Confirme sua presenca!' };
          var bar = document.createElement('div');
          bar.className = 'confirm-bar';
          bar.id = 'confirm-bar-presenca'; // id para evitar duplicata
          bar.style.cssText = 'flex-direction:column;align-items:flex-start;gap:10px';
          bar.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;width:100%">' +
              '<span style="font-size:18px">' + (status==='confirmed'?'&#9989;':status==='declined'?'&#10060;':'&#8987;') + '</span>' +
              '<div>' +
                '<div style="font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted)">Sua confirmacao de presenca</div>' +
                '<div style="font-size:14px;font-weight:600;' + (statusColors[status]||'') + '">' + (statusLabel[status]||status) + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;width:100%">' +
              '<button class="btn btn-success btn-sm confirm-yes-btn" style="flex:1' + (status==='confirmed'?';opacity:1;font-weight:700':';opacity:.6') + '">&#10003; Vou comparecer</button>' +
              '<button class="btn btn-danger btn-sm confirm-no-btn" style="flex:1' + (status==='declined'?';opacity:1;font-weight:700':';opacity:.6') + '">&#10007; Nao vou</button>' +
            '</div>' +
            '<p style="font-size:11px;color:var(--muted);margin:0">Esta confirmacao e somente para <strong>' + (currentProfile.name||'voce') + '</strong>.</p>';
          // Garante que nao duplica
          var existing = document.getElementById('confirm-bar-presenca');
          if (existing) existing.remove();
          document.getElementById('svc-modal-body').appendChild(bar);
          bar.querySelector('.confirm-yes-btn').addEventListener('click', function() {
            setConfirmation(id, 'confirmed');
          });
          bar.querySelector('.confirm-no-btn').addEventListener('click', function() {
            setConfirmation(id, 'declined');
          });
        });
    }
  } else if (!currentUser) {
    // visitante sem conta
    var infoBar = document.createElement('div');
    infoBar.className = 'confirm-bar';
    infoBar.innerHTML = '<span style="font-size:16px">&#128274;</span><p style="color:var(--muted);font-size:13px">Faca login para confirmar sua presenca nos cultos.</p>';
    document.getElementById('svc-modal-body').appendChild(infoBar);
  }

  // Footer
  var footer = document.getElementById('svc-modal-footer');
  footer.innerHTML = '';

  if (r === 'admin') {
    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.textContent = 'Excluir';
    delBtn.addEventListener('click', function() { deleteService(id); });
    footer.appendChild(delBtn);

    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', function() {
      closeServiceModal();
      openEditServiceModal(id);
    });
    footer.appendChild(editBtn);
  }

  if (r === 'admin' || r === 'lider') {
    var saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.style.width = 'auto';
    saveBtn.textContent = 'Salvar Equipe';
    saveBtn.addEventListener('click', function() {
      saveTeam(id, team.id);
    });
    footer.appendChild(saveBtn);

    // Botão Notificar Equipe via WhatsApp
    var waBtn = document.createElement('button');
    waBtn.className = 'btn btn-secondary';
    waBtn.style.cssText = 'width:auto;background:rgba(37,211,102,.15);color:#25d366;border:1px solid rgba(37,211,102,.3)';
    waBtn.innerHTML = '&#128242; Notificar Equipe';
    waBtn.addEventListener('click', function() {
      notificarEquipeWA(s, team);
    });
    footer.appendChild(waBtn);
  }

  document.getElementById('service-modal').classList.remove('hidden');
}

document.getElementById('btn-close-service-modal').addEventListener('click', closeServiceModal);
function closeServiceModal() {
  document.getElementById('service-modal').classList.add('hidden');
}

function notificarEquipeWA(s, team) {
  // Coletar todos os nomes escalados
  var campos = [
    { label: 'Pastor', valor: team.worship_pastor },
    { label: 'Louvor', valor: team.worship_band },
    { label: 'Lider de Louvor', valor: team.worship_leader },
    { label: 'Vocais', valor: team.worship_vocais },
    { label: 'Teclado', valor: team.worship_teclado },
    { label: 'Violao', valor: team.worship_violao },
    { label: 'Guitarra', valor: team.worship_guitarra },
    { label: 'Bateria', valor: team.worship_bateria },
    { label: 'Baixo', valor: team.worship_baixo },
    { label: 'Som', valor: team.sound_operator },
    { label: 'Projecao', valor: team.projection_operator },
    { label: 'Iluminacao', valor: team.lighting_operator },
    { label: 'Live', valor: team.live_operator },
  ];

  // Coletar nomes únicos
  var nomes = [];
  campos.forEach(function(c) {
    if (!c.valor) return;
    parseList(c.valor).forEach(function(n) {
      if (n && nomes.indexOf(n) === -1) nomes.push(n);
    });
  });

  if (!nomes.length) {
    toast('Nenhum membro escalado ainda.', 'error');
    return;
  }

  var dateObj = new Date(s.date + 'T00:00:00');
  var dataFmt = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  var hora    = (s.time || '').slice(0, 5);
  var local   = s.location || '';
  var titulo  = s.title || '';

  // Buscar phones dos membros pelo nome (comparacao flexivel)
  sb.from('profiles')
    .select('id, name, phone')
    .eq('church_id', currentProfile.church_id)
    .eq('status', 'approved')
    .then(function(res) {
      var profiles = res.data || [];

      // Abrir modal de notificação
      var old = document.getElementById('modal-notificar-wa');
      if (old) old.remove();

      var overlay = document.createElement('div');
      overlay.id = 'modal-notificar-wa';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';

      var appUrl = window.location.origin + window.location.pathname + (getChurchSlug() ? '?church=' + getChurchSlug() : '');

      // Montar bloco de equipe para a mensagem
      function fmtList(val) {
        if (!val) return '';
        return parseList(val).filter(Boolean).join(', ');
      }
      var linhasEquipe = [];

      // Pastor / Ministro
      if (team.worship_pastor) linhasEquipe.push('🙏 *Pastor/Ministro:* ' + team.worship_pastor);

      // Louvor
      var instrumentistas = [];
      [{k:'worship_vocais',l:'Vocais'},{k:'worship_teclado',l:'Teclado'},{k:'worship_violao',l:'Violao'},
       {k:'worship_guitarra',l:'Guitarra'},{k:'worship_bateria',l:'Bateria'},{k:'worship_baixo',l:'Baixo'},
       {k:'worship_outros',l:'Outros'}].forEach(function(c) {
        var v = fmtList(team[c.k]);
        if (v) instrumentistas.push(c.l + ': ' + v);
      });
      var linhaLouvor = '';
      if (team.worship_band) linhaLouvor += team.worship_band;
      if (instrumentistas.length) linhaLouvor += (linhaLouvor ? '\n   ' : '') + instrumentistas.join(' | ');
      if (linhaLouvor) linhasEquipe.push('🎵 *Louvor:* ' + linhaLouvor);

      // Repertório
      if (team.worship_repertoire) {
        var musicas = team.worship_repertoire.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
        if (musicas.length) linhasEquipe.push('🎶 *Repertorio:*\n   ' + musicas.join('\n   '));
      }

      // Som
      var som = fmtList(team.sound_operators) || team.sound_operator || '';
      if (som) linhasEquipe.push('🎚️ *Som:* ' + som);

      // Iluminação
      if (team.lighting_operator) linhasEquipe.push('💡 *Iluminacao:* ' + team.lighting_operator);

      var blocoEquipe = linhasEquipe.length ? '\n\n' + linhasEquipe.join('\n') : '';

      var msg = '🙌 *Escala de Servico - ' + titulo + '*' +
        '\n\n📅 *Data:* ' + dataFmt +
        '\n⏰ *Horario:* ' + hora +
        '\n📍 *Local:* ' + local +
        blocoEquipe +
        '\n\nVoce esta na escala deste culto! Por favor confirme sua presenca no app:' +
        '\n👉 ' + appUrl +
        '\n\n_Acesse, abra o culto e toque em ✅ Vou comparecer ou ❌ Nao vou._';

      var itens = nomes.map(function(nome) {
        // Tenta match exato primeiro, depois parcial
        var perfil = profiles.find(function(p) {
          return p.name && p.name.toLowerCase().trim() === nome.toLowerCase().trim();
        });
        if (!perfil) {
          perfil = profiles.find(function(p) {
            if (!p.name) return false;
            var pn = p.name.toLowerCase().trim();
            var nn = nome.toLowerCase().trim();
            return pn.indexOf(nn) !== -1 || nn.indexOf(pn) !== -1;
          });
        }
        var phone = perfil && perfil.phone ? perfil.phone.replace(/[^0-9]/g,'') : '';
        // Remove 55 do inicio se já vier no numero
        var phoneNorm = phone;
        if (phoneNorm.startsWith('55') && phoneNorm.length >= 12) {
          phoneNorm = phoneNorm.slice(2);
        }
        // Garante 11 dígitos (DDD 2 + 9 + número 8)
        // Se tiver 10 dígitos (sem o 9), insere o 9 após o DDD
        if (phoneNorm.length === 10) {
          phoneNorm = phoneNorm.slice(0,2) + '9' + phoneNorm.slice(2);
        }
        // Se tiver 11 dígitos mas o 3º dígito não for 9, também insere
        // (ex: número antigo de 8 dígitos com DDD mas sem o 9 → não se aplica ao Brasil atual)
        var waNum = phoneNorm ? '55' + phoneNorm : '';
        var waUrl = waNum
          ? 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg)
          : 'https://wa.me/?text=' + encodeURIComponent(msg);
        var hasPhone = !!phoneNorm;

        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08)">' +
          '<div>' +
            '<div style="font-weight:600;font-size:13px;color:#fff">' + nome + '</div>' +
            '<div style="font-size:11px;color:' + (hasPhone ? '#25d366' : '#f59e0b') + '">' +
              (hasPhone ? '&#9989; +55 ' + phoneNorm : '&#9888; Sem WhatsApp cadastrado') +
            '</div>' +
          '</div>' +
          '<a href="' + waUrl + '" target="_blank" style="background:#25d366;color:#fff;border:none;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap">&#128242; Notificar</a>' +
        '</div>';
      }).join('');

      overlay.innerHTML =
        '<div style="background:#1a1a2e;border-radius:16px;width:100%;max-width:480px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6)">' +
          '<div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;align-items:center">' +
            '<div>' +
              '<div style="font-weight:700;font-size:15px;color:#fff">&#128242; Notificar Equipe</div>' +
              '<div style="font-size:12px;color:#6b7280;margin-top:2px">' + titulo + ' &bull; ' + dataFmt + '</div>' +
            '</div>' +
            '<button id="btn-fechar-notif" style="background:rgba(255,255,255,.1);color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px">Fechar</button>' +
          '</div>' +
          '<div style="flex:1;overflow-y:auto;padding:16px 20px">' +
            '<p style="font-size:12px;color:#6b7280;margin-bottom:12px">Clique em Notificar para abrir o WhatsApp com a mensagem pronta para cada membro.</p>' +
            itens +
          '</div>' +
          '<div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,.1)">' +
            '<a href="https://wa.me/?text=' + encodeURIComponent(msg) + '" target="_blank" style="display:block;text-align:center;background:#25d366;color:#fff;padding:12px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">&#128242; Notificar Todos (Mensagem Geral)</a>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
      document.getElementById('btn-fechar-notif').addEventListener('click', function() { overlay.remove(); });
    });
}

function saveTeam(serviceId, teamId) {
  var r = currentProfile.role;
  var dept = currentProfile.department;

  function val(id) { var el = document.getElementById(id); return el ? el.value : undefined; }

  var updates = {};

  if (r === 'admin' || (r === 'lider' && dept === 'louvor')) {
    updates.worship_pastor       = val('edit-pastor') || '';
    updates.worship_band         = val('edit-band') || '';
    updates.worship_repertoire   = val('edit-repertoire') || '';
    updates.worship_dress_code   = val('edit-dresscode') || '';
    updates.worship_vocais       = getListFromUI('vocais');
    updates.worship_teclado      = getListFromUI('teclado');
    updates.worship_violao       = getListFromUI('violao');
    updates.worship_guitarra     = getListFromUI('guitarra');
    updates.worship_bateria      = getListFromUI('bateria');
    updates.worship_baixo        = getListFromUI('baixo');
    updates.worship_outros       = getListFromUI('louvor-outros');
  }
  if (r === 'admin' || (r === 'lider' && dept === 'som')) {
    updates.sound_operators = getListFromUI('som');
    updates.sound_operator  = updates.sound_operators.split('|')[0] || '';
  }
  if (r === 'admin' || (r === 'lider' && dept === 'projecao')) {
    updates.projection_operators = getListFromUI('proj');
    updates.projection_operator  = updates.projection_operators.split('|')[0] || '';
  }
  if (r === 'admin' || (r === 'lider' && dept === 'iluminacao')) {
    updates.lighting_operator = val('edit-light') || '';
  }
  if (r === 'admin' || (r === 'lider' && dept === 'live')) {
    updates.live_operators = getListFromUI('live');
    updates.live_operator  = updates.live_operators.split('|')[0] || '';
  }

  updates.updated_by = currentUser.id;

  var promise;
  if (teamId) {
    promise = sb.from('service_teams').update(updates).eq('id', teamId);
  } else {
    updates.service_id = serviceId;
    promise = sb.from('service_teams').insert(updates);
  }

  promise.then(function(res) {
    if (res.error) { toast('Erro ao salvar: ' + res.error.message, 'error'); return; }
    toast('Equipe atualizada!', 'success');
    closeServiceModal();
    loadServices().then(function() { renderServices(); renderCalendar(); });
  });
}

function setConfirmation(serviceId, status) {
  sb.from('service_confirmations').upsert({
    service_id: serviceId,
    user_id: currentUser.id,
    status: status
  }, { onConflict: 'service_id,user_id' }).then(function(res) {
    if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
    toast(status === 'confirmed' ? 'Presenca confirmada!' : 'Marcado como ausente', 'success');
    closeServiceModal();
  });
}

// =============================================

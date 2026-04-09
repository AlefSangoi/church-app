// PAINEL DE CONVITES (ADMIN)
// =============================================
var convitesInit = false;
function initConvites() {
  if (!convitesInit) {
    convitesInit = true;
    document.getElementById('btn-novo-convite').addEventListener('click', function() {
      var f = document.getElementById('novo-convite-form');
      f.style.display = f.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('btn-gerar-convite').addEventListener('click', function() {
      var role = document.getElementById('convite-role').value;
      var exp  = parseInt(document.getElementById('convite-expires').value);
      var lbl  = document.getElementById('convite-label').value.trim();
      var max  = parseInt(document.getElementById('convite-max-uses').value);
      var b = this; b.disabled = true; b.textContent = 'Gerando...';
      sb.rpc('create_invite', { p_role: role, p_label: lbl || null, p_max_uses: max, p_expires_days: exp || null })
        .then(function(r) {
          b.disabled = false; b.textContent = 'Gerar Link';
          if (r.error) { toast('Erro: ' + r.error.message, 'error'); return; }
          var base = window.location.origin + window.location.pathname;
          var slug = getChurchSlug() || '';
          var link = base + '?invite=' + r.data.token + (slug ? '&church=' + slug : '');
          document.getElementById('convite-link-gerado').value = link;
          document.getElementById('btn-whatsapp-convite').href =
            'https://wa.me/?text=' + encodeURIComponent('Voce foi convidado! Acesse: ' + link);
          document.getElementById('convite-gerado').style.display = 'block';
          document.getElementById('novo-convite-form').style.display = 'none';
          toast('Convite gerado!', 'success');
          carregarListaConvites();
        });
    });
    document.getElementById('btn-copiar-link').addEventListener('click', function() {
      var inp = document.getElementById('convite-link-gerado');
      navigator.clipboard ? navigator.clipboard.writeText(inp.value) : (inp.select(), document.execCommand('copy'));
      this.textContent = 'Copiado!'; var s = this;
      setTimeout(function(){ s.textContent = 'Copiar'; }, 2000);
    });
  }
  carregarListaConvites();
}

function carregarListaConvites() {
  var c = document.getElementById('convites-lista');
  c.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:10px">Carregando...</p>';
  sb.from('invites').select('*').eq('church_id', currentProfile.church_id).order('created_at', { ascending: false }).then(function(r) {
    var lista = r.data || [];
    if (!lista.length) {
      c.innerHTML = '<p style="color:var(--muted);font-size:14px;padding:20px;text-align:center">Nenhum convite ainda.</p>';
      return;
    }
    var base = window.location.origin + window.location.pathname;
    var slug = getChurchSlug() || '';
    var rl = { voluntario:'Voluntario', lider:'Lider', admin:'Admin' };
    c.innerHTML = '<h4 style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Convites gerados</h4>' +
      lista.map(function(inv) {
        var exp = inv.expires_at && new Date(inv.expires_at) < new Date();
        var esg = inv.uses_count >= inv.max_uses;
        var st  = inv.revoked ? 'Revogado' : exp ? 'Expirado' : esg ? 'Esgotado' : 'Ativo';
        var cls = (inv.revoked || exp || esg) ? 'invite-expired' : 'invite-active';
        var link = base + '?invite=' + inv.token + (slug ? '&church=' + slug : '');
        var expStr = inv.expires_at ? new Date(inv.expires_at).toLocaleDateString('pt-BR') : 'Sem expiracao';
        return '<div class="invite-card">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
              '<strong style="font-size:14px">' + (inv.label || rl[inv.role] || inv.role) + '</strong>' +
              '<span class="invite-badge ' + cls + '">' + st + '</span>' +
              '<span style="font-size:11px;color:var(--muted);margin-left:auto">' + inv.uses_count + '/' + inv.max_uses + ' usos</span>' +
            '</div>' +
            '<div class="invite-token">' + link + '</div>' +
            '<div class="invite-meta">Perfil: ' + (rl[inv.role]||inv.role) + ' &bull; Validade: ' + expStr + '</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">' +
            '<button class="btn btn-secondary btn-sm copy-btn" data-link="' + link + '">Copiar</button>' +
            (!inv.revoked && !exp && !esg ? '<button class="btn btn-danger btn-sm rev-btn" data-id="' + inv.id + '">Revogar</button>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    c.querySelectorAll('.copy-btn').forEach(function(b) {
      b.addEventListener('click', function() {
        var txt = this.getAttribute('data-link'); var self = this;
        navigator.clipboard ? navigator.clipboard.writeText(txt) : (function(){ var t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);})();
        self.textContent = 'Copiado!'; setTimeout(function(){ self.textContent = 'Copiar'; }, 2000);
      });
    });
    c.querySelectorAll('.rev-btn').forEach(function(b) {
      b.addEventListener('click', function() {
        if (!confirm('Revogar convite?')) return;
        sb.from('invites').update({ revoked: true }).eq('id', this.getAttribute('data-id')).then(function(r) {
          if (r.error) { toast('Erro: ' + r.error.message,'error'); return; }
          toast('Convite revogado.', 'success'); carregarListaConvites();
        });
      });
    });
  });
}

// (IIFE fechado em config.js)

// =============================================
// ESCALA EM MASSA
// =============================================
var escalaMassaInit = false;
function initEscalaMassa() {
  if (!escalaMassaInit) {
    escalaMassaInit = true;

    // Preencher mês atual
    var hoje = new Date();
    document.getElementById('em-mes').value = hoje.getMonth() + 1;
    document.getElementById('em-ano').value = hoje.getFullYear();

    // Buscar cultos
    document.getElementById('btn-em-buscar').addEventListener('click', buscarCultosEscalaMassa);

    // Selecionar todos
    document.getElementById('em-check-all').addEventListener('change', function() {
      document.querySelectorAll('.em-culto-check').forEach(function(cb) { cb.checked = this.checked; }.bind(this));
      atualizarPreviewEscala();
    });

    // Botão aplicar
    document.getElementById('btn-em-aplicar').addEventListener('click', aplicarEscalaMassa);
  }
  buscarCultosEscalaMassa();
}

function buscarCultosEscalaMassa() {
  var mes = parseInt(document.getElementById('em-mes').value);
  var ano = parseInt(document.getElementById('em-ano').value);
  var inicio = new Date(ano, mes - 1, 1).toISOString().slice(0, 10);
  var fim    = new Date(ano, mes, 0).toISOString().slice(0, 10);

  var wrap  = document.getElementById('em-cultos-wrap');
  var lista = document.getElementById('em-cultos-list');
  var empty = document.getElementById('em-cultos-empty');
  lista.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">Carregando...</div>';
  wrap.style.display = 'block';

  sb.from('services')
    .select('id, title, date, time, location, color')
    .eq('church_id', currentProfile.church_id)
    .gte('date', inicio).lte('date', fim)
    .order('date', { ascending: true })
    .then(function(res) {
      var cultos = res.data || [];
      if (!cultos.length) {
        lista.innerHTML = '';
        empty.style.display = 'block';
        document.getElementById('em-equipe-wrap').style.display = 'none';
        document.getElementById('em-aplicar-wrap').style.display = 'none';
        return;
      }
      empty.style.display = 'none';
      lista.innerHTML = cultos.map(function(c) {
        var dt = new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short' });
        var hr = c.time ? c.time.slice(0,5) : '';
        return '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:border-color .15s" ' +
          'onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
          '<input type="checkbox" class="em-culto-check" data-id="' + c.id + '" style="width:16px;height:16px;accent-color:var(--accent);flex-shrink:0" onchange="atualizarPreviewEscala()"/>' +
          '<div style="width:6px;height:6px;border-radius:50%;background:' + (c.color||'var(--accent)') + ';flex-shrink:0"></div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:13px;font-weight:600">' + c.title + '</div>' +
            '<div style="font-size:11px;color:var(--muted)">' + dt + (hr ? ' &middot; ' + hr : '') + ' &middot; ' + (c.location||'') + '</div>' +
          '</div>' +
        '</label>';
      }).join('');
      document.getElementById('em-equipe-wrap').style.display = 'block';
      atualizarPreviewEscala();
    });
}

function atualizarPreviewEscala() {
  var selecionados = document.querySelectorAll('.em-culto-check:checked').length;
  var preview = document.getElementById('em-preview');
  var wrap    = document.getElementById('em-aplicar-wrap');
  if (selecionados === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  preview.innerHTML = '&#9889; Serao escalados <strong>' + selecionados + ' culto' + (selecionados > 1 ? 's' : '') + '</strong> com as funcoes preenchidas abaixo.';
}

function aplicarEscalaMassa() {
  var checks = Array.from(document.querySelectorAll('.em-culto-check:checked'));
  if (!checks.length) { toast('Selecione ao menos um culto.', 'error'); return; }

  function getField(id) { return (document.getElementById(id).value || '').trim(); }
  var campos = {
    worship_vocais:       getField('em-vocais'),
    worship_teclado:      getField('em-teclado'),
    worship_violao:       getField('em-violao'),
    worship_guitarra:     getField('em-guitarra'),
    worship_bateria:      getField('em-bateria'),
    worship_baixo:        getField('em-baixo'),
    worship_outros:       getField('em-outros'),
    sound_operators:      getField('em-som'),
    sound_operator:       getField('em-som').split('|')[0] || '',
    projection_operators: getField('em-proj'),
    projection_operator:  getField('em-proj').split('|')[0] || '',
    lighting_operator:    getField('em-luz'),
    live_operators:       getField('em-live'),
    live_operator:        getField('em-live').split('|')[0] || ''
  };

  // Remove campos vazios se não está sobrescrevendo
  var sobrescrever = document.getElementById('em-sobrescrever').checked;
  var updates = {};
  Object.keys(campos).forEach(function(k) {
    if (sobrescrever || campos[k]) updates[k] = campos[k];
  });

  if (!Object.keys(updates).length) { toast('Preencha ao menos uma funcao para escalar.', 'error'); return; }

  var ids = checks.map(function(cb) { return cb.getAttribute('data-id'); });
  var prog = document.getElementById('em-progress');
  var bar  = document.getElementById('em-progress-bar');
  var lbl  = document.getElementById('em-progress-label');
  var btn  = document.getElementById('btn-em-aplicar');

  prog.style.display = 'block';
  btn.disabled = true;
  var done = 0;

  // Processar em sequência para não sobrecarregar
  function processNext(i) {
    if (i >= ids.length) {
      bar.style.width = '100%';
      lbl.textContent = 'Concluido! ' + ids.length + ' culto' + (ids.length > 1 ? 's' : '') + ' escalado' + (ids.length > 1 ? 's' : '') + '.';
      btn.disabled = false;
      toast('Escala em massa aplicada em ' + ids.length + ' culto' + (ids.length > 1 ? 's' : '') + '!', 'success');
      loadServices();
      return;
    }
    var serviceId = ids[i];
    // Buscar team_id existente
    sb.from('service_teams').select('id').eq('service_id', serviceId).maybeSingle()
      .then(function(r) {
        var promise;
        if (r.data && r.data.id) {
          promise = sb.from('service_teams').update(updates).eq('id', r.data.id);
        } else {
          var insert = Object.assign({ service_id: serviceId, church_id: currentProfile.church_id }, updates);
          promise = sb.from('service_teams').insert(insert);
        }
        return promise;
      })
      .then(function() {
        done++;
        bar.style.width = Math.round((done / ids.length) * 100) + '%';
        lbl.textContent = 'Aplicando... ' + done + '/' + ids.length;
        processNext(i + 1);
      })
      .catch(function(err) {
        console.error('Erro escala massa:', err);
        done++;
        processNext(i + 1);
      });
  }
  processNext(0);
}
window.atualizarPreviewEscala = atualizarPreviewEscala;

// =============================================
// BANNER DE CONVITE NA AGENDA
// =============================================
function verificarBannerConvite() {
  if (!currentProfile || currentProfile.role !== 'admin') return;
  if (!window.currentChurch) return;

  var plano = PLANOS[(window.currentChurch.plan) || 'trial'];
  var maxUsers = plano.usuarios;

  sb.from('profiles').select('id', { count: 'exact', head: true })
    .eq('church_id', currentProfile.church_id)
    .eq('status', 'approved')
    .then(function(res) {
      var total = res.count || 0;
      var vagas = maxUsers === 999 ? 999 : maxUsers - total;
      var banner = document.getElementById('banner-convidar');
      var txt    = document.getElementById('banner-convidar-txt');
      if (!banner) return;
      if (vagas > 0 && total < 3) {
        // Poucos usuários — mostrar banner incisivo
        banner.style.display = 'flex';
        txt.textContent = 'Voce tem ' + vagas + ' vaga' + (vagas > 1 ? 's' : '') + ' disponivel' + (vagas > 1 ? 'is' : '') + ' no plano ' + plano.label + '. Convide sua equipe!';
      } else if (vagas > 0) {
        banner.style.display = 'flex';
        txt.textContent = total + ' membro' + (total > 1 ? 's' : '') + ' cadastrado' + (total > 1 ? 's' : '') + ' · ' + vagas + ' vaga' + (vagas > 1 ? 's' : '') + ' disponivel' + (vagas > 1 ? 'is' : '') + ' no plano ' + plano.label + '.';
      } else {
        banner.style.display = 'none';
      }
    });
}
window.verificarBannerConvite = verificarBannerConvite;

// =============================================
// MODAL BOAS-VINDAS PÓS-ONBOARDING
// =============================================
function mostrarBoasVindasComConvite() {
  var old = document.getElementById('modal-boas-vindas');
  if (old) old.remove();

  var overlay = document.createElement('div');
  overlay.id = 'modal-boas-vindas';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px';

  overlay.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:20px;width:100%;max-width:460px;padding:32px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)">' +
      '<div style="font-size:52px;margin-bottom:16px">&#127881;</div>' +
      '<div style="font-family:var(--font-display);font-size:28px;letter-spacing:1px;margin-bottom:8px">Agenda criada!</div>' +
      '<p style="font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.6">Agora convide sua equipe para comecar a escalar os cultos. Cada voluntario recebera um link para entrar direto na sua agenda.</p>' +
      '<button id="btn-bv-convidar" style="display:block;width:100%;background:var(--accent);color:#000;border:none;padding:15px;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;margin-bottom:10px">&#128279; Convidar minha equipe agora</button>' +
      '<button id="btn-bv-depois" style="display:block;width:100%;background:transparent;border:1px solid var(--border);color:var(--muted);padding:12px;border-radius:12px;font-size:13px;cursor:pointer">Fazer isso depois</button>' +
    '</div>';

  document.body.appendChild(overlay);

  document.getElementById('btn-bv-convidar').addEventListener('click', function() {
    overlay.remove();
    showPageSafe('admin');
    setTimeout(function() {
      var tab = document.querySelector('[data-admin-tab="convites"]');
      if (tab) tab.click();
    }, 150);
  });
  document.getElementById('btn-bv-depois').addEventListener('click', function() { overlay.remove(); });
}
window.mostrarBoasVindasComConvite = mostrarBoasVindasComConvite;

// =============================================
// AJUDA - accordion
// =============================================
function toggleAjuda(id) {
  var card = document.getElementById(id);
  if (!card) return;
  var isOpen = card.classList.contains('open');
  // Fecha todos
  document.querySelectorAll('.ajuda-card').forEach(function(c) { c.classList.remove('open'); });
  // Abre o clicado (se estava fechado)
  if (!isOpen) card.classList.add('open');
}

// =============================================
// LISTENER GLOBAL - fora do IIFE
// Captura cliques em cards de culto em qualquer parte da pagina
// =============================================
document.addEventListener('click', function(e) {
  var card = e.target.closest('.service-card[data-id]');
  if (card && window.openServiceModal) {
    window.openServiceModal(card.getAttribute('data-id'));
    return;
  }
  var pill = e.target.closest('.cal-event-pill[data-id]');
  if (pill && window.openServiceModal) {
    window.openServiceModal(pill.getAttribute('data-id'));
    return;
  }
  var mcItem = e.target.closest('.mc-item[data-id]');
  if (mcItem && window.openServiceModal) {
    window.openServiceModal(mcItem.getAttribute('data-id'));
    return;
  }
});

// =============================================
// INICIALIZAR APP - chamado após todos os scripts
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  if (typeof initApp === 'function') initApp();
});
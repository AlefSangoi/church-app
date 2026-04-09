// MODAL PIX - SUPER ADMIN
// =============================================
function abrirModalPix(nome, valor, pixKey, waCliente) {
  var old = document.getElementById('modal-pix-sa');
  if (old) old.remove();

  // Gerar QR Code via API gratuita do QR Server
  var pixData = pixKey; // chave PIX
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(pixKey);

  var overlay = document.createElement('div');
  overlay.id = 'modal-pix-sa';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';

  overlay.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:20px;width:100%;max-width:380px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)">' +
      // Header
      '<div style="background:linear-gradient(135deg,#1a2744,#0f172a);padding:20px;text-align:center">' +
        '<div style="font-size:13px;color:var(--accent);font-weight:700;letter-spacing:1px;margin-bottom:4px">COBRANÇA PIX</div>' +
        '<div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:2px">' + nome + '</div>' +
        '<div style="font-size:28px;font-weight:800;color:var(--accent)">R$ ' + parseFloat(valor).toFixed(2) + '<span style="font-size:13px;color:var(--muted)">/mês</span></div>' +
      '</div>' +
      // QR Code
      '<div style="padding:24px;text-align:center">' +
        '<div style="background:#fff;border-radius:12px;padding:12px;display:inline-block;margin-bottom:16px">' +
          '<img src="' + qrUrl + '" width="180" height="180" alt="QR Code PIX" style="display:block"/>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">Escaneie o QR Code ou copie a chave abaixo</div>' +
        // Chave PIX
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:16px">' +
          '<span style="font-size:13px;color:var(--text);font-family:monospace">' + pixKey + '</span>' +
          '<button id="btn-copiar-pix" style="background:var(--accent);color:#000;border:none;padding:5px 12px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Copiar</button>' +
        '</div>' +
        // Botão WhatsApp
        '<button id="btn-wa-pix" style="width:100%;background:#25d366;color:#fff;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px">' +
          '&#128242; Cobrar via WhatsApp' +
        '</button>' +
        '<button id="btn-fechar-pix" style="width:100%;background:var(--surface2);color:var(--muted);border:1px solid var(--border);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">Fechar</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.getElementById('btn-fechar-pix').addEventListener('click', function() { overlay.remove(); });

  document.getElementById('btn-copiar-pix').addEventListener('click', function() {
    navigator.clipboard && navigator.clipboard.writeText(pixKey).catch(function(){});
    this.textContent = 'Copiado!';
    var btn = this;
    setTimeout(function() { btn.textContent = 'Copiar'; }, 2000);
    toast('Chave PIX copiada!', 'success');
  });

  document.getElementById('btn-wa-pix').addEventListener('click', function() {
    var msg = 'Ola! Tudo bem?' +
      '\n\nPassando para lembrar o pagamento mensal da *Agenda Church App* referente a igreja *' + nome + '*.' +
      '\n\nValor: *R$ ' + parseFloat(valor).toFixed(2) + '/mes*' +
      '\n\nChave PIX: *' + pixKey + '*' +
      '\n\nApos o pagamento sua agenda continua funcionando normalmente.' +
      '\nQualquer duvida estou a disposicao!';
    // Se tiver numero do cliente, abrir direto para ele
    var waNum = (waCliente || '').replace(/[^0-9]/g,'');
    var waUrl = waNum ? 'https://wa.me/55' + waNum + '?text=' + encodeURIComponent(msg)
                     : 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(waUrl, '_blank');
  });
}

// =============================================
// MODAL DE PLANOS E UPGRADE
// =============================================
function abrirModalPlanos() {
  var old = document.getElementById('modal-planos');
  if (old) old.remove();

  var church = window.currentChurch || {};
  var planoAtual = church.plan || 'trial';
  var nomeIgreja = church.name || '';

  var planos = [
    { key:'trial',        nome:'Trial',        valor:'Gratis',   dias:'7 dias',  usuarios:5,   esbocos:'1 total',   convites:'Nao',   cor:'#6b7280' },
    { key:'basico',       nome:'Basico',        valor:'R$19,90',  dias:'30 dias', usuarios:15,  esbocos:'Nao',       convites:'Sim',   cor:'#3b82f6' },
    { key:'essencial',    nome:'Essencial',     valor:'R$29,90',  dias:'30 dias', usuarios:30,  esbocos:'5/mes',     convites:'Sim',   cor:'#8b5cf6' },
    { key:'profissional', nome:'Profissional',  valor:'R$39,90',  dias:'30 dias', usuarios:60,  esbocos:'20/mes',    convites:'Sim',   cor:'#f59e0b' },
    { key:'premium',      nome:'Premium',       valor:'R$59,90',  dias:'30 dias', usuarios:999, esbocos:'Ilimitado', convites:'Sim',   cor:'#10b981' },
  ];

  var cardsHtml = planos.map(function(p) {
    var isAtual = p.key === planoAtual;
    var isMelhor = p.key === 'profissional';
    return '<div style="background:var(--surface2);border:2px solid ' + (isAtual ? p.cor : isMelhor ? p.cor : 'var(--border)') + ';border-radius:14px;padding:20px;position:relative;' + (isMelhor ? 'transform:scale(1.03)' : '') + '">' +
      (isMelhor ? '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:' + p.cor + ';color:#000;padding:2px 14px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">MAIS POPULAR</div>' : '') +
      (isAtual ? '<div style="position:absolute;top:-10px;right:12px;background:var(--green);color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">ATUAL</div>' : '') +
      '<div style="text-align:center;margin-bottom:14px">' +
        '<div style="font-weight:800;font-size:15px;color:' + p.cor + ';margin-bottom:4px">' + p.nome + '</div>' +
        '<div style="font-size:22px;font-weight:800;color:var(--text)">' + p.valor + '</div>' +
        '<div style="font-size:11px;color:var(--muted)">' + p.dias + '</div>' +
      '</div>' +
      '<div style="font-size:12px;display:flex;flex-direction:column;gap:6px;margin-bottom:16px">' +
        '<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Usuarios</span><strong>' + (p.usuarios >= 999 ? 'Ilimitado' : 'Ate ' + p.usuarios) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Esbocos IA</span><strong>' + p.esbocos + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Convites</span><strong>' + p.convites + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Suporte</span><strong>' + (p.key === 'trial' ? 'Nao' : 'Seg-Sex') + '</strong></div>' +
      '</div>' +
      (isAtual
        ? '<div style="text-align:center;padding:8px;border-radius:8px;background:rgba(16,185,129,.1);color:var(--green);font-size:12px;font-weight:700">Plano Atual</div>'
        : '<button class="btn-assinar-plano" data-key="' + p.key + '" data-nome="' + p.nome + '" data-valor="' + p.valor + '" style="width:100%;background:' + p.cor + ';color:' + (p.key==="basico"?"#fff":"#000") + ';border:none;padding:10px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">Assinar ' + p.nome + '</button>'
      ) +
    '</div>';
  }).join('');

  var overlay = document.createElement('div');
  overlay.id = 'modal-planos';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;backdrop-filter:blur(4px)';

  overlay.innerHTML =
    '<div style="background:var(--surface);border-radius:20px;width:100%;max-width:900px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);margin:auto">' +
      '<div style="background:linear-gradient(135deg,#1a2744,#0f172a);padding:28px;text-align:center">' +
        '<div style="font-size:28px;margin-bottom:8px">&#9679; Planos Church App</div>' +
        '<p style="color:#94a3b8;font-size:14px">Escolha o plano ideal para sua igreja</p>' +
      '</div>' +
      '<div style="padding:24px">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:24px">' +
          cardsHtml +
        '</div>' +
        '<p style="text-align:center;font-size:12px;color:var(--muted)">Pagamento via PIX. Suporte de segunda a sexta, das 8h as 18h.</p>' +
      '</div>' +
      '<div style="padding:16px 24px;border-top:1px solid var(--border);text-align:right">' +
        '<button id="btn-fechar-planos" style="background:var(--surface2);color:var(--muted);border:1px solid var(--border);padding:8px 20px;border-radius:8px;cursor:pointer;font-size:13px">Fechar</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.getElementById('btn-fechar-planos').addEventListener('click', function() { overlay.remove(); });

  // Listeners dos botões de assinar
  overlay.querySelectorAll('.btn-assinar-plano').forEach(function(btn) {
    btn.addEventListener('click', function() {
      solicitarUpgrade(
        this.getAttribute('data-key'),
        this.getAttribute('data-nome'),
        this.getAttribute('data-valor'),
        nomeIgreja
      );
    });
  });
}

function solicitarUpgrade(planoKey, planoNome, planoValor, nomeIgreja) {
  var msg = 'Ola! Quero fazer upgrade do meu plano na *Agenda Church App*.' +
    '\n\nIgreja: *' + nomeIgreja + '*' +
    '\nPlano desejado: *' + planoNome + '* (' + planoValor + '/mes)' +
    '\n\nAguardo as instrucoes para o pagamento via PIX. Obrigado!';
  var url = 'https://wa.me/5549988068778?text=' + encodeURIComponent(msg);
  window.open(url, '_blank');
}

// =============================================
// BANNER DE PLANO NO SISTEMA DO CLIENTE
// =============================================
function mostrarBannerPlano(church) {
  if (!church) return;
  var status  = church.plan_status || 'trial';
  var plan    = church.plan || 'trial';
  var plano   = PLANOS[plan] || PLANOS.trial;
  var expires = church.plan_expires_at ? new Date(church.plan_expires_at) : null;
  var hoje    = new Date();

  // Banners de vencimento/carencia sao tratados por verificarStatusPlano — nao duplicar
  if (status === 'overdue' || status === 'cancelled') return;

  var diasRestantes = expires ? Math.ceil((expires - hoje) / (1000*60*60*24)) : null;
  var isTrial = (plan === 'trial' || plan === 'free');

  // Mostrar banner: trial ativo, ou plano vencendo em <= 7 dias (nao coberto acima)
  var mostrar = isTrial || (diasRestantes !== null && diasRestantes <= 7 && diasRestantes > 3);
  if (!mostrar) return;

  var old = document.getElementById('banner-plano');
  if (old) old.remove();

  var banner = document.createElement('div');
  banner.id = 'banner-plano';

  var cor = isTrial ? '#f59e0b' : (diasRestantes <= 3 ? '#ef4444' : '#f59e0b');
  var msg = '';

  if (isTrial) {
    msg = diasRestantes !== null && diasRestantes > 0
      ? '&#9201; Voce esta no periodo Trial. Restam <strong>' + diasRestantes + ' dias</strong>. Assine um plano para continuar usando!'
      : '&#9201; Voce esta no periodo Trial gratuito. Assine um plano para continuar usando!';
  } else {
    msg = '&#9888; Seu plano <strong>' + plano.label + '</strong> vence em <strong>' + diasRestantes + ' dias</strong>. Renove para nao perder o acesso!';
  }

  banner.style.cssText = 'background:' + cor + '18;border-bottom:2px solid ' + cor + ';padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:var(--text);flex-wrap:wrap;position:relative;z-index:10';
  banner.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px">' +
      '<span>' + msg + '</span>' +
    '</div>' +
    '<button onclick="abrirModalPlanos()" style="background:' + cor + ';color:#fff;padding:6px 16px;border-radius:8px;font-weight:700;font-size:12px;border:none;cursor:pointer;white-space:nowrap">Ver Planos</button>';

  var mainContent = document.getElementById('main-content');
  if (mainContent) mainContent.insertBefore(banner, mainContent.firstChild);
}

function atualizarBadgePlanoSidebar(church) {
  if (!church) return;
  var badge = document.getElementById('sidebar-plano-badge');
  if (!badge) return;

  var plan    = church.plan || 'trial';
  var plano   = PLANOS[plan] || PLANOS.trial;
  var expires = church.plan_expires_at ? new Date(church.plan_expires_at) : null;
  var hoje    = new Date();
  var diasRestantes = expires ? Math.ceil((expires - hoje) / (1000*60*60*24)) : null;
  var diasTotal = plano.dias || 30;

  // Calcular % do período usado
  var pct = 0;
  if (diasRestantes !== null && diasTotal > 0) {
    pct = Math.min(100, Math.max(0, Math.round((1 - diasRestantes / diasTotal) * 100)));
  }

  // Cor da barra
  var cor = pct >= 85 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981';

  // Texto de dias
  var diasTxt = '';
  if (diasRestantes !== null) {
    if (diasRestantes <= 0) diasTxt = 'Vencido';
    else if (diasRestantes === 1) diasTxt = '1 dia restante';
    else diasTxt = diasRestantes + ' dias';
  }

  var nomeEl  = document.getElementById('sidebar-plano-nome');
  var diasEl  = document.getElementById('sidebar-plano-dias');
  var barEl   = document.getElementById('sidebar-plano-bar');
  var hintEl  = document.getElementById('sidebar-plano-hint');

  if (nomeEl) nomeEl.textContent = plano.label;
  if (diasEl) { diasEl.textContent = diasTxt; diasEl.style.color = pct >= 85 ? '#ef4444' : 'var(--muted)'; }
  if (barEl)  { barEl.style.width = pct + '%'; barEl.style.background = cor; }
  if (hintEl) {
    hintEl.textContent = (plan === 'trial' || plan === 'free')
      ? 'Clique para assinar'
      : (pct >= 85 ? 'Renovar plano' : 'Ver detalhes');
    hintEl.style.color = pct >= 85 ? '#ef4444' : 'var(--muted)';
  }

  badge.style.display = 'block';
}

// =============================================
// VERIFICACAO DE STATUS DO PLANO
// =============================================
function verificarStatusPlano(church) {
  var status  = church.plan_status || 'trial';
  var expires = church.plan_expires_at ? new Date(church.plan_expires_at) : null;
  var hoje    = new Date();

  // Calcular dias desde o vencimento (positivo = já venceu)
  var diasVencido = expires ? Math.ceil((hoje - expires) / (1000*60*60*24)) : 0;

  // Cancelado: bloqueia imediatamente
  if (status === 'cancelled') {
    _mostrarModalBloqueio(church, 'cancelled', 0);
    return;
  }

  // Inadimplente (overdue)
  if (status === 'overdue') {
    if (diasVencido <= 3) {
      // Dentro da carência: banner vermelho com countdown, app funciona
      _mostrarBannerCarencia(church, diasVencido);
    } else {
      // Carência esgotada: bloqueia
      _mostrarModalBloqueio(church, 'overdue', diasVencido);
    }
    return;
  }

  // Ativo mas vencendo em breve: banner progressivo
  if (status === 'active' && expires) {
    var diasRestantes = Math.ceil((expires - hoje) / (1000*60*60*24));
    if (diasRestantes <= 3 && diasRestantes >= 0) {
      _mostrarBannerAviso(church, diasRestantes, 'danger');
    } else if (diasRestantes <= 7) {
      _mostrarBannerAviso(church, diasRestantes, 'warning');
    }
  }
}

function _mostrarBannerCarencia(church, diasVencido) {
  var old = document.getElementById('banner-plano-carencia');
  if (old) old.remove();
  var restantes = 3 - diasVencido;
  var banner = document.createElement('div');
  banner.id = 'banner-plano-carencia';
  banner.style.cssText = 'background:rgba(239,68,68,.12);border-bottom:2px solid #ef4444;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:var(--text);flex-wrap:wrap;position:relative;z-index:10';
  var msg = restantes <= 0
    ? '&#128680; Seu plano venceu e o acesso sera bloqueado hoje. Regularize agora!'
    : '&#128680; Seu plano venceu. Voce tem mais <strong>' + restantes + ' dia' + (restantes > 1 ? 's' : '') + '</strong> de carencia antes do bloqueio.';
  banner.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px">' +
      '<span>' + msg + '</span>' +
    '</div>' +
    '<button onclick="abrirModalPlanos()" style="background:#ef4444;color:#fff;padding:6px 16px;border-radius:8px;font-weight:700;font-size:12px;border:none;cursor:pointer;white-space:nowrap">Regularizar agora</button>';
  var mainContent = document.getElementById('main-content');
  if (mainContent) mainContent.insertBefore(banner, mainContent.firstChild);
}

function _mostrarBannerAviso(church, diasRestantes, tipo) {
  var old = document.getElementById('banner-plano-aviso');
  if (old) old.remove();
  var cor = tipo === 'danger' ? '#ef4444' : '#f59e0b';
  var icon = tipo === 'danger' ? '&#9888;' : '&#9201;';
  var msg = diasRestantes === 0
    ? icon + ' Seu plano <strong>vence hoje</strong>! Renove para nao perder o acesso.'
    : icon + ' Seu plano vence em <strong>' + diasRestantes + ' dia' + (diasRestantes > 1 ? 's' : '') + '</strong>. Renove para continuar usando normalmente.';
  var banner = document.createElement('div');
  banner.id = 'banner-plano-aviso';
  banner.style.cssText = 'background:' + cor + '18;border-bottom:2px solid ' + cor + ';padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:var(--text);flex-wrap:wrap;position:relative;z-index:10';
  banner.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px"><span>' + msg + '</span></div>' +
    '<button onclick="abrirModalPlanos()" style="background:' + cor + ';color:#fff;padding:6px 16px;border-radius:8px;font-weight:700;font-size:12px;border:none;cursor:pointer;white-space:nowrap">Renovar plano</button>';
  var mainContent = document.getElementById('main-content');
  if (mainContent) mainContent.insertBefore(banner, mainContent.firstChild);
}

function _mostrarModalBloqueio(church, status, diasVencido) {
  var old = document.getElementById('modal-plano-bloqueado');
  if (old) return;

  var isCancelled = status === 'cancelled';
  var titulo = isCancelled ? 'Plano Cancelado' : 'Acesso Bloqueado';
  var icon   = isCancelled ? '&#128683;' : '&#128274;';
  var cor    = '#ef4444';
  var msg    = isCancelled
    ? 'Sua agenda foi cancelada. Entre em contato para reativar o seu plano e continuar usando o sistema.'
    : 'Seu plano venceu ha ' + diasVencido + ' dia' + (diasVencido > 1 ? 's' : '') + ' e o periodo de carencia de 3 dias foi encerrado. Regularize para retomar o acesso.';

  var overlay = document.createElement('div');
  overlay.id = 'modal-plano-bloqueado';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';

  overlay.innerHTML =
    '<div style="background:var(--surface);border:2px solid ' + cor + ';border-radius:20px;width:100%;max-width:440px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6);text-align:center">' +
      '<div style="background:' + cor + '22;padding:32px 24px 20px;border-bottom:1px solid ' + cor + '33">' +
        '<div style="font-size:48px;margin-bottom:12px">' + icon + '</div>' +
        '<div style="font-size:20px;font-weight:800;color:' + cor + ';margin-bottom:8px">' + titulo + '</div>' +
        '<div style="font-size:13px;color:var(--muted);line-height:1.6">' + msg + '</div>' +
      '</div>' +
      '<div style="padding:24px">' +
        '<div style="background:var(--surface2);border-radius:12px;padding:16px;margin-bottom:20px;text-align:left">' +
          '<div style="font-size:12px;color:var(--muted);margin-bottom:4px">Igreja</div>' +
          '<div style="font-weight:700;font-size:15px">' + (church.name || '') + '</div>' +
        '</div>' +
        '<a href="https://wa.me/5549988068778?text=' + encodeURIComponent('Ola! Preciso regularizar o plano da minha agenda: ' + (church.name || '')) + '" target="_blank" ' +
          'style="display:block;background:#25d366;color:#fff;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:10px">' +
          '&#128242; Falar com Suporte no WhatsApp' +
        '</a>' +
        '<button id="btn-ver-somente-leitura" style="width:100%;background:transparent;color:var(--muted);border:1px solid var(--border);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">Ver sistema (somente leitura)</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  setTimeout(function() {
    var btnVer = document.getElementById('btn-ver-somente-leitura');
    if (btnVer) btnVer.addEventListener('click', function() {
      var m = document.getElementById('modal-plano-bloqueado');
      if (m) { m.style.opacity = '0.15'; m.style.pointerEvents = 'none'; }
      setTimeout(function() {
        var m2 = document.getElementById('modal-plano-bloqueado');
        if (m2) { m2.style.opacity = '1'; m2.style.pointerEvents = ''; }
      }, 10000);
    });
  }, 100);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      // Dar um "shake" visual para indicar que nao pode fechar
      overlay.style.animation = 'none';
      overlay.style.transform = 'scale(1.02)';
      setTimeout(function() { overlay.style.transform = ''; }, 150);
    }
  });
}

// =============================================
// NAVEGACAO
// =============================================
// Usar event delegation para navegação - mais robusto
document.addEventListener('click', function(e) {
  var navBtn = e.target.closest('.nav-item[data-page]');
  if (navBtn) {
    e.preventDefault();
    showPageSafe(navBtn.getAttribute('data-page'));
    return;
  }
  var topbarBtn = e.target.closest('#topbar-add-btn');
  if (topbarBtn) { openNewServiceModal(); return; }
  var newSvcBtn = e.target.closest('#btn-new-service');
  if (newSvcBtn) { openNewServiceModal(); return; }
  var sidebarLogo = e.target.closest('#sidebar-logo-btn');
  if (sidebarLogo) { showPageSafe('agenda'); return; }
});

// Manter também os listeners diretos como fallback
document.querySelectorAll('.nav-item[data-page]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    showPageSafe(this.getAttribute('data-page'));
  });
});

(document.getElementById('btn-prev-month')||{addEventListener:function(){}}).addEventListener('click', function() {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  renderCalendar(); renderServices();
});
(document.getElementById('btn-next-month')||{addEventListener:function(){}}).addEventListener('click', function() {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  renderCalendar(); renderServices();
});

function isMobile() {
  return window.innerWidth <= 768;
}

function toggleSidebar(forceClose) {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  var isOpen = sidebar.classList.contains('open');
  if (forceClose || isOpen) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    if (isMobile()) document.body.style.overflow = 'hidden'; // impede scroll da página ao fundo
  }
}
document.getElementById('hamburger').addEventListener('click', function() {
  toggleSidebar();
});
document.getElementById('sidebar-overlay').addEventListener('click', function() {
  toggleSidebar(true);
});

// Fecha sidebar no mobile ao clicar em qualquer nav-item
document.getElementById('sidebar').addEventListener('click', function(e) {
  if (isMobile() && e.target.closest('.nav-item')) {
    setTimeout(function(){ toggleSidebar(true); }, 100);
  }
});

// Swipe para fechar sidebar no mobile

// Expor globalmente
window.abrirModalPlanos         = abrirModalPlanos;
window.mostrarBannerPlano       = mostrarBannerPlano;
window.atualizarBadgePlanoSidebar = atualizarBadgePlanoSidebar;
window.verificarStatusPlano     = verificarStatusPlano;
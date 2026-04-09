// =============================================
// AUTH
// =============================================
// Login com Google
document.getElementById('btn-google-login').addEventListener('click', function() {
  var btn = this;
  btn.disabled = true;
  btn.style.opacity = '.7';
  // redirectTo deve ser a URL raiz do site sem hash ou query string
  var redirectUrl = window.location.origin + window.location.pathname;
  sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl }
  }).then(function(res) {
    if (res.error) {
      toast(res.error.message, 'error');
      btn.disabled = false;
      btn.style.opacity = '1';
    }
    // O Supabase redireciona para o Google e volta automaticamente
  });
});

document.getElementById('btn-login').addEventListener('click', function() {
  var email = document.getElementById('login-email').value.trim();
  var pass  = document.getElementById('login-password').value;
  if (!email || !pass) { toast('Preencha e-mail e senha.', 'error'); return; }
  this.textContent = 'Entrando...';
  this.disabled = true;
  var self = this;
  sb.auth.signInWithPassword({ email: email, password: pass }).then(function(res) {
    self.textContent = 'Entrar';
    self.disabled = false;
    if (res.error) { toast(res.error.message, 'error'); return; }
    loadApp(res.data.user);
  });
});

// BOTAO VISITANTE - acesso sem login
// Login com Google
// listener google removido (duplicado)
// Listener de mudanca de estado auth (captura retorno do OAuth Google)
sb.auth.onAuthStateChange(function(event, session) {
  if (event === 'SIGNED_IN' && session && !currentUser) {
    loadApp(session.user);
  }
  if (event === 'SIGNED_OUT') {
    currentUser = null;
    currentProfile = null;
  }
});

document.getElementById('btn-visitante-login').addEventListener('click', function() {
  currentUser = null;
  currentProfile = { id: null, name: 'Visitante', role: 'visitante', email: '' };
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  updateUserChip();
  applyRoleVisibility();
  loadServices().then(function() {
    renderCalendar();
    renderServices();
  });
});

document.getElementById('link-register').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('register-modal').classList.remove('hidden');
});

document.getElementById('btn-close-register').addEventListener('click', function() {
  document.getElementById('register-modal').classList.add('hidden');
});
document.getElementById('btn-cancel-register').addEventListener('click', function() {
  document.getElementById('register-modal').classList.add('hidden');
});

document.getElementById('btn-do-register').addEventListener('click', function() {
  var name  = document.getElementById('reg-name').value.trim();
  var email = document.getElementById('reg-email').value.trim();
  var pass  = document.getElementById('reg-password').value;
  if (!name || !email || !pass) { toast('Preencha todos os campos.', 'error'); return; }
  if (pass.length < 6) { toast('Senha deve ter pelo menos 6 caracteres.', 'error'); return; }
  var btn = document.getElementById('btn-do-register');
  btn.textContent = 'Criando...';
  btn.disabled = true;
  sb.auth.signUp({
    email: email,
    password: pass,
    options: { data: { name: name, role: 'visitante' } }
  }).then(function(res) {
    btn.textContent = 'Criar conta';
    btn.disabled = false;
    if (res.error) { toast(res.error.message, 'error'); return; }
    // Criar perfil manualmente (garante que existe mesmo sem trigger)
    var userId = res.data && res.data.user ? res.data.user.id : null;
    if (userId) {
      sb.from('profiles').upsert({ id: userId, name: name, email: email, role: 'visitante' }).then(function() {});
    }
    document.getElementById('register-modal').classList.add('hidden');
    // Se sessao ja criada (email confirm desativado no Supabase), loga direto
    if (res.data && res.data.session) {
      toast('Conta criada! Bem-vindo(a), ' + name + '!', 'success');
      loadApp(res.data.user);
    } else {
      // Tenta logar direto (caso email confirm esteja desligado mas sessao nao veio)
      sb.auth.signInWithPassword({ email: email, password: pass }).then(function(loginRes) {
        if (loginRes.error) {
          // Email confirm esta ativo - mostrar modal explicativo
          document.getElementById('email-confirm-modal').classList.remove('hidden');
          document.getElementById('email-confirm-addr').textContent = email;
        } else {
          toast('Conta criada! Bem-vindo(a), ' + name + '!', 'success');
          loadApp(loginRes.data.user);
        }
      });
    }
  });
});

document.getElementById('btn-logout').addEventListener('click', function(e) {
  e.stopPropagation();
  // Se e visitante sem sessao, apenas volta para login
  if (!currentUser) {
    currentProfile = null;
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    return;
  }
  sb.auth.signOut().then(function() {
    currentUser = null;
    currentProfile = null;
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    toast('Voce saiu da conta.', 'success');
  });
});

// =============================================
// INIT
// =============================================
function initApp() {
  mostrarVersiculo();

  // Detectar ?invite= na URL - mostrar tela de convite antes do login
  var inviteToken = getInviteToken();
  var churchSlug  = getChurchSlug();

  // Salvar slug no localStorage para uso posterior
  if (churchSlug) localStorage.setItem('gca_church_slug', churchSlug);

  // Escuta mudancas de auth - captura retorno do OAuth e login normal
  sb.auth.onAuthStateChange(function(event, session) {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && session.user) {
      if (!currentUser) {
        if (window.location.hash && window.location.hash.indexOf('access_token') !== -1) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        // Se tem invite pendente, processa primeiro
        var pending = getInviteToken();
        if (pending) {
          processarInvitePendente().then(function() { loadApp(session.user); });
        } else {
          loadApp(session.user);
        }
      }
    }
    if (event === 'SIGNED_OUT') {
      currentUser = null; currentProfile = null;
      document.getElementById('app-screen').classList.add('hidden');
      document.getElementById('login-screen').style.display = 'flex';
    }
  });

  // Se tem token de convite na URL e nao esta logado -> tela de convite
  if (inviteToken) {
    sb.auth.getSession().then(function(res) {
      if (res.data && res.data.session) {
        // Ja logado: processa o invite direto
        processarInvitePendente().then(function() { loadApp(res.data.session.user); });
      } else {
        // Nao logado: mostrar tela de convite
        showInviteScreen(inviteToken);
      }
    });
    return;
  }

  // Hash de retorno OAuth
  if (window.location.hash && window.location.hash.indexOf('access_token') !== -1) {
    return; // onAuthStateChange cuida disso
  }

  // Sessao existente
  sb.auth.getSession().then(function(res) {
    if (res.data && res.data.session) {
      loadApp(res.data.session.user);
    }
  });
}

function loadApp(user) {
  currentUser = user;

  // Verificar Super Admin ANTES de qualquer coisa
  if (window.isSuperAdmin && window.isSuperAdmin(user.email)) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('onboarding-screen').style.display = 'none';
    document.getElementById('app-screen').classList.add('hidden');

    // Verificar PIN antes de mostrar painel
    if (!window.isSuperAdminPinVerified()) {
      mostrarPinSuperAdmin(user);
    } else {
      var saScreen = document.getElementById('superadmin-screen');
      saScreen.classList.add('show');
      document.getElementById('sa-user-email').textContent = user.email;
      initSuperAdmin();
    }
    return;
  }

  sb.from('profiles')
    .select('id, church_id, name, email, role, department, phone, status')
    .eq('id', user.id)
    .limit(1)
    .then(function(res) {
      if (res.data && res.data.length > 0) {
        currentProfile = res.data[0];
      } else {
        var novoNome = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user.email.split('@')[0];
        currentProfile = { id: user.id, name: novoNome, role: 'visitante', email: user.email, status: 'pending' };
        sb.from('profiles').upsert({ id: user.id, name: novoNome, email: user.email, role: 'visitante', status: 'pending' }).then(function() {});
      }

      // Sem church_id: redirecionar para onboarding
      if (!currentProfile.church_id) {
        showOnboardingBanner();
        return;
      }

      // Usuario bloqueado
      if (currentProfile.status === 'blocked') {
        showBlockedScreen();
        return;
      }

      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('app-screen').classList.remove('hidden');
      updateUserChip();
      applyRoleVisibility();

      // Carregar nome e logo da igreja no sidebar e favicon
      if (currentProfile.church_id) {
        sb.from('churches').select('name, logo_url, plan_status, plan_expires_at, plan, plan_value').eq('id', currentProfile.church_id).single().then(function(r) {
          if (!r.data) return;
          if (r.data.name) {
            var nameEl = document.getElementById('sidebar-church-name');
            if (nameEl) nameEl.textContent = r.data.name.toUpperCase();
            document.title = r.data.name + ' - Agenda';
          }
          if (r.data.logo_url) {
            var logoEl = document.querySelector('.logo-church-img');
            if (logoEl) {
              var img = document.createElement('img');
              img.src = r.data.logo_url;
              img.style.cssText = 'width:38px;height:38px;border-radius:10px;object-fit:cover;flex-shrink:0';
              img.alt = 'Logo';
              logoEl.parentNode.replaceChild(img, logoEl);
            }
            var fav = document.querySelector("link[rel~='icon']");
            if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
            fav.type = 'image/x-icon';
            fav.href = r.data.logo_url;
          }
          // Verificar status do plano (exceto super admin)
          if (!window.isSuperAdmin || !window.isSuperAdmin(currentUser.email)) {
            window.currentChurch = r.data;
            verificarStatusPlano(r.data);
            mostrarBannerPlano(r.data);
            atualizarBadgePlanoSidebar(r.data);
            setTimeout(verificarBannerConvite, 1500);
          }
        });
      }

      // Banner de aprovacao pendente para visitantes
      if (currentProfile.status === 'pending' && currentProfile.role === 'visitante') {
        showPendingBanner();
      }

      // Badge de usuarios pendentes para admin
      if (currentProfile.role === 'admin') {
        verificarPendentes();
      }

      loadServices().then(function() {
        renderCalendar();
        renderServices();
        // Processar navegação pós-login pendente (ex: vindo do onboarding "Convidar agora")
        if (window._pendingPostLogin) {
          var dest = window._pendingPostLogin;
          window._pendingPostLogin = null;
          setTimeout(function() {
            if (dest === 'convites') {
              showPageSafe('admin');
              setTimeout(function() {
                var tab = document.querySelector('[data-admin-tab="convites"]');
                if (tab) tab.click();
              }, 200);
            }
          }, 300);
        }
      });
      document.getElementById('profile-name').value = currentProfile.name || '';
      document.getElementById('profile-email').value = currentProfile.email || '';
      var phoneEl = document.getElementById('profile-phone');
      if (phoneEl) phoneEl.value = currentProfile.phone || '';
      setTimeout(carregarMeusCultos, 800);
    });
}

function showOnboardingBanner() {
  // Mostrar a tela de onboarding integrada
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').classList.add('hidden');
  if (window.showOnboarding) {
    window.showOnboarding(currentUser);
  } else {
    // Fallback: tela simples
    var div = document.createElement('div');
    div.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:40px 20px;text-align:center';
    div.innerHTML = '<div style="max-width:440px">' +
      '<div style="font-size:48px;margin-bottom:20px">&#9962;</div>' +
      '<h2 style="font-size:24px;font-weight:700;margin-bottom:12px">Configure sua Igreja</h2>' +
      '<p style="color:var(--muted);margin-bottom:28px">Sua conta foi criada! Vamos configurar a agenda da sua igreja.</p>' +
      '<button onclick="window.showOnboarding(currentUser)" style="padding:14px 28px;background:var(--accent);color:#000;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer">Comecar configuracao</button>' +
    '</div>';
    document.body.appendChild(div);
  }
}

function showOnboarding(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').classList.add('hidden');
  var os = document.getElementById('onboarding-screen');
  if (os) os.style.display = 'block';
  if (user) {
    state.user = user;
    var metaName = user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name);
    if (metaName) state.adminName = metaName;
    if (state.step === 1) goOnboardStep(2);
  }
  if (!onboardingInitialized) {
    onboardingInitialized = true;
    initOnboardingListeners();
  }
}

function hideOnboarding() {
  var os = document.getElementById('onboarding-screen');
  if (os) os.style.display = 'none';
}

function showBlockedScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  var div = document.createElement('div');
  div.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:40px 20px;text-align:center';
  div.innerHTML = '<div style="max-width:380px">' +
    '<div style="font-size:48px;margin-bottom:16px">&#128683;</div>' +
    '<h2 style="font-size:22px;font-weight:700;margin-bottom:10px">Acesso bloqueado</h2>' +
    '<p style="color:var(--muted);margin-bottom:24px">Sua conta foi bloqueada. Entre em contato com o administrador da sua igreja.</p>' +
    '<button onclick="sb.auth.signOut().then(function(){window.location.reload()})" style="padding:12px 24px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);cursor:pointer;font-size:14px">Sair</button>' +
  '</div>';
  document.body.appendChild(div);
}

function showPendingBanner() {
  var banner = document.getElementById('pending-banner');
  if (banner) { banner.style.display = 'flex'; return; }
  banner = document.createElement('div');
  banner.id = 'pending-banner';
  banner.style.cssText = 'background:rgba(245,158,11,.1);border-bottom:1px solid rgba(245,158,11,.3);' +
    'padding:12px 24px;display:flex;align-items:center;gap:12px;font-size:14px;flex-wrap:wrap;';
  banner.innerHTML = '<span style="font-size:18px">&#9203;</span>' +
    '<span><strong>Acesso pendente de aprovacao.</strong> Um administrador precisa aprovar sua conta para voce ter acesso completo.</span>' +
    '<button id="btn-dismiss-pending" style="margin-left:auto;background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px">&#10005;</button>';
  document.getElementById('main-content').prepend(banner);
  document.getElementById('btn-dismiss-pending').addEventListener('click', function() {
    banner.style.display = 'none';
  });
}

function verificarPendentes() {
  if (!currentProfile.church_id) return;
  sb.from('profiles')
    .select('id', { count: 'exact' })
    .eq('church_id', currentProfile.church_id)
    .eq('status', 'pending')
    .then(function(res) {
      var count = res.count || 0;
      if (count === 0) return;
      // Mostrar badge no menu de Usuarios
      var adminBtn = document.querySelector('.nav-item[data-page="admin"]');
      if (adminBtn && !adminBtn.querySelector('.nav-badge')) {
        var badge = document.createElement('span');
        badge.className = 'nav-badge';
        badge.id = 'pendentes-badge';
        badge.textContent = count;
        adminBtn.appendChild(badge);
      }
    });
}

function updateUserChip() {
  var p = currentProfile;
  var name = p.name || 'Visitante';
  var parts = name.split(' ');
  var initials = parts.slice(0, 2).map(function(w) { return w[0]; }).join('').toUpperCase();
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('user-name-chip').textContent = name;
  var roleEl = document.getElementById('user-role-chip');
  roleEl.textContent = roleLabel(p.role);
  roleEl.className = 'user-role';
  // cor do role no chip
  var roleColors = { admin: 'color:var(--accent)', lider: 'color:var(--accent2)', voluntario: 'color:var(--green)', visitante: 'color:var(--muted)' };
  roleEl.style.cssText = roleColors[p.role] || '';
}

function applyRoleVisibility() {
  var r = currentProfile.role;

  // Esconder/mostrar itens do menu lateral
  document.querySelectorAll('.admin-only').forEach(function(el) {
    el.style.display = (r === 'admin') ? '' : 'none';
  });
  document.querySelectorAll('.lider-only').forEach(function(el) {
    el.style.display = (r === 'lider' || r === 'admin') ? '' : 'none';
  });
  document.querySelectorAll('.pastor-only').forEach(function(el) {
    el.style.display = (r === 'pastor' || r === 'admin') ? '' : 'none';
  });

  // Botao de novo culto na topbar (so admin)
  var actions = document.getElementById('topbar-actions');
  if (r === 'admin') {
    actions.innerHTML = '<button class="btn btn-primary btn-sm" id="topbar-add-btn">+ Novo Culto</button>';
    (document.getElementById('topbar-add-btn')||{addEventListener:function(){}}).addEventListener('click', openNewServiceModal);
  } else {
    actions.innerHTML = '';
  }

  // Role no user modal (admin pode mudar, lider nao)
  var adminOnlyFields = document.querySelectorAll('.admin-only-field');
  adminOnlyFields.forEach(function(el) {
    el.style.display = (r === 'admin') ? '' : 'none';
  });

  // Redirecionar pagina se sem permissao
  var paginaAtiva = document.querySelector('.page.active');
  if (paginaAtiva) {
    var idPagina = paginaAtiva.id;
    if (idPagina === 'page-admin' && r !== 'admin') showPageSafe('agenda');
    if (idPagina === 'page-my-team' && r !== 'lider' && r !== 'admin') showPageSafe('agenda');
    if (idPagina === 'page-sermao' && r !== 'pastor' && r !== 'admin') showPageSafe('agenda');
  }
}

// Navegacao segura com verificacao de permissao
function showPageSafe(page) {
  var r = currentProfile ? currentProfile.role : 'visitante';
  if (page === 'admin' && r !== 'admin') {
    toast('Acesso restrito a administradores.', 'error'); page = 'agenda';
  }
  if (page === 'my-team' && r !== 'lider' && r !== 'admin') {
    toast('Acesso restrito a lideres.', 'error'); page = 'agenda';
  }
  if (page === 'sermao' && r !== 'pastor' && r !== 'admin') {
    toast('Acesso restrito a pastores.', 'error'); page = 'agenda';
  }

  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });

  var pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  var navBtn = document.querySelector('.nav-item[data-page="' + page + '"]');
  if (navBtn) navBtn.classList.add('active');

  var titles = { agenda: 'Agenda', proximos: 'Proximos Cultos',
    'my-team': 'Minha Equipe', admin: 'Administracao',
    sermao: 'Gerador de Esbocos', profile: 'Meu Perfil' };
  document.getElementById('page-title').textContent = titles[page] || '';

  if (page === 'proximos') renderServiceCards(allServices.filter(function(s) {
    return s.date >= new Date().toISOString().slice(0,10);
  }).slice(0,20), 'upcoming-list');

  if (page === 'my-team') {
    var hoje2 = new Date().toISOString().slice(0,10);
    var pr = currentProfile.role;
    var liderDash = document.getElementById('lider-dash');
    if (liderDash) liderDash.style.display = (pr === 'lider' || pr === 'admin') ? 'block' : 'none';
    if (pr === 'lider' || pr === 'admin') {
      var mesEl = document.getElementById('lider-dash-mes');
      var anoEl = document.getElementById('lider-dash-ano');
      if (mesEl) mesEl.value = new Date().getMonth() + 1;
      if (anoEl) anoEl.value = new Date().getFullYear();
      carregarLiderDash();
      document.getElementById('btn-lider-dash-load').onclick = carregarLiderDash;
    }
    renderServiceCards(allServices.filter(function(s) { return s.date >= hoje2; }).slice(0,20), 'my-team-list');
  }
  if (page === 'admin') renderAdminServices();
  if (page === 'sermao') initSermao();

  toggleSidebar(true);
}

// =============================================
// DATA
// =============================================
function loadServices() {
  if (!currentProfile || !currentProfile.church_id) { allServices = []; return Promise.resolve(); }
  return sb.from('services')
    .select('*, service_teams(*)')
    .eq('church_id', currentProfile.church_id)
    .order('date', { ascending: true })
    .then(function(res) {
      if (res.error) { console.error(res.error); return; }
      allServices = res.data || [];
    });
}

function servicesForMonth(year, month) {
  return allServices.filter(function(s) {
    var d = new Date(s.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

// =============================================

// =============================================
// PIN DE ACESSO SUPER ADMIN
// =============================================
function mostrarPinSuperAdmin(user) {
  var old = document.getElementById('sa-pin-screen');
  if (old) old.remove();

  var div = document.createElement('div');
  div.id = 'sa-pin-screen';
  div.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  div.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:40px 32px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)">' +
      '<div style="font-size:40px;margin-bottom:16px">&#128274;</div>' +
      '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:24px;letter-spacing:2px;margin-bottom:6px">ACESSO RESTRITO</div>' +
      '<p style="font-size:13px;color:var(--muted);margin-bottom:28px">Digite o PIN para acessar o painel administrativo.</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px" id="sa-pin-dots">' +
        '<div style="width:14px;height:14px;border-radius:50%;border:2px solid var(--border);background:transparent" id="dot-0"></div>' +
        '<div style="width:14px;height:14px;border-radius:50%;border:2px solid var(--border);background:transparent" id="dot-1"></div>' +
        '<div style="width:14px;height:14px;border-radius:50%;border:2px solid var(--border);background:transparent" id="dot-2"></div>' +
        '<div style="width:14px;height:14px;border-radius:50%;border:2px solid var(--border);background:transparent" id="dot-3"></div>' +
      '</div>' +
      '<input type="password" id="sa-pin-input" maxlength="4" inputmode="numeric" pattern="[0-9]*" ' +
        'style="width:100%;padding:14px;background:var(--surface2);border:2px solid var(--border);border-radius:12px;' +
        'color:var(--text);font-size:24px;text-align:center;letter-spacing:8px;font-family:monospace;margin-bottom:16px" ' +
        'placeholder="••••"/>' +
      '<div id="sa-pin-error" style="color:var(--red);font-size:13px;margin-bottom:12px;min-height:20px"></div>' +
      '<button id="sa-pin-btn" style="width:100%;background:var(--accent);color:#000;border:none;padding:14px;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer">Acessar</button>' +
      '<button id="sa-pin-logout" style="width:100%;background:transparent;border:none;color:var(--muted);padding:10px;font-size:13px;cursor:pointer;margin-top:8px">Sair da conta</button>' +
    '</div>';

  document.body.appendChild(div);

  var input = document.getElementById('sa-pin-input');
  var btn   = document.getElementById('sa-pin-btn');
  var err   = document.getElementById('sa-pin-error');

  // Atualizar dots conforme digita
  input.addEventListener('input', function() {
    var len = this.value.length;
    for (var i = 0; i < 4; i++) {
      var dot = document.getElementById('dot-' + i);
      if (dot) {
        dot.style.background = i < len ? 'var(--accent)' : 'transparent';
        dot.style.borderColor = i < len ? 'var(--accent)' : 'var(--border)';
      }
    }
    err.textContent = '';
    // Auto-submit com 4 dígitos
    if (len === 4) verificarPin();
  });

  function verificarPin() {
    var pin = input.value;
    if (pin === window.SUPER_ADMIN_PIN) {
      window.setSuperAdminPinVerified();
      div.remove();
      var saScreen = document.getElementById('superadmin-screen');
      saScreen.classList.add('show');
      document.getElementById('sa-user-email').textContent = user.email;
      initSuperAdmin();
    } else {
      err.textContent = 'PIN incorreto. Tente novamente.';
      input.value = '';
      // Resetar dots
      for (var i = 0; i < 4; i++) {
        var dot = document.getElementById('dot-' + i);
        if (dot) { dot.style.background = 'transparent'; dot.style.borderColor = 'var(--border)'; }
      }
      input.style.borderColor = 'var(--red)';
      setTimeout(function() { input.style.borderColor = 'var(--border)'; input.focus(); }, 800);
    }
  }

  btn.addEventListener('click', verificarPin);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') verificarPin(); });
  document.getElementById('sa-pin-logout').addEventListener('click', function() {
    sb.auth.signOut().then(function() { window.location.reload(); });
  });

  setTimeout(function() { input.focus(); }, 100);
}

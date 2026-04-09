// ONBOARDING JS (integrado)
// =============================================
var CULTOS_OPTIONS_OB = [
  { key: 'culto-familia-sede-09', name: 'Culto da Familia', time: 'Domingo 09:00', location: 'SEDE', color: '#f59e0b' },
  { key: 'culto-familia-sede-18', name: 'Culto da Familia', time: 'Domingo 18:00', location: 'SEDE', color: '#f97316' },
  { key: 'segunda-nao-pare',      name: 'Segunda Nao Pare', time: 'Segunda 19:30', location: 'SEDE', color: '#06b6d4' },
  { key: 'tarde-com-deus',        name: 'Tarde com Deus',   time: 'Terca 14:30',  location: 'SEDE', color: '#ec4899' },
  { key: 'quarta-oracao',         name: 'Quarta de Oracao', time: 'Quarta 19:30', location: 'SEDE', color: '#10b981' },
  { key: 'quinta-vitoria',        name: 'Quinta da Vitoria',time: 'Quinta 19:30', location: 'SEDE', color: '#6366f1' },
  { key: 'next-level',            name: 'Next Level',       time: 'Sabado 20:00', location: 'SEDE', color: '#ef4444' },
  { key: 'culto-casais',          name: 'Culto de Casais',  time: 'Mensal',       location: 'SEDE', color: '#e11d48' },
  { key: 'get-men',               name: 'GET Men',          time: 'Mensal',       location: 'SEDE', color: '#1d4ed8' },
];

var obState = {
  step: 1, user: null, adminName: '', churchName: '',
  churchCity: '', churchState: '', slug: '',
  logoFile: null, logoUrl: null, cultosSelected: [], churchId: null,
};

// =============================================
// EMAILJS - Email de boas-vindas ao admin
// =============================================
// Configure em https://www.emailjs.com:
// 1. Crie conta gratuita
// 2. Conecte seu email (Gmail etc)
// 3. Crie um template com as variaveis abaixo
// 4. Substitua os IDs abaixo
var EMAILJS_SERVICE_ID  = 'SEU_SERVICE_ID';   // ex: service_abc123
var EMAILJS_TEMPLATE_ID = 'SEU_TEMPLATE_ID';  // ex: template_xyz456
var EMAILJS_PUBLIC_KEY  = 'SUA_PUBLIC_KEY';   // ex: user_abc...

function enviarEmailBoasVindas() {
  if (!obState.user || !obState.user.email) return;
  if (EMAILJS_SERVICE_ID === 'SEU_SERVICE_ID') return; // nao configurado

  if (typeof emailjs === 'undefined') return;
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  var churchSlug = obState.slug || '';
  var link = window.location.origin + '/' + churchSlug;

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email:     obState.user.email,
    to_name:      obState.adminName || 'Administrador',
    church_name:  obState.churchName,
    church_slug:  churchSlug,
    access_link:  link,
    year:         new Date().getFullYear(),
  }).then(function() {
    console.log('Email de boas-vindas enviado!');
  }).catch(function(err) {
    console.warn('Erro ao enviar email:', err);
  });
}

function toastOnboard_ob(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = '<span>' + (type==='error' ? '&#10060;' : '&#9989;') + '</span><span>' + msg + '</span>';
  el.className = 'show ' + (type || 'success');
  setTimeout(function() { el.className = ''; }, 4000);
}

function goOnboardStep(n) {
  for (var i = 1; i <= 4; i++) {
    var el = document.getElementById('step-' + i);
    if (el) el.style.display = (i === n) ? 'block' : 'none';
    var item = document.getElementById('step-item-' + i);
    if (item) item.className = 'step-item' + (i < n ? ' done' : i === n ? ' active' : '');
  }
  obState.step = n;
  var os = document.getElementById('onboarding-screen');
  if (os) os.scrollTo({ top: 0, behavior: 'smooth' });
}

function setProgress(pct, label) {
  var f = document.getElementById('progress-fill');
  var l = document.getElementById('progress-label');
  if (f) f.style.width = pct + '%';
  if (l) l.textContent = label;
}

function fmtDateOb(dt) {
  return dt.getFullYear() + '-' +
    String(dt.getMonth()+1).padStart(2,'0') + '-' +
    String(dt.getDate()).padStart(2,'0');
}

function gerarCultos2026() {
  var cultos = [];
  var ano = 2026;
  var META = {
    'culto-familia-sede-09': { title:'Culto da Familia', location:'SEDE', time:'09:00:00', color:'#f59e0b', dow:0, rec:'weekly' },
    'culto-familia-sede-18': { title:'Culto da Familia', location:'SEDE', time:'18:00:00', color:'#f97316', dow:0, rec:'weekly' },
    'segunda-nao-pare':      { title:'Segunda Nao Pare', location:'SEDE', time:'19:30:00', color:'#06b6d4', dow:1, rec:'weekly' },
    'tarde-com-deus':        { title:'Tarde com Deus',   location:'SEDE', time:'14:30:00', color:'#ec4899', dow:2, rec:'weekly' },
    'quarta-oracao':         { title:'Quarta de Oracao', location:'SEDE', time:'19:30:00', color:'#10b981', dow:3, rec:'weekly' },
    'quinta-vitoria':        { title:'Quinta da Vitoria',location:'SEDE', time:'19:30:00', color:'#6366f1', dow:4, rec:'weekly' },
    'next-level':            { title:'Next Level',       location:'SEDE', time:'20:00:00', color:'#ef4444', dow:6, rec:'weekly' },
    'culto-casais':          { title:'Culto de Casais',  location:'SEDE', time:'19:30:00', color:'#e11d48', dow:5, rec:'monthly' },
    'get-men':               { title:'GET Men',          location:'SEDE', time:'20:00:00', color:'#1d4ed8', dow:6, rec:'monthly' },
  };
  var dt = new Date(ano, 0, 1);
  var end = new Date(ano, 11, 31);
  while (dt <= end) {
    var dow = dt.getDay();
    var ds = fmtDateOb(dt);
    obState.cultosSelected.forEach(function(key) {
      var m = META[key]; if (!m) return;
      if (m.rec === 'weekly' && dow === m.dow) {
        cultos.push({ church_id: obState.churchId, service_type_key: key, title: m.title,
          location: m.location, date: ds, time: m.time, color: m.color, status: 'scheduled', created_by: obState.user.id });
      }
      if (m.rec === 'monthly' && dow === m.dow) {
        var first = new Date(dt.getFullYear(), dt.getMonth(), 1);
        var diff = (m.dow - first.getDay() + 7) % 7;
        var fo = new Date(dt.getFullYear(), dt.getMonth(), 1 + diff);
        if (dt.getDate() === fo.getDate()) {
          cultos.push({ church_id: obState.churchId, service_type_key: key, title: m.title,
            location: m.location, date: ds, time: m.time, color: m.color, status: 'scheduled', created_by: obState.user.id });
        }
      }
    });
    dt.setDate(dt.getDate() + 1);
  }
  if (!cultos.length) return Promise.resolve();
  var chunks = [];
  for (var i = 0; i < cultos.length; i += 100) chunks.push(cultos.slice(i, i+100));
  var p = Promise.resolve();
  chunks.forEach(function(c) { p = p.then(function() { return sb.from('services').insert(c); }); });
  return p;
}

function renderCultosAdicionados() {
  var container = document.getElementById('cultos-adicionados');
  if (!container) return;
  if (!obState.cultosSelected.length) {
    container.innerHTML = '<p style="font-size:13px;color:var(--muted);text-align:center;padding:12px">Nenhum culto adicionado ainda.</p>';
    return;
  }
  container.innerHTML = obState.cultosSelected.map(function(c, i) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px">' +
      '<div style="width:10px;height:10px;border-radius:50%;background:' + c.cor + ';flex-shrink:0"></div>' +
      '<div style="flex:1">' +
        '<div style="font-weight:600;font-size:14px">' + c.nome + '</div>' +
        '<div style="font-size:12px;color:var(--muted)">' + (c.label || c.recLabel || '') + ' &bull; ' + c.hora + ' &bull; ' + c.local + '</div>' +
      '</div>' +
      '<button onclick="removerCultoOb(' + i + ')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:4px">&#10005;</button>' +
    '</div>';
  }).join('');
}

function removerCultoOb(idx) {
  obState.cultosSelected.splice(idx, 1);
  renderCultosAdicionados();
}

function gerarCultosDinamico() {
  var cultos = [];
  var ano = 2026;
  obState.cultosSelected.forEach(function(c) {
    var dt = new Date(ano, 0, 1);
    var end = new Date(ano, 11, 31);
    var key = c.nome.toLowerCase().replace(/[^a-z0-9]/g,'-').slice(0,30) + '-' + c.dow;
    while (dt <= end) {
      var dow = dt.getDay();
      var ds = dt.getFullYear() + '-' +
        String(dt.getMonth()+1).padStart(2,'0') + '-' +
        String(dt.getDate()).padStart(2,'0');
      var add = false;
      if (c.recType === 'weekly' && dow === c.dow) {
        add = true;
      } else if (c.recType === 'monthly' && dow === c.dow) {
        var first = new Date(dt.getFullYear(), dt.getMonth(), 1);
        var diff = (c.dow - first.getDay() + 7) % 7;
        var nthDate = 1 + diff + (c.weekNum - 1) * 7;
        if (dt.getDate() === nthDate) add = true;
      }
      if (add) {
        cultos.push({
          church_id: obState.churchId,
          service_type_key: key,
          title: c.nome,
          location: c.local,
          date: ds,
          time: c.hora + ':00',
          color: c.cor,
          status: 'scheduled',
          created_by: obState.user.id,
        });
      }
      dt.setDate(dt.getDate() + 1);
    }
  });
  if (!cultos.length) return Promise.resolve();
  var chunks = [];
  for (var i = 0; i < cultos.length; i += 100) chunks.push(cultos.slice(i, i+100));
  var p = Promise.resolve();
  chunks.forEach(function(chunk) { p = p.then(function() { return sb.from('services').insert(chunk); }); });
  return p;
}

function criarIgreja() {
  setProgress(10, 'Verificando autenticacao...');
  if (!obState.user) { toastOnboard_ob('Sessao expirada.', 'error'); goOnboardStep(1); return; }

  var uploadP = Promise.resolve(null);
  if (obState.logoFile) {
    setProgress(20, 'Enviando logo...');
    var fn = 'church-logos/' + obState.user.id + '-' + Date.now();
    uploadP = sb.storage.from('public').upload(fn, obState.logoFile, { upsert: true }).then(function(r) {
      if (r.error) return null;
      return sb.storage.from('public').getPublicUrl(fn).data.publicUrl;
    });
  }

  uploadP.then(function(logoUrl) {
    obState.logoUrl = logoUrl;
    setProgress(35, 'Criando sua igreja...');
    // Criar igreja e perfil admin diretamente (sem RPC)
    var adminName = obState.adminName || obState.user.email.split('@')[0];
    var userId    = obState.user.id;

    // Gerar slug unico
    var slug = obState.slug.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40);

    // 1. Verificar se slug existe e gerar unico
    function tentarInserirIgreja(slugTentativa, tentativa) {
      return sb.from('churches').insert({
        name:     obState.churchName,
        slug:     slugTentativa,
        city:     obState.churchCity || '',
        state:    obState.churchState || '',
        owner_id: userId,
        plan:     'free',
        active:   true,
        whatsapp: obState.churchWhatsapp || null
      }).select('id, slug').single().then(function(r) {
        if (r.error) {
          // Slug duplicado - tentar com sufixo
          if (r.error.code === '23505' && tentativa < 5) {
            var novoSlug = slug + '-' + Math.random().toString(36).slice(2,6);
            return tentarInserirIgreja(novoSlug, tentativa + 1);
          }
          throw new Error(r.error.message);
        }
        return r;
      });
    }
    return tentarInserirIgreja(slug, 0).then(function(r) {
      if (r.error) throw new Error(r.error.message);
      var churchId   = r.data.id;
      obState.churchId = churchId;
      obState.slug     = r.data.slug;

        // 2. Criar/atualizar perfil do admin
        return sb.from('profiles').upsert({
        id:        userId,
        church_id: churchId,
        name:      adminName,
        email:     obState.user.email,
        role:      'admin',
        status:    'approved'
      }, { onConflict: 'id' }).then(function(pr) {
        if (pr.error) throw new Error(pr.error.message);
        return { data: { church_id: churchId, slug: r.data.slug, success: true }, error: null };
      });
    });
  }).then(function() {
    // church_id e slug já setados no INSERT
    localStorage.setItem('gca_church_slug', obState.slug);
    if (obState.logoUrl && obState.churchId) {
      return sb.from('churches').update({ logo_url: obState.logoUrl }).eq('id', obState.churchId);
    }
  }).then(function() {
    setProgress(60, 'Criando cultos...');
    return obState.cultosSelected.length > 0 ? gerarCultosDinamico() : Promise.resolve();
  }).then(function() {
    setProgress(90, 'Finalizando...'); return new Promise(function(r) { setTimeout(r, 800); });
  }).then(function() {
    setProgress(100, 'Tudo pronto!');
    setTimeout(function() {
      document.getElementById('step-4').style.display = 'none';
      document.getElementById('success-screen').style.display = 'block';
      var si4 = document.getElementById('step-item-4');
      if (si4) si4.className = 'step-item done';

      // Enviar email de boas-vindas via EmailJS
      enviarEmailBoasVindas();
    }, 600);
  }).catch(function(err) {
    toastOnboard_ob('Erro: ' + err.message, 'error');
    console.error(err);
    goOnboardStep(3);
  });
}

function renderCultosOb() {
  var grid = document.getElementById('cultos-grid');
  if (!grid) return;
  grid.innerHTML = CULTOS_OPTIONS_OB.map(function(c) {
    var ck = obState.cultosSelected.indexOf(c.key) !== -1;
    return '<label class="culto-check' + (ck?' checked':'') + '" data-key="' + c.key + '">' +
      '<input type="checkbox" value="' + c.key + '"' + (ck?' checked':'') + '/>' +
      '<div class="culto-dot" style="background:' + c.color + '"></div>' +
      '<div class="culto-info"><div class="name">' + c.name + '</div><div class="time">' + c.time + ' &bull; ' + c.location + '</div></div>' +
    '</label>';
  }).join('');
  grid.querySelectorAll('.culto-check').forEach(function(el) {
    el.addEventListener('click', function() {
      var key = this.getAttribute('data-key');
      var cb = this.querySelector('input[type=checkbox]');
      var idx = obState.cultosSelected.indexOf(key);
      if (idx === -1) { obState.cultosSelected.push(key); cb.checked = true; this.classList.add('checked'); }
      else { obState.cultosSelected.splice(idx,1); cb.checked = false; this.classList.remove('checked'); }
    });
  });
}

var onboardingInitialized = false;

function showOnboarding(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').classList.add('hidden');
  var os = document.getElementById('onboarding-screen');
  if (os) os.style.display = 'block';
  if (user) {
    obState.user = user;
    var mn = user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name);
    if (mn) obState.adminName = mn;
    if (obState.step === 1) goOnboardStep(2);
  }
  // Capturar access token para chamadas diretas à API
  sb.auth.getSession().then(function(r) {
    if (r.data && r.data.session) {
      obState.accessToken = r.data.session.access_token;
    }
  });
  if (!onboardingInitialized) { onboardingInitialized = true; initOnboardingListeners(); }
}

function hideOnboarding() {
  var os = document.getElementById('onboarding-screen');
  if (os) os.style.display = 'none';
}

function initOnboardingListeners() {
  // Google no onboarding
  var btnG = document.getElementById('btn-google');
  if (btnG) btnG.addEventListener('click', function() {
    var b = this; b.disabled = true; b.style.opacity = '.6';
    sb.auth.signInWithOAuth({ provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    }).then(function(r) { if (r.error) { toastOnboard_ob(r.error.message,'error'); b.disabled=false; b.style.opacity='1'; } });
  });

  // Email/senha no onboarding
  var btnCriar = document.getElementById('btn-criar-conta');
  if (btnCriar) btnCriar.addEventListener('click', function() {
    var name  = document.getElementById('admin-name').value.trim();
    var email = document.getElementById('admin-email').value.trim();
    var pass  = document.getElementById('admin-pass').value;
    if (!name||!email||!pass) { toastOnboard_ob('Preencha todos os campos.','error'); return; }
    if (pass.length < 6) { toastOnboard_ob('Senha min. 6 caracteres.','error'); return; }
    var b = this; b.disabled = true; b.textContent = 'Criando...';
    sb.auth.signUp({ email:email, password:pass, options:{data:{name:name}} }).then(function(r) {
      b.disabled = false; b.textContent = 'Criar conta e continuar';
      if (r.error) { toastOnboard_ob(r.error.message,'error'); return; }
      obState.user = r.data.user; obState.adminName = name;
      if (r.data.session) {
        obState.accessToken = r.data.session.access_token;
        goOnboardStep(2);
      }
      else {
        sb.auth.signInWithPassword({email:email,password:pass}).then(function(lr) {
          if (lr.data&&lr.data.user) {
            obState.user=lr.data.user;
            if (lr.data.session) obState.accessToken = lr.data.session.access_token;
            goOnboardStep(2);
          } else { toastOnboard_ob('Conta criada! Faca login.','success'); }
        });
      }
    });
  });

  // Step 2: nome da igreja
  var nameInput = document.getElementById('church-name');
  if (nameInput) nameInput.addEventListener('input', function() {
    var slug = this.value.trim().toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,30);
    obState.slug = slug;
    var prev = document.getElementById('slug-preview');
    var sv = document.getElementById('slug-val');
    if (prev) prev.style.display = slug ? 'block' : 'none';
    if (sv) sv.textContent = slug;
  });

  // Logo upload
  var logoInp = document.getElementById('logo-input');
  if (logoInp) logoInp.addEventListener('change', function() {
    var file = this.files[0]; if (!file) return;
    if (file.size > 2*1024*1024) { toastOnboard_ob('Logo max 2MB.','error'); return; }
    obState.logoFile = file;
    var reader = new FileReader();
    reader.onload = function(e) {
      var prev = document.getElementById('logo-preview');
      var ph = document.getElementById('logo-placeholder');
      if (prev) { prev.src = e.target.result; prev.style.display = 'block'; }
      if (ph) ph.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  // Step 2 continuar
  // CEP auto-preenchimento via ViaCEP
  function buscarCEP(cep) {
    cep = cep.replace(/[^0-9]/g, '');
    if (cep.length !== 8) {
      var st = document.getElementById('cep-status');
      if (st) { st.textContent = 'CEP invalido — informe 8 digitos.'; st.style.color = 'var(--red)'; st.style.display = 'block'; }
      return;
    }
    var st = document.getElementById('cep-status');
    if (st) { st.textContent = 'Buscando...'; st.style.color = 'var(--muted)'; st.style.display = 'block'; }
    fetch('https://viacep.com.br/ws/' + cep + '/json/')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.erro) {
          if (st) { st.textContent = 'CEP nao encontrado.'; st.style.color = 'var(--red)'; }
          return;
        }
        var cityEl  = document.getElementById('church-city');
        var stateEl = document.getElementById('church-state');
        var addrEl  = document.getElementById('church-address');
        var addrGrp = document.getElementById('church-address-group');
        if (cityEl)  cityEl.value  = data.localidade || '';
        if (stateEl) stateEl.value = data.uf || '';
        if (addrEl && data.logradouro) {
          addrEl.value = data.logradouro + (data.bairro ? ' - ' + data.bairro : '');
          if (addrGrp) addrGrp.style.display = 'block';
        }
        if (st) { st.textContent = '✓ ' + (data.localidade||'') + ' — ' + (data.uf||''); st.style.color = 'var(--green)'; }
      })
      .catch(function() {
        if (st) { st.textContent = 'Erro ao buscar CEP. Preencha manualmente.'; st.style.color = 'var(--red)'; }
      });
  }

  var btnCep = document.getElementById('btn-buscar-cep');
  if (btnCep) btnCep.addEventListener('click', function() {
    buscarCEP((document.getElementById('church-cep').value || ''));
  });

  // Buscar automaticamente ao digitar 8 dígitos
  var inpCep = document.getElementById('church-cep');
  if (inpCep) {
    inpCep.addEventListener('input', function() {
      // Formatar CEP com hífen
      var v = this.value.replace(/[^0-9]/g, '');
      if (v.length > 5) v = v.slice(0,5) + '-' + v.slice(5,8);
      this.value = v;
      if (v.replace('-','').length === 8) buscarCEP(v);
    });
  }

  var btnS2 = document.getElementById('btn-step2');
  if (btnS2) btnS2.addEventListener('click', function() {
    obState.churchName     = (document.getElementById('church-name')||{}).value || '';
    obState.churchCity     = (document.getElementById('church-city')||{}).value || '';
    obState.churchState    = ((document.getElementById('church-state')||{}).value || '').toUpperCase();
    obState.churchWhatsapp = ((document.getElementById('church-whatsapp')||{}).value || '').replace(/[^0-9]/g,'');
    if (!obState.churchName.trim()) { toastOnboard_ob('Informe o nome da igreja.','error'); return; }
    if (!obState.churchWhatsapp || obState.churchWhatsapp.length < 10) {
      toastOnboard_ob('Informe o WhatsApp do responsavel (com DDD).','error'); return;
    }
    if (!obState.slug) obState.slug = obState.churchName.toLowerCase().replace(/[^a-z0-9]/g,'-').slice(0,30);
    renderCultosOb();
    goOnboardStep(3);
  });

  // Voltar step 2 no novo botão
  var btnBackS3 = document.getElementById('btn-back-step2-s3');
  if (btnBackS3) btnBackS3.addEventListener('click', function() { goOnboardStep(2); });

  // Adicionar culto dinamicamente
  var btnAddCulto = document.getElementById('btn-add-culto');
  if (btnAddCulto) btnAddCulto.addEventListener('click', function() {
    var nome = (document.getElementById('nc-nome').value || '').trim();
    var rec  = document.getElementById('nc-rec').value;
    var hora = document.getElementById('nc-hora').value || '19:00';
    var local = (document.getElementById('nc-local').value || '').trim() || 'Sede';
    var cor  = document.getElementById('nc-cor').value || '#f59e0b';
    if (!nome) { document.getElementById('nc-nome').focus(); return; }

    var parts = rec.split('-'); // ex: weekly-0 ou monthly-1-5
    var recType = parts[0]; // weekly | monthly
    var week = parts[1];    // numero da semana (para monthly) ou dow (weekly)
    var dow  = parts.length > 2 ? parseInt(parts[2]) : parseInt(parts[1]);

    var diasPT = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
    var recLabel = recType === 'weekly'
      ? 'Toda ' + diasPT[dow]
      : (week === '1' ? '1o/1a ' : '2o/2a ') + diasPT[dow];

    var culto = { nome: nome, rec: rec, recType: recType, dow: dow,
                  weekNum: parseInt(week||1), hora: hora, local: local, cor: cor,
                  label: recLabel, recLabel: recLabel };
    obState.cultosSelected.push(culto);
    renderCultosAdicionados();
    document.getElementById('nc-nome').value = '';
    document.getElementById('step3-alert').style.display = 'none';
  });

  // Step 3 criar
  var btnS3 = document.getElementById('btn-step3');
  if (btnS3) btnS3.addEventListener('click', function() {
    if (!obState.cultosSelected.length) {
      document.getElementById('step3-alert').style.display = 'block'; return;
    }
    goOnboardStep(4); criarIgreja();
  });

  // Btn ir para agenda
  var btnIr = document.getElementById('btn-ir-agenda');
  if (btnIr) btnIr.addEventListener('click', function() {
    hideOnboarding();
    if (obState.user) loadApp(obState.user);
  });

  // Btn convidar agora (success screen)
  var btnConvidar = document.getElementById('btn-convidar-agora');
  if (btnConvidar) btnConvidar.addEventListener('click', function() {
    hideOnboarding();
    if (obState.user) {
      // Seta flag para navegar para convites após app carregar
      window._pendingPostLogin = 'convites';
      loadApp(obState.user);
    }
  });

  // Botoes voltar
  document.querySelectorAll('[onclick="goStep(1)"]').forEach(function(b){ b.removeAttribute('onclick'); b.addEventListener('click', function(){ goOnboardStep(1); }); });
  document.querySelectorAll('[onclick="goStep(2)"]').forEach(function(b){ b.removeAttribute('onclick'); b.addEventListener('click', function(){ goOnboardStep(2); }); });
}


// =============================================

// SUPER ADMIN
// =============================================
var SUPER_ADMIN_EMAIL = 'getprojection@gmail.com';
var saEditingChurchId = null;

function initSuperAdmin() {
  document.getElementById('btn-sa-logout').addEventListener('click', function() {
    sb.auth.signOut().then(function() { window.location.reload(); });
  });
  document.getElementById('btn-sa-refresh').addEventListener('click', carregarChurches);
  document.getElementById('sa-filter-status').addEventListener('change', carregarChurches);

  // Modal editar
  document.getElementById('btn-sa-edit-close').addEventListener('click', function() {
    var _m = document.getElementById('sa-edit-modal');
    _m.classList.add('hidden'); _m.style.display = '';
  });
  document.getElementById('btn-sa-edit-cancel').addEventListener('click', function() {
    var _m = document.getElementById('sa-edit-modal');
    _m.classList.add('hidden'); _m.style.display = '';
  });
  document.getElementById('btn-sa-edit-save').addEventListener('click', salvarEdicaoSA);

  carregarChurches();
}

function carregarChurches() {
  var tbody = document.getElementById('sa-churches-body');
  tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--muted)">Carregando...</td></tr>';

  var filtroStatus = document.getElementById('sa-filter-status').value;

  // Buscar igrejas e admins diretamente (sem RPC para evitar cache)
  sb.from('churches').select('*').order('created_at', { ascending: false })
  .then(function(res) {
    if (res.error) { tbody.innerHTML = '<tr><td colspan="11" style="color:var(--red);padding:20px">' + res.error.message + '</td></tr>'; return; }
    var churches = res.data || [];
    if (filtroStatus) churches = churches.filter(function(c){ return c.plan_status === filtroStatus; });

    if (!churches.length) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--muted)">Nenhuma igreja cadastrada ainda.</td></tr>';
      // Zerar stats
      ['sa-total-churches','sa-active-churches','sa-overdue-churches','sa-total-users'].forEach(function(id){
        var el = document.getElementById(id); if(el) el.textContent = '0';
      });
      var mrr = document.getElementById('sa-mrr'); if(mrr) mrr.textContent = 'R$0';
      return;
    }

    // Buscar contagens de users e services por igreja
    Promise.all([
      sb.from('profiles').select('church_id'),
      sb.from('services').select('church_id')
    ]).then(function(counts) {
      var profiles = counts[0].data || [];
      var services = counts[1].data || [];

      var lista = churches.map(function(c) {
        var uCount = profiles.filter(function(p){ return p.church_id === c.id; }).length;
        var sCount = services.filter(function(s){ return s.church_id === c.id; }).length;
        return Object.assign({}, c, { user_count: uCount, service_count: sCount, owner_email: '-' });
      });

      // Buscar emails dos admins
      sb.from('profiles').select('church_id, email').eq('role','admin').then(function(admRes) {
        var admins = admRes.data || [];
        lista.forEach(function(c) {
          var adm = admins.find(function(a){ return a.church_id === c.id; });
          if (adm) c.owner_email = adm.email || '-';
        });
        renderSATable(lista);
      });
    });
  });
}

function renderSATable(lista) {
  var tbody = document.getElementById('sa-churches-body');

  // Stats
  var total   = lista.length;
  var trial   = lista.filter(function(c){ return c.plan_status === 'trial' || !c.plan_status; }).length;
  var ativos  = lista.filter(function(c){ return c.plan_status === 'active'; }).length;
  var inadimp = lista.filter(function(c){ return c.plan_status === 'overdue'; }).length;
  var mrr     = lista.filter(function(c){ return c.plan_status === 'active' && c.plan !== 'isento'; })
                     .reduce(function(s,c){ return s + (parseFloat(c.plan_value)||0); }, 0);
  var totalU  = lista.reduce(function(s,c){ return s + (c.user_count||0); }, 0);
  var vencendo = lista.filter(function(c) {
    if (!c.plan_expires_at) return false;
    var dias = Math.ceil((new Date(c.plan_expires_at) - new Date()) / (1000*60*60*24));
    return dias >= 0 && dias <= 7;
  }).length;

  document.getElementById('sa-total-churches').textContent  = total;
  document.getElementById('sa-active-churches').textContent = ativos;
  document.getElementById('sa-overdue-churches').textContent = inadimp;
  document.getElementById('sa-mrr').textContent = 'R$' + mrr.toFixed(0);
  document.getElementById('sa-total-users').textContent = totalU;
  // Atualizar badge de trial e vencendo se existir
  var elTrial = document.getElementById('sa-trial-churches');
  if (elTrial) elTrial.textContent = trial;
  var elVenc  = document.getElementById('sa-vencendo-churches');
  if (elVenc)  elVenc.textContent  = vencendo;

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--muted)">Nenhuma igreja cadastrada ainda.</td></tr>';
    return;
  }

  var hoje = new Date();
  tbody.innerHTML = lista.map(function(c) {
    var slug   = c.slug || '';
    var link   = window.location.origin + '/' + slug;
    var valor  = parseFloat(c.plan_value) || 0;
    var status = c.plan_status || 'trial';
    var statusLabels = { trial:'Trial', active:'Ativo', overdue:'Inadimplente', cancelled:'Cancelado' };
    var statusColors = { trial:'#f59e0b', active:'#10b981', overdue:'#ef4444', cancelled:'#6b7280' };
    var statusBg     = { trial:'rgba(245,158,11,.15)', active:'rgba(16,185,129,.15)', overdue:'rgba(239,68,68,.15)', cancelled:'rgba(107,114,128,.15)' };

    // Verificar carência (overdue mas dentro de 3 dias)
    if (status === 'overdue' && c.plan_expires_at) {
      var diasVenc = Math.ceil((new Date() - new Date(c.plan_expires_at)) / (1000*60*60*24));
      if (diasVenc <= 3) {
        statusLabels.overdue = 'Carencia (' + (3 - diasVenc) + 'd)';
        statusColors.overdue = '#f97316';
        statusBg.overdue     = 'rgba(249,115,22,.15)';
      }
    }

    // Dias até vencimento
    var diasStr = '-'; var diasColor = 'var(--muted)';
    if (c.plan_expires_at) {
      var vencDate = new Date(c.plan_expires_at);
      var dias = Math.ceil((vencDate - hoje) / (1000*60*60*24));
      if (dias < 0) { diasStr = 'Vencido'; diasColor = '#ef4444'; }
      else if (dias === 0) { diasStr = 'Hoje!'; diasColor = '#ef4444'; }
      else if (dias <= 5) { diasStr = dias + 'd !!'; diasColor = '#f59e0b'; }
      else { diasStr = dias + ' dias'; diasColor = '#10b981'; }
    }

    return '<tr>' +
      // Igreja + link
      '<td style="max-width:160px">' +
        '<div style="font-weight:700;font-size:13px;margin-bottom:2px">' + c.name + '</div>' +
        '<a href="' + link + '" target="_blank" style="font-size:11px;color:var(--accent);text-decoration:none">/' + slug + '</a>' +
        (c.notes ? '<div style="font-size:11px;color:var(--muted);margin-top:2px;font-style:italic">' + c.notes + '</div>' : '') +
      '</td>' +
      // Admin + botão cobrar
      '<td style="font-size:12px">' +
        '<div style="color:var(--muted);margin-bottom:4px">' + (c.owner_email||'-') + '</div>' +
        (c.owner_email && c.owner_email !== '-' ?
          '<button class="btn-cobrar-pix" data-email="' + c.owner_email + '" data-name="' + c.name + '" data-valor="' + valor.toFixed(2) + '" ' +
          'style="background:rgba(37,211,102,.15);color:#25d366;border:1px solid rgba(37,211,102,.3);padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">' +
          'PIX Cobrar</button>' : '') +
      '</td>' +
      // Plano
      '<td><span style="font-size:12px;font-weight:600">' + (c.plan||'free').toUpperCase() + '</span></td>' +
      // Valor
      '<td style="font-weight:700;color:' + (valor > 0 ? '#10b981' : 'var(--muted)') + ';font-size:13px">' +
        (valor > 0 ? 'R$ ' + valor.toFixed(2) : 'Gratis') +
      '</td>' +
      // Status badge
      '<td><span style="background:' + (statusBg[status]||'rgba(107,114,128,.15)') + ';color:' + (statusColors[status]||'#6b7280') + ';padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">' +
        (statusLabels[status]||status) +
      '</span></td>' +
      // Vencimento
      '<td style="font-size:12px;color:var(--muted)">' + (c.plan_expires_at ? new Date(c.plan_expires_at).toLocaleDateString('pt-BR') : '-') + '</td>' +
      // Dias
      '<td style="font-weight:700;font-size:12px;color:' + diasColor + '">' + diasStr + '</td>' +
      // Usuarios
      '<td style="text-align:center;font-size:13px">' + (c.user_count||0) + '</td>' +
      // Acoes
      '<td style="white-space:nowrap">' +
        '<button class="btn btn-secondary btn-sm sa-edit-btn" ' +
          'data-id="' + c.id + '" data-name="' + c.name + '" data-plan="' + (c.plan||'free') + '" ' +
          'data-value="' + valor + '" data-status="' + status + '" ' +
          'data-expires="' + (c.plan_expires_at||'').slice(0,10) + '" ' +
          'data-notes="' + (c.notes||'').replace(/"/g,"'") + '" ' +
          'style="margin-right:4px">&#9998; Editar</button>' +
        '<button class="btn btn-danger btn-sm sa-del-btn" data-id="' + c.id + '" data-name="' + c.name + '">&#128465;</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  // Listener PIX
  tbody.querySelectorAll('.btn-cobrar-pix').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var nome  = this.getAttribute('data-name');
      var valor = this.getAttribute('data-valor');
      var pixKey = '0f78da20-cc1f-4d67-a4f5-b0b6f6747be5';
      var waCliente = this.getAttribute('data-whatsapp') || '';
      abrirModalPix(nome, valor, pixKey, waCliente);
    });
  });

  // Listener Editar
  tbody.querySelectorAll('.sa-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id      = this.getAttribute('data-id');
      var name    = this.getAttribute('data-name');
      var plan    = this.getAttribute('data-plan');
      var value   = this.getAttribute('data-value');
      var status  = this.getAttribute('data-status');
      var expires = this.getAttribute('data-expires');
      var notes   = this.getAttribute('data-notes');
      saEditingChurchId = id;
      // Mostrar nome da igreja no título
      var titleEl = document.getElementById('sa-edit-title');
      if (titleEl) titleEl.textContent = 'Editar: ' + name;
      document.getElementById('sa-edit-plan').value    = plan;
      document.getElementById('sa-edit-value').value   = value;
      document.getElementById('sa-edit-status').value  = status;
      document.getElementById('sa-edit-expires').value = expires;
      document.getElementById('sa-edit-notes').value   = notes || '';
      var waEl = document.getElementById('sa-edit-whatsapp');
      if (waEl) waEl.value = this.getAttribute('data-whatsapp') || '';
      var modal = document.getElementById('sa-edit-modal');
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    });
  });

  // Listener Excluir
  tbody.querySelectorAll('.sa-del-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id   = this.getAttribute('data-id');
      var name = this.getAttribute('data-name');
      if (!confirm('EXCLUIR "' + name + '"?\n\nTodos os cultos, equipes e usuarios serao desvinculados. Esta acao e irreversivel!')) return;
      var b = this; b.disabled = true; b.textContent = 'Excluindo...';
      sb.from('services').delete().eq('church_id', id).then(function() {
        return sb.from('invites').delete().eq('church_id', id);
      }).then(function() {
        return sb.from('profiles').update({ church_id: null, role: 'visitante', status: 'pending' }).eq('church_id', id);
      }).then(function() {
        return sb.from('churches').delete().eq('id', id);
      }).then(function() {
        toast('Igreja excluida com sucesso!', 'success');
        carregarChurches();
      }).catch(function(err) {
        b.disabled = false; b.textContent = '&#128465;';
        toast('Erro: ' + err.message, 'error');
      });
    });
  });
}


function salvarEdicaoSA() {
  if (!saEditingChurchId) return;
  var btn = document.getElementById('btn-sa-edit-save');
  btn.disabled = true; btn.textContent = 'Salvando...';

  var expiresVal  = document.getElementById('sa-edit-expires').value;
  var whatsappVal = (document.getElementById('sa-edit-whatsapp') || {}).value || null;
  sb.rpc('super_admin_update_church', {
    p_church_id:    saEditingChurchId,
    p_plan:         document.getElementById('sa-edit-plan').value,
    p_plan_value:   parseFloat(document.getElementById('sa-edit-value').value) || 0,
    p_plan_status:  document.getElementById('sa-edit-status').value,
    p_plan_expires: expiresVal ? new Date(expiresVal).toISOString() : null,
    p_notes:        document.getElementById('sa-edit-notes').value || null,
  }).then(function(r) {
    // Salvar whatsapp diretamente (campo extra)
    if (whatsappVal !== null) {
      sb.from('churches').update({ whatsapp: whatsappVal }).eq('id', saEditingChurchId);
    }
    btn.disabled = false; btn.textContent = 'Salvar';
    if (r.error) { alert('Erro: ' + r.error.message); return; }
    var _m = document.getElementById('sa-edit-modal');
    _m.classList.add('hidden'); _m.style.display = '';
    carregarChurches();
  });
}

function exportarRelatorioSA() {
  sb.rpc('super_admin_get_all_churches').then(function(res) {
    var lista = res.data || [];
    var header = ['Igreja','Slug','Admin','Cidade','Estado','Plano','Valor','Status','Vencimento','Usuarios','Cultos','Criado em'];
    var rows = lista.map(function(c) {
      return [
        '"' + (c.name||'') + '"', c.slug, c.owner_email||'',
        c.city||'', c.state||'', c.plan||'',
        (c.plan_value||0).toFixed(2), c.plan_status||'',
        c.plan_expires_at ? c.plan_expires_at.slice(0,10) : '',
        c.user_count||0, c.service_count||0,
        c.created_at ? c.created_at.slice(0,10) : ''
      ].join(',');
    });
    var csv = [header.join(',')].concat(rows).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'clientes-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  });
}

// =============================================
// CONFIGURACOES: BACKUP E EXCLUSAO
// =============================================
var configInit = false;
function initConfiguracoes() {
  if (configInit) return;
  configInit = true;

  // Exportar backup
  document.getElementById('btn-exportar-backup').addEventListener('click', exportarBackup);

  // Importar backup
  var btnImport = document.getElementById('btn-importar-backup');
  var fileInput = document.getElementById('input-importar-backup');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) { importarBackup(e.target.result); };
      reader.readAsText(file);
      this.value = ''; // reset para permitir re-upload
    });
  }

  // Verificar aviso de backup (a cada 15 dias)
  verificarAvisoBackup();

  // Locais
  var cepInput = document.getElementById('loc-cep');
  if (cepInput) {
    cepInput.addEventListener('input', function() {
      var v = this.value.replace(/[^0-9]/g,'');
      this.value = v.length > 5 ? v.slice(0,5) + '-' + v.slice(5,8) : v;
    });
    cepInput.addEventListener('blur', function() { buscarCEP(this.value); });
  }
  var btnLocal = document.getElementById('btn-salvar-local');
  if (btnLocal) btnLocal.addEventListener('click', salvarLocal);
  carregarLocais();

  // Excluir agenda
  document.getElementById('btn-excluir-agenda').addEventListener('click', function() {
    var confirmName = document.getElementById('delete-church-confirm').value.trim();
    // Buscar nome da igreja
    sb.from('churches').select('name').eq('id', currentProfile.church_id).single().then(function(r) {
      var churchName = r.data && r.data.name;
      if (!churchName) { toast('Erro ao buscar dados da igreja.', 'error'); return; }
      if (confirmName !== churchName) {
        toast('Nome da igreja incorreto. Digite exatamente: ' + churchName, 'error'); return;
      }
      if (!confirm('ULTIMA CONFIRMACAO: Excluir permanentemente a agenda de "' + churchName + '"? Esta acao NAO pode ser desfeita!')) return;
      excluirAgenda();
    });
  });
}

function exportarBackup() {
  var btn = document.getElementById('btn-exportar-backup');
  var status = document.getElementById('export-status');
  btn.disabled = true; btn.textContent = 'Exportando...';
  status.textContent = 'Coletando dados...';

  var churchId = currentProfile.church_id;
  var backup = { exported_at: new Date().toISOString(), church: null, profiles: [], services: [], service_teams: [], confirmations: [] };

  // Buscar dados em paralelo
  Promise.all([
    sb.from('churches').select('*').eq('id', churchId).single(),
    sb.from('profiles').select('*').eq('church_id', churchId),
    sb.from('services').select('*').eq('church_id', churchId).order('date'),
    sb.from('service_teams').select('*, services!inner(church_id)').eq('services.church_id', churchId),
    sb.from('service_confirmations').select('*, services!inner(church_id)').eq('services.church_id', churchId),
  ]).then(function(results) {
    backup.church         = results[0].data;
    backup.profiles       = results[1].data || [];
    backup.services       = results[2].data || [];
    backup.service_teams  = results[3].data || [];
    backup.confirmations  = results[4].data || [];

    var json = JSON.stringify(backup, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    var date = new Date().toISOString().slice(0,10);
    a.href     = url;
    a.download = 'backup-' + (backup.church && backup.church.slug || 'agenda') + '-' + date + '.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);

    btn.disabled = false; btn.textContent = '&#11015; Exportar JSON';
    status.textContent = 'Backup exportado com sucesso! ' + backup.services.length + ' cultos, ' + backup.profiles.length + ' usuarios.';
    status.style.color = 'var(--green)';
    // Registrar data do último backup
    localStorage.setItem('ultimo_backup_' + currentProfile.church_id, new Date().toISOString());
    if (window.verificarAvisoBackup) verificarAvisoBackup();
    toast('Backup exportado!', 'success');
  }).catch(function(err) {
    btn.disabled = false; btn.textContent = '&#11015; Exportar JSON';
    status.textContent = 'Erro: ' + err.message;
    status.style.color = 'var(--red)';
    toast('Erro ao exportar: ' + err.message, 'error');
  });
}


function importarBackup(jsonStr) {
  var statusEl = document.getElementById('import-status');
  try {
    var data = JSON.parse(jsonStr);
    if (!data.services || !Array.isArray(data.services)) {
      if (statusEl) { statusEl.textContent = 'Arquivo invalido. Use um backup gerado pelo Church App.'; statusEl.style.color = 'var(--red)'; }
      return;
    }
    if (!confirm('Importar backup de ' + data.services.length + ' cultos? Os dados existentes NAO serao apagados.')) return;
    if (statusEl) { statusEl.textContent = 'Importando...'; statusEl.style.color = 'var(--muted)'; }

    var churchId = currentProfile.church_id;
    var services = data.services.map(function(s) {
      return { church_id: churchId, title: s.title, date: s.date, time: s.time,
               location: s.location, color: s.color, status: s.status || 'scheduled' };
    });

    sb.from('services').upsert(services, { onConflict: 'church_id,date,title' })
      .then(function(r) {
        if (r.error) throw r.error;
        if (statusEl) { statusEl.textContent = 'Importado! ' + services.length + ' cultos restaurados.'; statusEl.style.color = 'var(--green)'; }
        toast('Backup importado com sucesso!', 'success');
        localStorage.setItem('ultimo_backup_' + churchId, new Date().toISOString());
      })
      .catch(function(err) {
        if (statusEl) { statusEl.textContent = 'Erro: ' + err.message; statusEl.style.color = 'var(--red)'; }
        toast('Erro ao importar backup.', 'error');
      });
  } catch(e) {
    if (statusEl) { statusEl.textContent = 'Arquivo JSON invalido.'; statusEl.style.color = 'var(--red)'; }
  }
}

function verificarAvisoBackup() {
  if (!currentProfile || !currentProfile.church_id) return;
  var key = 'ultimo_backup_' + currentProfile.church_id;
  var ultimo = localStorage.getItem(key);
  var diasSemBackup = 999;
  if (ultimo) diasSemBackup = Math.floor((Date.now() - new Date(ultimo).getTime()) / (1000*60*60*24));
  var aviso = document.getElementById('aviso-backup');
  if (!aviso) return;
  if (diasSemBackup >= 15) {
    aviso.style.display = 'flex';
    document.getElementById('aviso-backup-txt').textContent = ultimo
      ? 'Ultimo backup ha ' + diasSemBackup + ' dias. Recomendamos baixar a cada 15 dias.'
      : 'Nenhum backup registrado. Baixe agora para garantir seus dados!';
  } else {
    aviso.style.display = 'none';
  }
}
window.verificarAvisoBackup = verificarAvisoBackup;

function excluirAgenda() {
  var btn = document.getElementById('btn-excluir-agenda');
  btn.disabled = true; btn.textContent = 'Excluindo...';
  var churchId = currentProfile.church_id;

  // Excluir em cascata (as FKs com CASCADE cuidam das filhas)
  // Precisa apagar na ordem certa:
  // 1. service_confirmations (via cascade do service)
  // 2. service_teams (via cascade do service)
  // 3. services
  // 4. invites
  // 5. profiles (desvincula church_id)
  // 6. churches

  sb.from('services').delete().eq('church_id', churchId).then(function() {
    return sb.from('invites').delete().eq('church_id', churchId);
  }).then(function() {
    return sb.from('profiles').update({ church_id: null, role: 'visitante', status: 'pending' })
      .eq('church_id', churchId);
  }).then(function() {
    return sb.from('churches').delete().eq('id', churchId);
  }).then(function() {
    toast('Agenda excluida. Redirecionando...', 'success');
    setTimeout(function() {
      sb.auth.signOut().then(function() { window.location.reload(); });
    }, 2000);
  }).catch(function(err) {
    btn.disabled = false; btn.textContent = 'Excluir agenda permanentemente';
    toast('Erro: ' + err.message, 'error');
  });
}

// =============================================
// DETECCAO DE SLUG (?church=) E INVITE (?invite=)
// =============================================
function getChurchSlug() {
  // Prioridade: 1) pathname ex: /getchurch  2) ?church=  3) localStorage
  var path = window.location.pathname.replace(/^\//, '').split('/')[0];
  if (path && path !== 'index.html' && path.length > 0) return path;
  var p = new URLSearchParams(window.location.search);
  return p.get('church') || localStorage.getItem('gca_church_slug') || null;
}

function getChurchLink(slug) {
  var base = window.location.origin;
  return base + '/' + (slug || '');
}
function getInviteToken() {
  var p = new URLSearchParams(window.location.search);
  return p.get('invite') || localStorage.getItem('gca_pending_invite') || null;
}
function loadChurchBySlug(slug, cb) {
  if (!slug) { cb(null); return; }
  sb.rpc('get_church_by_slug', { p_slug: slug }).then(function(r) {
    cb(r.data && r.data.found ? r.data : null);
  });
}
function processarInvitePendente() {
  var token = getInviteToken();
  if (!token) return Promise.resolve(false);
  return sb.rpc('use_invite', { p_token: token }).then(function(r) {
    localStorage.removeItem('gca_pending_invite');
    var url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState(null, '', url.toString());
    if (r.error) {
      if (r.error.message && r.error.message.indexOf('ja pertence') !== -1) return false;
      toast('Erro no convite: ' + r.error.message, 'error');
      return false;
    }
    toast('Bem-vindo(a)! Convite aceito!', 'success');
    return true;
  });
}

// =============================================
// TELA DE CONVITE
// =============================================
function showInviteScreen(token) {
  localStorage.setItem('gca_pending_invite', token);
  var screen = document.getElementById('invite-screen');
  screen.classList.add('show');

  sb.from('invites').select('church_id, role, label, expires_at, uses_count, max_uses, revoked').eq('token', token).single()
    .then(function(r) {
      if (r.error || !r.data) {
        document.getElementById('invite-church-name').textContent = 'Convite invalido';
        document.getElementById('invite-role-badge').style.display = 'none';
        return;
      }
      var inv = r.data;
      var expirado = inv.expires_at && new Date(inv.expires_at) < new Date();
      if (inv.revoked || expirado || inv.uses_count >= inv.max_uses) {
        document.getElementById('invite-church-name').textContent = 'Convite expirado';
        document.getElementById('invite-role-badge').style.display = 'none';
        document.getElementById('invite-actions').innerHTML =
          '<p style="color:var(--red);font-size:14px">Este convite nao e mais valido.</p>';
        return;
      }
      sb.from('churches').select('name,logo_url,city,state').eq('id', inv.church_id).single().then(function(cr) {
        if (!cr.data) return;
        document.getElementById('invite-church-name').textContent = cr.data.name;
        document.getElementById('invite-church-city').textContent = [cr.data.city, cr.data.state].filter(Boolean).join(' - ');
        if (cr.data.logo_url) {
          document.getElementById('invite-church-logo-wrap').innerHTML = '<img src="' + cr.data.logo_url + '" class="invite-church-logo" alt="Logo"/>';
        }
      });
      var rl = { voluntario:'Voluntario', lider:'Lider', admin:'Administrador' };
      document.getElementById('invite-role-label').textContent = rl[inv.role] || inv.role;
    });

  document.getElementById('btn-invite-google').addEventListener('click', function() {
    var b = this; b.disabled = true; b.style.opacity = '.6';
    sb.auth.signInWithOAuth({ provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname + '?invite=' + token }
    }).then(function(r) { if (r.error) { toast(r.error.message,'error'); b.disabled=false; b.style.opacity='1'; } });
  });
  document.getElementById('btn-invite-email').addEventListener('click', function() {
    screen.classList.remove('show');
    document.getElementById('login-screen').style.display = 'flex';
  });
}

// =============================================
// PASTOR: ESBOCOS DE PREGACAO COM IA
// =============================================
// Configure sua chave da API Gemini abaixo
// Groq API chamada via Netlify Function (chave segura no servidor)

// =============================================
// CONFIGURACAO DOS PLANOS
// =============================================
var PLANOS = {
  trial:         { label:'Trial',         valor:0,     dias:7,    usuarios:5,   esbocos:1,   convites:false, wa_notif:false, locais:1,   isento:false },
  basico:        { label:'Basico',        valor:19.90, dias:30,   usuarios:15,  esbocos:0,   convites:true,  wa_notif:false, locais:1,   isento:false },
  essencial:     { label:'Essencial',     valor:29.90, dias:30,   usuarios:30,  esbocos:5,   convites:true,  wa_notif:true,  locais:2,   isento:false },
  profissional:  { label:'Profissional',  valor:39.90, dias:30,   usuarios:60,  esbocos:20,  convites:true,  wa_notif:true,  locais:5,   isento:false },
  premium:       { label:'Premium',       valor:59.90, dias:30,   usuarios:999, esbocos:999, convites:true,  wa_notif:true,  locais:999, isento:false },
  free:          { label:'Free',          valor:0,     dias:30,   usuarios:10,  esbocos:0,   convites:false, wa_notif:false, locais:1,   isento:false },
  isento:        { label:'Isento',        valor:0,     dias:9999, usuarios:999, esbocos:999, convites:true,  wa_notif:true,  locais:999, isento:true  },
};

function getPlano(church) {
  return PLANOS[(church && church.plan)] || PLANOS.trial;
}

function autoPreencherValorPlano(plano) {
  var p = PLANOS[plano];
  if (!p) return;

  // Valor mensal
  var elVal = document.getElementById('sa-edit-value');
  if (elVal) elVal.value = p.valor.toFixed(2);

  // Status
  var elStatus = document.getElementById('sa-edit-status');
  if (elStatus) {
    if (plano === 'isento') elStatus.value = 'full';
    else if (plano === 'trial' || plano === 'free') elStatus.value = 'trial';
    else elStatus.value = 'active';
  }

  // Data de expiração
  var exp = document.getElementById('sa-edit-expires');
  if (exp) {
    if (plano === 'isento') {
      exp.value = ''; // sem vencimento
      exp.disabled = true;
    } else {
      exp.disabled = false;
      var d = new Date();
      d.setDate(d.getDate() + p.dias);
      exp.value = d.toISOString().slice(0,10);
    }
  }
}
window.autoPreencherValorPlano = autoPreencherValorPlano;

var sermaoInit = false;

function initSermao() {
  if (!sermaoInit) {
    sermaoInit = true;

    document.getElementById('btn-novo-sermao').addEventListener('click', function() {
      var f = document.getElementById('sermao-form');
      f.style.display = f.style.display === 'none' ? 'block' : 'none';
    });

    var btnCancelar = document.getElementById('btn-cancelar-sermao');
    if (btnCancelar) btnCancelar.addEventListener('click', function() {
      document.getElementById('sermao-form').style.display = 'none';
    });

    document.getElementById('btn-gerar-sermao').addEventListener('click', gerarEsboço);

    // Seletor de versiculo
    var btnAddRef = document.getElementById('btn-add-ref');
    if (btnAddRef) btnAddRef.addEventListener('click', function() {
      var livro = document.getElementById('sel-livro').value;
      var cap   = document.getElementById('sel-cap').value.trim();
      var vers  = document.getElementById('sel-vers').value.trim();
      if (!livro || !cap) { toast('Selecione o livro e capitulo.', 'error'); return; }
      var ref = livro + ' ' + cap + (vers ? ':' + vers : '');
      var refsEl = document.getElementById('sermao-refs');
      refsEl.value = refsEl.value ? refsEl.value + ', ' + ref : ref;
      document.getElementById('sel-cap').value  = '';
      document.getElementById('sel-vers').value = '';
      document.getElementById('sel-livro').value = '';
    });
  }
  carregarSermoes();
}

function gerarEsboço() {
  var livro  = document.getElementById('sel-livro') ? document.getElementById('sel-livro').value : '';
  var cap    = document.getElementById('sel-cap') ? document.getElementById('sel-cap').value.trim() : '';
  var vers   = document.getElementById('sel-vers') ? document.getElementById('sel-vers').value.trim() : '';
  var refs   = document.getElementById('sermao-refs').value.trim();
  var extra  = document.getElementById('sermao-refs-extra') ? document.getElementById('sermao-refs-extra').value.trim() : '';
  var duracao = document.getElementById('sermao-duracao').value;
  var publico = document.getElementById('sermao-publico').value;
  var tema    = document.getElementById('sermao-tema') ? document.getElementById('sermao-tema').value.trim() : '';
  var obs     = document.getElementById('sermao-obs') ? document.getElementById('sermao-obs').value.trim() : '';

  // Montar referência principal se veio do seletor
  if (livro && cap && !refs) {
    refs = livro + ' ' + cap + (vers ? ':' + vers : '');
  }
  if (extra) refs = refs ? refs + ', ' + extra : extra;

  if (!refs) { toast('Informe pelo menos uma referencia biblica.', 'error'); return; }

  // Verificar limite de esbocos do plano
  var planoAtual = PLANOS[(window.currentChurch && window.currentChurch.plan) || 'trial'];
  if (planoAtual.esbocos === 0) {
    toast('Seu plano (' + planoAtual.label + ') nao inclui o Gerador de Esbocos com IA.', 'error');
    setTimeout(abrirModalPlanos, 500);
    return;
  }
  if (planoAtual.esbocos < 999 && (window.esbocosUsadosMes || 0) >= planoAtual.esbocos) {
    toast('Limite de ' + planoAtual.esbocos + ' esbocos/mes atingido no plano ' + planoAtual.label + '.', 'error');
    setTimeout(abrirModalPlanos, 500);
    return;
  }

  var btn     = document.getElementById('btn-gerar-sermao');
  var loading = document.getElementById('sermao-loading');
  btn.style.display     = 'none';
  loading.style.display = 'block';
  document.getElementById('sermao-form').style.display = 'none';

  var publicoLabels = { geral:'congregacao geral', jovens:'jovens', casais:'casais', lideres:'lideres', criancas:'criancas' };

  var promptText = [
    'Voce e um pastor evangelico experiente e pregador ungido. Crie um esboço de pregacao completo em portugues brasileiro.',
    'Use linguagem direta, pastoral, com frases curtas e impactantes -- como se estivesse falando para a congregacao.',
    'O estilo deve ser conversacional, com perguntas retorias, repeticoes intencionais e momentos de apelo.',
    '',
    'REFERENCIAS BIBLICAS: ' + refs,
    'DURACAO: ' + duracao + ' minutos',
    'PUBLICO: ' + publicoLabels[publico],
    tema ? 'TEMA CENTRAL: ' + tema : '',
    obs ? 'CONTEXTO ADICIONAL: ' + obs : '',
    '',
    'ESTRUTURA OBRIGATORIA -- siga exatamente este formato:',
    '',
    '------------------------------',
    '[TITULO EM MAIUSCULO]',
    '------------------------------',
    '',
    'INTRODUCAO',
    '* Comece com uma situacao real do cotidiano ou uma pergunta que a congregacao ja se fez',
    '* Apresente o problema central que o texto vai responder',
    '* Cite o versiculo base completo (livro capitulo:versiculo -- "texto completo")',
    '* Frase de transicao impactante que leve ao primeiro ponto',
    '',
    '1. [TITULO DO PRIMEIRO PONTO EM MAIUSCULO]',
    '* Explicacao do texto biblico com linguagem simples',
    '* Versiculos de apoio (cite pelo menos 2 com referencia completa)',
    '* Ilustracao pratica: uma situacao da vida real que ilustra o ponto',
    '* Frase de impacto: uma verdade forte e memoravel sobre este ponto',
    '* Pergunta retorica para engajar a congregacao',
    '',
    '2. [TITULO DO SEGUNDO PONTO EM MAIUSCULO]',
    '* Explicacao do texto biblico com linguagem simples',
    '* Versiculos de apoio (cite pelo menos 2 com referencia completa)',
    '* Exemplos praticos da vida crista (familiar, financeiro, espiritual)',
    '* Frase de impacto memoravel',
    '* Momento de identificacao: "Tem alguem aqui que..."',
    '',
    '3. [TITULO DO TERCEIRO PONTO EM MAIUSCULO]',
    '* Explicacao do texto biblico com linguagem simples',
    '* Versiculos de apoio (cite pelo menos 2 com referencia completa)',
    '* A solucao biblica pratica e concreta',
    '* Frase de declaracao para a congregacao repetir em voz alta',
    '* Transicao para a conclusao',
    '',
    'CONCLUSAO -- A RESPOSTA DE DEUS',
    '* Retome o problema central da introducao',
    '* Apresente a resposta definitiva do texto biblico',
    '* Cite o versiculo final de fechamento completo',
    '* Liste 3 acoes praticas que a pessoa pode tomar HOJE',
    '* Frase de apelo emocional e espiritual',
    '',
    'APELO FINAL',
    '* Convite para decisao/compromisso',
    '* Oracao de encerramento sugerida (2-3 linhas)',
    '* Versiculos para memorizar esta semana (2 versiculos com referencia)',
    '* Sugestao de 1 musica de louvor que combine com o tema',
    '',
    'IMPORTANTE:',
    '- Use frases curtas. Um paragrafo = uma ideia.',
    '- Coloque frases de impacto em destaque com *',
    '- Cite TODOS os versiculos com livro, capitulo e versiculo (ex: Romanos 7:24)',
    '- O tom deve ser pastoral, nao academico.',
    '- Inclua momentos de participacao da congregacao (repeticoes, perguntas)',
    '- Duracao da pregacao: ' + duracao + ' minutos'
  ].join('\n');

  fetch('/.netlify/functions/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.7,
      max_tokens: 3000
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    btn.style.display     = 'flex';
    loading.style.display = 'none';

    if (data.error) {
      toast('Erro: ' + (data.error.message || JSON.stringify(data.error)), 'error');
      document.getElementById('sermao-form').style.display = 'block';
      return;
    }

    var esboço = data.choices && data.choices[0] &&
                 data.choices[0].message && data.choices[0].message.content;

    if (!esboço) { toast('Resposta vazia da IA.', 'error'); return; }

    // Extrair titulo - ignorar separadores e linhas vazias
    var titulo = '';
    var linhas = esboço.split('\n');
    for (var i = 0; i < linhas.length; i++) {
      var l = linhas[i].trim()
        .replace(/\*\*/g,'')
        .replace(/^#+\s*/,'')
        .replace(/^TITULO[:\s]*/i,'')
        .replace(/^TÍTULO[:\s]*/i,'')
        .trim();
      // Ignorar separadores (traços, asteriscos, underlines) e linhas curtas
      if (!l) continue;
      if (l.match(/^[-_=*--]{3,}$/)) continue;
      if (l.length < 4) continue;
      titulo = l;
      break;
    }
    if (!titulo) titulo = 'Esboço: ' + refs;

    var pregador  = (document.getElementById('sermao-pregador') || {}).value || '';
    var whatsapp  = (document.getElementById('sermao-whatsapp') || {}).value || '';
    var esbocoFinal = esboço;

    sb.from('sermons').insert({
      church_id:   currentProfile.church_id,
      created_by:  currentUser.id,
      referencias: refs,
      duracao_min: parseInt(duracao),
      esboco:      esbocoFinal,
      titulo:      titulo.replace(/^[-_=*--\s]+/, '').trim() || ('Esboço: ' + refs),
      status:      'done'
    }).then(function(res) {
      if (res.error) { toast('Erro ao salvar: ' + res.error.message, 'error'); return; }
      document.getElementById('sermao-form').style.display = 'none';
      document.getElementById('sermao-refs').value  = '';
      var temaTema = document.getElementById('sermao-tema');
      if (temaTema) temaTema.value = '';
      var refsExtra = document.getElementById('sermao-refs-extra');
      if (refsExtra) refsExtra.value = '';
      var obsEl = document.getElementById('sermao-obs');
      if (obsEl) obsEl.value = '';
      toast('Esboço gerado com sucesso!', 'success');
      carregarSermoes();


    });
  })
  .catch(function(err) {
    btn.style.display     = 'flex';
    loading.style.display = 'none';
    document.getElementById('sermao-form').style.display = 'block';
    toast('Erro: ' + err.message, 'error');
    console.error(err);
  });
}


function carregarSermoes() {
  var container = document.getElementById('sermoes-lista');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:10px">Carregando...</p>';

  // Atualizar contador
  atualizarContadorSermoes();

  sb.from('sermons').select('*')
    .eq('church_id', currentProfile.church_id)
    .order('created_at', { ascending: false })
    .then(function(res) {
      var lista = res.data || [];
      if (!lista.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">&#128214;</div><h4>Nenhum esboço ainda</h4><p>Clique em "+ Novo Esboço" para gerar seu primeiro esboço com IA</p></div>';
        return;
      }

      container.innerHTML = '';

      // Grade de 2 colunas no desktop
      var grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px';

      lista.forEach(function(s) {
        var dt     = new Date(s.created_at).toLocaleDateString('pt-BR');
        var titulo = (s.titulo || 'Sem titulo')
          .replace(/\*\*/g,'').replace(/^#+\s*/,'')
          .replace(/^[-_=*--]{3,}$/,'').trim() || 'Sem titulo';
        var refs   = s.referencias || '';
        var dur    = s.duracao_min || '';
        var pubMap = { geral:'Geral', jovens:'Jovens', casais:'Casais', lideres:'Lideres', criancas:'Criancas' };
        var pub    = pubMap[s.publico] || 'Geral';

        var card = document.createElement('div');
        card.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px';

        card.innerHTML =
          // Título e info
          '<div>' +
            '<div style="font-weight:700;font-size:14px;margin-bottom:6px;line-height:1.3">' + titulo + '</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
              '<span style="font-size:11px;background:var(--surface2);padding:2px 8px;border-radius:20px;color:var(--muted)">&#128214; ' + refs + '</span>' +
              '<span style="font-size:11px;background:var(--surface2);padding:2px 8px;border-radius:20px;color:var(--muted)">&#128101; ' + pub + '</span>' +
              '<span style="font-size:11px;background:var(--surface2);padding:2px 8px;border-radius:20px;color:var(--muted)">&#128197; ' + dt + '</span>' +
            '</div>' +
          '</div>' +
          // Botões
          '<div style="display:flex;gap:7px">' +
            '<button class="btn btn-primary sermao-pdf-btn" data-id="' + s.id + '" style="flex:2;display:flex;align-items:center;justify-content:center;gap:4px">&#128196; PDF</button>' +
            '<button class="btn btn-secondary btn-sm sermao-wa-btn" data-id="' + s.id + '" style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;background:rgba(37,211,102,.15);color:#25d366;border:1px solid rgba(37,211,102,.3)" title="Compartilhar no WhatsApp">&#128242;</button>' +
            '<button class="btn btn-danger btn-sm btn-del-sermao" data-id="' + s.id + '" style="padding:8px 10px" title="Excluir">&#128465;</button>' +
          '</div>';

        grid.appendChild(card);
      });

      container.appendChild(grid);

      // Listener WhatsApp - compartilhar esboço
      container.querySelectorAll('.sermao-wa-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = this.getAttribute('data-id');
          var s = lista.find(function(x) { return x.id === id; });
          if (!s) return;
          var titulo  = (s.titulo || 'Esboço de Pregacao').replace(/\*\*/g,'').replace(/^[-]+$/,'').trim();
          var refs    = s.referencias || '';
          var dur     = s.duracao_min || '';
          var esboco  = (s.esboco || s.esboço || '').slice(0, 1800);
          var msg = '*' + titulo + '*' +
            '\n_' + refs + ' | ' + dur + ' min_' +
            '\n\n' + esboco +
            '\n\n_Gerado pela Agenda Church App_';
          window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
        });
      });

      // Listener PDF
      container.querySelectorAll('.sermao-pdf-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = this.getAttribute('data-id');
          var s = lista.find(function(x) { return x.id === id; });
          if (s) gerarPDFSermao(s);
        });
      });

      // Listener Excluir
      container.querySelectorAll('.btn-del-sermao').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = this.getAttribute('data-id');
          if (!confirm('Excluir este esboço?')) return;
          sb.from('sermons').delete().eq('id', id).then(function() {
            toast('Esboço excluido.', 'success');
            carregarSermoes();
          });
        });
      });
    });
}


function atualizarContadorSermoes() {
  if (!currentProfile || !currentProfile.church_id) return;
  var plano = PLANOS[(window.currentChurch && window.currentChurch.plan) || 'trial'];
  var limite = plano.esbocos;

  var contador = document.getElementById('sermao-contador');
  if (!contador) return;

  // Se plano nao tem IA, esconder contador
  if (limite === 0) {
    contador.style.display = 'none';
    return;
  }

  // Buscar esboços do mês atual
  var agora = new Date();
  var inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  var fimMes    = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59).toISOString();

  sb.from('sermons').select('id', { count: 'exact' })
    .eq('church_id', currentProfile.church_id)
    .gte('created_at', inicioMes)
    .lte('created_at', fimMes)
    .then(function(res) {
      var usado  = res.count || 0;
      var ilimit = limite >= 999;
      var pct    = ilimit ? 30 : Math.min(100, Math.round(usado / limite * 100));
      var corBar = pct >= 100 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';

      var txt = ilimit
        ? usado + ' esbocos gerados este mes (Ilimitado)'
        : usado + ' de ' + limite + ' esbocos (' + plano.label + ')';

      var bar  = document.getElementById('sermao-contador-bar');
      var txtEl = document.getElementById('sermao-contador-txt');
      var hint = document.getElementById('sermao-upgrade-hint');

      if (bar)   { bar.style.width = pct + '%'; bar.style.background = corBar; }
      if (txtEl) txtEl.textContent = txt;
      if (hint)  hint.style.display = (!ilimit && usado >= limite) ? 'block' : 'none';

      contador.style.display = 'block';

      // Salvar localmente para verificar ao gerar
      window.esbocosUsadosMes = usado;
    });
}

function renderSermaoHTML(s) {
  var titulo = s.titulo || 'Esboço de Pregacao';
  var refs   = s.referencias || '';
  var dur    = s.duracao_min || '';
  var pubMap = { geral:'Congregacao Geral', jovens:'Jovens', casais:'Casais', lideres:'Lideres', criancas:'Criancas' };
  var pub    = pubMap[s.publico] || 'Congregacao Geral';
  var dt     = new Date(s.created_at).toLocaleDateString('pt-BR');
  var esboco = (s.esboco || s.esboço || '').trim();

  // Header escuro
  var html = '<div style="background:#0f172a;padding:20px 24px;color:#fff">' +
    '<div style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:2px;margin-bottom:8px">CHURCH APP -- ESBOÇO DE PREGACAO</div>' +
    '<div style="font-size:22px;font-weight:800;margin-bottom:12px">' + titulo + '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<span style="background:rgba(245,158,11,.2);color:var(--accent);padding:4px 12px;border-radius:20px;font-size:12px">&#128214; ' + refs + '</span>' +
      '<span style="background:rgba(99,102,241,.15);color:#a5b4fc;padding:4px 12px;border-radius:20px;font-size:12px">&#128101; ' + pub + '</span>' +
      '<span style="background:rgba(16,185,129,.15);color:var(--green);padding:4px 12px;border-radius:20px;font-size:12px">~' + dur + ' min</span>' +
      '<span style="background:rgba(239,68,68,.1);color:#fca5a5;padding:4px 12px;border-radius:20px;font-size:12px">&#128197; ' + dt + '</span>' +
    '</div>' +
  '</div>';

  // Conteudo formatado
  html += '<div id="sermao-content-' + s.id + '" style="padding:28px 28px 8px;background:#fff;color:#111">';

  // Informacoes basicas
  html += '<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px dashed #ddd">';
  html += '<p style="font-size:13px;margin:4px 0"><strong style="color:#d97706">Texto Base:</strong> ' + refs + '</p>';
  html += '<p style="font-size:13px;margin:4px 0"><strong style="color:#d97706">Publico:</strong> ' + pub + '</p>';
  html += '<p style="font-size:13px;margin:4px 0"><strong style="color:#d97706">Duracao estimada:</strong> ~' + dur + ' minutos</p>';
  html += '</div>';

  // Renderizar o corpo do esboço linha por linha
  var linhas = esboco.split('\n');
  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i].trim();
    if (!l) { html += '<br/>'; continue; }

    // Remover markdown de negrito ** e # mas manter o texto
    var lClean = l.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^#+\s*/, '');

    // Separadores --- ou ===
    if (l.match(/^[-=*]{3,}$/) || l.match(/^[--]{3,}$/)) {
      html += '<hr style="border:none;border-top:1px dashed #ddd;margin:16px 0"/>'; continue;
    }

    // Títulos ## ou seções em MAIUSCULO
    if (l.startsWith('##') || l.startsWith('# ')) {
      html += '<div style="background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;margin:18px 0 8px;font-weight:700;font-size:13px;letter-spacing:1px">&#128212; ' + lClean.toUpperCase() + '</div>';
      continue;
    }
    if (lClean === lClean.toUpperCase() && lClean.length > 4 && !lClean.match(/^[0-9*-]/)) {
      html += '<div style="background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;margin:18px 0 8px;font-weight:700;font-size:13px;letter-spacing:1px">&#128212; ' + lClean + '</div>';
      continue;
    }

    // Pontos numerados: 1. ou PONTO 1
    if (l.match(/^\d+\.\s+/) || l.match(/^PONTO\s+\d/i)) {
      var num = l.match(/\d+/)[0];
      var txt = l.replace(/^\d+\.\s+/, '').replace(/^PONTO\s+\d+\s*[--]?\s*/i, '');
      html += '<div style="background:linear-gradient(135deg,#1e3a5f,#1a2744);color:#fff;padding:12px 16px;border-radius:8px;margin:18px 0 8px;font-weight:700;font-size:14px">' +
        '<span style="background:var(--accent);color:#000;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;margin-right:8px">' +
        num + '</span>' + (txt || lClean) + '</div>';
      continue;
    }

    // Bullets * * -
    if (l.match(/^[**-]\s+/)) {
      html += '<p style="margin:4px 0 4px 14px;font-size:13px;line-height:1.7">* ' + lClean.replace(/^[**-]\s+/, '') + '</p>';
      continue;
    }

    // Label "Texto de apoio:" / "Ilustracao:"
    if (lClean.match(/^[A-Za-zÀ-ú\s]{2,30}:/) && !lClean.match(/^https?:/)) {
      var colonIdx = lClean.indexOf(':');
      var lbl = lClean.slice(0, colonIdx).trim();
      var rest = lClean.slice(colonIdx+1).trim();
      if (rest) {
        html += '<p style="margin:5px 0;font-size:13px;line-height:1.7"><strong style="color:#d97706">' + lbl + ':</strong> ' + rest + '</p>';
      } else {
        html += '<p style="font-weight:700;color:#d97706;margin:10px 0 3px;font-size:13px">' + lbl + '</p>';
      }
      continue;
    }

    // Texto normal
    html += '<p style="margin:4px 0;font-size:13px;line-height:1.7">' + lClean + '</p>';
  }

  html += '</div>';
  return html;
}


function gerarPDFSermao(sermon) {
  var old = document.getElementById('modal-pdf');
  if (old) old.remove();

  var htmlEsboco = renderSermaoHTML(sermon);

  var overlay = document.createElement('div');
  overlay.id = 'modal-pdf';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:#fff;border-radius:16px;width:100%;max-width:740px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)';

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #eee;flex-shrink:0;background:#fff';
  header.innerHTML =
    '<div style="font-weight:700;font-size:15px;color:#111">Esboço de Pregacao</div>' +
    '<div style="display:flex;gap:8px">' +
      '<button id="btn-pdf-print" style="background:#f59e0b;color:#000;border:none;padding:8px 20px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">Imprimir / PDF</button>' +
      '<button id="btn-pdf-close" style="background:#f1f5f9;color:#333;border:none;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer">Fechar</button>' +
    '</div>';

  var body = document.createElement('div');
  body.style.cssText = 'flex:1;overflow-y:auto;padding:0';
  body.innerHTML = htmlEsboco;

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.getElementById('btn-pdf-close').addEventListener('click', function() { overlay.remove(); });

  document.getElementById('btn-pdf-print').addEventListener('click', function() {
    var w = window.open('', '_blank', 'width=820,height=720');
    if (!w) { toast('Permita popups para imprimir.', 'error'); return; }
    w.document.open();
    w.document.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">');
    w.document.write('<title>' + (sermon.titulo || 'Esboco') + '</title>');
    w.document.write('<style>');
    w.document.write('body{font-family:Arial,sans-serif;font-size:13px;margin:0;padding:0;color:#111;background:#fff}');
    w.document.write('p{margin:4px 0;line-height:1.7}hr{border:none;border-top:1px dashed #ddd;margin:12px 0}');
    w.document.write('.btn-area{text-align:center;padding:12px;background:#f9f9f9;border-top:1px solid #eee}');
    w.document.write('.bp{background:#f59e0b;color:#000;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;margin-right:8px}');
    w.document.write('.bf{background:#ddd;color:#333;border:none;padding:10px 14px;border-radius:6px;font-size:13px;cursor:pointer}');
    w.document.write('@media print{.btn-area{display:none}@page{margin:12mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}');
    w.document.write('</style></head><body>');
    w.document.write(body.innerHTML);
    w.document.write('<div class="btn-area"><button class="bp" onclick="window.print()">Imprimir / Salvar PDF</button>');
    w.document.write('<button class="bf" onclick="window.close()">Fechar</button></div>');
    w.document.write('</body></html>');
    w.document.close();
  });
}


function _gerarPDFSermao(sermon) {
  var jsPDF = window.jspdf && window.jspdf.jsPDF || window.jsPDF;
  var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  var pageW = doc.internal.pageSize.getWidth();
  var margin = 20;
  var maxW   = pageW - margin * 2;
  var y = margin;

  // Header
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 0, pageW, 12, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9); doc.setFont(undefined, 'bold');
  doc.text('ESBOÇO DE PREGAÇÃO', margin, 8);
  doc.text(new Date().toLocaleDateString('pt-BR'), pageW - margin, 8, { align: 'right' });

  y = 24;
  // Título
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(18); doc.setFont(undefined, 'bold');
  var tituloLines = doc.splitTextToSize(sermon.titulo || 'Esboço de Pregacao', maxW);
  doc.text(tituloLines, margin, y);
  y += tituloLines.length * 8 + 4;

  // Refs e meta
  doc.setFontSize(11); doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 120);
  doc.text('Referências: ' + sermon.referencias, margin, y); y += 6;
  doc.text('Duração estimada: ' + sermon.duracao_min + ' minutos', margin, y); y += 10;

  // Linha separadora
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y); y += 8;

  // Conteúdo
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(11); doc.setFont(undefined, 'normal');
  var linhas = (sermon.esboco || sermon.esboço || '').split('\n');
  linhas.forEach(function(linha) {
    if (y > 270) { doc.addPage(); y = margin; }
    if (!linha.trim()) { y += 4; return; }

    // Detectar títulos
    var isTitulo = /^[0-9]+\./.test(linha.trim()) || linha.startsWith('##') || linha.toUpperCase() === linha && linha.length < 60;
    if (isTitulo) {
      y += 2;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 80);
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 40);
    }

    var linhaLimpa = linha.replace(/^#+\s*/, '').replace(/\*\*/g, '');
    var wrapped = doc.splitTextToSize(linhaLimpa, maxW);
    wrapped.forEach(function(wl) {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.text(wl, margin, y);
      y += isTitulo ? 7 : 6;
    });
  });

  // Footer
  var totalPages = doc.internal.getNumberOfPages();
  for (var i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150, 150, 160);
    doc.text('Pagina ' + i + ' de ' + totalPages + '  |  Gerado por Church App', margin, 290);
  }

  doc.save('esboço-' + (sermon.titulo || 'pregacao').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0,30) + '.pdf');
  toast('PDF gerado!', 'success');
}

// =============================================

// =============================================
// METRICAS DE CUSTO - SUPER ADMIN
// =============================================
var CUSTOS_KEY = 'sa_custos_config';

function initMetricasCusto() {
  carregarCustosSalvos();
  var btnSalvar = document.getElementById('btn-salvar-custos');
  if (btnSalvar) btnSalvar.addEventListener('click', salvarCustos);
  verificarRenovacoes();
}

function carregarCustosSalvos() {
  try {
    var saved = localStorage.getItem(CUSTOS_KEY);
    if (saved) {
      var d = JSON.parse(saved);
      var el = function(id) { return document.getElementById(id); };
      if (el('custo-netlify'))        el('custo-netlify').value        = d.netlify        || 0;
      if (el('custo-supabase'))       el('custo-supabase').value       = d.supabase       || 0;
      if (el('custo-outros'))         el('custo-outros').value         = d.outros         || 0;
      if (el('renov-netlify'))        el('renov-netlify').value        = d.renov_netlify  || '';
      if (el('renov-supabase'))       el('renov-supabase').value       = d.renov_supabase || '';
    }
  } catch(e) {}
  atualizarMetricas();
}

function salvarCustos() {
  var dados = {
    netlify:        parseFloat((document.getElementById('custo-netlify')||{}).value)  || 0,
    supabase:       parseFloat((document.getElementById('custo-supabase')||{}).value) || 0,
    outros:         parseFloat((document.getElementById('custo-outros')||{}).value)   || 0,
    renov_netlify:  (document.getElementById('renov-netlify')||{}).value  || '',
    renov_supabase: (document.getElementById('renov-supabase')||{}).value || '',
  };
  localStorage.setItem(CUSTOS_KEY, JSON.stringify(dados));
  atualizarMetricas();
  verificarRenovacoes();
  toast('Custos salvos!', 'success');
}

function verificarRenovacoes() {
  var hoje = new Date();
  var alertas = [];

  ['netlify', 'supabase'].forEach(function(servico) {
    var el = document.getElementById('renov-' + servico);
    if (!el || !el.value) return;
    var data = new Date(el.value + 'T00:00:00');
    var dias = Math.ceil((data - hoje) / (1000 * 60 * 60 * 24));
    var badge = document.getElementById('badge-renov-' + servico);
    if (!badge) return;
    if (dias < 0) {
      badge.textContent = 'VENCIDO';
      badge.style.background = 'rgba(239,68,68,.2)';
      badge.style.color = '#ef4444';
      badge.style.display = 'inline-flex';
      alertas.push(servico.toUpperCase() + ' vencido!');
    } else if (dias <= 7) {
      badge.textContent = 'Vence em ' + dias + 'd';
      badge.style.background = 'rgba(245,158,11,.2)';
      badge.style.color = '#f59e0b';
      badge.style.display = 'inline-flex';
      alertas.push(servico.toUpperCase() + ' vence em ' + dias + ' dia(s)!');
    } else {
      badge.textContent = dias + ' dias';
      badge.style.background = 'rgba(16,185,129,.15)';
      badge.style.color = '#10b981';
      badge.style.display = 'inline-flex';
    }
  });

  // Mostrar banner de alerta no topo do super admin
  var bannerEl = document.getElementById('sa-renov-banner');
  if (alertas.length > 0) {
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'sa-renov-banner';
      var content = document.querySelector('.sa-content');
      if (content) content.insertBefore(bannerEl, content.firstChild);
    }
    bannerEl.style.cssText = 'background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#fca5a5;display:flex;align-items:center;gap:10px';
    bannerEl.innerHTML = '<span style="font-size:18px">&#9888;</span><strong>Atenção:</strong> ' + alertas.join(' · ') + ' Verifique as renovações no painel de métricas.';
  } else if (bannerEl) {
    bannerEl.remove();
  }
}

function atualizarMetricas() {
  var netlify  = parseFloat((document.getElementById('custo-netlify')||{}).value)  || 0;
  var supabase = parseFloat((document.getElementById('custo-supabase')||{}).value) || 0;
  var outros   = parseFloat((document.getElementById('custo-outros')||{}).value)   || 0;
  var totalCusto = netlify + supabase + outros;

  var mrrEl = document.getElementById('sa-mrr');
  var mrrVal = mrrEl ? parseFloat(mrrEl.textContent.replace('R$','').replace(',','.')) || 0 : 0;

  var mrrDisplay = document.getElementById('sa-mrr-display');
  if (mrrDisplay) mrrDisplay.textContent = 'R$ ' + mrrVal.toFixed(2);

  var lucro  = mrrVal - totalCusto;
  var margem = mrrVal > 0 ? ((lucro / mrrVal) * 100).toFixed(1) : 0;
  var cor    = lucro >= 0 ? '#10b981' : '#ef4444';

  var el = function(id) { return document.getElementById(id); };
  if (el('met-custo-total')) el('met-custo-total').textContent = 'R$ ' + totalCusto.toFixed(2);
  if (el('met-lucro'))       { el('met-lucro').textContent = 'R$ ' + lucro.toFixed(2); el('met-lucro').style.color = cor; }
  if (el('met-margem'))      { el('met-margem').textContent = margem + '%'; el('met-margem').style.color = cor; }
}
window.initMetricasCusto = initMetricasCusto;
window.atualizarMetricas = atualizarMetricas;

// Expor globalmente
window.initSuperAdmin       = initSuperAdmin;
window.initConfiguracoes    = initConfiguracoes;
window.exportarBackup       = exportarBackup;
window.importarBackup       = importarBackup;
window.exportarRelatorioSA  = exportarRelatorioSA;
window.gerarPDFSermao       = gerarPDFSermao;
window.solicitarUpgrade     = solicitarUpgrade;
window.abrirModalPix        = abrirModalPix;
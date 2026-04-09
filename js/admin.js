// ADMIN
// =============================================
document.querySelectorAll('[data-admin-tab]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var tab = this.getAttribute('data-admin-tab');
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    document.getElementById('admin-services').classList.toggle('hidden', tab !== 'services');
    document.getElementById('admin-dashboard').classList.toggle('hidden', tab !== 'dashboard');
    document.getElementById('admin-bulk').classList.toggle('hidden', tab !== 'bulk');
    document.getElementById('admin-bulk-edit').classList.toggle('hidden', tab !== 'bulk-edit');
    document.getElementById('admin-escala-massa').classList.toggle('hidden', tab !== 'escala-massa');
    document.getElementById('admin-users').classList.toggle('hidden', tab !== 'users');
    document.getElementById('admin-aprovacoes').classList.toggle('hidden', tab !== 'aprovacoes');
    document.getElementById('admin-convites').classList.toggle('hidden', tab !== 'convites');
    document.getElementById('admin-configuracoes').classList.toggle('hidden', tab !== 'configuracoes');
    if (tab === 'users') loadUsersTable();
    if (tab === 'services') renderAdminServices();
    if (tab === 'bulk') initBulkTab();
    if (tab === 'bulk-edit') initBulkEditTab();
    if (tab === 'escala-massa') initEscalaMassa();
    if (tab === 'dashboard') initDashboard();
    if (tab === 'aprovacoes') carregarAprovacoes();
    if (tab === 'convites') initConvites();
    if (tab === 'configuracoes') initConfiguracoes();
    if (tab === 'configuracoes' && window.verificarAvisoBackup) verificarAvisoBackup();
  });
});

(document.getElementById('btn-new-service')||{addEventListener:function(){}}).addEventListener('click', openNewServiceModal);

function renderAdminServices() {
  renderServiceCards(allServices, 'admin-services-list');
}

// =============================================
// GERACAO EM MASSA
// =============================================

// Dias da semana: 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
var DAY_NAMES = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];

// =============================================
// APROVACAO DE USUARIOS
// =============================================
function carregarAprovacoes() {
  var churchId = currentProfile && currentProfile.church_id;
  if (!churchId) return;
  var tbody = document.getElementById('aprovacoes-tbody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted)">Carregando...</td></tr>';

  sb.from('profiles').select('*')
    .eq('church_id', churchId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .then(function(res) {
      var lista = res.data || [];

      // Atualizar badge
      var badge = document.getElementById('badge-aprov');
      if (badge) { badge.textContent = lista.length; badge.style.display = lista.length > 0 ? 'inline' : 'none'; }

      if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--muted)">Nenhum usuario aguardando aprovacao &#127881;</td></tr>';
        return;
      }

      tbody.innerHTML = lista.map(function(u) {
        var dt = new Date(u.created_at).toLocaleDateString('pt-BR');
        return '<tr>' +
          '<td><strong>' + u.name + '</strong></td>' +
          '<td style="color:var(--muted);font-size:13px">' + (u.email || '-') + '</td>' +
          '<td style="color:var(--muted);font-size:13px">' + dt + '</td>' +
          '<td style="white-space:nowrap">' +
            '<select class="aprov-role-sel" data-uid="' + u.id + '" style="padding:5px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;margin-right:6px">' +
              '<option value="voluntario">Voluntario</option>' +
              '<option value="lider">Lider</option>' +
              '<option value="pastor">Pastor</option>' +
              '<option value="admin">Admin</option>' +
            '</select>' +
            '<button class="btn btn-success btn-sm aprov-btn" data-uid="' + u.id + '">&#10003; Aprovar</button>' +
            '<button class="btn btn-danger btn-sm bloquear-btn" data-uid="' + u.id + '" style="margin-left:4px">&#10005; Bloquear</button>' +
          '</td>' +
        '</tr>';
      }).join('');

      tbody.querySelectorAll('.aprov-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var uid = this.getAttribute('data-uid');
          var role = tbody.querySelector('.aprov-role-sel[data-uid="' + uid + '"]').value;
          btn.disabled = true; btn.textContent = 'Aprovando...';
          sb.rpc('approve_user', { p_user_id: uid, p_new_role: role }).then(function(res) {
            if (res.error) { toast('Erro: ' + res.error.message, 'error'); btn.disabled = false; return; }
            toast('Usuario aprovado como ' + role + '!', 'success');
            carregarAprovacoes();
            verificarPendentes();
          });
        });
      });

      tbody.querySelectorAll('.bloquear-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var uid = this.getAttribute('data-uid');
          if (!confirm('Bloquear este usuario?')) return;
          sb.rpc('block_user', { p_user_id: uid }).then(function(res) {
            if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
            toast('Usuario bloqueado.', 'success');
            carregarAprovacoes();
          });
        });
      });
    });
}

// =============================================
// EDITAR EM MASSA
// =============================================
var bulkEditInit = false;
function initBulkEditTab() {
  if (bulkEditInit) return;
  bulkEditInit = true;

  document.getElementById('btn-bulk-edit-search').addEventListener('click', buscarCultosParaEditar);

  // Carregar tipos de culto dinamicamente no editar em massa
  carregarTiposBulkEdit();
  carregarLocaisBulkEdit();

  document.getElementById('btn-bulk-edit-apply').addEventListener('click', function() {
    var novoLocal = document.getElementById('bulk-edit-new-location').value;
    var novoTime  = document.getElementById('bulk-edit-new-time').value;
    if (!novoLocal && !novoTime) { toast('Selecione um local ou horario para alterar.', 'error'); return; }

    var checkboxes = document.querySelectorAll('.bulk-edit-check:checked');
    if (checkboxes.length === 0) { toast('Selecione ao menos um culto.', 'error'); return; }

    var ids = Array.from(checkboxes).map(function(c){ return c.getAttribute('data-id'); });
    if (!confirm('Alterar ' + ids.length + ' cultos selecionados?')) return;

    var updates = {};
    if (novoLocal) updates.location = novoLocal;
    if (novoTime)  updates.time = novoTime + ':00';

    // Atualiza em lotes
    var promises = ids.map(function(id) {
      return sb.from('services').update(updates).eq('id', id);
    });
    Promise.all(promises).then(function(results) {
      var erros = results.filter(function(r){ return r.error; });
      if (erros.length > 0) { toast('Erro em alguns registros.', 'error'); return; }
      toast(ids.length + ' cultos atualizados!', 'success');
      buscarCultosParaEditar();
      loadServices().then(function(){ renderCalendar(); renderServices(); });
    });
  });

  document.getElementById('btn-bulk-edit-delete-sel').addEventListener('click', function() {
    var checkboxes = document.querySelectorAll('.bulk-edit-check:checked');
    if (checkboxes.length === 0) { toast('Selecione ao menos um culto.', 'error'); return; }
    var ids = Array.from(checkboxes).map(function(c){ return c.getAttribute('data-id'); });
    if (!confirm('EXCLUIR ' + ids.length + ' cultos selecionados? Isso nao pode ser desfeito!')) return;
    sb.from('services').delete().in('id', ids).then(function(res) {
      if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
      toast(ids.length + ' cultos excluidos.', 'success');
      buscarCultosParaEditar();
      loadServices().then(function(){ renderCalendar(); renderServices(); });
    });
  });

  document.getElementById('bulk-edit-check-all').addEventListener('change', function() {
    document.querySelectorAll('.bulk-edit-check').forEach(function(c){ c.checked = this.checked; }.bind(this));
  });
}

function carregarTiposBulkEdit() {
  if (!currentProfile || !currentProfile.church_id) return;
  var sel = document.getElementById('bulk-edit-type');
  if (!sel) return;
  sb.from('services')
    .select('service_type_key, title, location, time')
    .eq('church_id', currentProfile.church_id)
    .then(function(res) {
      var seen = {}, opts = '<option value="">-- Selecione --</option>';
      (res.data || []).forEach(function(s) {
        var key = s.service_type_key || s.title.toLowerCase().replace(/[^a-z0-9]/g,'-');
        if (!seen[key]) {
          seen[key] = true;
          opts += '<option value="' + key + '">' + s.title + ' - ' + (s.location||'') + ' - ' + (s.time||'').slice(0,5) + '</option>';
        }
      });
      sel.innerHTML = opts;
    });
}

function carregarLocaisBulkEdit() {
  if (!currentProfile || !currentProfile.church_id) return;
  var sel = document.getElementById('bulk-edit-new-location');
  if (!sel) return;
  sb.from('services').select('location').eq('church_id', currentProfile.church_id)
    .then(function(res) {
      var seen = {}, opts = '<option value="">-- Local (sem alterar) --</option>';
      var locs = [];
      (res.data || []).forEach(function(s) {
        var loc = (s.location || '').trim();
        if (loc && !seen[loc]) { seen[loc] = true; locs.push(loc); opts += '<option value="' + loc + '">' + loc + '</option>'; }
      });
      // Adicionar locais do localStorage
      var chave  = 'locais_' + currentProfile.church_id;
      var salvos = JSON.parse(localStorage.getItem(chave) || '[]');
      salvos.forEach(function(l) {
        if (l.nome && !seen[l.nome]) { seen[l.nome] = true; opts += '<option value="' + l.nome + '">' + l.nome + '</option>'; }
      });
      window._servicosLocais = locs;
      sel.innerHTML = opts;
    });
}

function buscarCultosParaEditar() {
  var typeKey = document.getElementById('bulk-edit-type').value;
  var mes     = parseInt(document.getElementById('bulk-edit-mes').value);
  var ano     = parseInt(document.getElementById('bulk-edit-ano').value);

  if (!typeKey) { toast('Selecione o tipo de culto.', 'error'); return; }

  var query = sb.from('services').select('id, title, date, time, location, status, color')
    .eq('service_type_key', typeKey)
    .order('date', { ascending: true });

  if (mes > 0) {
    var mm  = String(mes).padStart(2,'0');
    var ini = ano + '-' + mm + '-01';
    var fim = ano + '-' + mm + '-' + new Date(ano, mes, 0).getDate();
    query = query.gte('date', ini).lte('date', fim);
  } else {
    query = query.gte('date', ano + '-01-01').lte('date', ano + '-12-31');
  }

  query.then(function(res) {
    var cultos = res.data || [];
    var resultsEl = document.getElementById('bulk-edit-results');
    var tbody = document.getElementById('bulk-edit-tbody');
    document.getElementById('bulk-edit-count').textContent = cultos.length + ' cultos encontrados';
    resultsEl.classList.remove('hidden');

    if (cultos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted)">Nenhum culto encontrado</td></tr>';
      return;
    }

    var statusMap = { scheduled: 'Agendado', completed: 'Realizado', cancelled: 'Cancelado' };
    tbody.innerHTML = cultos.map(function(s) {
      var dt = new Date(s.date + 'T00:00:00');
      var dateLabel = dt.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short', year:'2-digit' });
      var color = s.color || '#f59e0b';
      return '<tr>' +
        '<td><input type="checkbox" class="bulk-edit-check" data-id="' + s.id + '"/></td>' +
        '<td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + color + ';margin-right:6px"></span>' + s.title + '</td>' +
        '<td style="font-family:var(--font-mono);font-size:12px">' + dateLabel + '</td>' +
        '<td style="font-family:var(--font-mono);font-size:12px">' + (s.time||'').slice(0,5) + '</td>' +
        '<td>' + s.location + '</td>' +
        '<td><span class="card-status status-' + (s.status||'scheduled') + '">' + (statusMap[s.status]||'Agendado') + '</span></td>' +
        '<td>' +
          '<select class="bulk-edit-row-status" data-id="' + s.id + '" style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">' +
            '<option value="scheduled"' + (s.status==='scheduled'?' selected':'') + '>Agendado</option>' +
            '<option value="completed"' + (s.status==='completed'?' selected':'') + '>Realizado</option>' +
            '<option value="cancelled"' + (s.status==='cancelled'?' selected':'') + '>Cancelado</option>' +
          '</select>' +
        '</td>' +
      '</tr>';
    }).join('');

    // Listener para alterar status individual
    tbody.querySelectorAll('.bulk-edit-row-status').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var id = this.getAttribute('data-id');
        var st = this.value;
        sb.from('services').update({ status: st }).eq('id', id).then(function(res) {
          if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
          toast('Status atualizado!', 'success');
          loadServices().then(function(){ renderCalendar(); renderServices(); });
        });
      });
    });
  });
}

var bulkTabInit = false;
function initBulkTab() {
  if (bulkTabInit) { carregarTiposCultosBulk(); return; }
  bulkTabInit = true;

  // Preview ao mudar campos
  ['bulk-add-nome','bulk-add-recorrencia','bulk-add-hora','bulk-add-year'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.addEventListener('change', atualizarPreviewBulk); el.addEventListener('input', atualizarPreviewBulk); }
  });

  // Botao adicionar em massa
  var btnAdd = document.getElementById('btn-bulk-add');
  if (btnAdd) btnAdd.addEventListener('click', adicionarEmMassa);

  // Botao remover em massa
  var btnDel = document.getElementById('btn-bulk-del');
  if (btnDel) btnDel.addEventListener('click', removerEmMassa);

  var delType = document.getElementById('bulk-del-type');
  var delYear = document.getElementById('bulk-del-year');
  if (delType) delType.onchange = function() { atualizarPreviewDel(); };
  if (delYear) delYear.onchange = function() { atualizarPreviewDel(); };

  carregarTiposCultosBulk();
}

function atualizarPreviewDel() {
  var tipo = document.getElementById('bulk-del-type').value;
  var ano  = document.getElementById('bulk-del-year').value;
  if (!tipo || !ano) return;
  sb.from('services').select('id', { count: 'exact' })
    .eq('church_id', currentProfile.church_id)
    .eq('service_type_key', tipo)
    .gte('date', ano + '-01-01').lte('date', ano + '-12-31')
    .then(function(r) {
      document.getElementById('bulk-del-preview').textContent =
        (r.count || 0) + ' cultos encontrados para remover em ' + ano;
    });
}

function atualizarPreviewBulk() {
  var nome = (document.getElementById('bulk-add-nome') || {}).value || '';
  var rec  = (document.getElementById('bulk-add-recorrencia') || {}).value || '';
  var ano  = parseInt((document.getElementById('bulk-add-year') || {}).value || '2026');
  if (!nome.trim() || !rec) { return; }
  var total = contarDatasParaGerar(rec, ano);
  var diasPT = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
  var parts = rec.split('-');
  var dow = parseInt(parts[parts.length-1]);
  var recType = parts[0];
  var recLabel = recType === 'weekly' ? 'Toda ' + diasPT[dow] : 'Mensal';
  var prev = document.getElementById('bulk-add-preview');
  if (prev) prev.textContent = total + ' cultos serao gerados (' + recLabel + ')';
}

function contarDatasParaGerar(rec, ano) {
  var parts = rec.split('-');
  var recType = parts[0];
  var weekNum = parseInt(parts[1]) || 1;
  var dow = parseInt(parts[parts.length-1]);
  var count = 0;
  var dt = new Date(ano, 0, 1);
  var end = new Date(ano, 11, 31);
  while (dt <= end) {
    var d = dt.getDay();
    if (recType === 'weekly' && d === dow) { count++; }
    else if (recType === 'monthly' && d === dow) {
      var first = new Date(dt.getFullYear(), dt.getMonth(), 1);
      var diff = (dow - first.getDay() + 7) % 7;
      var nthD = 1 + diff + (weekNum - 1) * 7;
      if (dt.getDate() === nthD) count++;
    }
    dt.setDate(dt.getDate() + 1);
  }
  return count;
}

function adicionarEmMassa() {
  var nome  = (document.getElementById('bulk-add-nome') || {}).value || '';
  var rec   = (document.getElementById('bulk-add-recorrencia') || {}).value || '';
  var hora  = (document.getElementById('bulk-add-hora') || {}).value || '19:00';
  var local = (document.getElementById('bulk-add-local') || {}).value || 'Sede';
  var cor   = (document.getElementById('bulk-add-cor') || {}).value || '#f59e0b';
  var ano   = parseInt((document.getElementById('bulk-add-year') || {}).value || '2026');

  nome = nome.trim(); local = local.trim() || 'Sede';
  if (!nome) { toast('Informe o nome do culto.', 'error'); return; }

  var parts   = rec.split('-');
  var recType = parts[0];
  var weekNum = parseInt(parts[1]) || 1;
  var dow     = parseInt(parts[parts.length-1]);
  var typeKey = nome.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').slice(0,30) + '-' + dow;

  var cultos = [];
  var dt = new Date(ano, 0, 1);
  var end = new Date(ano, 11, 31);
  while (dt <= end) {
    var d = dt.getDay();
    var ds = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
    var add = false;
    if (recType === 'weekly' && d === dow) add = true;
    else if (recType === 'monthly' && d === dow) {
      var first = new Date(dt.getFullYear(), dt.getMonth(), 1);
      var diff  = (dow - first.getDay() + 7) % 7;
      var nthD  = 1 + diff + (weekNum - 1) * 7;
      if (dt.getDate() === nthD) add = true;
    }
    if (add) cultos.push({
      church_id: currentProfile.church_id,
      service_type_key: typeKey,
      title: nome, location: local,
      date: ds, time: hora + ':00',
      color: cor, status: 'scheduled',
      created_by: currentUser.id
    });
    dt.setDate(dt.getDate() + 1);
  }

  if (!cultos.length) { toast('Nenhuma data encontrada.', 'error'); return; }
  if (!confirm('Gerar ' + cultos.length + ' cultos de "' + nome + '" para ' + ano + '?')) return;

  var btn = document.getElementById('btn-bulk-add');
  btn.disabled = true; btn.textContent = 'Gerando...';

  var chunks = [];
  for (var i = 0; i < cultos.length; i += 100) chunks.push(cultos.slice(i, i+100));
  var p = Promise.resolve();
  chunks.forEach(function(chunk) { p = p.then(function() { return sb.from('services').insert(chunk); }); });
  p.then(function() {
    btn.disabled = false; btn.textContent = 'Gerar Cultos para o Ano';
    toast(cultos.length + ' cultos adicionados com sucesso!', 'success');
    loadServices().then(function() { renderCalendar(); renderServices(); });
    carregarTiposCultosBulk();
  }).catch(function(err) {
    btn.disabled = false; btn.textContent = 'Gerar Cultos para o Ano';
    toast('Erro: ' + err.message, 'error');
  });
}

function removerEmMassa() {
  var tipo = (document.getElementById('bulk-del-type') || {}).value;
  var ano  = (document.getElementById('bulk-del-year') || {}).value;
  if (!tipo) { toast('Selecione o tipo de culto.', 'error'); return; }
  var prev = document.getElementById('bulk-del-preview');
  if (!confirm('Remover os cultos de ' + ano + '? Esta acao nao pode ser desfeita!')) return;

  sb.from('services').delete()
    .eq('church_id', currentProfile.church_id)
    .eq('service_type_key', tipo)
    .gte('date', ano + '-01-01')
    .lte('date', ano + '-12-31')
    .then(function(r) {
      if (r.error) { toast('Erro: ' + r.error.message, 'error'); return; }
      toast('Cultos removidos com sucesso!', 'success');
      if (prev) prev.textContent = '';
      loadServices().then(function() { renderCalendar(); renderServices(); });
      carregarTiposCultosBulk();
    });
}
function carregarTiposCultoSelect(selectId) {
  if (!currentProfile || !currentProfile.church_id) return;
  var sel = document.getElementById(selectId);
  if (!sel) return;
  sb.from('services')
    .select('service_type_key, title, location, time, color')
    .eq('church_id', currentProfile.church_id)
    .order('title')
    .then(function(res) {
      var rows = res.data || [];
      var seen = {}, tipos = [];
      rows.forEach(function(r) {
        var key = r.service_type_key || r.title.toLowerCase().replace(/[^a-z0-9]/g,'-');
        if (!seen[key]) {
          seen[key] = true;
          tipos.push({ key: key, title: r.title, location: r.location, time: r.time, color: r.color });
        }
      });
      sel.innerHTML = '<option value="">-- Selecione --</option>' +
        '<option value="custom">Evento Especial (nome livre)</option>';
      tipos.forEach(function(t) {
        var opt = document.createElement('option');
        opt.value = t.key;
        opt.textContent = t.title + (t.location ? ' - ' + t.location : '');
        sel.appendChild(opt);
      });
      // Atualizar SERVICE_META
      tipos.forEach(function(t) {
        if (!SERVICE_META[t.key]) {
          SERVICE_META[t.key] = {
            title: t.title, location: t.location || 'Sede',
            time: (t.time||'19:00').slice(0,5), color: t.color || '#f59e0b',
            recurrence: 'weekly', dayOfWeek: 0
          };
        }
      });
    });
}

function carregarTiposCultosBulk() {
  if (!currentProfile || !currentProfile.church_id) return;
  // Buscar tipos unicos de culto desta igreja
  sb.from('services')
    .select('service_type_key, title, location, time, color')
    .eq('church_id', currentProfile.church_id)
    .order('title')
    .then(function(res) {
      var rows = res.data || [];
      // Deduplicar por service_type_key
      var seen = {};
      var tipos = [];
      rows.forEach(function(r) {
        var key = r.service_type_key || r.title.toLowerCase().replace(/[^a-z0-9]/g,'-');
        if (!seen[key]) {
          seen[key] = true;
          tipos.push({ key: key, title: r.title, location: r.location, time: r.time, color: r.color });
        }
      });
      if (!tipos.length) return;

      // Popular os 3 selects de bulk
      ['bulk-add-type', 'bulk-del-type', 'bulk-edit-type'].forEach(function(selId) {
        var sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Selecione o culto --</option>';
        tipos.forEach(function(t) {
          var opt = document.createElement('option');
          opt.value = t.key;
          opt.textContent = t.title + (t.location ? ' - ' + t.location : '') + (t.time ? ' - ' + t.time.slice(0,5) : '');
          sel.appendChild(opt);
        });
      });

      // Atualizar SERVICE_META dinamicamente
      tipos.forEach(function(t) {
        var timeStr = (t.time || '19:00:00').slice(0,5);
        var existing = SERVICE_META[t.key];
        if (!existing) {
          // Tentar inferir dia da semana do primeiro service com essa key
          var firstService = rows.find(function(r) {
            return (r.service_type_key || r.title.toLowerCase().replace(/[^a-z0-9]/g,'-')) === t.key;
          });
          var dow = 0;
          if (firstService && firstService.date) {
            dow = new Date(firstService.date + 'T00:00:00').getDay();
          }
          SERVICE_META[t.key] = {
            title: t.title, location: t.location || 'SEDE',
            time: timeStr, color: t.color || '#f59e0b',
            recurrence: 'weekly', dayOfWeek: dow
          };
        }
      });
    });
}

function getDatesForType(typeKey, year) {
  var meta = SERVICE_META[typeKey];
  if (!meta || meta.recurrence === 'none') return [];
  var dates = [];
  var dt = new Date(year, 0, 1);
  var end = new Date(year, 11, 31);

  while (dt <= end) {
    var dow = dt.getDay();
    var added = false;

    if (meta.recurrence === 'weekly' && dow === meta.dayOfWeek) {
      dates.push(new Date(dt));
      added = true;
    }

    if (meta.recurrence === 'monthly' && dow === meta.dayOfWeek && !added) {
      // Verificar se e a Nth ocorrencia do mes
      var firstOfMonth = new Date(dt.getFullYear(), dt.getMonth(), 1);
      var firstDow = firstOfMonth.getDay();
      var diff = (meta.dayOfWeek - firstDow + 7) % 7;
      var firstOccurrence = new Date(firstOfMonth);
      firstOccurrence.setDate(1 + diff);
      // Calcular qual ocorrencia e essa data
      var weekNum = Math.floor((dt.getDate() - firstOccurrence.getDate()) / 7) + 1;
      if (weekNum === meta.weekOfMonth) {
        dates.push(new Date(dt));
      }
    }

    dt.setDate(dt.getDate() + 1);
  }
  return dates;
}

function fmtDate(dt) {
  var y = dt.getFullYear();
  var m = String(dt.getMonth() + 1).padStart(2,'0');
  var d = String(dt.getDate()).padStart(2,'0');
  return y + '-' + m + '-' + d;
}

// Funcoes bulk antigas removidas
// btn-bulk-delete removido (substituido por btn-bulk-del)

function loadUsersTable() {
  var churchId = currentProfile && currentProfile.church_id;
  if (!churchId) {
    document.getElementById('users-table-body').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted)">Sem church_id definido</td></tr>';
    return;
  }
  sb.from('profiles').select('*').eq('church_id', churchId).eq('status', 'approved').order('name').then(function(res) {
    var tbody = document.getElementById('users-table-body');
    if (res.error || !res.data) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)">Erro ao carregar</td></tr>';
      return;
    }
    var deptLabels = { louvor: 'Louvor', som: 'Som', projecao: 'LED/Proj', iluminacao: 'Iluminacao', live: 'Live' };
    tbody.innerHTML = res.data.map(function(u) {
      var phoneClean = (u.phone || '').replace(/[^0-9]/g, '');
      var whatsBtn = phoneClean
        ? '<a href="https://wa.me/55' + phoneClean + '" target="_blank" class="btn btn-success btn-sm" style="margin-left:4px" title="Abrir WhatsApp">&#128242;</a>'
        : '';
      return '<tr>' +
        '<td><strong>' + u.name + '</strong>' + (u.phone ? '<div style="font-size:11px;color:var(--muted)">' + u.phone + '</div>' : '') + '</td>' +
        '<td style="color:var(--muted);font-size:12px">' + u.email + '</td>' +
        '<td><span class="role-badge role-' + u.role + '">' + roleLabel(u.role) + '</span></td>' +
        '<td>' + (u.department ? (deptLabels[u.department] || u.department) : '<span style="color:var(--muted)">-</span>') + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn btn-secondary btn-sm" data-uid="' + u.id +
            '" data-name="' + u.name + '" data-email="' + u.email +
            '" data-role="' + u.role + '" data-dept="' + (u.department || '') +
            '" data-phone="' + (u.phone || '') + '" onclick-edit>Editar</button>' +
          '<button class="btn btn-secondary btn-sm" style="margin-left:4px" data-email="' + u.email + '" onclick-reset title="Enviar link de redefinicao de senha">&#128274; Senha</button>' +
          whatsBtn +
          (u.id !== currentUser.id ? '<button class="btn btn-danger btn-sm" style="margin-left:4px" data-uid="' + u.id + '" onclick-delete>Excluir</button>' : '') +
        '</td></tr>';
    }).join('');

    tbody.querySelectorAll('[onclick-edit]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openEditUserModal(
          this.getAttribute('data-uid'), this.getAttribute('data-name'),
          this.getAttribute('data-email'), this.getAttribute('data-role'),
          this.getAttribute('data-dept'), this.getAttribute('data-phone')
        );
      });
    });
    tbody.querySelectorAll('[onclick-delete]').forEach(function(btn) {
      btn.addEventListener('click', function() { deleteUser(this.getAttribute('data-uid')); });
    });
    tbody.querySelectorAll('[onclick-reset]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var email = this.getAttribute('data-email');
        if (!confirm('Enviar link de redefinicao de senha para ' + email + '?')) return;
        sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href }).then(function(res) {
          if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
          toast('Link enviado para ' + email + '!', 'success');
        });
      });
    });
  });
}


function openEditUserModal(id, name, email, role, dept, phone) {
  editingUserId = id;
  var r = currentProfile.role;
  document.getElementById('user-modal-title').textContent = 'Editar Usuario';
  document.getElementById('user-modal-name').value = name;
  document.getElementById('user-modal-email').value = email;
  document.getElementById('user-modal-email').disabled = false;
  document.getElementById('user-modal-role').value = role;
  document.getElementById('user-modal-dept').value = dept || '';
  document.getElementById('user-modal-phone').value = phone || '';

  // Lider pode editar nome, email e phone, mas nao pode mudar permissao/dept
  var adminOnlyFields = document.querySelectorAll('.admin-only-field');
  adminOnlyFields.forEach(function(el) {
    el.style.display = (r === 'admin') ? '' : 'none';
  });

  document.getElementById('new-user-modal').classList.remove('hidden');
}

document.getElementById('btn-close-user-modal').addEventListener('click', function() {
  document.getElementById('new-user-modal').classList.add('hidden');
});
document.getElementById('btn-cancel-user-modal').addEventListener('click', function() {
  document.getElementById('new-user-modal').classList.add('hidden');
});

document.getElementById('btn-save-user').addEventListener('click', function() {
  var name  = document.getElementById('user-modal-name').value.trim();
  var email = document.getElementById('user-modal-email').value.trim();
  var phone = document.getElementById('user-modal-phone').value.trim();
  var role  = document.getElementById('user-modal-role').value;
  var dept  = document.getElementById('user-modal-dept').value;
  var r     = currentProfile.role;

  if (!name) { toast('Informe o nome.', 'error'); return; }

  if (editingUserId) {
    // Campos que lider pode editar
    var updates = { name: name, phone: phone || null };
    // So admin pode mudar role, dept e email
    if (r === 'admin') {
      updates.role = role;
      updates.department = dept || null;
    }

    sb.from('profiles').update(updates).eq('id', editingUserId).then(function(res) {
      if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
      toast('Usuario atualizado!', 'success');
      document.getElementById('new-user-modal').classList.add('hidden');
      loadUsersTable();
      // Lider dash tambem precisa atualizar
      if (document.getElementById('lider-vol-body')) carregarLiderDash();
    });
  } else {
    toast('Para criar usuario, use a tela de Solicitar Acesso ou o painel Supabase Auth.', 'error');
  }
});

function deleteUser(id) {
  if (!confirm('Excluir usuario?')) return;
  sb.from('profiles').delete().eq('id', id).then(function(res) {
    if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
    toast('Usuario removido.', 'success');
    loadUsersTable();
  });
}

// =============================================
// PROFILE
// =============================================
(document.getElementById('btn-save-profile')||{addEventListener:function(){}}).addEventListener('click', function() {
  var name  = document.getElementById('profile-name').value.trim();
  var phone = (document.getElementById('profile-phone') ? document.getElementById('profile-phone').value.trim() : '');
  if (!name) { toast('Informe seu nome.', 'error'); return; }
  sb.from('profiles').update({ name: name, phone: phone || null }).eq('id', currentUser.id).then(function(res) {
    if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
    currentProfile.name = name;
    currentProfile.phone = phone;
    updateUserChip();
    toast('Perfil atualizado!', 'success');
  });
});

// Alterar senha do proprio usuario
(document.getElementById('btn-change-pass')||{addEventListener:function(){}}).addEventListener('click', function() {
  var newPass  = document.getElementById('profile-new-pass').value;
  var confPass = document.getElementById('profile-confirm-pass').value;
  if (!newPass) { toast('Digite a nova senha.', 'error'); return; }
  if (newPass.length < 6) { toast('Senha deve ter pelo menos 6 caracteres.', 'error'); return; }
  if (newPass !== confPass) { toast('As senhas nao conferem.', 'error'); return; }
  var btn = this; btn.disabled = true; btn.textContent = 'Alterando...';
  sb.auth.updateUser({ password: newPass }).then(function(res) {
    btn.disabled = false; btn.textContent = 'Alterar Senha';
    if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
    toast('Senha alterada com sucesso!', 'success');
    document.getElementById('profile-new-pass').value = '';
    document.getElementById('profile-confirm-pass').value = '';
  });
});

// =============================================
// LOCAIS DA IGREJA
// =============================================
function buscarCEP(cep) {
  var c = cep.replace(/[^0-9]/g,'');
  if (c.length !== 8) return;
  fetch('https://viacep.com.br/ws/' + c + '/json/')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.erro) { toast('CEP nao encontrado.', 'error'); return; }
      var rua    = document.getElementById('loc-rua');
      var bairro = document.getElementById('loc-bairro');
      var cidade = document.getElementById('loc-cidade');
      if (rua)    rua.value    = d.logradouro || '';
      if (bairro) bairro.value = d.bairro || '';
      if (cidade) cidade.value = (d.localidade||'') + (d.uf ? ' - ' + d.uf : '');
      toast('Endereco preenchido!', 'success');
    })
    .catch(function() { toast('Erro ao buscar CEP.', 'error'); });
}

function carregarLocais() {
  if (!currentProfile || !currentProfile.church_id) return;
  var lista = document.getElementById('locais-lista');
  if (!lista) return;
  var chave = 'locais_' + currentProfile.church_id;
  var saved = localStorage.getItem(chave);
  var locais = saved ? JSON.parse(saved) : [];
  renderLocais(locais);
}

function renderLocais(locais) {
  var lista = document.getElementById('locais-lista');
  if (!lista) return;
  if (!locais.length) {
    lista.innerHTML = '<p style="font-size:13px;color:var(--muted)">Nenhum local cadastrado ainda.</p>';
    return;
  }
  lista.innerHTML = locais.map(function(l, i) {
    var end = [l.rua, l.numero, l.bairro, l.cidade].filter(Boolean).join(', ');
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface2);border-radius:10px;margin-bottom:8px;gap:12px">' +
      '<div>' +
        '<div style="font-weight:700;font-size:13px">' + l.nome + '</div>' +
        '<div style="font-size:12px;color:var(--muted)">' + (end || 'Endereco nao informado') + (l.cep ? ' &bull; CEP: ' + l.cep : '') + '</div>' +
      '</div>' +
      '<button class="btn btn-danger btn-sm" onclick="deletarLocal(' + i + ')">&#10005;</button>' +
    '</div>';
  }).join('');
}

function salvarLocal() {
  var nome   = (document.getElementById('loc-nome') || {}).value.trim();
  var cep    = (document.getElementById('loc-cep') || {}).value.trim();
  var rua    = (document.getElementById('loc-rua') || {}).value.trim();
  var numero = (document.getElementById('loc-numero') || {}).value.trim();
  var bairro = (document.getElementById('loc-bairro') || {}).value.trim();
  var cidade = (document.getElementById('loc-cidade') || {}).value.trim();
  if (!nome) { toast('Informe o nome do local.', 'error'); return; }
  var chave  = 'locais_' + currentProfile.church_id;
  var locais = JSON.parse(localStorage.getItem(chave) || '[]');
  locais.push({ nome:nome, cep:cep, rua:rua, numero:numero, bairro:bairro, cidade:cidade });
  localStorage.setItem(chave, JSON.stringify(locais));
  // Limpar campos
  ['loc-nome','loc-cep','loc-rua','loc-numero','loc-bairro','loc-cidade'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  renderLocais(locais);
  atualizarSelectLocais();
  toast('Local salvo!', 'success');
}

function deletarLocal(idx) {
  if (!confirm('Remover este local?')) return;
  var chave  = 'locais_' + currentProfile.church_id;
  var locais = JSON.parse(localStorage.getItem(chave) || '[]');
  locais.splice(idx, 1);
  localStorage.setItem(chave, JSON.stringify(locais));
  renderLocais(locais);
  atualizarSelectLocais();
  toast('Local removido.', 'success');
}

function atualizarSelectLocais() {
  // Atualizar o select de local no editar em massa
  var chave  = 'locais_' + (currentProfile ? currentProfile.church_id : '');
  var locais = JSON.parse(localStorage.getItem(chave) || '[]');
  var sel = document.getElementById('bulk-edit-new-location');
  if (!sel) return;
  var opts = '<option value="">-- Local (sem alterar) --</option>';
  // Locais dos cultos
  var seen = {};
  (window._servicosLocais || []).forEach(function(loc) {
    if (loc && !seen[loc]) { seen[loc] = true; opts += '<option value="' + loc + '">' + loc + '</option>'; }
  });
  // Locais cadastrados
  locais.forEach(function(l) {
    if (!seen[l.nome]) { seen[l.nome] = true; opts += '<option value="' + l.nome + '">' + l.nome + '</option>'; }
  });
  sel.innerHTML = opts;
}

// =============================================

// Expor globalmente
window.renderAdminServices  = renderAdminServices;
window.loadUsersTable       = loadUsersTable;
window.carregarAprovacoes   = carregarAprovacoes;
window.initBulkTab          = initBulkTab;
window.initBulkEditTab      = initBulkEditTab;
window.openEditUserModal    = openEditUserModal;
window.deleteUser           = deleteUser;
window.carregarLocais       = carregarLocais;
window.salvarLocal          = salvarLocal;
window.deletarLocal         = deletarLocal;
// NEW / EDIT SERVICE MODAL
// =============================================
function openNewServiceModal() {
  editingServiceId = null;
  carregarTiposCultoSelect('new-svc-type');
  document.getElementById('new-svc-title').textContent = 'Cadastrar Novo Culto';
  document.getElementById('btn-save-service').textContent = 'Salvar na Agenda';
  ['new-svc-type','new-svc-date','new-svc-time','new-svc-name','new-svc-band',
   'new-svc-pastor','new-svc-repertoire','new-svc-dresscode','new-svc-sound',
   'new-svc-projection','new-svc-lighting','new-svc-live','new-svc-notes'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('event-name-group').classList.add('hidden');
  document.getElementById('new-service-modal').classList.remove('hidden');
  if (window.carregarUsuariosParaSelects) carregarUsuariosParaSelects();
}

function openEditServiceModal(id) {
  var s = allServices.find(function(x) { return x.id === id; });
  if (!s) return;
  var team = (s.service_teams && s.service_teams[0]) || {};
  editingServiceId = id;
  document.getElementById('new-svc-title').textContent = 'Editar Culto';
  document.getElementById('btn-save-service').textContent = 'Atualizar';
  document.getElementById('new-svc-type').value = s.service_type_key || 'custom';
  document.getElementById('new-svc-date').value = s.date;
  document.getElementById('new-svc-time').value = s.time ? s.time.slice(0,5) : '';
  document.getElementById('new-svc-name').value = s.title;
  document.getElementById('new-svc-location').value = s.location;
  document.getElementById('new-svc-band').value = team.worship_band || '';
  document.getElementById('new-svc-pastor').value = team.worship_pastor || '';
  document.getElementById('new-svc-repertoire').value = team.worship_repertoire || '';
  document.getElementById('new-svc-dresscode').value = team.worship_dress_code || '';
  document.getElementById('new-svc-sound').value = team.sound_operator || '';
  document.getElementById('new-svc-projection').value = team.projection_operator || '';
  document.getElementById('new-svc-lighting').value = team.lighting_operator || '';
  document.getElementById('new-svc-live').value = team.live_operator || '';
  document.getElementById('new-svc-notes').value = team.notes || '';
  document.getElementById('new-service-modal').classList.remove('hidden');
}

document.getElementById('btn-close-new-service').addEventListener('click', closeNewServiceModal);
document.getElementById('btn-cancel-new-service').addEventListener('click', closeNewServiceModal);
function closeNewServiceModal() {
  document.getElementById('new-service-modal').classList.add('hidden');
}

document.getElementById('new-svc-type').addEventListener('change', function() {
  var val = this.value;
  document.getElementById('event-name-group').classList.toggle('hidden', val !== 'custom');
  var meta = SERVICE_META[val];
  if (meta) {
    document.getElementById('new-svc-time').value = meta.time;
    document.getElementById('new-svc-location').value = meta.location;
  }
});

document.getElementById('btn-save-service').addEventListener('click', function() {
  var typeKey = document.getElementById('new-svc-type').value;
  if (!typeKey) { toast('Selecione o tipo de evento.', 'error'); return; }

  var meta = SERVICE_META[typeKey] || {};
  var title = (typeKey === 'custom')
    ? document.getElementById('new-svc-name').value.trim()
    : meta.title;
  if (!title) { toast('Informe o nome do evento.', 'error'); return; }

  var date = document.getElementById('new-svc-date').value;
  var time = document.getElementById('new-svc-time').value;
  if (!date || !time) { toast('Informe data e horario.', 'error'); return; }

  var location = document.getElementById('new-svc-location').value;
  var color = meta.color || '#f59e0b';

  var serviceData = {
    church_id: currentProfile.church_id,
    title: title,
    date: date,
    time: time + ':00',
    location: location,
    color: color,
    is_event: typeKey === 'custom',
    service_type_key: typeKey,
    status: 'scheduled',
    created_by: currentUser.id
  };

  var teamData = {
    worship_pastor:      document.getElementById('new-svc-pastor').value,
    worship_band:        document.getElementById('new-svc-band').value,
    worship_repertoire:  document.getElementById('new-svc-repertoire').value,
    worship_dress_code:  document.getElementById('new-svc-dresscode').value,
    sound_operator:      document.getElementById('new-svc-sound').value,
    projection_operator: document.getElementById('new-svc-projection').value,
    lighting_operator:   document.getElementById('new-svc-lighting').value,
    live_operator:       document.getElementById('new-svc-live').value,
    notes:               document.getElementById('new-svc-notes').value,
    updated_by:          currentUser.id
  };

  if (editingServiceId) {
    sb.from('services').update(serviceData).eq('id', editingServiceId).then(function(res) {
      if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
      var existTeam = allServices.find(function(s) { return s.id === editingServiceId; });
      var existTeamId = existTeam && existTeam.service_teams && existTeam.service_teams[0] && existTeam.service_teams[0].id;
      var teamPromise = existTeamId
        ? sb.from('service_teams').update(teamData).eq('id', existTeamId)
        : sb.from('service_teams').insert(Object.assign({ service_id: editingServiceId }, teamData));
      teamPromise.then(function() {
        toast('Culto atualizado!', 'success');
        closeNewServiceModal();
        loadServices().then(function() { renderCalendar(); renderServices(); renderAdminServices(); });
      });
    });
  } else {
    sb.from('services').insert(serviceData).select().single().then(function(res) {
      if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
      var newId = res.data.id;
      teamData.service_id = newId;
      sb.from('service_teams').insert(teamData).then(function() {
        toast('Culto adicionado a agenda!', 'success');
        closeNewServiceModal();
        loadServices().then(function() { renderCalendar(); renderServices(); renderAdminServices(); });
      });
    });
  }
});

function deleteService(id) {
  if (!confirm('Excluir este culto?')) return;
  sb.from('services').delete().eq('id', id).then(function(res) {
    if (res.error) { toast('Erro: ' + res.error.message, 'error'); return; }
    toast('Culto excluido.', 'success');
    closeServiceModal();
    loadServices().then(function() { renderCalendar(); renderServices(); renderAdminServices(); });
  });
}

// =============================================

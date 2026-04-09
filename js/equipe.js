// RENDER DA EQUIPE EXPANDIDA NO MODAL
// =============================================
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function renderEquipeEdit(team, role, dept) {
  var canAll = (role === 'admin');

  function multiInput(sectionId, icon, label, fieldKey, canEdit) {
    var pessoas = parseList(team[fieldKey] || '');
    var html = '<div class="equipe-section">' +
      '<div class="equipe-section-title">' + icon + ' ' + label + '</div>' +
      '<div class="multi-pessoa-list" id="list-' + sectionId + '">';
    if (pessoas.length === 0) {
      html += '<span style="font-size:12px;color:var(--muted);padding:4px">A definir</span>';
    } else {
      pessoas.forEach(function(p, i) {
        if (canEdit) {
          html += '<span class="pessoa-tag">' + escHtml(p) +
            '<span class="remove-pessoa" data-section="' + sectionId + '" data-idx="' + i + '">x</span></span>';
        } else {
          html += '<span class="pessoa-tag">' + escHtml(p) + '</span>';
        }
      });
    }
    html += '</div>';
    if (canEdit) {
      html += '<div class="add-pessoa-row">' +
        '<input type="text" id="inp-' + sectionId + '" placeholder="Nome da pessoa..." maxlength="60"/>' +
        '<button class="add-pessoa-btn" data-section="' + sectionId + '" data-field="' + fieldKey + '">+ Add</button>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  var html = '';

  // PASTOR / MINISTRO
  var canPastor = canAll;
  if (team.worship_pastor || canPastor) {
    html += '<div class="equipe-section">';
    html += '<div class="equipe-section-title">&#128591; Pastor / Ministro</div>';
    if (canPastor) {
      html += '<div style="display:flex;gap:8px;align-items:center">' +
        '<input type="text" id="edit-pastor" value="' + escAttr(team.worship_pastor||'') + '" ' +
        'placeholder="Nome do pastor ou ministro que ira pregar" ' +
        'style="flex:1;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:var(--font-body);font-size:14px"/>' +
        '<select id="edit-pastor-select" onchange="document.getElementById(\'edit-pastor\').value=this.value;this.value=\'\'" ' +
        'style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:13px">' +
        '<option value="">Selecionar...</option>' +
        '</select>' +
      '</div>';
      // populate select async
      html += '<script>setTimeout(function(){if(window._profilesCache){var s=document.getElementById("edit-pastor-select");if(s){window._profilesCache.forEach(function(p){var o=document.createElement("option");o.value=p.name;o.textContent=p.name;s.appendChild(o);});}}}  ,100);</script>';
    } else {
      html += '<div style="font-size:14px;font-weight:600;color:var(--text)">' +
        (team.worship_pastor || '<span style="color:var(--muted);font-style:italic">A definir</span>') + '</div>';
    }
    html += '</div>';
  }

  // LOUVOR
  var canLouvor = canAll || (role === 'lider' && dept === 'louvor');
  html += '<div class="equipe-section">';
  html += '<div class="equipe-section-title">&#127925; Louvor</div>';
  html += '<div class="form-group" style="margin-bottom:10px"><label>Banda / Ministerio</label>' +
    '<input type="text" id="edit-band" value="' + escAttr(team.worship_band||'') + '" placeholder="Ex: Banda da Havila - quem vai tocar aqui?" ' +
    (!canLouvor ? 'readonly style="opacity:.6"' : '') + '/></div>';
  if (canLouvor) {
    html += multiInput('vocais', '&#127908;', 'Vocais', 'worship_vocais', true);
    html += multiInput('teclado', '&#127929;', 'Teclado', 'worship_teclado', true);
    html += multiInput('violao', '&#127928;', 'Violao', 'worship_violao', true);
    html += multiInput('guitarra', '&#127928;', 'Guitarra', 'worship_guitarra', true);
    html += multiInput('bateria', '&#129345;', 'Bateria', 'worship_bateria', true);
    html += multiInput('baixo', '&#127932;', 'Baixo', 'worship_baixo', true);
    html += multiInput('louvor-outros', '&#127911;', 'Outros', 'worship_outros', true);
  } else {
    var camposLouvor = [
      {k:'worship_vocais',l:'Vocais',i:'&#127908;'},
      {k:'worship_teclado',l:'Teclado',i:'&#127929;'},
      {k:'worship_violao',l:'Violao',i:'&#127928;'},
      {k:'worship_guitarra',l:'Guitarra',i:'&#127928;'},
      {k:'worship_bateria',l:'Bateria',i:'&#129345;'},
      {k:'worship_baixo',l:'Baixo',i:'&#127932;'}
    ];
    camposLouvor.forEach(function(c) {
      var lista = parseList(team[c.k]||'');
      if (lista.length > 0) {
        html += '<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px">' + c.i + ' ' + c.l + '</div>';
        html += '<div class="multi-pessoa-list">' + lista.map(function(p){ return '<span class="pessoa-tag">'+escHtml(p)+'</span>'; }).join('') + '</div></div>';
      }
    });
  }
  html += '</div>';

  // REPERTORIO
  var canLouvor2 = canAll || (role === 'lider' && dept === 'louvor');
  if (canLouvor2) {
    html += '<div class="equipe-section">';
    html += '<div class="equipe-section-title">&#127925; Repertorio</div>';
    html += '<div class="form-group" style="margin-bottom:8px"><label>Cole o repertorio (uma musica por linha)</label>' +
      '<textarea id="edit-repertoire" style="min-height:120px;font-size:13px" ' +
      'placeholder="Ex: Gratidao E (Havila)">' + escHtml(team.worship_repertoire||'') + '</textarea></div>';
    html += '<div class="form-group"><label>Dress Code</label>' +
      '<input type="text" id="edit-dresscode" value="' + escAttr(team.worship_dress_code||'') + '" placeholder="Ex: Social / Casual"/></div>';
    html += '</div>';
  } else if (team.worship_repertoire) {
    var musicas = parseMusicasRepertorio(team.worship_repertoire);
    if (musicas.length > 0) {
      html += '<div class="equipe-section">';
      html += '<div class="equipe-section-title">&#127925; Repertorio</div>';
      musicas.forEach(function(m) {
        html += '<div class="musica-item"><span class="musica-titulo">' + escHtml(m.titulo) + '</span>';
        if (m.tom) html += '<span class="musica-tom">' + escHtml(m.tom) + '</span>';
        if (m.artista) html += '<div class="musica-artista">' + escHtml(m.artista) + '</div>';
        html += '</div>';
      });
      if (team.worship_dress_code) {
        html += '<div style="font-size:12px;color:var(--muted);margin-top:6px">Dress Code: <strong>' + escHtml(team.worship_dress_code) + '</strong></div>';
      }
      html += '</div>';
    }
  }

  // SOM
  var canSom = canAll || (role === 'lider' && dept === 'som');
  html += multiInput('som', '&#128266;', 'Som', 'sound_operators', canSom);

  // LED/PROJECAO
  var canProj = canAll || (role === 'lider' && dept === 'projecao');
  html += multiInput('proj', '&#128250;', 'LED / Projecao', 'projection_operators', canProj);

  // ILUMINACAO (1 pessoa)
  var canLuz = canAll || (role === 'lider' && dept === 'iluminacao');
  html += '<div class="equipe-section"><div class="equipe-section-title">&#128161; Iluminacao</div>';
  if (canLuz) {
    html += '<input type="text" id="edit-light" value="' + escAttr(team.lighting_operator||'') + '" ' +
      'placeholder="Operador de iluminacao" style="width:100%;padding:8px 10px;background:var(--surface);' +
      'border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font-body);font-size:14px"/>';
  } else {
    html += '<div style="font-size:14px;font-weight:500">' +
      (team.lighting_operator || '<span style="color:var(--muted);font-style:italic">A definir</span>') + '</div>';
  }
  html += '</div>';

  // LIVE
  var canLive = canAll || (role === 'lider' && dept === 'live');
  html += multiInput('live', '&#127909;', 'Live / Transmissao', 'live_operators', canLive);

  return html;
}


function addPessoa(sectionId, fieldKey) {
  var inp = document.getElementById('inp-' + sectionId);
  if (!inp) return;
  var nome = inp.value.trim();
  if (!nome) return;
  var container = document.getElementById('list-' + sectionId);
  // remove "A definir" se existir
  container.querySelectorAll('span').forEach(function(s){
    if (s.textContent.indexOf('A definir') !== -1) s.remove();
  });
  var idx = container.querySelectorAll('.pessoa-tag').length;
  if (idx >= 10) { alert('Maximo de 10 pessoas por funcao.'); return; }
  var tag = document.createElement('span');
  tag.className = 'pessoa-tag';
  tag.innerHTML = nome + '<span class="remove-pessoa" data-section="' + sectionId + '" data-idx="' + idx + '">x</span>';
  tag.querySelector('.remove-pessoa').addEventListener('click', function() { tag.remove(); });
  container.appendChild(tag);
  inp.value = '';
  inp.focus();
}

function getListFromUI(sectionId) {
  var container = document.getElementById('list-' + sectionId);
  if (!container) return '';
  var tags = container.querySelectorAll('.pessoa-tag');
  var nomes = [];
  tags.forEach(function(t) {
    var clone = t.cloneNode(true);
    clone.querySelectorAll('.remove-pessoa').forEach(function(r){ r.remove(); });
    var n = clone.textContent.trim();
    if (n) nomes.push(n);
  });
  return joinList(nomes);
}

// =============================================
// START
// =============================================
// START
initApp();

// Expor funcoes no escopo global
window.openServiceModal = openServiceModal;
window.deletarLocal = deletarLocal;
window.gerarPDFSermao = gerarPDFSermao;
window.abrirModalPlanos = abrirModalPlanos;
window.atualizarBadgePlanoSidebar = atualizarBadgePlanoSidebar;
window.solicitarUpgrade = solicitarUpgrade;
window.addPessoa = addPessoa;
window.showOnboarding = showOnboarding;

// =============================================

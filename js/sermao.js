// PASTOR: ESBOCOS DE PREGACAO COM IA
// =============================================
// Configure sua chave da API Gemini abaixo
// Groq API chamada via Netlify Function (chave segura no servidor)

// =============================================
// CONFIGURACAO DOS PLANOS
// =============================================
var PLANOS = {
  trial:         { label:'Trial',         valor:0,     dias:7,  usuarios:5,   esbocos:1,   convites:false, wa_notif:false, locais:1   },
  basico:        { label:'Basico',        valor:19.90, dias:30, usuarios:15,  esbocos:0,   convites:true,  wa_notif:false, locais:1   },
  essencial:     { label:'Essencial',     valor:29.90, dias:30, usuarios:30,  esbocos:5,   convites:true,  wa_notif:true,  locais:2   },
  profissional:  { label:'Profissional',  valor:39.90, dias:30, usuarios:60,  esbocos:20,  convites:true,  wa_notif:true,  locais:5   },
  premium:       { label:'Premium',       valor:59.90, dias:30, usuarios:999, esbocos:999, convites:true,  wa_notif:true,  locais:999 },
  free:          { label:'Free',          valor:0,     dias:30, usuarios:10,  esbocos:0,   convites:false, wa_notif:false, locais:1   },
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

  // Status: trial → trial, qualquer outro → active
  var elStatus = document.getElementById('sa-edit-status');
  if (elStatus) elStatus.value = (plano === 'trial' || plano === 'free') ? 'trial' : 'active';

  // Data de expiração: hoje + dias do plano
  var exp = document.getElementById('sa-edit-expires');
  if (exp) {
    var d = new Date();
    d.setDate(d.getDate() + p.dias);
    exp.value = d.toISOString().slice(0,10);
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
  var versao  = document.getElementById('sermao-versao') ? document.getElementById('sermao-versao').value : 'NVI';

  var versaoLabels = {
    NVI:  'NVI (Nova Versao Internacional)',
    ARA:  'ARA (Almeida Revista e Atualizada)',
    ACF:  'ACF (Almeida Corrigida e Fiel)',
    NAA:  'NAA (Nova Almeida Atualizada)',
    NTLH: 'NTLH (Nova Traducao na Linguagem de Hoje)',
    KJA:  'KJA (King James Atualizada)',
    BKJ:  'BKJ (Biblia King James Fiel 1611)'
  };

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
    'VERSAO DA BIBLIA: ' + (versaoLabels[versao] || versao),
    'IMPORTANTE: Use EXCLUSIVAMENTE a versao ' + versao + ' para TODAS as citacoes biblicas.',
    'Cite cada versiculo no formato: "texto do versiculo" (' + versao + ' - Livro capitulo:versiculo)',
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
    '* Cite o versiculo base completo na versao ' + versao + ' (livro capitulo:versiculo -- "texto completo")',
    '* Frase de transicao impactante que leve ao primeiro ponto',
    '',
    '1. [TITULO DO PRIMEIRO PONTO EM MAIUSCULO]',
    '* Explicacao do texto biblico com linguagem simples',
    '* Versiculos de apoio na versao ' + versao + ' (cite pelo menos 2 com referencia completa)',
    '* Ilustracao pratica: uma situacao da vida real que ilustra o ponto',
    '* Frase de impacto: uma verdade forte e memoravel sobre este ponto',
    '* Pergunta retorica para engajar a congregacao',
    '',
    '2. [TITULO DO SEGUNDO PONTO EM MAIUSCULO]',
    '* Explicacao do texto biblico com linguagem simples',
    '* Versiculos de apoio na versao ' + versao + ' (cite pelo menos 2 com referencia completa)',
    '* Exemplos praticos da vida crista (familiar, financeiro, espiritual)',
    '* Frase de impacto memoravel',
    '* Momento de identificacao: "Tem alguem aqui que..."',
    '',
    '3. [TITULO DO TERCEIRO PONTO EM MAIUSCULO]',
    '* Explicacao do texto biblico com linguagem simples',
    '* Versiculos de apoio na versao ' + versao + ' (cite pelo menos 2 com referencia completa)',
    '* A solucao biblica pratica e concreta',
    '* Frase de declaracao para a congregacao repetir em voz alta',
    '* Transicao para a conclusao',
    '',
    'CONCLUSAO -- A RESPOSTA DE DEUS',
    '* Retome o problema central da introducao',
    '* Apresente a resposta definitiva do texto biblico',
    '* Cite o versiculo final de fechamento completo na versao ' + versao,
    '* Liste 3 acoes praticas que a pessoa pode tomar HOJE',
    '* Frase de apelo emocional e espiritual',
    '',
    'APELO FINAL',
    '* Convite para decisao/compromisso',
    '* Oracao de encerramento sugerida (2-3 linhas)',
    '* Versiculos para memorizar esta semana na versao ' + versao + ' (2 versiculos com referencia)',
    '* Sugestao de 1 musica de louvor que combine com o tema',
    '',
    'IMPORTANTE:',
    '- Use frases curtas. Um paragrafo = uma ideia.',
    '- Coloque frases de impacto em destaque com *',
    '- Cite TODOS os versiculos na versao ' + versao + ' com livro, capitulo e versiculo (ex: Romanos 7:24)',
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

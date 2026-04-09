(function() {

// =============================================
// CONFIGURACAO SUPABASE
// =============================================
var SUPABASE_URL = 'https://gupbbjhbxmnkaizzjwqn.supabase.co';
var SUPABASE_KEY = 'sb_publishable_NDeCO7s7OEQ_lOgK3mZNKw_1EXJLLhC';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: true, autoRefreshToken: true },
  global: { headers: { 'x-my-custom-header': 'church-app' } }
});
window.sb = sb;

// =============================================
// SUPER ADMINS AUTORIZADOS
// =============================================
var SUPER_ADMIN_EMAILS = [
  'getprojection@gmail.com',
  // Adicione mais emails aqui conforme necessário
];

// PIN de acesso ao painel super admin (altere para o seu PIN)
var SUPER_ADMIN_PIN = '1234';
var SA_PIN_KEY = 'sa_pin_verified';

function isSuperAdmin(email) {
  return SUPER_ADMIN_EMAILS.indexOf(email) !== -1;
}

function isSuperAdminPinVerified() {
  // PIN válido por 4 horas na sessão
  var stored = sessionStorage.getItem(SA_PIN_KEY);
  if (!stored) return false;
  var data = JSON.parse(stored);
  return data.verified && (Date.now() - data.ts < 4 * 60 * 60 * 1000);
}

function setSuperAdminPinVerified() {
  sessionStorage.setItem(SA_PIN_KEY, JSON.stringify({ verified: true, ts: Date.now() }));
}

window.isSuperAdmin = isSuperAdmin;
window.isSuperAdminPinVerified = isSuperAdminPinVerified;
window.setSuperAdminPinVerified = setSuperAdminPinVerified;
window.SUPER_ADMIN_PIN = SUPER_ADMIN_PIN;
window.SUPER_ADMIN_EMAILS = SUPER_ADMIN_EMAILS;

// =============================================
// ESTADO
// =============================================
var currentUser = null;
var currentProfile = null;
var hoje = new Date(); var currentMonth = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
var allServices = [];
var editingServiceId = null;
var editingUserId = null;

// Expor estado globalmente para todos os módulos
window.currentUser       = currentUser;
window.currentProfile    = currentProfile;
window.currentMonth      = currentMonth;
window.allServices       = allServices;
window.editingServiceId  = editingServiceId;
window.editingUserId     = editingUserId;

// Getters/setters para manter sincronia entre arquivos
Object.defineProperty(window, 'currentUser', {
  get: function() { return currentUser; },
  set: function(v) { currentUser = v; }
});
Object.defineProperty(window, 'currentProfile', {
  get: function() { return currentProfile; },
  set: function(v) { currentProfile = v; }
});
Object.defineProperty(window, 'allServices', {
  get: function() { return allServices; },
  set: function(v) { allServices = v; }
});
Object.defineProperty(window, 'currentMonth', {
  get: function() { return currentMonth; },
  set: function(v) { currentMonth = v; }
});
Object.defineProperty(window, 'editingServiceId', {
  get: function() { return editingServiceId; },
  set: function(v) { editingServiceId = v; }
});
Object.defineProperty(window, 'editingUserId', {
  get: function() { return editingUserId; },
  set: function(v) { editingUserId = v; }
});

var SERVICE_META = {
  'culto-familia-sede-09':   { title: 'Culto da Familia', location: 'SEDE', time: '09:00', color: '#f59e0b', recurrence: 'weekly', dayOfWeek: 0 },
  'culto-familia-sede-18':   { title: 'Culto da Familia', location: 'SEDE', time: '18:00', color: '#f97316', recurrence: 'weekly', dayOfWeek: 0 },
  'culto-familia-efapi':     { title: 'Culto da Familia', location: 'GET Efapi', time: '19:00', color: '#8b5cf6', recurrence: 'weekly', dayOfWeek: 0 },
  'segunda-nao-pare':        { title: 'Segunda Nao Pare', location: 'SEDE', time: '19:30', color: '#06b6d4', recurrence: 'weekly', dayOfWeek: 1 },
  'tarde-com-deus':          { title: 'Tarde com Deus', location: 'SEDE', time: '14:30', color: '#ec4899', recurrence: 'weekly', dayOfWeek: 2 },
  'quarta-oracao':           { title: 'Quarta de Oracao', location: 'SEDE', time: '19:30', color: '#10b981', recurrence: 'weekly', dayOfWeek: 3 },
  'quinta-vitoria':          { title: 'Quinta da Vitoria', location: 'SEDE', time: '19:30', color: '#6366f1', recurrence: 'weekly', dayOfWeek: 4 },
  'quinta-vitoria-efapi':    { title: 'Quinta da Vitoria', location: 'GET Efapi', time: '20:00', color: '#7c3aed', recurrence: 'weekly', dayOfWeek: 4 },
  'sexta-milagres-efapi':    { title: 'Sexta dos Milagres', location: 'GET Efapi', time: '20:00', color: '#0ea5e9', recurrence: 'weekly', dayOfWeek: 5 },
  'next-level':              { title: 'Next Level', location: 'SEDE', time: '20:00', color: '#ef4444', recurrence: 'weekly', dayOfWeek: 6 },
  'quarta-milagres-efapi':   { title: 'Quarta dos Milagres', location: 'GET Efapi', time: '20:00', color: '#14b8a6', recurrence: 'weekly', dayOfWeek: 3 },
  'culto-casais':            { title: 'Culto de Casais', location: 'SEDE', time: '19:30', color: '#e11d48', recurrence: 'none' },
  'secreto-elas':            { title: 'Secreto pra Elas', location: 'SEDE', time: '19:30', color: '#db2777', recurrence: 'none' },
  'get-men':                 { title: 'GET Men', location: 'SEDE', time: '20:00', color: '#1d4ed8', recurrence: 'none' },
  'batismo':                 { title: 'Batismo', location: 'SEDE', time: '18:00', color: '#0ea5e9', recurrence: 'none' },
  'talc':                    { title: 'TALC', location: 'Sala Next Level - Sede', time: '19:30', color: '#a855f7', recurrence: 'none' },
  'custom':                  { title: 'Evento Especial', location: 'SEDE', time: '19:00', color: '#f59e0b', recurrence: 'none' }
};

var DEPT_FIELDS = {
  louvor:     ['worship_band', 'worship_repertoire', 'worship_dress_code'],
  som:        ['sound_operator'],
  projecao:   ['projection_operator'],
  iluminacao: ['lighting_operator'],
  live:       ['live_operator']
};

// =============================================
// TOAST
// =============================================
function toast(msg, type) {
  type = type || 'success';
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(function() { el.remove(); }, 3500);
}

// =============================================
// VERSICULOS DIARIOS
// =============================================
var VERSICULOS = [
  { texto: "Porque sou eu que conheco os planos que tenho para voces, planos de fazer o bem e nao de causar mal, para dar-lhes um futuro e uma esperanca.", ref: "Jeremias 29:11" },
  { texto: "O Senhor e o meu pastor; nada me faltara.", ref: "Salmos 23:1" },
  { texto: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  { texto: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigenito, para que todo aquele que nele cre nao pereca, mas tenha a vida eterna.", ref: "Joao 3:16" },
  { texto: "Confie no Senhor de todo o seu coracao e nao se apoie em seu proprio entendimento; reconheca-o em todos os seus caminhos, e ele enderecara as suas veredas.", ref: "Proverbios 3:5-6" },
  { texto: "Buscai primeiro o reino de Deus e a sua justica, e todas essas coisas vos serao acrescentadas.", ref: "Mateus 6:33" },
  { texto: "Sede fortes e corajosos. Nao temais, nem vos assusteis diante delas; porque o Senhor, teu Deus, e aquele que vai contigo; nao te deixara, nem te desamparara.", ref: "Deuteronomio 31:6" },
  { texto: "Nao andeis ansiosos por coisa alguma; antes em tudo, pela oracao e pela suplica, com accoes de gracas, sejam os vossos pedidos conhecidos diante de Deus.", ref: "Filipenses 4:6" },
  { texto: "O Senhor e a minha luz e a minha salvacao; a quem temerei?", ref: "Salmos 27:1" },
  { texto: "Aquele que habita no esconderijo do Altissimo, e que se abriga a sombra do Onipotente.", ref: "Salmos 91:1" },
  { texto: "Lancai sobre ele toda a vossa ansiedade, porque ele tem cuidado de vos.", ref: "1 Pedro 5:7" },
  { texto: "Jesus lhe disse: Eu sou o caminho, e a verdade, e a vida; ningem vem ao Pai senao por mim.", ref: "Joao 14:6" },
  { texto: "Ide por todo o mundo e pregai o evangelho a toda criatura.", ref: "Marcos 16:15" },
  { texto: "Alegrai-vos sempre no Senhor; outra vez digo, alegrai-vos.", ref: "Filipenses 4:4" },
  { texto: "Este e o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.", ref: "Salmos 118:24" },
  { texto: "Todas as coisas cooperam para o bem daqueles que amam a Deus.", ref: "Romanos 8:28" },
  { texto: "A paz que excede todo entendimento guardara os vossos coracoes e os vossos pensamentos em Cristo Jesus.", ref: "Filipenses 4:7" },
  { texto: "O amor e paciente, o amor e bondoso. Nao inveja, nao se vangloria, nao se orgulha.", ref: "1 Corintios 13:4" },
  { texto: "Mas os que esperam no Senhor renovarao as suas forcas; subirão com asas como aguias.", ref: "Isaias 40:31" },
  { texto: "Porque eu, o Senhor teu Deus, te sustento pela minha destra, e te digo: Nao temas, porque eu te ajudo.", ref: "Isaias 41:13" },
  { texto: "Deleita-te tambem no Senhor, e ele te concedera os desejos do teu coracao.", ref: "Salmos 37:4" },
  { texto: "Maior amor ninguem tem do que este: de dar a sua vida pelos seus amigos.", ref: "Joao 15:13" },
  { texto: "Ensina a crianca no caminho em que deve andar; e, ainda quando envelhecer, nao se desviara dele.", ref: "Proverbios 22:6" },
  { texto: "A sabedoria e a coisa principal; adquire pois a sabedoria; sim, com tudo o que possuis, adquire o entendimento.", ref: "Proverbios 4:7" },
  { texto: "Posso dar gracias a Deus em tudo, pois esta e a vontade de Deus em Cristo Jesus para convosco.", ref: "1 Tessalonicenses 5:18" },
  { texto: "E conhecereis a verdade, e a verdade vos libertara.", ref: "Joao 8:32" },
  { texto: "Nao se apaguem no espiritual. Sede fervorosos. Servindo ao Senhor.", ref: "Romanos 12:11" },
  { texto: "Ora, a fe e a certeza do que esperamos, e a prova das coisas que nao vemos.", ref: "Hebreus 11:1" },
  { texto: "Porque para Deus nada e impossivel.", ref: "Lucas 1:37" },
  { texto: "O Senhor abencoa a casa do justo.", ref: "Proverbios 3:33" },
  { texto: "A graca do Senhor Jesus Cristo, o amor de Deus e a comunhao do Espirito Santo sejam com todos voces.", ref: "2 Corintios 13:13" }
];

function mostrarVersiculo() {
  var hoje = new Date();
  var idx = (hoje.getDate() + hoje.getMonth() * 31) % VERSICULOS.length;
  var v = VERSICULOS[idx];
  var elTexto = document.getElementById('versiculo-texto');
  var elRef   = document.getElementById('versiculo-ref');
  if (elTexto) elTexto.textContent = v.texto;
  if (elRef)   elRef.textContent   = v.ref;
  var elFoto    = document.getElementById('versiculo-texto-foto');
  var elRefFoto = document.getElementById('versiculo-ref-foto');
  if (elFoto)    elFoto.textContent    = v.texto;
  if (elRefFoto) elRefFoto.textContent = v.ref;
}

// Expor funções e constantes globalmente
window.SERVICE_META      = SERVICE_META;
window.DEPT_FIELDS       = DEPT_FIELDS;
window.VERSICULOS        = VERSICULOS;
window.mostrarVersiculo  = mostrarVersiculo;
window.toast             = toast;

})();
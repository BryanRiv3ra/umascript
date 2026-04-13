const KEYWORDS_MAP = {
  paddock:'PADDOCK', finish:'FINISH', training:'TRAINING', skill:'SKILL',
  trophy:'TROPHY', speed:'SPEED', stamina:'STAMINA', power:'POWER',
  guts:'GUTS', wit:'WIT', turf:'TURF', dirt:'DIRT', sprint:'SPRINT',
  mile:'MILE', medium:'MEDIUM', longrun:'LONGRUN', race:'RACE',
  retire:'RETIRE', pace:'PACE', frontpace:'FRONTPACE', latepace:'LATEPACE',
  announce:'ANNOUNCE', hear:'HEAR', win:'WIN', loss:'LOSS'
};
const TYPES = ['SPEED','STAMINA','POWER','GUTS','WIT'];

let currentTokens  = [];
let currentErrors  = [];
let currentSymbols = [];
let activeTab      = 'tokens';

// ── Lexer ──
function runLexer(source) {
  const tokens = [], errors = [], symbols = [];
  let pos = 0, line = 1, col = 1;

  const cur  = () => source[pos] ?? null;
  const peek = () => source[pos + 1] ?? null;
  const adv  = () => {
    const c = source[pos++];
    if (c === '\n') { line++; col = 1; } else col++;
    return c;
  };
  const isDigit  = c => c >= '0' && c <= '9';
  const isLetter = c => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  const addTok   = (type, val, l, c) => tokens.push({ type, value: val, line: l, col: c });

  while (pos < source.length) {

    // Saltar espacios y comentarios
    while (pos < source.length) {
      const c = cur();
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { adv(); continue; }
      if (c === '/' && peek() === '/') {
        while (pos < source.length && cur() !== '\n') adv();
        continue;
      }
      if (c === '/' && peek() === '*') {
        const sl = line, sc = col; adv(); adv();
        let closed = false;
        while (pos < source.length) {
          if (cur() === '*' && peek() === '/') { adv(); adv(); closed = true; break; }
          adv();
        }
        if (!closed) errors.push({ type:'LEXICO', msg:'Comentario sin cerrar', line:sl, col:sc, val:'/*' });
        continue;
      }
      break;
    }
    if (pos >= source.length) break;

    const c = cur(), l = line, co = col;

    // Número
    if (isDigit(c)) {
      let v = '', fl = false;
      while (pos < source.length && isDigit(cur())) v += adv();
      if (cur() === '.' && isDigit(peek())) {
        fl = true; v += adv();
        while (pos < source.length && isDigit(cur())) v += adv();
      }
      addTok(fl ? 'NUMBER_FLOAT' : 'NUMBER_INT', v, l, co);
      continue;
    }

    // String
    if (c === '"') {
      adv(); let v = '';
      while (pos < source.length && cur() !== '"') {
        if (cur() === '\n') {
          errors.push({ type:'LEXICO', msg:'String sin cerrar', line:l, col:co, val:'"'+v });
          addTok('ERROR', v, l, co);
          break;
        }
        v += adv();
      }
      if (pos < source.length && cur() === '"') adv();
      addTok('STRING', v, l, co);
      continue;
    }

    // Identificador o keyword
    if (isLetter(c) || c === '_') {
      let v = '';
      while (pos < source.length && (isLetter(cur()) || isDigit(cur()) || cur() === '_')) v += adv();
      const low  = v.toLowerCase();
      const type = KEYWORDS_MAP[low] || 'IDENTIFIER';
      if (type !== 'IDENTIFIER' && v !== low) {
        errors.push({ type:'LEXICO', msg:`Keyword en mayúsculas: '${v}' → use '${low}'`, line:l, col:co, val:v });
      }
      addTok(type, v, l, co);

      // Detectar declaración → tabla de símbolos
      if (type === 'IDENTIFIER') {
        const prev2 = tokens[tokens.length - 3];
        const prev1 = tokens[tokens.length - 2];
        if (prev2?.type === 'TRAINING' && TYPES.includes(prev1?.type)) {
          if (symbols.find(s => s.name === v)) {
            errors.push({ type:'LEXICO', msg:`Variable ya declarada: '${v}'`, line:l, col:co, val:v });
          } else {
            symbols.push({ name:v, type:prev1.value, value:null, line:l, col:co });
          }
        }
      }
      continue;
    }

    // Operadores 2 caracteres
    const two = c + (peek() || '');
    const ops2 = { ':=':'ASSIGN','==':'EQUAL','!=':'NOT_EQUAL','<=':'LESS_EQ','>=':'GREATER_EQ','&&':'AND','||':'OR' };
    if (ops2[two]) { addTok(ops2[two], two, l, co); adv(); adv(); continue; }

    // Operadores 1 carácter
    const ops1 = {
      '+':'PLUS','-':'MINUS','*':'MULTIPLY','/':'DIVIDE','%':'MODULO',
      '<':'LESS','>':'GREATER','!':'NOT',';':'SEMICOLON',',':'COMMA',
      ':':'COLON','(':'LPAREN',')':'RPAREN','{':'LBRACE','}':'RBRACE',
      '[':'LBRACKET',']':'RBRACKET'
    };
    if (ops1[c]) { addTok(ops1[c], c, l, co); adv(); continue; }

    // Error léxico
    errors.push({ type:'LEXICO', msg:`Carácter no permitido: '${c}'`, line:l, col:co, val:c });
    addTok('ERROR', c, l, co);
    adv();
  }

  addTok('EOF', 'EOF', line, col);
  return { tokens, errors, symbols };
}

// ── Color por tipo de token ──
function tokClass(type) {
  const kws = ['PADDOCK','FINISH','TRAINING','SKILL','TROPHY','TURF','DIRT','RACE',
               'SPRINT','MILE','MEDIUM','LONGRUN','RETIRE','PACE','FRONTPACE',
               'LATEPACE','ANNOUNCE','HEAR','WIN','LOSS'];
  if (kws.includes(type))          return 'c-kw';
  if (TYPES.includes(type))        return 'c-type';
  if (type === 'IDENTIFIER')       return 'c-id';
  if (type === 'STRING')           return 'c-str';
  if (type.includes('NUMBER'))     return 'c-num';
  if (type === 'ERROR')            return 'c-err';
  if (['PLUS','MINUS','MULTIPLY','DIVIDE','MODULO','EQUAL','NOT_EQUAL',
       'LESS','GREATER','LESS_EQ','GREATER_EQ','AND','OR','NOT','ASSIGN'].includes(type)) return 'c-op';
  return 'c-sym';
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Actualizar números de línea ──
function updateLineNums() {
  const editor = document.getElementById('editor');
  const nums   = document.getElementById('line-nums');
  const count  = editor.value.split('\n').length;
  nums.innerHTML = Array.from({ length: count }, (_, i) => `<span>${i + 1}</span>`).join('');
}

// ── Ejecutar análisis ──
function ejecutarAnalisis() {
  const source = document.getElementById('editor').value;
  if (!source.trim()) return;

  const result   = runLexer(source);
  currentTokens  = result.tokens;
  currentErrors  = result.errors;
  currentSymbols = result.symbols;

  const realToks = currentTokens.filter(t => t.type !== 'EOF');

  document.getElementById('status-tokens').textContent  = `Tokens: ${realToks.length}`;
  document.getElementById('status-errors').textContent  = `Errores: ${currentErrors.length}`;
  document.getElementById('status-symbols').textContent = `Símbolos: ${currentSymbols.length}`;
  document.getElementById('count-tokens').textContent   = realToks.length;
  document.getElementById('count-symbols').textContent  = currentSymbols.length;
  document.getElementById('count-errors').textContent   = currentErrors.length;

  const errBadge = document.getElementById('count-errors');
  errBadge.className = currentErrors.length > 0 ? 'tab-count has-errors' : 'tab-count';

  renderTab(activeTab);
}

// ── Limpiar ──
function limpiarEditor() {
  document.getElementById('editor').value = '';
  currentTokens = []; currentErrors = []; currentSymbols = [];
  document.getElementById('results-body').innerHTML = '<span class="empty-msg">Editor limpiado.</span>';
  document.getElementById('status-tokens').textContent  = 'Tokens: —';
  document.getElementById('status-errors').textContent  = 'Errores: —';
  document.getElementById('status-symbols').textContent = 'Símbolos: —';
  document.getElementById('count-tokens').textContent  = '0';
  document.getElementById('count-symbols').textContent = '0';
  document.getElementById('count-errors').textContent  = '0';
  document.getElementById('count-errors').className = 'tab-count';
  updateLineNums();
}

// ── Cambiar pestaña ──
function showTab(el, name) {
  activeTab = name;
  document.querySelectorAll('.results-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderTab(name);
}

// ── Renderizar contenido de pestaña ──
function renderTab(name) {
  const body = document.getElementById('results-body');
  if (currentTokens.length === 0) {
    body.innerHTML = '<span class="empty-msg">Presiona "Ejecutar análisis" para ver los resultados...</span>';
    return;
  }

  if (name === 'tokens') {
    const rows = currentTokens
      .filter(t => t.type !== 'EOF')
      .map(t => `
        <div class="t-row">
          <span class="${tokClass(t.type)}">${t.type}</span>
          <span class="c-val">${esc(t.value)}</span>
          <span class="c-pos">L${t.line}:C${t.col}</span>
        </div>`).join('');
    body.innerHTML = `
      <div class="t-header"><span>Tipo</span><span>Valor</span><span>Posición</span></div>
      ${rows}`;
  }

  else if (name === 'symbols') {
    if (currentSymbols.length === 0) {
      body.innerHTML = '<span class="empty-msg">Sin símbolos declarados.</span>';
      return;
    }
    const rows = currentSymbols.map(s => `
      <div class="s-row">
        <span class="s-name">${s.name}</span>
        <span class="s-type">${s.type}</span>
        <span class="s-val">${s.value ?? 'null'}</span>
        <span class="s-line">L${s.line}:C${s.col}</span>
      </div>`).join('');
    body.innerHTML = `
      <div class="s-header"><span>Nombre</span><span>Tipo</span><span>Valor</span><span>Posición</span></div>
      ${rows}`;
  }

  else if (name === 'errors') {
    if (currentErrors.length === 0) {
      body.innerHTML = '<span class="success-msg">Sin errores léxicos encontrados.</span>';
      return;
    }
    const rows = currentErrors.map(e => `
      <div class="e-row">
        <span class="e-type">${e.type}</span>
        <span class="e-pos">L${e.line}:C${e.col}</span>
        <span class="e-val">"${esc(e.val)}"</span>
        <span class="e-msg">${e.msg}</span>
      </div>`).join('');
    body.innerHTML = `
      <div class="e-header"><span>Tipo</span><span>Posición</span><span>Valor</span><span>Descripción</span></div>
      ${rows}`;
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  updateLineNums();
  const editor = document.getElementById('editor');
  const nums   = document.getElementById('line-nums');

  editor.addEventListener('scroll', () => nums.scrollTop = editor.scrollTop);
  editor.addEventListener('input', updateLineNums);

  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      editor.value = editor.value.substring(0, s) + '    ' + editor.value.substring(editor.selectionEnd);
      editor.selectionStart = editor.selectionEnd = s + 4;
    }
  });
});
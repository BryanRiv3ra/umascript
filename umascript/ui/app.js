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
let currentTree    = null;
let activeTab      = 'tokens';

// ============================================
// LEXER
// ============================================
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
    while (pos < source.length) {
      const c = cur();
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { adv(); continue; }
      if (c === '/' && peek() === '/') { while (pos < source.length && cur() !== '\n') adv(); continue; }
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

    if (isDigit(c)) {
      let v = '', fl = false;
      while (pos < source.length && isDigit(cur())) v += adv();
      if (cur() === '.' && isDigit(peek())) { fl = true; v += adv(); while (pos < source.length && isDigit(cur())) v += adv(); }
      addTok(fl ? 'NUMBER_FLOAT' : 'NUMBER_INT', v, l, co); continue;
    }

    if (c === '"') {
      adv(); let v = '';
      while (pos < source.length && cur() !== '"') {
        if (cur() === '\n') { errors.push({ type:'LEXICO', msg:'String sin cerrar', line:l, col:co, val:'"'+v }); addTok('ERROR', v, l, co); break; }
        v += adv();
      }
      if (pos < source.length && cur() === '"') adv();
      addTok('STRING', v, l, co); continue;
    }

    if (isLetter(c) || c === '_') {
      let v = '';
      while (pos < source.length && (isLetter(cur()) || isDigit(cur()) || cur() === '_')) v += adv();
      const low = v.toLowerCase();
      const type = KEYWORDS_MAP[low] || 'IDENTIFIER';
      if (type !== 'IDENTIFIER' && v !== low)
        errors.push({ type:'LEXICO', msg:`Keyword en mayúsculas: '${v}' → use '${low}'`, line:l, col:co, val:v });
      addTok(type, v, l, co);
      if (type === 'IDENTIFIER') {
        const p2 = tokens[tokens.length - 3], p1 = tokens[tokens.length - 2];
        if (p2?.type === 'TRAINING' && TYPES.includes(p1?.type)) {
          if (symbols.find(s => s.name === v))
            errors.push({ type:'LEXICO', msg:`Variable ya declarada: '${v}'`, line:l, col:co, val:v });
          else
            symbols.push({ name:v, type:p1.value, value:null, line:l, col:co });
        }
      }
      continue;
    }

    const two = c + (peek() || '');
    const ops2 = { ':=':'ASSIGN','==':'EQUAL','!=':'NOT_EQUAL','<=':'LESS_EQ','>=':'GREATER_EQ','&&':'AND','||':'OR' };
    if (ops2[two]) { addTok(ops2[two], two, l, co); adv(); adv(); continue; }

    const ops1 = { '+':'PLUS','-':'MINUS','*':'MULTIPLY','/':'DIVIDE','%':'MODULO','<':'LESS','>':'GREATER','!':'NOT',';':'SEMICOLON',',':'COMMA',':':'COLON','(':'LPAREN',')':'RPAREN','{':'LBRACE','}':'RBRACE','[':'LBRACKET',']':'RBRACKET' };
    if (ops1[c]) { addTok(ops1[c], c, l, co); adv(); continue; }

    errors.push({ type:'LEXICO', msg:`Carácter no permitido: '${c}'`, line:l, col:co, val:c });
    addTok('ERROR', c, l, co); adv();
  }

  addTok('EOF', 'EOF', line, col);
  return { tokens, errors, symbols };
}

// ============================================
// PARSER
// ============================================
function runParser(tokens) {
  const toks = tokens.filter(t => t.type !== 'EOF' && t.type !== 'ERROR');
  const errors = [];
  let pos = 0;

  const cur   = () => toks[pos] ?? null;
  const adv   = () => toks[pos++] ?? null;
  const isEnd = () => pos >= toks.length;

  function expect(type) {
    const t = cur();
    if (t?.type === type) return adv();
    errors.push({ type:'SINTACTICO', msg:`Se esperaba '${type}', se encontró '${t?.type ?? "EOF"}'`, line:t?.line??0, col:t?.col??0, val:t?.value??'' });
    return null;
  }

  function node(label, children = []) { return { label, children }; }

  function parseProgram() {
    const n = node('Programa');
    expect('PADDOCK'); n.children.push(node('paddock'));
    if (cur()?.type === 'IDENTIFIER') n.children.push(node(adv().value));
    expect('LBRACE'); n.children.push(node('{'));
    const body = node('Cuerpo');
    while (!isEnd() && cur()?.type !== 'RBRACE' && cur()?.type !== 'FINISH') {
      const s = parseStatement(); if (s) body.children.push(s); else break;
    }
    n.children.push(body);
    if (cur()?.type === 'RBRACE') { adv(); n.children.push(node('}')); }
    if (cur()?.type === 'FINISH') { adv(); n.children.push(node('finish')); }
    return n;
  }

  function parseStatement() {
    const t = cur(); if (!t) return null;
    switch (t.type) {
      case 'TRAINING':   return parseDecl();
      case 'ANNOUNCE':   return parseAnnounce();
      case 'TURF':       return parseIf();
      case 'SPRINT': case 'MILE': case 'MEDIUM': case 'LONGRUN': case 'RACE': return parseLoop();
      case 'SKILL':      return parseSkill();
      case 'TROPHY':     return parseTrophy();
      case 'RETIRE':     adv(); return node('retire');
      case 'PACE':       adv(); return node('pace');
      case 'IDENTIFIER': return parseAssign();
      default: adv(); return null;
    }
  }

  function parseDecl() {
    const n = node('Declaración'); adv(); n.children.push(node('training'));
    if (TYPES.includes(cur()?.type)) n.children.push(node(adv().value));
    if (cur()?.type === 'IDENTIFIER') n.children.push(node(adv().value));
    if (cur()?.type === 'ASSIGN') { adv(); n.children.push(node(':=')); n.children.push(parseExpr()); }
    if (cur()?.type === 'SEMICOLON') adv();
    return n;
  }

  function parseAssign() {
    const n = node('Asignación'); n.children.push(node(adv().value));
    if (cur()?.type === 'ASSIGN') { adv(); n.children.push(node(':=')); n.children.push(parseExpr()); }
    if (cur()?.type === 'SEMICOLON') adv();
    return n;
  }

  function parseAnnounce() {
    const n = node('announce'); adv(); expect('LPAREN');
    n.children.push(parseExpr()); expect('RPAREN');
    if (cur()?.type === 'SEMICOLON') adv();
    return n;
  }

  function parseIf() {
    const n = node('turf / dirt'); adv(); n.children.push(node('turf'));
    expect('LPAREN'); n.children.push(parseExpr()); expect('RPAREN');
    n.children.push(parseBlock('Bloque-turf'));
    if (cur()?.type === 'DIRT') { adv(); n.children.push(node('dirt')); n.children.push(parseBlock('Bloque-dirt')); }
    return n;
  }

  function parseLoop() {
    const tok = adv(); const n = node(`${tok.value} (bucle)`); n.children.push(node(tok.value));
    if (tok.type !== 'LONGRUN') {
      expect('LPAREN');
      const init = node('init');
      if (cur()?.type === 'IDENTIFIER') {
        init.children.push(node(adv().value));
        if (cur()?.type === 'ASSIGN') { adv(); init.children.push(node(':=')); init.children.push(parseExpr()); }
      }
      n.children.push(init); if (cur()?.type === 'SEMICOLON') adv();
      const cond = node('condición'); cond.children.push(parseExpr()); n.children.push(cond);
      if (cur()?.type === 'SEMICOLON') adv();
      const inc = node('incremento');
      if (cur()?.type === 'IDENTIFIER') {
        inc.children.push(node(adv().value));
        if (cur()?.type === 'ASSIGN') { adv(); inc.children.push(node(':=')); inc.children.push(parseExpr()); }
      }
      n.children.push(inc); expect('RPAREN');
    }
    n.children.push(parseBlock('Cuerpo')); return n;
  }

  function parseSkill() {
    const n = node('skill (función)'); adv(); n.children.push(node('skill'));
    if (cur()?.type === 'IDENTIFIER') n.children.push(node(adv().value));
    expect('LPAREN');
    const params = node('parámetros');
    while (!isEnd() && cur()?.type !== 'RPAREN') {
      params.children.push(node(adv().value));
      if (cur()?.type === 'COMMA') adv();
    }
    expect('RPAREN'); n.children.push(params);
    n.children.push(parseBlock('Cuerpo')); return n;
  }

  function parseTrophy() {
    const n = node('trophy (return)'); adv(); n.children.push(node('trophy'));
    n.children.push(parseExpr());
    if (cur()?.type === 'SEMICOLON') adv();
    return n;
  }

  function parseBlock(label) {
    const n = node(label); expect('LBRACE');
    while (!isEnd() && cur()?.type !== 'RBRACE') {
      const s = parseStatement(); if (s) n.children.push(s); else break;
    }
    expect('RBRACE'); return n;
  }

  function parseExpr()       { return parseComparison(); }

  function parseComparison() {
    let left = parseAddSub();
    const ops = ['EQUAL','NOT_EQUAL','LESS','GREATER','LESS_EQ','GREATER_EQ','AND','OR'];
    while (!isEnd() && ops.includes(cur()?.type)) {
      const op = adv(); const n = node(op.value);
      n.children.push(left); n.children.push(parseAddSub()); left = n;
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (!isEnd() && (cur()?.type === 'PLUS' || cur()?.type === 'MINUS')) {
      const op = adv(); const n = node(op.value);
      n.children.push(left); n.children.push(parseMulDiv()); left = n;
    }
    return left;
  }

  function parseMulDiv() {
    let left = parsePrimary();
    while (!isEnd() && ['MULTIPLY','DIVIDE','MODULO'].includes(cur()?.type)) {
      const op = adv(); const n = node(op.value);
      n.children.push(left); n.children.push(parsePrimary()); left = n;
    }
    return left;
  }

  function parsePrimary() {
    const t = cur(); if (!t) return node('?');
    if (t.type === 'LPAREN') {
      adv(); const e = parseExpr();
      if (cur()?.type === 'RPAREN') adv();
      return e;
    }
    if (['NUMBER_INT','NUMBER_FLOAT','STRING','IDENTIFIER','WIN','LOSS'].includes(t.type)) {
      adv(); return node(t.value);
    }
    adv(); return node(t.value);
  }

  return { tree: parseProgram(), errors };
}

// ============================================
// RENDER ÁRBOL SVG
// ============================================
function renderTree(root) {
  if (!root) return '<span class="empty-msg">Sin árbol generado.</span>';

  const NODE_W = 120, NODE_H = 34, PADY = 60, PADX = 20;

  function calcSize(n) {
    if (!n.children || n.children.length === 0) { n._w = NODE_W + PADX; return; }
    n.children.forEach(calcSize);
    n._w = Math.max(n.children.reduce((s, c) => s + c._w, 0), NODE_W + PADX);
  }

  function assignPos(n, x, y) {
    n._x = x + n._w / 2; n._y = y;
    let cx = x;
    (n.children || []).forEach(c => { assignPos(c, cx, y + NODE_H + PADY); cx += c._w; });
  }

  function collectNodes(n, arr = []) { arr.push(n); (n.children || []).forEach(c => collectNodes(c, arr)); return arr; }

  function collectEdges(n, arr = []) {
    (n.children || []).forEach(c => {
      arr.push({ x1: n._x, y1: n._y + NODE_H/2, x2: c._x, y2: c._y - NODE_H/2 });
      collectEdges(c, arr);
    });
    return arr;
  }

  calcSize(root); assignPos(root, 0, 40);
  const allNodes = collectNodes(root);
  const allEdges = collectEdges(root);
  const maxX = Math.max(...allNodes.map(n => n._x + NODE_W/2)) + PADX;
  const maxY = Math.max(...allNodes.map(n => n._y + NODE_H)) + PADY;

  function nodeColor(label) {
    if (label === 'Programa')            return { fill:'#2a1f50', stroke:'#9070e0', text:'#c0a0f8' };
    if (label === 'Cuerpo')              return { fill:'#1f2f40', stroke:'#60a8f0', text:'#90c8f8' };
    if (label.startsWith('Declaración')) return { fill:'#1a2f28', stroke:'#40c8a0', text:'#70e8c0' };
    if (label.startsWith('Asignación'))  return { fill:'#1a2f28', stroke:'#40c8a0', text:'#70e8c0' };
    if (label === 'turf / dirt')         return { fill:'#2f2010', stroke:'#f0c040', text:'#f8d870' };
    if (label.includes('bucle'))         return { fill:'#2f1020', stroke:'#e060a0', text:'#f090c0' };
    if (label.includes('función'))       return { fill:'#301828', stroke:'#e060a0', text:'#f090c0' };
    if (label === 'announce')            return { fill:'#102028', stroke:'#60a8f0', text:'#90c8f8' };
    if (!isNaN(label) && label !== '')   return { fill:'#2a1808', stroke:'#f0a850', text:'#f0a850' };
    if (label.startsWith('"'))           return { fill:'#0f2018', stroke:'#60d890', text:'#60d890' };
    return { fill:'#1e1c2e', stroke:'#5a5080', text:'#b0a8d0' };
  }

  function trunc(str, max = 14) { return str.length > max ? str.substring(0, max-1) + '…' : str; }

  const edges = allEdges.map(e =>
    `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="#3a3460" stroke-width="1.5"/>`
  ).join('');

  const nodes = allNodes.map(n => {
    const col = nodeColor(n.label);
    const rx = n._x - NODE_W/2, ry = n._y - NODE_H/2;
    return `<g>
      <rect x="${rx}" y="${ry}" width="${NODE_W}" height="${NODE_H}" rx="8"
            fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.5"/>
      <text x="${n._x}" y="${n._y + 5}" text-anchor="middle"
            font-family="Consolas,monospace" font-size="11" fill="${col.text}">${trunc(n.label)}</text>
    </g>`;
  }).join('');

  return `<div style="overflow:auto;width:100%;height:100%">
    <svg width="${maxX}" height="${maxY}" xmlns="http://www.w3.org/2000/svg"
         style="display:block;background:#0f0e17">
      ${edges}${nodes}
    </svg>
  </div>`;
}

// ============================================
// HELPERS
// ============================================
function tokClass(type) {
  const kws = ['PADDOCK','FINISH','TRAINING','SKILL','TROPHY','TURF','DIRT','RACE',
               'SPRINT','MILE','MEDIUM','LONGRUN','RETIRE','PACE','FRONTPACE',
               'LATEPACE','ANNOUNCE','HEAR','WIN','LOSS'];
  if (kws.includes(type))      return 'c-kw';
  if (TYPES.includes(type))    return 'c-type';
  if (type === 'IDENTIFIER')   return 'c-id';
  if (type === 'STRING')       return 'c-str';
  if (type.includes('NUMBER')) return 'c-num';
  if (type === 'ERROR')        return 'c-err';
  if (['PLUS','MINUS','MULTIPLY','DIVIDE','MODULO','EQUAL','NOT_EQUAL',
       'LESS','GREATER','LESS_EQ','GREATER_EQ','AND','OR','NOT','ASSIGN'].includes(type)) return 'c-op';
  return 'c-sym';
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function updateLineNums() {
  const editor = document.getElementById('editor');
  const nums   = document.getElementById('line-nums');
  const count  = editor.value.split('\n').length;
  nums.innerHTML = Array.from({ length: count }, (_, i) => `<span>${i + 1}</span>`).join('');
}

// ============================================
// INICIAR CARRERA
// ============================================
function iniciarCarrera() {
  const btn = document.getElementById('btn-run');
  btn.classList.add('running');
  setTimeout(() => btn.classList.remove('running'), 800);

  const source = document.getElementById('editor').value;
  if (!source.trim()) return;

  const lex      = runLexer(source);
  currentTokens  = lex.tokens;
  currentErrors  = lex.errors;
  currentSymbols = lex.symbols;

  const parse = runParser(currentTokens);
  currentTree = parse.tree;
  parse.errors.forEach(e => currentErrors.push(e));

  const realToks = currentTokens.filter(t => t.type !== 'EOF');
  document.getElementById('status-tokens').textContent  = `Tokens: ${realToks.length}`;
  document.getElementById('status-errors').textContent  = `Errores: ${currentErrors.length}`;
  document.getElementById('status-symbols').textContent = `Símbolos: ${currentSymbols.length}`;
  document.getElementById('count-tokens').textContent   = realToks.length;
  document.getElementById('count-symbols').textContent  = currentSymbols.length;
  document.getElementById('count-errors').textContent   = currentErrors.length;
  document.getElementById('count-errors').className     = currentErrors.length > 0 ? 'tab-count has-errors' : 'tab-count';

  renderTab(activeTab);
}

// ============================================
// LIMPIAR
// ============================================
function limpiarEditor() {
  document.getElementById('editor').value = '';
  currentTokens = []; currentErrors = []; currentSymbols = []; currentTree = null;
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

// ============================================
// TABS
// ============================================
function showTab(el, name) {
  activeTab = name;
  document.querySelectorAll('.results-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const btnFs = document.getElementById('btn-fullscreen');
  if (btnFs) btnFs.style.display = name === 'tree' ? 'block' : 'none';
  renderTab(name);
}

function renderTab(name) {
  const body = document.getElementById('results-body');

  if (name === 'tree') {
    body.style.padding  = '0';
    body.style.overflow = 'hidden';
    body.innerHTML = currentTree
      ? renderTree(currentTree)
      : '<span class="empty-msg" style="padding:10px 14px;display:block">Presiona Iniciar Carrera para ver el árbol...</span>';
    return;
  }

  body.style.padding  = '10px 14px';
  body.style.overflow = 'auto';

  if (currentTokens.length === 0) {
    body.innerHTML = '<span class="empty-msg">Presiona "Iniciar Carrera" para ver los resultados...</span>';
    return;
  }

  if (name === 'tokens') {
    const rows = currentTokens.filter(t => t.type !== 'EOF').map(t =>
      `<div class="t-row">
        <span class="${tokClass(t.type)}">${t.type}</span>
        <span class="c-val">${esc(t.value)}</span>
        <span class="c-pos">L${t.line}:C${t.col}</span>
      </div>`).join('');
    body.innerHTML = `<div class="t-header"><span>Tipo</span><span>Valor</span><span>Posición</span></div>${rows}`;
  }

  else if (name === 'symbols') {
    if (!currentSymbols.length) { body.innerHTML = '<span class="empty-msg">Sin símbolos declarados.</span>'; return; }
    const rows = currentSymbols.map(s =>
      `<div class="s-row">
        <span class="s-name">${s.name}</span>
        <span class="s-type">${s.type}</span>
        <span class="s-val">${s.value ?? 'null'}</span>
        <span class="s-line">L${s.line}:C${s.col}</span>
      </div>`).join('');
    body.innerHTML = `<div class="s-header"><span>Nombre</span><span>Tipo</span><span>Valor</span><span>Posición</span></div>${rows}`;
  }

  else if (name === 'errors') {
    if (!currentErrors.length) { body.innerHTML = '<span class="success-msg">Sin errores encontrados.</span>'; return; }
    const rows = currentErrors.map(e =>
      `<div class="e-row">
        <span class="e-type">${e.type}</span>
        <span class="e-pos">L${e.line}:C${e.col}</span>
        <span class="e-val">"${esc(e.val)}"</span>
        <span class="e-msg">${e.msg}</span>
      </div>`).join('');
    body.innerHTML = `<div class="e-header"><span>Tipo</span><span>Posición</span><span>Valor</span><span>Descripción</span></div>${rows}`;
  }
}

// ============================================
// PANTALLA COMPLETA
// ============================================
function toggleFullscreen() {
  if (!currentTree) return;
  const existing = document.getElementById('tree-overlay');
  if (existing) { existing.remove(); return; }
  const overlay = document.createElement('div');
  overlay.id = 'tree-overlay';
  overlay.className = 'tree-fullscreen';
  overlay.innerHTML = `
    <button class="tree-fullscreen-close" onclick="document.getElementById('tree-overlay').remove()">
      ✕ Cerrar
    </button>
    ${renderTree(currentTree)}
  `;
  document.body.appendChild(overlay);
}

// ============================================
// INIT
// ============================================
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
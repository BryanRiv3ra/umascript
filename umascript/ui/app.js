const KEYWORDS_MAP = {
  paddock:'PADDOCK', finish:'FINISH', training:'TRAINING', skill:'SKILL',
  trophy:'TROPHY', speed:'SPEED', stamina:'STAMINA', power:'POWER',
  guts:'GUTS', wit:'WIT', turf:'TURF', dirt:'DIRT', sprint:'SPRINT',
  mile:'MILE', medium:'MEDIUM', longrun:'LONGRUN', race:'RACE',
  retire:'RETIRE', pace:'PACE', frontpace:'FRONTPACE', latepace:'LATEPACE',
  announce:'ANNOUNCE', hear:'HEAR', win:'WIN', loss:'LOSS'
};
const TYPES = ['SPEED','STAMINA','POWER','GUTS','WIT'];

const CHARACTER_SPRITES = {
  idle:   'hacker.jpeg',
  normal: 'image.png',
  error:  'santosgigawatss.png'
};

const EJEMPLOS = {
  RUN1: `/* Prueba 1 — Variables y condicional basico */\npaddock PrimeraCarrera {\n\n    training wit     uma    := "Special Week";\n    training speed   vel    := 850;\n    training stamina tiempo := 9.75;\n    training guts    activa := win;\n\n    announce("Comenzando carrera de: " + uma);\n\n    turf (vel > 800) {\n        announce("Velocidad maxima activada!");\n    } dirt {\n        announce("Sigue entrenando...");\n    }\n\n} finish`,

  RUN2: `/* Prueba 2 — Bucle mile con acumulador */\npaddock EntrenamientoMile {\n\n    training speed vel := 600;\n    training power pts := 0;\n\n    announce("Iniciando entrenamiento mile...");\n\n    mile (i := 1; i <= 5; i := i + 1) {\n        pts := pts + vel;\n        announce("Vuelta " + i + " completada");\n    }\n\n    turf (pts > 2500) {\n        announce("Entrenamiento exitoso!");\n    } dirt {\n        announce("Necesitas mas training.");\n    }\n\n} finish`,

  RUN3: `/* Prueba 3 — Funcion con skill y trophy */\npaddock CarreraConSkill {\n\n    training speed   vel := 900;\n    training stamina sta := 750;\n\n    skill calcularPower(speed v, stamina s) {\n        training stamina resultado := v * s / 100;\n        trophy resultado;\n    }\n\n    training stamina powerTotal := calcularPower(vel, sta);\n    announce("Power calculado: " + powerTotal);\n\n    turf (powerTotal > 6000) {\n        announce("Listo para el Japan Cup!");\n    } dirt {\n        announce("Sigue entrenando tus stats.");\n    }\n\n} finish`,

  RUN4: `/* Prueba 4 — Bucle sprint con retire */\npaddock SprintCarrera {\n\n    training speed  meta    := 1000;\n    training speed  actual  := 500;\n    training power  vueltas := 0;\n\n    announce("Iniciando sprint...");\n\n    sprint (i := 0; i < 10; i := i + 1) {\n        actual  := actual + 100;\n        vueltas := vueltas + 1;\n\n        turf (actual >= meta) {\n            announce("Meta alcanzada en vuelta " + vueltas);\n            retire;\n        }\n\n        announce("Vuelta " + i + " vel=" + actual);\n    }\n\n} finish`,

  RUN5: `/* Prueba 5 — Simulador completo de carrera */\npaddock SimuladorCarrera {\n\n    training wit     nombre := "Silence Suzuka";\n    training speed   vel    := 920;\n    training stamina sta    := 880;\n    training power   pts    := 0;\n    training guts    gano   := loss;\n\n    announce("=== Japan Cup ===");\n    announce("Uma: " + nombre);\n\n    sprint (i := 1; i <= 3; i := i + 1) {\n        pts := pts + vel;\n        announce("Calentamiento vuelta " + i);\n    }\n\n    mile (i := 1; i <= 6; i := i + 1) {\n        pts := pts + vel + sta;\n        turf (i == 3) {\n            announce("Mitad de carrera! Pts: " + pts);\n        } dirt {\n            announce("Vuelta " + i + " Pts: " + pts);\n        }\n    }\n\n    turf (pts > 10000) {\n        gano := win;\n        announce("VICTORIA! " + nombre + " gana!");\n    } dirt {\n        announce("Buen esfuerzo. Pts: " + pts);\n    }\n\n} finish`,

  DROPPEO1: `/* Error 1 — Caracteres no permitidos */\npaddock ErrorCaracteres {\n\n    training speed vel := 850;\n    training wit  uma := "Special Week";\n\n    @ caracter invalido aqui\n    training stamina tiempo := 9.5#;\n\n    announce("Hola" + uma);\n\n} finish`,

  DROPPEO2: `/* Error 2 — String sin cerrar */\npaddock ErrorString {\n\n    training wit uma := "Special Week;\n    training speed vel := 900;\n\n    announce("Carrera de " + uma);\n\n} finish`,

  DROPPEO3: `/* Error 3 — Keywords en mayusculas */\nPADDOCK ErrorMayusculas {\n\n    TRAINING SPEED vel := 850;\n    TRAINING WIT   uma := "Gold Ship";\n\n    TURF (vel > 800) {\n        ANNOUNCE("Velocidad alta!");\n    } DIRT {\n        ANNOUNCE("Velocidad baja");\n    }\n\n} FINISH`,

  DROPPEO4: `/* Error 4 — Comentario de bloque sin cerrar\npaddock ErrorComentario {\n\n    training speed vel := 750;\n    training wit  uma := "Mejiro McQueen";\n\n    announce("Uma: " + uma);\n\n} finish`,

  DROPPEO5: `/* Error 5 — Multiples errores lexicos */\npaddock ErrorMultiple {\n\n    training speed  vel := 85o;\n    training wit    uma := "Tokai Teio;\n    training stamina sta := 7.2.5;\n\n    $ simbolo invalido\n    training power pts := 0;\n\n} finish`,
};

let currentTokens  = [];
let currentErrors  = [];
let currentSymbols = [];
let currentTree    = null;
let activeTab      = 'tokens';

// ============================================
// SYNTAX HIGHLIGHTER
// ============================================
function applyHighlights(text) {
  let h = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  h = h.replace(/(\/\*[\s\S]*?(?:\*\/|$))/g, '<span class="hl-comment">$1</span>');
  h = h.replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>');
  h = h.replace(/("(?:[^"\\]|\\.)*"?)/g, '<span class="hl-str">$1</span>');
  h = h.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="hl-num">$1</span>');

  const allKws = Object.keys(KEYWORDS_MAP);
  const regexKws = new RegExp(`\\b(${allKws.join('|')})\\b`, 'gi');
  h = h.replace(regexKws, (match) => {
    const key = KEYWORDS_MAP[match.toLowerCase()];
    const isType = TYPES.includes(key);
    return `<span class="${isType ? 'hl-type' : 'hl-kw'}">${match}</span>`;
  });

  return h;
}

function syncScroll() {
  const editor = document.getElementById('editor');
  const layer  = document.getElementById('highlighted-layer');
  const nums   = document.getElementById('line-nums');
  if (layer) { layer.scrollTop = editor.scrollTop; layer.scrollLeft = editor.scrollLeft; }
  if (nums)  nums.scrollTop = editor.scrollTop;
}

function updateEditor() {
  const editor = document.getElementById('editor');
  const code   = document.querySelector('#highlighted-layer code');
  const text   = editor.value;

  if (code) {
    code.innerHTML = applyHighlights(text) + (text.endsWith('\n') ? ' ' : '');
  }

  const nums  = document.getElementById('line-nums');
  if (nums) {
    const lines = text.split('\n').length;
    nums.innerHTML = Array.from({ length: lines }, (_, i) => `<span>${i + 1}</span>`).join('');
  }
}

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
        errors.push({ type:'LEXICO', msg:`Keyword en mayúsculas: '${v}' → '${low}'`, line:l, col:co, val:v });
      addTok(type, v, l, co);
      if (type === 'IDENTIFIER') {
        const p2 = tokens[tokens.length - 3], p1 = tokens[tokens.length - 2];
        if (p2?.type === 'TRAINING' && TYPES.includes(p1?.type)) {
          if (!symbols.find(s => s.name === v))
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

  function expect(type, parent) {
    const t = cur();
    if (t?.type === type) return adv();
    const msg = `Se esperaba '${type}', encontró '${t?.type ?? "EOF"}'`;
    errors.push({ type:'SINTACTICO', msg, line:t?.line??0, col:t?.col??0, val:t?.value??'' });
    if (parent) parent.children.push(errNode(`${msg}`, 'SINTÁCTICO', t?.line??0, t?.col??0));
    return null;
  }

  function node(label, children = []) { return { label, children, isError: false }; }
  function errNode(msg, errType, line, col) {
    const prefix = errType === 'LÉXICO' ? '🔴' : errType === 'SEMÁNTICO' ? '🟣' : '🟠';
    return { label: `${prefix} ${msg}`, children: [], isError: true, errorType: errType || 'SINTÁCTICO', errorLine: line || 0, errorCol: col || 0 };
  }

  function parseProgram() {
    const n = node('Programa');
    expect('PADDOCK', n); n.children.push(node('paddock'));
    if (cur()?.type === 'IDENTIFIER') n.children.push(node(adv().value));
    expect('LBRACE', n); n.children.push(node('{'));
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
    const n = node('announce'); adv(); expect('LPAREN', n);
    n.children.push(parseExpr()); expect('RPAREN', n);
    if (cur()?.type === 'SEMICOLON') adv();
    return n;
  }

  function parseIf() {
    const n = node('turf / dirt'); adv(); n.children.push(node('turf'));
    expect('LPAREN', n); n.children.push(parseExpr()); expect('RPAREN', n);
    n.children.push(parseBlock('Bloque-turf'));
    if (cur()?.type === 'DIRT') { adv(); n.children.push(node('dirt')); n.children.push(parseBlock('Bloque-dirt')); }
    return n;
  }

  function parseLoop() {
    const tok = adv(); const n = node(`${tok.value} (bucle)`); n.children.push(node(tok.value));
    if (tok.type !== 'LONGRUN') {
      expect('LPAREN', n);
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
      n.children.push(inc); expect('RPAREN', n);
    }
    n.children.push(parseBlock('Cuerpo')); return n;
  }

  function parseSkill() {
    const n = node('skill (función)'); adv(); n.children.push(node('skill'));
    if (cur()?.type === 'IDENTIFIER') n.children.push(node(adv().value));
    expect('LPAREN', n);
    const params = node('parámetros');
    while (!isEnd() && cur()?.type !== 'RPAREN') { params.children.push(node(adv().value)); if (cur()?.type === 'COMMA') adv(); }
    expect('RPAREN', n); n.children.push(params);
    n.children.push(parseBlock('Cuerpo')); return n;
  }

  function parseTrophy() {
    const n = node('trophy (return)'); adv(); n.children.push(node('trophy'));
    n.children.push(parseExpr()); if (cur()?.type === 'SEMICOLON') adv(); return n;
  }

  function parseBlock(label) {
    const n = node(label); expect('LBRACE', n);
    while (!isEnd() && cur()?.type !== 'RBRACE') { const s = parseStatement(); if (s) n.children.push(s); else break; }
    expect('RBRACE', n); return n;
  }

  function parseExpr() { return parseComparison(); }

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
    if (t.type === 'LPAREN') { adv(); const e = parseExpr(); if (cur()?.type === 'RPAREN') adv(); return e; }
    if (['NUMBER_INT','NUMBER_FLOAT','STRING','IDENTIFIER','WIN','LOSS'].includes(t.type)) { adv(); return node(t.value); }
    adv(); return node(t.value);
  }

  return { tree: parseProgram(), errors };
}

// ============================================
// RENDER ÁRBOL SVG
// ============================================
function renderTree(root) {
  if (!root) return '<span class="empty-msg">Sin árbol generado.</span>';

  const ERR_NODE_W = 240, NODE_W = 120, NODE_H = 36, PADY = 70, PADX = 24;

  function getNodeW(n) { return n.isError ? ERR_NODE_W : NODE_W; }

  function calcSize(n) {
    const nw = getNodeW(n);
    if (!n.children || n.children.length === 0) { n._w = nw + PADX; return; }
    n.children.forEach(calcSize);
    n._w = Math.max(n.children.reduce((s, c) => s + c._w, 0), nw + PADX);
  }

  function assignPos(n, x, y) {
    n._x = x + n._w / 2; n._y = y;
    let cx = x;
    (n.children || []).forEach(c => { assignPos(c, cx, y + NODE_H + PADY); cx += c._w; });
  }

  function collectNodes(n, arr = []) { arr.push(n); (n.children || []).forEach(c => collectNodes(c, arr)); return arr; }

  function collectEdges(n, arr = []) {
    (n.children || []).forEach(c => {
      arr.push({ x1: n._x, y1: n._y + NODE_H/2, x2: c._x, y2: c._y - NODE_H/2, isError: c.isError || false, errType: c.errorType || null });
      collectEdges(c, arr);
    });
    return arr;
  }

  calcSize(root); assignPos(root, 0, 50);
  const allNodes = collectNodes(root);
  const allEdges = collectEdges(root);
  const maxX = Math.max(...allNodes.map(n => n._x + getNodeW(n)/2)) + PADX;
  const maxY = Math.max(...allNodes.map(n => n._y + NODE_H)) + PADY;

  // Paleta de colores según tipo de error
  function errPalette(errType) {
    if (errType === 'LÉXICO')     return { fill:'#2d0a0a', stroke:'#f44336', glow:'#f44336', text:'#ff6b6b', badge:'#c62828' };
    if (errType === 'SINTÁCTICO') return { fill:'#2d1a00', stroke:'#ff9800', glow:'#ff9800', text:'#ffb74d', badge:'#e65100' };
    if (errType === 'SEMÁNTICO')  return { fill:'#1e0a2d', stroke:'#ce93d8', glow:'#ab47bc', text:'#e1bee7', badge:'#7b1fa2' };
    // fallback sintáctico
    return { fill:'#2d1a00', stroke:'#ff9800', glow:'#ff9800', text:'#ffb74d', badge:'#e65100' };
  }

  function nodeColor(n) {
    const label = n.label;
    if (n.isError) return errPalette(n.errorType);
    if (label === 'Programa')            return { fill:'#1a1040', stroke:'#ff79b4', text:'#ffb3d1' };
    if (label === 'Cuerpo')              return { fill:'#0d1f35', stroke:'#2196f3', text:'#64b5f6' };
    if (label.startsWith('Declaración')) return { fill:'#0d2518', stroke:'#4caf50', text:'#81c784' };
    if (label.startsWith('Asignación'))  return { fill:'#0d2518', stroke:'#4caf50', text:'#81c784' };
    if (label === 'turf / dirt')         return { fill:'#2a1f00', stroke:'#ffc107', text:'#ffd54f' };
    if (label.includes('bucle'))         return { fill:'#2a0f1a', stroke:'#ff579a', text:'#ff79b4' };
    if (label.includes('función'))       return { fill:'#2a1030', stroke:'#ff579a', text:'#ff79b4' };
    if (label === 'announce')            return { fill:'#0d1f35', stroke:'#2196f3', text:'#64b5f6' };
    if (!isNaN(label) && label !== '')   return { fill:'#2a1a00', stroke:'#ffd54f', text:'#ffd54f' };
    if (label.startsWith('"'))           return { fill:'#0d2010', stroke:'#81c784', text:'#81c784' };
    return { fill:'#1a2030', stroke:'#3e4a57', text:'#a0aab5' };
  }

  function edgeColor(e) {
    if (!e.isError) return '#3e4a57';
    if (e.errType === 'LÉXICO')     return '#f44336';
    if (e.errType === 'SINTÁCTICO') return '#ff9800';
    if (e.errType === 'SEMÁNTICO')  return '#ab47bc';
    return '#ff9800';
  }

  function trunc(str, max = 14) { return str.length > max ? str.substring(0, max-1) + '…' : str; }

  // Definiciones de filtros SVG para glow
  const defs = `<defs>
    <filter id="glow-red" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-orange" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-purple" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

  const edges = allEdges.map(e => {
    const color = edgeColor(e);
    const dash  = e.isError ? ' stroke-dasharray="6,3"' : '';
    return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${color}" stroke-width="${e.isError ? 2 : 1.5}"${dash}/>`;
  }).join('');

  const nodes = allNodes.map(n => {
    const col = nodeColor(n);
    const nw  = getNodeW(n);
    const rx  = n._x - nw/2, ry = n._y - NODE_H/2;
    let svg = `<g>`;

    if (n.isError) {
      // Outer glow pulse ring
      const glowFilter = n.errorType === 'LÉXICO' ? 'glow-red' : n.errorType === 'SEMÁNTICO' ? 'glow-purple' : 'glow-orange';
      svg += `<rect x="${rx-3}" y="${ry-3}" width="${nw+6}" height="${NODE_H+6}" rx="11" fill="${col.glow}" opacity="0.15" filter="url(#${glowFilter})"/>`;
      svg += `<rect x="${rx-1}" y="${ry-1}" width="${nw+2}" height="${NODE_H+2}" rx="10" fill="none" stroke="${col.stroke}" stroke-width="1" opacity="0.5"/>`;
    }

    // Main box
    svg += `<rect x="${rx}" y="${ry}" width="${nw}" height="${NODE_H}" rx="8"
            fill="${col.fill}" stroke="${col.stroke}" stroke-width="${n.isError ? 2 : 1.5}"/>`;

    if (n.isError && n.errorType) {
      // Tipo badge pill
      const badgeText = n.errorType;
      const badgeW = badgeText.length * 7 + 14;
      svg += `<rect x="${n._x - badgeW/2}" y="${ry - 16}" width="${badgeW}" height="16" rx="5" fill="${col.badge}"/>`;
      svg += `<text x="${n._x}" y="${ry - 4}" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="9" font-weight="800" fill="#fff" letter-spacing="0.5">${badgeText}</text>`;

      // Línea de posición si existe
      const posText = n.errorLine ? `L${n.errorLine}:C${n.errorCol}` : '';
      if (posText) {
        svg += `<text x="${rx + nw - 4}" y="${ry + NODE_H - 4}" text-anchor="end" font-family="Consolas,monospace" font-size="8" fill="${col.text}" opacity="0.7">${posText}</text>`;
      }
    }

    // Label text
    const labelClean = n.label.replace(/^[🔴🟠🟣❌]\s*/, '');
    const displayLabel = n.isError ? labelClean : n.label;
    svg += `<text x="${n._x}" y="${n._y + 5}" text-anchor="middle"
            font-family="Consolas,monospace" font-size="${n.isError ? 10 : 11}" fill="${col.text}">${trunc(displayLabel, n.isError ? 30 : 14)}</text>`;
    svg += `</g>`;
    return svg;
  }).join('');

  return `<div style="overflow:auto;width:100%;height:100%">
    <svg width="${maxX}" height="${maxY}" xmlns="http://www.w3.org/2000/svg"
         style="display:block;background:#15191e">
      ${defs}${edges}${nodes}
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

function setSprite(state) {
  const sprite = document.getElementById('character-sprite');
  if (sprite) sprite.src = CHARACTER_SPRITES[state] || CHARACTER_SPRITES.idle;
}

// ============================================
// CARGAR EJEMPLO
// ============================================
function cargarEjemplo(nombre) {
  document.getElementById('editor').value = EJEMPLOS[nombre] || '';
  updateEditor();
  currentTokens = []; currentErrors = []; currentSymbols = []; currentTree = null;
  resetResultados();
  setSprite('idle');
}

function resetResultados() {
  document.getElementById('results-body').innerHTML = '<span class="empty-msg">Esperando inicio de carrera...</span>';
  document.getElementById('status-tokens').textContent  = 'Tokens: —';
  document.getElementById('status-errors').textContent  = 'Errores: —';
  document.getElementById('status-symbols').textContent = 'Símbolos: —';
  document.getElementById('count-tokens').textContent   = '0';
  document.getElementById('count-symbols').textContent  = '0';
  document.getElementById('count-errors').textContent   = '0';
  document.getElementById('count-errors').className = 'tab-count';
  const dialog = document.getElementById('dialog-box');
  if (dialog) dialog.classList.remove('error-state');
  const btnFs = document.getElementById('btn-fullscreen');
  if (btnFs) btnFs.style.display = 'none';
}

// ============================================
// LIMPIAR
// ============================================
function limpiarEditor() {
  document.getElementById('editor').value = '';
  updateEditor();
  currentTokens = []; currentErrors = []; currentSymbols = []; currentTree = null;
  resetResultados();
  setSprite('idle');
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

  // ── Análisis semántico básico: variables usadas sin declarar ──
  const declaredVars = new Set(currentSymbols.map(s => s.name));
  const semanticErrors = [];
  currentTokens.forEach(tok => {
    if (tok.type === 'IDENTIFIER' && !declaredVars.has(tok.value)) {
      // Heurística: si el identificador no es nombre de programa ni de función conocida
      // Solo reportar si fue usado en contexto de expresión (después de := o en condición)
      // Simplificación: marcar solo si fue visto pero no está en la tabla de símbolos
      // (se filtra para no duplicar errores ya reportados por el parser)
      const alreadyInSyntax = parse.errors.some(e => e.val === tok.value);
      if (!alreadyInSyntax) {
        // No reportar el identificador raíz (nombre del paddock) ni funciones
        const idx = currentTokens.indexOf(tok);
        const prev = currentTokens[idx - 1];
        const isPaddockName = prev?.type === 'PADDOCK';
        const isSkillName   = prev?.type === 'SKILL';
        if (!isPaddockName && !isSkillName) {
          semanticErrors.push({ type:'SEMÁNTICO', msg:`Variable '${tok.value}' usada sin declarar`, line:tok.line, col:tok.col, val:tok.value });
        }
      }
    }
  });
  semanticErrors.forEach(e => currentErrors.push(e));

  // ── Inyectar errores en el árbol como nodos hijos del nodo raíz ──
  if (currentTree) {
    // Errores léxicos → nodo rojo por cada uno
    if (lex.errors.length > 0) {
      const lexBranch = {
        label: `Errores Léxicos (${lex.errors.length})`,
        children: [],
        isError: true,
        errorType: 'LÉXICO'
      };
      lex.errors.forEach(e => {
        lexBranch.children.push({
          label: `${e.msg} — "${e.val}"`,
          children: [],
          isError: true,
          errorType: 'LÉXICO',
          errorLine: e.line,
          errorCol: e.col
        });
      });
      currentTree.children.unshift(lexBranch);
    }

    // Errores semánticos → nodo violeta
    if (semanticErrors.length > 0) {
      const semBranch = {
        label: `Errores Semánticos (${semanticErrors.length})`,
        children: [],
        isError: true,
        errorType: 'SEMÁNTICO'
      };
      semanticErrors.forEach(e => {
        semBranch.children.push({
          label: `${e.msg}`,
          children: [],
          isError: true,
          errorType: 'SEMÁNTICO',
          errorLine: e.line,
          errorCol: e.col
        });
      });
      currentTree.children.unshift(semBranch);
    }
  }

  const realToks = currentTokens.filter(t => t.type !== 'EOF');
  document.getElementById('status-tokens').textContent  = `Tokens: ${realToks.length}`;
  document.getElementById('status-errors').textContent  = `Errores: ${currentErrors.length}`;
  document.getElementById('status-symbols').textContent = `Símbolos: ${currentSymbols.length}`;
  document.getElementById('count-tokens').textContent   = realToks.length;
  document.getElementById('count-symbols').textContent  = currentSymbols.length;
  document.getElementById('count-errors').textContent   = currentErrors.length;
  document.getElementById('count-errors').className     = currentErrors.length > 0 ? 'tab-count has-errors' : 'tab-count';

  const dialog = document.getElementById('dialog-box');
  if (currentErrors.length > 0) {
    if (dialog) dialog.classList.add('error-state');
    setSprite('error');
  } else {
    if (dialog) dialog.classList.remove('error-state');
    setSprite('normal');
  }

  renderTab(activeTab);
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
      : '<span class="empty-msg" style="padding:12px;display:block">Presiona Iniciar Carrera para ver el árbol...</span>';
    return;
  }

  body.style.padding  = '10px 12px';
  body.style.overflow = 'auto';

  if (currentTokens.length === 0) {
    body.innerHTML = '<span class="empty-msg">Presiona Iniciar Carrera para ver resultados...</span>';
    return;
  }

  if (name === 'tokens') {
    const rows = currentTokens.filter(t => t.type !== 'EOF').map(t =>
      `<div class="t-row">
        <span class="${tokClass(t.type)}">${t.type}</span>
        <span style="color:#fff">${esc(t.value)}</span>
        <span style="color:var(--text-muted)">L${t.line}:C${t.col}</span>
      </div>`).join('');
    body.innerHTML = `<div class="t-header"><span>Tipo</span><span>Valor</span><span>Posición</span></div>${rows}`;
  }

  else if (name === 'symbols') {
    if (!currentSymbols.length) { body.innerHTML = '<span class="empty-msg">Sin símbolos declarados.</span>'; return; }
    const rows = currentSymbols.map(s =>
      `<div class="s-row">
        <span class="s-name">${s.name}</span>
        <span class="s-type">${s.type}</span>
        <span style="color:#fff">${s.value ?? 'null'}</span>
        <span style="color:var(--text-muted)">L${s.line}:C${s.col}</span>
      </div>`).join('');
    body.innerHTML = `<div class="s-header"><span>Nombre</span><span>Tipo</span><span>Valor</span><span>Posición</span></div>${rows}`;
  }

  else if (name === 'errors') {
    if (!currentErrors.length) { body.innerHTML = '<span class="success-msg">¡Carrera Perfecta! Sin errores.</span>'; return; }
    const rows = currentErrors.map(e => {
      const typeNorm = (e.type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      const typeClass = typeNorm.includes('lexico') || typeNorm.includes('léxico')
        ? 'e-type e-type-lexico'
        : typeNorm.includes('semantico') || typeNorm.includes('semántico')
          ? 'e-type e-type-semantico'
          : 'e-type e-type-sintactico';
      return `<div class="e-row">
        <span class="${typeClass}">${e.type}</span>
        <span style="color:var(--text-muted)">L${e.line}:C${e.col}</span>
        <span style="color:var(--uma-gold)">"${esc(e.val)}"</span>
        <span class="e-msg">${e.msg}</span>
      </div>`;
    }).join('');
    body.innerHTML = `<div class="e-header"><span>Tipo</span><span>Pos.</span><span>Valor</span><span>Descripción</span></div>${rows}`;
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
  const editor = document.getElementById('editor');

  const ejemploPorDefecto =
`/* Bienvenido a UmaScript!
   Ejemplo basico de uso del lenguaje */
paddock MiPrimeraCarrera {

    training wit     nombre   := "Special Week";
    training speed   vel      := 850;
    training stamina tiempo   := 9.75;
    training guts    campeona := win;

    announce("Hola! Esta es tu primera carrera con: " + nombre);
    announce("Velocidad: " + vel);

    turf (vel > 800) {
        announce("Velocidad excelente! Lista para competir!");
    } dirt {
        announce("Necesitas mas entrenamiento...");
    }

} finish`;

  editor.value = ejemploPorDefecto;
  updateEditor();

  editor.addEventListener('input',  updateEditor);
  editor.addEventListener('scroll', syncScroll);

  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      editor.value = editor.value.substring(0, s) + '    ' + editor.value.substring(editor.selectionEnd);
      editor.selectionStart = editor.selectionEnd = s + 4;
      updateEditor();
    }
  });
});
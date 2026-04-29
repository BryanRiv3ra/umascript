// ============================================
// UmaScript — Analizador Sintáctico (Parser)
// Técnica: Descenso Recursivo Predictivo
// ============================================

const { TokenType } = require('../lexer/tokens');

// ============================================
// Nodo del Árbol Sintáctico (AST)
// ============================================
class ASTNode {
  constructor(label, children = []) {
    this.label    = label;
    this.children = children;
  }

  // Agregar un hijo al nodo
  addChild(child) {
    if (child) this.children.push(child);
    return this;
  }

  // Representación textual del árbol (para debug)
  toString(indent = 0) {
    const prefix = '  '.repeat(indent);
    let result = `${prefix}└─ ${this.label}\n`;
    this.children.forEach(child => {
      if (child instanceof ASTNode) {
        result += child.toString(indent + 1);
      } else {
        result += `${prefix}  └─ ${child}\n`;
      }
    });
    return result;
  }
}

// ============================================
// Clase principal del Parser
// ============================================
class Parser {
  constructor(tokens) {
    // Filtrar tokens de error y EOF para el análisis
    this.tokens = tokens.filter(
      t => t.type !== TokenType.EOF && t.type !== TokenType.ERROR
    );
    this.pos    = 0;       // posición actual en la lista de tokens
    this.errors = [];      // lista de errores sintácticos
  }

  // --- Utilidades de navegación ---

  // Retorna el token actual sin avanzar
  current() {
    return this.tokens[this.pos] ?? null;
  }

  // Avanza al siguiente token y retorna el actual
  advance() {
    return this.tokens[this.pos++] ?? null;
  }

  // Verifica si llegamos al final de los tokens
  isEnd() {
    return this.pos >= this.tokens.length;
  }

  // --- Registro de errores sintácticos ---
  addError(message, line, column, value) {
    this.errors.push({
      type:    'SINTACTICO',
      message,
      line,
      column,
      value,
    });
  }

  // ============================================
  // Esperar un token específico (o registrar error)
  // ============================================
  expect(expectedType) {
    const tok = this.current();

    if (tok && tok.type === expectedType) {
      return this.advance();
    }

    // Token inesperado → error sintáctico
    const found = tok ? tok.type : 'EOF';
    const line  = tok ? tok.line   : 0;
    const col   = tok ? tok.column : 0;
    const val   = tok ? tok.value  : '';

    this.addError(
      `Se esperaba '${expectedType}', se encontró '${found}'`,
      line, col, val
    );

    return null;
  }

  // ============================================
  // Método principal: parsear todos los tokens
  // ============================================
  parse() {
    const tree = this.parseProgram();
    return {
      tree,
      errors: this.errors,
    };
  }

  // ============================================
  // Regla: Programa
  // paddock <nombre> { <cuerpo> } finish
  // ============================================
  parseProgram() {
    const node = new ASTNode('Programa');

    // paddock
    this.expect(TokenType.PADDOCK);
    node.addChild(new ASTNode('paddock'));

    // Nombre del programa (identificador opcional)
    if (this.current()?.type === TokenType.IDENTIFIER) {
      node.addChild(new ASTNode(this.advance().value));
    }

    // {
    this.expect(TokenType.LBRACE);
    node.addChild(new ASTNode('{'));

    // Cuerpo del programa
    const body = new ASTNode('Cuerpo');
    while (
      !this.isEnd() &&
      this.current()?.type !== TokenType.RBRACE &&
      this.current()?.type !== TokenType.FINISH
    ) {
      const stmt = this.parseStatement();
      if (stmt) {
        body.addChild(stmt);
      } else {
        break; // evitar ciclo infinito
      }
    }
    node.addChild(body);

    // }
    if (this.current()?.type === TokenType.RBRACE) {
      this.advance();
      node.addChild(new ASTNode('}'));
    }

    // finish
    if (this.current()?.type === TokenType.FINISH) {
      this.advance();
      node.addChild(new ASTNode('finish'));
    }

    return node;
  }

  // ============================================
  // Regla: Sentencia
  // Despacha según el tipo de token actual
  // ============================================
  parseStatement() {
    const tok = this.current();
    if (!tok) return null;

    switch (tok.type) {
      case TokenType.TRAINING:  return this.parseDeclaration();
      case TokenType.ANNOUNCE:  return this.parseAnnounce();
      case TokenType.TURF:      return this.parseIf();
      case TokenType.SPRINT:
      case TokenType.MILE:
      case TokenType.MEDIUM:
      case TokenType.LONGRUN:
      case TokenType.RACE:      return this.parseLoop();
      case TokenType.SKILL:     return this.parseSkill();
      case TokenType.TROPHY:    return this.parseTrophy();
      case TokenType.RETIRE:    this.advance(); return new ASTNode('retire');
      case TokenType.PACE:      this.advance(); return new ASTNode('pace');
      case TokenType.IDENTIFIER: return this.parseAssignment();
      default:
        // Token inesperado → saltar para evitar ciclo infinito
        this.advance();
        return null;
    }
  }

  // ============================================
  // Regla: Declaración
  // training <tipo> <nombre> := <expresión> ;
  // ============================================
  parseDeclaration() {
    const node = new ASTNode('Declaración');

    // training
    this.advance();
    node.addChild(new ASTNode('training'));

    // Tipo (speed, stamina, power, guts, wit)
    const TYPES = [
      TokenType.SPEED,
      TokenType.STAMINA,
      TokenType.POWER,
      TokenType.GUTS,
      TokenType.WIT,
    ];
    if (TYPES.includes(this.current()?.type)) {
      node.addChild(new ASTNode(this.advance().value));
    }

    // Nombre de la variable
    if (this.current()?.type === TokenType.IDENTIFIER) {
      node.addChild(new ASTNode(this.advance().value));
    }

    // := expresión
    if (this.current()?.type === TokenType.ASSIGN) {
      this.advance();
      node.addChild(new ASTNode(':='));
      node.addChild(this.parseExpression());
    }

    // ; (punto y coma opcional)
    if (this.current()?.type === TokenType.SEMICOLON) {
      this.advance();
    }

    return node;
  }

  // ============================================
  // Regla: Asignación
  // <nombre> := <expresión> ;
  // ============================================
  parseAssignment() {
    const node = new ASTNode('Asignación');

    // Nombre de la variable
    node.addChild(new ASTNode(this.advance().value));

    // := expresión
    if (this.current()?.type === TokenType.ASSIGN) {
      this.advance();
      node.addChild(new ASTNode(':='));
      node.addChild(this.parseExpression());
    }

    // ;
    if (this.current()?.type === TokenType.SEMICOLON) {
      this.advance();
    }

    return node;
  }

  // ============================================
  // Regla: Announce (print)
  // announce( <expresión> ) ;
  // ============================================
  parseAnnounce() {
    const node = new ASTNode('announce');

    this.advance(); // consumir 'announce'
    this.expect(TokenType.LPAREN);
    node.addChild(this.parseExpression());
    this.expect(TokenType.RPAREN);

    // ;
    if (this.current()?.type === TokenType.SEMICOLON) {
      this.advance();
    }

    return node;
  }

  // ============================================
  // Regla: Condicional
  // turf ( <expresión> ) { <cuerpo> } dirt { <cuerpo> }
  // ============================================
  parseIf() {
    const node = new ASTNode('turf / dirt');

    // turf
    this.advance();
    node.addChild(new ASTNode('turf'));

    // ( condición )
    this.expect(TokenType.LPAREN);
    node.addChild(this.parseExpression());
    this.expect(TokenType.RPAREN);

    // { bloque turf }
    node.addChild(this.parseBlock('Bloque-turf'));

    // dirt (else) — opcional
    if (this.current()?.type === TokenType.DIRT) {
      this.advance();
      node.addChild(new ASTNode('dirt'));
      node.addChild(this.parseBlock('Bloque-dirt'));
    }

    return node;
  }

  // ============================================
  // Regla: Bucle
  // sprint/mile/medium/race ( init; cond; inc ) { cuerpo }
  // longrun { cuerpo }
  // ============================================
  parseLoop() {
    const tok  = this.advance();
    const node = new ASTNode(`${tok.value} (bucle)`);
    node.addChild(new ASTNode(tok.value));

    // longrun no lleva paréntesis (es while true)
    if (tok.type !== TokenType.LONGRUN) {
      this.expect(TokenType.LPAREN);

      // Inicialización: variable := expresión
      const init = new ASTNode('init');
      if (this.current()?.type === TokenType.IDENTIFIER) {
        init.addChild(new ASTNode(this.advance().value));
        if (this.current()?.type === TokenType.ASSIGN) {
          this.advance();
          init.addChild(new ASTNode(':='));
          init.addChild(this.parseExpression());
        }
      }
      node.addChild(init);

      // ;
      if (this.current()?.type === TokenType.SEMICOLON) {
        this.advance();
      }

      // Condición
      const cond = new ASTNode('condición');
      cond.addChild(this.parseExpression());
      node.addChild(cond);

      // ;
      if (this.current()?.type === TokenType.SEMICOLON) {
        this.advance();
      }

      // Incremento: variable := expresión
      const inc = new ASTNode('incremento');
      if (this.current()?.type === TokenType.IDENTIFIER) {
        inc.addChild(new ASTNode(this.advance().value));
        if (this.current()?.type === TokenType.ASSIGN) {
          this.advance();
          inc.addChild(new ASTNode(':='));
          inc.addChild(this.parseExpression());
        }
      }
      node.addChild(inc);

      this.expect(TokenType.RPAREN);
    }

    // { cuerpo del bucle }
    node.addChild(this.parseBlock('Cuerpo'));

    return node;
  }

  // ============================================
  // Regla: Función
  // skill <nombre> ( <parámetros> ) { <cuerpo> }
  // ============================================
  parseSkill() {
    const node = new ASTNode('skill (función)');

    // skill
    this.advance();
    node.addChild(new ASTNode('skill'));

    // Nombre de la función
    if (this.current()?.type === TokenType.IDENTIFIER) {
      node.addChild(new ASTNode(this.advance().value));
    }

    // ( parámetros )
    this.expect(TokenType.LPAREN);
    const params = new ASTNode('parámetros');
    while (!this.isEnd() && this.current()?.type !== TokenType.RPAREN) {
      params.addChild(new ASTNode(this.advance().value));
      if (this.current()?.type === TokenType.COMMA) {
        this.advance();
      }
    }
    this.expect(TokenType.RPAREN);
    node.addChild(params);

    // { cuerpo }
    node.addChild(this.parseBlock('Cuerpo'));

    return node;
  }

  // ============================================
  // Regla: Trophy (return)
  // trophy <expresión> ;
  // ============================================
  parseTrophy() {
    const node = new ASTNode('trophy (return)');

    this.advance(); // consumir 'trophy'
    node.addChild(new ASTNode('trophy'));
    node.addChild(this.parseExpression());

    // ;
    if (this.current()?.type === TokenType.SEMICOLON) {
      this.advance();
    }

    return node;
  }

  // ============================================
  // Regla: Bloque
  // { <sentencias> }
  // ============================================
  parseBlock(label) {
    const node = new ASTNode(label);

    this.expect(TokenType.LBRACE);

    while (!this.isEnd() && this.current()?.type !== TokenType.RBRACE) {
      const stmt = this.parseStatement();
      if (stmt) {
        node.addChild(stmt);
      } else {
        break;
      }
    }

    this.expect(TokenType.RBRACE);

    return node;
  }

  // ============================================
  // Regla: Expresión (entrada)
  // ============================================
  parseExpression() {
    return this.parseComparison();
  }

  // ============================================
  // Regla: Comparación y operadores lógicos
  // ==, !=, <, >, <=, >=, &&, ||
  // ============================================
  parseComparison() {
    let left = this.parseAddSub();

    const compOps = [
      TokenType.EQUAL,
      TokenType.NOT_EQUAL,
      TokenType.LESS,
      TokenType.GREATER,
      TokenType.LESS_EQ,
      TokenType.GREATER_EQ,
      TokenType.AND,
      TokenType.OR,
    ];

    while (!this.isEnd() && compOps.includes(this.current()?.type)) {
      const op   = this.advance();
      const node = new ASTNode(op.value);
      node.addChild(left);
      node.addChild(this.parseAddSub());
      left = node;
    }

    return left;
  }

  // ============================================
  // Regla: Suma y Resta
  // +, -
  // ============================================
  parseAddSub() {
    let left = this.parseMulDiv();

    while (
      !this.isEnd() &&
      (this.current()?.type === TokenType.PLUS ||
       this.current()?.type === TokenType.MINUS)
    ) {
      const op   = this.advance();
      const node = new ASTNode(op.value);
      node.addChild(left);
      node.addChild(this.parseMulDiv());
      left = node;
    }

    return left;
  }

  // ============================================
  // Regla: Multiplicación, División, Módulo
  // *, /, %
  // ============================================
  parseMulDiv() {
    let left = this.parsePrimary();

    while (
      !this.isEnd() &&
      [TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO]
        .includes(this.current()?.type)
    ) {
      const op   = this.advance();
      const node = new ASTNode(op.value);
      node.addChild(left);
      node.addChild(this.parsePrimary());
      left = node;
    }

    return left;
  }

  // ============================================
  // Regla: Primario (valor atómico)
  // número, string, identificador, booleano, ( expr )
  // ============================================
  parsePrimary() {
    const tok = this.current();
    if (!tok) return new ASTNode('?');

    // Expresión entre paréntesis
    if (tok.type === TokenType.LPAREN) {
      this.advance(); // consumir (
      const expr = this.parseExpression();
      if (this.current()?.type === TokenType.RPAREN) {
        this.advance(); // consumir )
      }
      return expr;
    }

    // Literales e identificadores
    const literals = [
      TokenType.NUMBER_INT,
      TokenType.NUMBER_FLOAT,
      TokenType.STRING,
      TokenType.IDENTIFIER,
      TokenType.WIN,
      TokenType.LOSS,
    ];

    if (literals.includes(tok.type)) {
      this.advance();
      return new ASTNode(tok.value);
    }

    // Token no esperado como primario
    this.advance();
    return new ASTNode(tok.value);
  }

  // ============================================
  // Imprimir el árbol sintáctico en consola
  // ============================================
  printTree(node, indent = 0) {
    if (!node) {
      console.log('📭 Árbol sintáctico vacío.');
      return;
    }

    if (indent === 0) {
      console.log('\n╔══════════════════════════════════════════════════════╗');
      console.log('║          ÁRBOL SINTÁCTICO — UmaScript                ║');
      console.log('╚══════════════════════════════════════════════════════╝');
    }

    const prefix = indent === 0
      ? '🌳 '
      : '   '.repeat(indent - 1) + '├── ';

    console.log(`${prefix}${node.label}`);

    if (node.children) {
      node.children.forEach((child, i) => {
        this.printTree(child, indent + 1);
      });
    }
  }
}

module.exports = { Parser, ASTNode };

// ============================================
// UmaScript — Analizador Léxico (Lexer)
// ============================================

const { TokenType, KEYWORDS } = require('./tokens');

// Clase que representa un Token
class Token {
  constructor(type, value, line, column) {
    this.type   = type;
    this.value  = value;
    this.line   = line;
    this.column = column;
  }

  toString() {
    return `[${this.type}] "${this.value}" (línea ${this.line}, col ${this.column})`;
  }
}

// ============================================
// Clase principal del Lexer
// ============================================
class Lexer {
  constructor(source) {
    this.source  = source;   // código fuente completo
    this.pos     = 0;        // posición actual en el string
    this.line    = 1;        // línea actual
    this.column  = 1;        // columna actual
    this.tokens  = [];       // lista de tokens generados
    this.errors  = [];       // lista de errores léxicos
  }

  // --- Utilidades de navegación ---

  // Retorna el carácter actual sin avanzar
  current() {
    return this.source[this.pos] ?? null;
  }

  // Retorna el siguiente carácter sin avanzar
  peek() {
    return this.source[this.pos + 1] ?? null;
  }

  // Avanza un carácter y actualiza línea/columna
  advance() {
    const ch = this.source[this.pos];
    this.pos++;
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  // Verifica si llegamos al final del archivo
  isEnd() {
    return this.pos >= this.source.length;
  }

  // --- Registro de errores léxicos ---
  addError(message, line, column, value) {
    this.errors.push({ message, line, column, value });
  }

  // ============================================
  // Método principal: tokenizar todo el fuente
  // ============================================
  tokenize() {
    while (!this.isEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isEnd()) break;

      const ch     = this.current();
      const line   = this.line;
      const column = this.column;

      // Número
      if (this.isDigit(ch)) {
        this.tokens.push(this.readNumber(line, column));
        continue;
      }

      // Cadena de texto
      if (ch === '"') {
        this.tokens.push(this.readString(line, column));
        continue;
      }

      // Identificador o palabra reservada
      if (this.isLetter(ch) || ch === '_') {
        this.tokens.push(this.readIdentifier(line, column));
        continue;
      }

      // Operadores y símbolos
      const opToken = this.readOperatorOrSymbol(line, column);
      if (opToken) {
        this.tokens.push(opToken);
        continue;
      }

      // Carácter no reconocido → error léxico
      this.addError(
        `Carácter no permitido: '${ch}'`,
        line, column, ch
      );
      this.tokens.push(new Token(TokenType.ERROR, ch, line, column));
      this.advance();
    }

    // Token de fin de archivo
    this.tokens.push(new Token(TokenType.EOF, 'EOF', this.line, this.column));
    return this.tokens;
  }

  // ============================================
  // Saltar espacios en blanco y comentarios
  // ============================================
  skipWhitespaceAndComments() {
    while (!this.isEnd()) {
      const ch = this.current();

      // Espacios, tabs, saltos de línea
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.advance();
        continue;
      }

      // Comentario de línea: //
      if (ch === '/' && this.peek() === '/') {
        while (!this.isEnd() && this.current() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Comentario de bloque: /* ... */
      if (ch === '/' && this.peek() === '*') {
        const startLine = this.line;
        const startCol  = this.column;
        this.advance(); // /
        this.advance(); // *
        while (!this.isEnd()) {
          if (this.current() === '*' && this.peek() === '/') {
            this.advance(); // *
            this.advance(); // /
            break;
          }
          this.advance();
        }
        // Si se llegó al final sin cerrar el comentario
        if (this.isEnd()) {
          this.addError(
            'Comentario de bloque sin cerrar',
            startLine, startCol, '/*'
          );
        }
        continue;
      }

      break;
    }
  }

  // ============================================
  // Leer número entero o decimal
  // ============================================
  readNumber(line, column) {
    let value = '';
    let isFloat = false;

    while (!this.isEnd() && this.isDigit(this.current())) {
      value += this.advance();
    }

    // Parte decimal
    if (!this.isEnd() && this.current() === '.' && this.isDigit(this.peek())) {
      isFloat = true;
      value += this.advance(); // el punto
      while (!this.isEnd() && this.isDigit(this.current())) {
        value += this.advance();
      }
    }

    const type = isFloat ? TokenType.NUMBER_FLOAT : TokenType.NUMBER_INT;
    return new Token(type, value, line, column);
  }

  // ============================================
  // Leer cadena de texto entre comillas dobles
  // ============================================
  readString(line, column) {
    this.advance(); // consumir la comilla de apertura "
    let value = '';

    while (!this.isEnd() && this.current() !== '"') {
      // Salto de línea dentro de string → error
      if (this.current() === '\n') {
        this.addError(
          'Cadena de texto sin cerrar (salto de línea no permitido)',
          line, column, `"${value}`
        );
        return new Token(TokenType.ERROR, value, line, column);
      }
      value += this.advance();
    }

    if (this.isEnd()) {
      this.addError(
        'Cadena de texto sin cerrar (fin de archivo)',
        line, column, `"${value}`
      );
      return new Token(TokenType.ERROR, value, line, column);
    }

    this.advance(); // consumir la comilla de cierre "
    return new Token(TokenType.STRING, value, line, column);
  }

  // ============================================
  // Leer identificador o palabra reservada
  // ============================================
  readIdentifier(line, column) {
    let value = '';

    while (!this.isEnd() && (this.isLetter(this.current()) || this.isDigit(this.current()) || this.current() === '_')) {
      value += this.advance();
    }

    // Verificar si es palabra reservada (en minúsculas)
    const lower = value.toLowerCase();
    const type  = KEYWORDS[lower] ?? TokenType.IDENTIFIER;

    // Si encontramos una palabra reservada en mayúsculas → advertencia
    if (type !== TokenType.IDENTIFIER && value !== lower) {
      this.addError(
        `Palabra reservada debe escribirse en minúsculas: '${value}' → '${lower}'`,
        line, column, value
      );
    }

    return new Token(type, value, line, column);
  }

  // ============================================
  // Leer operadores y símbolos
  // ============================================
  readOperatorOrSymbol(line, column) {
    const ch = this.current();

    // Operador de asignación :=
    if (ch === ':' && this.peek() === '=') {
      this.advance(); this.advance();
      return new Token(TokenType.ASSIGN, ':=', line, column);
    }

    // Dos caracteres: ==, !=, <=, >=, &&, ||
    if (ch === '=' && this.peek() === '=') {
      this.advance(); this.advance();
      return new Token(TokenType.EQUAL, '==', line, column);
    }
    if (ch === '!' && this.peek() === '=') {
      this.advance(); this.advance();
      return new Token(TokenType.NOT_EQUAL, '!=', line, column);
    }
    if (ch === '<' && this.peek() === '=') {
      this.advance(); this.advance();
      return new Token(TokenType.LESS_EQ, '<=', line, column);
    }
    if (ch === '>' && this.peek() === '=') {
      this.advance(); this.advance();
      return new Token(TokenType.GREATER_EQ, '>=', line, column);
    }
    if (ch === '&' && this.peek() === '&') {
      this.advance(); this.advance();
      return new Token(TokenType.AND, '&&', line, column);
    }
    if (ch === '|' && this.peek() === '|') {
      this.advance(); this.advance();
      return new Token(TokenType.OR, '||', line, column);
    }

    // Un carácter
    const single = {
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.MULTIPLY,
      '/': TokenType.DIVIDE,
      '%': TokenType.MODULO,
      '<': TokenType.LESS,
      '>': TokenType.GREATER,
      '!': TokenType.NOT,
      ';': TokenType.SEMICOLON,
      ',': TokenType.COMMA,
      ':': TokenType.COLON,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '{': TokenType.LBRACE,
      '}': TokenType.RBRACE,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
    };

    if (single[ch]) {
      this.advance();
      return new Token(single[ch], ch, line, column);
    }

    return null; // no reconocido
  }

  // ============================================
  // Helpers de clasificación de caracteres
  // ============================================
  isDigit(ch)  { return ch >= '0' && ch <= '9'; }
  isLetter(ch) { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'); }
}

module.exports = { Lexer, Token };
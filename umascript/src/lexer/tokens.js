// ============================================
// UmaScript — Definición de Tokens
// ============================================

const TokenType = {

  // --- Palabras reservadas: Estructura ---
  PADDOCK:    'PADDOCK',      // inicio del programa
  FINISH:     'FINISH',       // fin del programa
  TRAINING:   'TRAINING',     // declarar variable
  SKILL:      'SKILL',        // declarar función
  TROPHY:     'TROPHY',       // return

  // --- Palabras reservadas: Tipos de dato (stats) ---
  SPEED:      'SPEED',        // int
  STAMINA:    'STAMINA',      // float
  POWER:      'POWER',        // long / int grande
  GUTS:       'GUTS',         // bool
  WIT:        'WIT',          // string

  // --- Palabras reservadas: Condicionales ---
  TURF:       'TURF',         // if
  DIRT:       'DIRT',         // else

  // --- Palabras reservadas: Bucles ---
  SPRINT:     'SPRINT',       // for corto
  MILE:       'MILE',         // for medio
  MEDIUM:     'MEDIUM',       // for largo
  LONGRUN:    'LONGRUN',      // while(true)
  RACE:       'RACE',         // for/while general
  RETIRE:     'RETIRE',       // break
  PACE:       'PACE',         // continue

  // --- Palabras reservadas: Estrategia ---
  FRONTPACE:  'FRONTPACE',    // primera instrucción / prioridad alta
  LATEPACE:   'LATEPACE',     // última instrucción / defer

  // --- Palabras reservadas: I/O ---
  ANNOUNCE:   'ANNOUNCE',     // print / console.log
  HEAR:       'HEAR',         // input / read

  // --- Palabras reservadas: Valores booleanos ---
  WIN:        'WIN',          // true
  LOSS:       'LOSS',         // false

  // --- Identificadores y literales ---
  IDENTIFIER: 'IDENTIFIER',   // nombres de variables y funciones
  NUMBER_INT:  'NUMBER_INT',  // números enteros: 42
  NUMBER_FLOAT:'NUMBER_FLOAT',// números decimales: 9.85
  STRING:     'STRING',       // cadenas de texto: "Special Week"

  // --- Operadores aritméticos ---
  PLUS:       'PLUS',         // +
  MINUS:      'MINUS',        // -
  MULTIPLY:   'MULTIPLY',     // *
  DIVIDE:     'DIVIDE',       // /
  MODULO:     'MODULO',       // %

  // --- Operadores de comparación ---
  EQUAL:      'EQUAL',        // ==
  NOT_EQUAL:  'NOT_EQUAL',    // !=
  LESS:       'LESS',         // <
  GREATER:    'GREATER',      // >
  LESS_EQ:    'LESS_EQ',      // <=
  GREATER_EQ: 'GREATER_EQ',   // >=

  // --- Operadores lógicos ---
  AND:        'AND',          // &&
  OR:         'OR',           // ||
  NOT:        'NOT',          // !

  // --- Asignación ---
  ASSIGN:     'ASSIGN',       // :=

  // --- Delimitadores y símbolos ---
  SEMICOLON:  'SEMICOLON',    // ;
  COMMA:      'COMMA',        // ,
  COLON:      'COLON',        // :
  LPAREN:     'LPAREN',       // (
  RPAREN:     'RPAREN',       // )
  LBRACE:     'LBRACE',       // {
  RBRACE:     'RBRACE',       // }
  LBRACKET:   'LBRACKET',     // [
  RBRACKET:   'RBRACKET',     // ]

  // --- Especiales ---
  EOF:        'EOF',          // fin del archivo
  ERROR:      'ERROR',        // token inválido
};

// Mapa de palabras reservadas → tipo de token
const KEYWORDS = {
  'paddock':   TokenType.PADDOCK,
  'finish':    TokenType.FINISH,
  'training':  TokenType.TRAINING,
  'skill':     TokenType.SKILL,
  'trophy':    TokenType.TROPHY,
  'speed':     TokenType.SPEED,
  'stamina':   TokenType.STAMINA,
  'power':     TokenType.POWER,
  'guts':      TokenType.GUTS,
  'wit':       TokenType.WIT,
  'turf':      TokenType.TURF,
  'dirt':      TokenType.DIRT,
  'sprint':    TokenType.SPRINT,
  'mile':      TokenType.MILE,
  'medium':    TokenType.MEDIUM,
  'longrun':   TokenType.LONGRUN,
  'race':      TokenType.RACE,
  'retire':    TokenType.RETIRE,
  'pace':      TokenType.PACE,
  'frontpace': TokenType.FRONTPACE,
  'latepace':  TokenType.LATEPACE,
  'announce':  TokenType.ANNOUNCE,
  'hear':      TokenType.HEAR,
  'win':       TokenType.WIN,
  'loss':      TokenType.LOSS,
};

module.exports = { TokenType, KEYWORDS };
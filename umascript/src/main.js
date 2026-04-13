// ============================================
// UmaScript — Punto de entrada principal
// ============================================

const fs                        = require('fs');
const path                      = require('path');
const { Lexer }                 = require('./lexer/lexer');
const { ErrorTable }            = require('./tables/errorTable');
const { SymbolTable }           = require('./tables/symbolTable');
const { TokenType }             = require('./lexer/tokens');

// ============================================
// Leer el archivo fuente .uma
// ============================================
function readSourceFile(filePath) {
  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Archivo no encontrado: ${fullPath}`);
    process.exit(1);
  }

  if (path.extname(fullPath) !== '.uma') {
    console.error(`❌ El archivo debe tener extensión .uma`);
    process.exit(1);
  }

  return fs.readFileSync(fullPath, 'utf-8');
}

// ============================================
// Llenar la tabla de símbolos desde los tokens
// ============================================
function buildSymbolTable(tokens, symbolTable, errorTable) {
  const TYPES = [
    TokenType.SPEED,
    TokenType.STAMINA,
    TokenType.POWER,
    TokenType.GUTS,
    TokenType.WIT,
  ];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // Detectar apertura de bloque → subir ámbito
    if (tok.type === TokenType.LBRACE) {
      symbolTable.enterScope();
      continue;
    }

    // Detectar cierre de bloque → bajar ámbito
    if (tok.type === TokenType.RBRACE) {
      symbolTable.exitScope();
      continue;
    }

    // Detectar declaración: training <tipo> <nombre> := <valor>
    // Patrón: TRAINING → TIPO → IDENTIFIER → ASSIGN → valor
    if (tok.type === TokenType.TRAINING) {
      const typeTok  = tokens[i + 1];  // el tipo (speed, wit, etc.)
      const nameTok  = tokens[i + 2];  // el nombre de la variable
      const assignTok = tokens[i + 3]; // el :=
      const valueTok = tokens[i + 4];  // el valor

      // Verificar que el patrón sea correcto
      if (
        typeTok  && TYPES.includes(typeTok.type) &&
        nameTok  && nameTok.type === TokenType.IDENTIFIER &&
        assignTok && assignTok.type === TokenType.ASSIGN
      ) {
        const value = valueTok ? valueTok.value : null;
        const added = symbolTable.addSymbol(
          nameTok.value,
          typeTok.value,
          value,
          nameTok.line,
          nameTok.column
        );

        // Si ya estaba declarada en el mismo ámbito → error
        if (!added) {
          errorTable.addError(
            'LEXICO',
            `Variable ya declarada: '${nameTok.value}'`,
            nameTok.line,
            nameTok.column,
            nameTok.value
          );
        }
      }
    }
  }
}

// ============================================
// Imprimir lista de tokens en consola
// ============================================
function printTokens(tokens) {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                   TOKENS — UmaScript                           ║');
  console.log('╠══════╦═══════════════════╦═══════════════════════╦═════════════╣');
  console.log('║  #   ║ TIPO              ║ VALOR                 ║ POSICIÓN    ║');
  console.log('╠══════╬═══════════════════╬═══════════════════════╬═════════════╣');

  tokens.forEach((tok, i) => {
    if (tok.type === TokenType.EOF) return;
    const num   = String(i + 1).padEnd(4);
    const type  = tok.type.padEnd(17);
    const value = String(tok.value).substring(0, 21).padEnd(21);
    const pos   = `L${tok.line}:C${tok.column}`.padEnd(11);
    console.log(`║  ${num}║ ${type} ║ ${value} ║ ${pos} ║`);
  });

  console.log('╚══════╩═══════════════════╩═══════════════════════╩═════════════╝');
  console.log(`\nTotal de tokens: ${tokens.filter(t => t.type !== TokenType.EOF).length}`);
}

// ============================================
// Función principal
// ============================================
function main() {
  // Leer argumento de línea de comandos
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║         UmaScript Compiler v1.0          ║');
    console.log('║   Uso: node src/main.js <archivo.uma>    ║');
    console.log('╚══════════════════════════════════════════╝');
    process.exit(0);
  }

  const filePath = args[0];

  console.log('╔══════════════════════════════════════════╗');
  console.log('║         UmaScript Compiler v1.0          ║');
  console.log(`║  Archivo: ${path.basename(filePath).padEnd(30)}║`);
  console.log('╚══════════════════════════════════════════╝');

  // 1. Leer el código fuente
  const source = readSourceFile(filePath);
  console.log('\n📄 Código fuente cargado correctamente.');

  // 2. Ejecutar el análisis léxico
  console.log('🔍 Ejecutando análisis léxico...');
  const lexer  = new Lexer(source);
  const tokens = lexer.tokenize();

  // 3. Inicializar tablas
  const errorTable  = new ErrorTable();
  const symbolTable = new SymbolTable();

  // 4. Pasar errores del lexer a la tabla de errores
  errorTable.addFromLexer(lexer.errors);

  // 5. Construir tabla de símbolos
  buildSymbolTable(tokens, symbolTable, errorTable);

  // 6. Mostrar resultados
  printTokens(tokens);
  symbolTable.print();
  errorTable.print();

  // 7. Resumen final
  console.log('\n══════════════════════════════════════');
  if (!errorTable.hasErrors()) {
    console.log('✅ Análisis léxico completado sin errores.');
  } else {
    console.log(`⚠️  Análisis léxico completado con ${errorTable.toArray().length} error(es).`);
  }
  console.log('══════════════════════════════════════\n');
}

main();
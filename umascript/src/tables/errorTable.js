// ============================================
// UmaScript — Tabla de Errores
// ============================================

class ErrorTable {
  constructor() {
    this.errors = [];
  }

  // Agregar un error a la tabla
  addError(type, message, line, column, value) {
    this.errors.push({
      type,       // 'LEXICO' o 'SINTACTICO'
      message,    // descripción del error
      line,       // línea donde ocurrió
      column,     // columna donde ocurrió
      value,      // el valor que causó el error
    });
  }

  // Agregar errores que vienen directo del lexer
  addFromLexer(lexerErrors) {
    for (const err of lexerErrors) {
      this.addError('LEXICO', err.message, err.line, err.column, err.value);
    }
  }

  // Verificar si hay errores registrados
  hasErrors() {
    return this.errors.length > 0;
  }

  // Obtener solo errores léxicos
  getLexicErrors() {
    return this.errors.filter(e => e.type === 'LEXICO');
  }

  // Obtener solo errores sintácticos
  getSyntaxErrors() {
    return this.errors.filter(e => e.type === 'SINTACTICO');
  }

  // Imprimir la tabla en consola de forma legible
  print() {
    if (this.errors.length === 0) {
      console.log('✅ Sin errores encontrados.');
      return;
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║              TABLA DE ERRORES — UmaScript               ║');
    console.log('╠══════╦══════════╦════════╦══════════════════════════════╣');
    console.log('║  #   ║  TIPO    ║ LÍNEA  ║ DESCRIPCIÓN                  ║');
    console.log('╠══════╬══════════╬════════╬══════════════════════════════╣');

    this.errors.forEach((err, i) => {
      const num  = String(i + 1).padEnd(4);
      const type = err.type.padEnd(8);
      const line = `L${err.line}:C${err.column}`.padEnd(6);
      const msg  = err.message.substring(0, 30).padEnd(30);
      console.log(`║  ${num}║  ${type}║ ${line}║ ${msg}║`);
    });

    console.log('╚══════╩══════════╩════════╩══════════════════════════════╝');
    console.log(`\nTotal de errores: ${this.errors.length}`);
  }

  // Retornar errores como arreglo (útil para exportar o mostrar en UI)
  toArray() {
    return this.errors;
  }
}

module.exports = { ErrorTable };
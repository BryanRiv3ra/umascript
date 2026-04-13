// ============================================
// UmaScript — Tabla de Símbolos
// ============================================

class SymbolTable {
  constructor() {
    this.symbols = [];  // lista de todos los símbolos encontrados
    this.scope   = 0;   // nivel de ámbito (0 = global, 1 = dentro de bloque, etc.)
  }

  // Agregar un símbolo nuevo a la tabla
  addSymbol(name, type, value, line, column) {
    // Verificar si ya existe en el mismo ámbito
    const exists = this.symbols.find(
      s => s.name === name && s.scope === this.scope
    );

    if (exists) {
      return false; // ya declarado en este ámbito
    }

    this.symbols.push({
      name,         // nombre del identificador
      type,         // tipo: speed, stamina, wit, guts, power
      value,        // valor asignado (puede ser null si aún no tiene)
      line,         // línea de declaración
      column,       // columna de declaración
      scope: this.scope,  // ámbito donde fue declarado
    });

    return true; // agregado con éxito
  }

  // Buscar un símbolo por nombre
  lookup(name) {
    // Busca del ámbito actual hacia el global
    for (let s = this.scope; s >= 0; s--) {
      const found = this.symbols.find(sym => sym.name === name && sym.scope === s);
      if (found) return found;
    }
    return null; // no encontrado
  }

  // Actualizar el valor de un símbolo existente
  updateValue(name, newValue) {
    const symbol = this.lookup(name);
    if (symbol) {
      symbol.value = newValue;
      return true;
    }
    return false;
  }

  // Entrar a un nuevo bloque (aumenta el ámbito)
  enterScope() {
    this.scope++;
  }

  // Salir del bloque actual (disminuye el ámbito)
  exitScope() {
    if (this.scope > 0) this.scope--;
  }

  // Verificar si un símbolo existe
  exists(name) {
    return this.lookup(name) !== null;
  }

  // Imprimir la tabla en consola de forma legible
  print() {
    if (this.symbols.length === 0) {
      console.log('📭 Tabla de símbolos vacía.');
      return;
    }

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                 TABLA DE SÍMBOLOS — UmaScript                 ║');
    console.log('╠══════════════╦══════════╦═══════════════╦════════╦════════════╣');
    console.log('║ NOMBRE       ║ TIPO     ║ VALOR         ║ LÍNEA  ║ ÁMBITO     ║');
    console.log('╠══════════════╬══════════╬═══════════════╬════════╬════════════╣');

    this.symbols.forEach(sym => {
      const name  = (sym.name  ?? '').substring(0, 12).padEnd(12);
      const type  = (sym.type  ?? '').substring(0, 8).padEnd(8);
      const value = String(sym.value ?? 'null').substring(0, 13).padEnd(13);
      const line  = `L${sym.line}:C${sym.column}`.padEnd(6);
      const scope = `ámbito ${sym.scope}`.padEnd(10);
      console.log(`║ ${name} ║ ${type} ║ ${value} ║ ${line} ║ ${scope} ║`);
    });

    console.log('╚══════════════╩══════════╩═══════════════╩════════╩════════════╝');
    console.log(`\nTotal de símbolos: ${this.symbols.length}`);
  }

  // Retornar símbolos como arreglo
  toArray() {
    return this.symbols;
  }
}

module.exports = { SymbolTable };
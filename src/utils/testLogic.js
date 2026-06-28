import { calculateEarnings } from './calculatorLogic.js';
import { parseOcrText, parseDateFromMetadata } from './ocrParser.js';
import { validateRut, formatRut } from './rutValidator.js';

console.log("=== INICIANDO PRUEBAS UNITARIAS DE LÓGICA Y RUT ===");

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

// --- Pruebas de la Calculadora de Ganancias ---

// 1. Caso de ejemplo del usuario: 24 total, 0 sin stock, Lunes ($1800 base)
const result1 = calculateEarnings({
  totalProducts: 24,
  sinStock: 0,
  isWeekendRate: true,
  orderNumber: 1
});

assert(result1.effectiveSkuCount === 24, "Calculadora - SKU efectivo debe ser 24");
assert(result1.skuRate === 60, "Calculadora - Tarifa del rango 22-31 debe ser $60");
assert(result1.skuPayment === 1440, "Calculadora - Pago SKU debe ser 24 * $60 = $1440");
assert(result1.basePayment === 1800, "Calculadora - Pago base de lunes debe ser $1800");
assert(result1.grossTotal === 3240, "Calculadora - Bruto debe ser $3240");
assert(result1.taxAmount === 494.1, "Calculadora - Impuesto (15.25% de 3240) con decimales debe ser $494.1");
assert(result1.netTotal === 2745.9, "Calculadora - Líquido (3240 - 494.1) debe ser $2745.9");

// 2. Regla del pedido 14 en adelante (Tarifa base especial de $2.500)
const resultSpecial = calculateEarnings({
  totalProducts: 24,
  sinStock: 0,
  isWeekendRate: true, // Lunes (debería ser 1800 pero el orden 14 lo sobreescribe a 2500)
  orderNumber: 14
});

assert(resultSpecial.effectiveSkuCount === 24, "Especial - SKU efectivo debe ser 24");
assert(resultSpecial.basePayment === 2500, "Especial - Pago base para pedido #14 debe ser $2500");
assert(resultSpecial.grossTotal === 3940, "Especial - Bruto (1440 + 2500) debe ser $3940");
assert(resultSpecial.taxAmount === 600.85, "Especial - Impuesto (15.25% de 3940) con decimales debe ser $600.85");
assert(resultSpecial.netTotal === 3339.15, "Especial - Líquido (3940 - 600.85) debe ser $3339.15");
assert(resultSpecial.isSpecialRate === true, "Especial - Debe marcar isSpecialRate = true");

// --- Pruebas de Validación de RUT ---
assert(validateRut("20.382.650-8") === true, "RUT - 20.382.650-8 con puntos y guion debe ser válido");
assert(validateRut("203826508") === true, "RUT - 203826508 sin formato debe ser válido");
assert(validateRut("12.345.678-5") === true, "RUT - 12.345.678-5 debe ser válido");
assert(validateRut("20.382.650-9") === false, "RUT - Dígito verificador incorrecto debe ser inválido");
assert(formatRut("203826508") === "20.382.650-8", "RUT - Formateo de entrada limpia debe dar formato correcto");
assert(formatRut("20.382.650-8") === "20.382.650-8", "RUT - Formateo de entrada con formato debe permanecer igual");

// --- Pruebas del Analizador de OCR ---
const sampleOcrText = `
Resumen de pedido
Detalle Pedido Nicolás Lavandero
Nº pedido v230912135jmch-01
Entrega Home Delivery Chile
Productos solicitados 24
Pickeados 24
Sustituidos 0
Sin stock 0
Total de productos 24
Tiempo total de picking 0:42 horas
Total de la compra $ 75.650
`;

const parsed = parseOcrText(sampleOcrText);

assert(parsed.pedidoId === "v230912135jmch-01", "OCR - ID del pedido debe ser v230912135jmch-01");
assert(parsed.productosSolicitados === 24, "OCR - Productos solicitados debe ser 24");
assert(parsed.sinStock === 0, "OCR - Sin stock debe ser 0");
assert(parsed.totalProductos === 24, "OCR - Total productos debe ser 24");
assert(parsed.pickingTime === "0:42", "OCR - Tiempo de picking debe ser 0:42");
assert(parsed.detectedDate === null, "OCR - Fecha extraída desde ID de pedido debe ser null");


console.log("=== TODAS LAS NUEVAS PRUEBAS PASARON EXITOSAMENTE ===");

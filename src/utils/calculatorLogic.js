export const DEFAULT_SKU_TABLE = [
  { min: 1, max: 11, value: 30 },
  { min: 12, max: 21, value: 50 },
  { min: 22, max: 31, value: 60 },
  { min: 32, max: 41, value: 70 },
  { min: 42, max: 51, value: 75 },
  { min: 52, max: 61, value: 80 },
  { min: 62, max: 71, value: 85 },
  { min: 72, max: 81, value: 85 },
  { min: 82, max: 91, value: 90 },
  { min: 92, max: 101, value: 90 },
  { min: 102, max: 9999, value: 95 } // Use 9999 as standard high bound
];

export const DEFAULT_BASE_PAYMENTS = {
  standard: 1500, // Martes a Sábado
  weekend: 1800   // Domingo y Lunes
};

export const DEFAULT_TAX_RETENTION = 15.25; // 15.25%

/**
 * Calcula las ganancias de un pedido de picking.
 * 
 * @param {Object} params
 * @param {number} params.totalProducts - Total de productos (normalmente del ticket)
 * @param {number} params.sinStock - Productos sin stock
 * @param {boolean} params.isWeekendRate - true si es Domingo o Lunes, false de lo contrario
 * @param {Array} [params.skuTable] - Tabla de valores SKU configurada
 * @param {Object} [params.basePayments] - Valores base de pedido configurados
 * @param {number} [params.taxRetentionPercent] - Porcentaje de retención de impuestos
 * @param {number} [params.orderNumber] - Número del pedido en el día (para aplicar tarifa >= 14)
 * @returns {Object} Desglose del cálculo de ganancias
 */
export function calculateEarnings({
  totalProducts = 0,
  sinStock = 0,
  isWeekendRate = false,
  skuTable = DEFAULT_SKU_TABLE,
  basePayments = DEFAULT_BASE_PAYMENTS,
  taxRetentionPercent = DEFAULT_TAX_RETENTION,
  orderNumber = 1
}) {
  // Cantidad de SKU efectivos = Total de productos - Sin stock
  const effectiveSkuCount = Math.max(0, totalProducts - sinStock);

  // Buscar el valor del SKU según el rango en la tabla
  const rangeRule = skuTable.find(range => {
    const maxVal = range.max === null || range.max === undefined ? Infinity : range.max;
    return effectiveSkuCount >= range.min && effectiveSkuCount <= maxVal;
  });

  const skuRate = rangeRule ? rangeRule.value : 0;
  const skuPayment = effectiveSkuCount * skuRate;

  // Valor base por pedido
  // Regla: A partir del pedido 14, la tarifa base es de $2.500 sea cual sea el día
  const basePayment = orderNumber >= 14 ? 2500 : (isWeekendRate ? basePayments.weekend : basePayments.standard);

  // Bruto
  const grossTotal = skuPayment + basePayment;

  // Retención de impuestos (con precisión decimal)
  const taxRate = taxRetentionPercent / 100;
  const taxAmount = Number((grossTotal * taxRate).toFixed(2));

  // Líquido
  const netTotal = Number((grossTotal - taxAmount).toFixed(2));

  return {
    effectiveSkuCount,
    skuRate,
    skuPayment,
    basePayment,
    grossTotal,
    taxAmount,
    netTotal,
    appliedRange: rangeRule,
    isSpecialRate: orderNumber >= 14
  };
}

/**
 * Determina si un día de la semana corresponde a la tarifa incrementada (Domingo/Lunes)
 * o estándar (Martes a Sábado).
 * 
 * @param {number} dayOfWeek - 0 (Domingo) a 6 (Sábado)
 * @returns {boolean} true si es Domingo (0) o Lunes (1), false de lo contrario
 */
export function isWeekendDay(dayOfWeek) {
  return dayOfWeek === 0 || dayOfWeek === 1;
}

/**
 * Retorna el nombre legible de la tarifa aplicada según el día de la semana
 * 
 * @param {boolean} isWeekendRate - true si es Domingo/Lunes
 * @returns {string} Nombre legible de la tarifa
 */
export function getRateName(isWeekendRate) {
  return isWeekendRate ? "Domingo y Lunes" : "Martes a Sábado";
}

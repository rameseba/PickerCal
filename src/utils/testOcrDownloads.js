import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseOcrText } from './ocrParser.js';
import { calculateEarnings } from './calculatorLogic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOWNLOADS = 'C:/Users/RAMESEBA/Downloads';
const files = [
  'WhatsApp Image 2026-06-28 at 1.05.44 AM.jpeg',
  'WhatsApp Image 2026-06-28 at 1.05.45 AM.jpeg',
  'WhatsApp Image 2026-06-28 at 1.05.45 AM (1).jpeg',
  'WhatsApp Image 2026-06-28 at 1.05.45 AM (2).jpeg',
  'WhatsApp Image 2026-06-28 at 1.05.45 AM (3).jpeg'
];

async function run() {
  console.log("=== INICIANDO ANÁLISIS DE LAS 5 BOLETAS DESCARGADAS ===");
  
  let totalGross = 0;
  let totalNet = 0;
  let totalTax = 0;
  
  // Utilizaremos tarifas por defecto de Martes-Sábado (1.500 base)
  const defaultSkuTable = [
    { min: 1, max: 11, value: 30 },
    { min: 12, max: 21, value: 50 },
    { min: 22, max: 31, value: 60 },
    { min: 32, max: 41, value: 70 },
    { min: 42, max: 51, value: 90 },
    { min: 52, max: 61, value: 110 },
    { min: 62, max: 71, value: 130 },
    { min: 72, max: 81, value: 150 },
    { min: 82, max: 91, value: 170 },
    { min: 92, max: 101, value: 190 },
    { min: 102, max: 999, value: 210 }
  ];
  
  const defaultBasePayments = { standard: 1500, weekend: 1800 };
  const defaultTaxRetention = 15.25;

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(DOWNLOADS, files[i]);
    console.log(`\n--------------------------------------------`);
    console.log(`Archivo: ${files[i]} (Pedido #${i + 1})`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: El archivo no existe en ${filePath}`);
      continue;
    }
    
    try {
      const { data: { text } } = await Tesseract.recognize(filePath, 'spa');
      console.log("--- TEXTO RECONOCIDO POR OCR ---");
      console.log(text.trim());
      console.log("--------------------------------");
      
      const parsed = parseOcrText(text);
      console.log("-> Datos extraídos:");
      console.log(`   ID Pedido: ${parsed.pedidoId}`);
      console.log(`   Solicitados: ${parsed.productosSolicitados}`);
      console.log(`   Sin Stock: ${parsed.sinStock}`);
      console.log(`   Total Cart: ${parsed.totalProductos}`);
      console.log(`   Tiempo Picking: ${parsed.pickingTime}`);
      
      const effectiveSku = Math.max(0, (parsed.totalProductos || 0) - (parsed.sinStock || 0));
      
      const earnings = calculateEarnings({
        totalProducts: parsed.totalProductos || 0,
        sinStock: parsed.sinStock || 0,
        isWeekendRate: false, // Tarifa Martes-Sábado (1.500)
        skuTable: defaultSkuTable,
        basePayments: defaultBasePayments,
        taxRetentionPercent: defaultTaxRetention,
        orderNumber: i + 1
      });
      
      console.log("-> Cálculo individual:");
      console.log(`   SKUs Efectivos: ${effectiveSku}`);
      console.log(`   Valor Base: $${earnings.basePayment}`);
      console.log(`   Rango SKU: $${earnings.skuRate} por unidad`);
      console.log(`   Pago SKU: $${earnings.skuPayment}`);
      console.log(`   Bruto: $${earnings.grossTotal}`);
      console.log(`   Retención (15.25%): $${earnings.taxAmount}`);
      console.log(`   Neto Líquido: $${earnings.netTotal}`);
      
      totalGross += earnings.grossTotal;
      totalTax += earnings.taxAmount;
      totalNet += earnings.netTotal;
      
    } catch (err) {
      console.error("Error al procesar:", err);
    }
  }
  
  console.log("\n==================================================");
  console.log("=== RESULTADOS TOTALES DE LAS 5 BOLETAS ===");
  console.log(`SUMA BRUTO: $${totalGross} CLP`);
  console.log(`SUMA RETENCIÓN (15.25%): $${totalTax} CLP`);
  console.log(`TOTAL NETO LÍQUIDO A PAGAR: $${totalNet} CLP`);
  
  // Vamos a recalcular aplicando el impuesto AL FINAL de la suma en lugar de redondeo por boleta
  const totalTaxCombined = Math.round(totalGross * (defaultTaxRetention / 100));
  const totalNetCombined = totalGross - totalTaxCombined;
  console.log("----------------------------------");
  console.log("Si calculamos la retención sobre la suma final (no por boleta):");
  console.log(`Suma de Brutos: $${totalGross} CLP`);
  console.log(`Retención Combinada: $${totalTaxCombined} CLP`);
  console.log(`Neto Líquido Combinado: $${totalNetCombined} CLP`);
  console.log(`Diferencia de redondeo acumulado: $${Math.abs(totalNetCombined - totalNet)} CLP`);
  console.log("==================================================");
}

run();

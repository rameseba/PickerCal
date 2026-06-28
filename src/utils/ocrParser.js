/**
 * Analiza el texto extraído por OCR para buscar y mapear los campos clave del pedido.
 * Utiliza expresiones regulares adaptadas y tolerantes a pequeños errores de lectura.
 * 
 * @param {string} text - Texto bruto obtenido del OCR
 * @returns {Object} Datos extraídos
 */
export function parseOcrText(text) {
  const result = {
    pedidoId: null,
    productosSolicitados: null,
    pickeados: null,
    sustituidos: null,
    sinStock: null,
    totalProductos: null,
    detectedDate: null,
    isWeekendRate: false,
    pickingTime: null
  };

  if (!text) return result;

  // Convertir a minúsculas para comparaciones uniformes
  const cleanText = text.toLowerCase();

  // 1. Extraer ID del pedido (Nº pedido)
  // Prioridad 1: Buscar código que empiece por 'v' y contenga al menos 6 dígitos (ej: v230912...)
  const vIdMatch = text.match(/\b(v\d{6,14}[a-z0-9\-]*)\b/i);
  if (vIdMatch) {
    result.pedidoId = vIdMatch[1].trim();
  } else {
    // Prioridad 2: Buscar patrón "n° pedido" o similar seguido de código
    const pedidoRegex = /(?:n[º°o]?\s*pedido|no?\s*pedido|nº\s*pedido)[\s\:\-\—\.\_]*([a-z0-9\-]+)/i;
    const pedidoMatch = text.match(pedidoRegex);
    if (pedidoMatch && pedidoMatch[1]) {
      result.pedidoId = pedidoMatch[1].trim();
    } else {
      // Prioridad 3: Buscar "pedido" seguido de un código con al menos un dígito
      const fallbackRegex = /\bpedido[\s\:\-\—\.\_]+([a-z0-9\-]*\d[a-z0-9\-]*)/i;
      const fallbackMatch = text.match(fallbackRegex);
      if (fallbackMatch && fallbackMatch[1]) {
        result.pedidoId = fallbackMatch[1].trim();
      }
    }
  }

  // 3. Extraer tiempo de picking (ej: "tiempo total de picking 0:42 horas" -> "0:42")
  const timeRegex = /(?:tiempo\s+total\s+de\s+picking|tiempo\s+picking|picking)[\s\:\-\—\.\_]*(\d+[\:\.]\d+)/i;
  const timeMatch = cleanText.match(timeRegex);
  if (timeMatch && timeMatch[1]) {
    result.pickingTime = timeMatch[1].trim();
  }

  // 4. Función auxiliar para encontrar el primer número entero después de una palabra clave
  function findNumberNearKeyword(keywordRegex, textStr) {
    const match = textStr.match(keywordRegex);
    if (match) {
      const startIndex = match.index + match[0].length;
      // Extrae un bloque de texto después de la palabra clave
      const searchSubstr = textStr.substring(startIndex, startIndex + 40);
      
      // Dividir por líneas y tomar solo la primera línea (el valor debe estar en la misma línea del texto)
      const firstLine = searchSubstr.split('\n')[0].trim();
      
      // Si la línea es 'o' u 'O' sola, o empieza por 'o'/'O' seguida de espacio, es el número 0 mal leído por el OCR
      if (/^[oO](?:\s|$)/.test(firstLine)) {
        return 0;
      }
      
      // Busca un número entero en esta primera línea
      const numMatch = firstLine.match(/\d+/);
      if (numMatch) {
        return parseInt(numMatch[0], 10);
      }
    }
    return null;
  }

  // Mapear campos con expresiones regulares robustas
  result.productosSolicitados = findNumberNearKeyword(/productos?\s+solicitados?/i, cleanText);
  result.pickeados = findNumberNearKeyword(/(?:pickeados?|piqueados?|piqueo)/i, cleanText);
  result.sustituidos = findNumberNearKeyword(/(?:sustituidos?|sustitutos?|sustituido)/i, cleanText);
  result.sinStock = findNumberNearKeyword(/(?:sin\s+stock|out\s+of\s+stock)/i, cleanText);
  result.totalProductos = findNumberNearKeyword(/(?:total\s+de\s+productos?|total\s+productos?)/i, cleanText);

  // Si no se encuentra totalProductos pero sí pickeados, a veces en la boleta coinciden
  if (result.totalProductos === null && result.pickeados !== null) {
    result.totalProductos = result.pickeados;
  }

  return result;
}

/**
 * Intenta extraer la fecha del nombre de archivo (ej. WhatsApp images)
 * o de metadatos EXIF, y devuelve el día de la semana correspondiente.
 * 
 * @param {string} fileName - Nombre del archivo subido
 * @param {number} [lastModified] - Timestamp de última modificación del archivo
 * @returns {Object|null} Objeto con la fecha y si aplica tarifa fin de semana/lunes
 */
export function parseDateFromMetadata(fileName, lastModified) {
  if (!fileName) return null;

  // Intentar con patrón de WhatsApp: IMG-YYYYMMDD-WA... o Screenshot_YYYYMMDD-WA...
  // Ej: IMG-20230912-WA0001.jpg -> 2023-09-12
  const waDateMatch = fileName.match(/(?:img|screenshot|screenshot_)[\-_]?(\d{4})(\d{2})(\d{2})/i);
  if (waDateMatch) {
    const year = parseInt(waDateMatch[1], 10);
    const month = parseInt(waDateMatch[2], 10) - 1;
    const day = parseInt(waDateMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      const dayOfWeek = date.getDay();
      return {
        dateStr: date.toISOString().split('T')[0],
        isWeekendRate: dayOfWeek === 0 || dayOfWeek === 1
      };
    }
  }

  // Intentar cualquier patrón de fecha YYYYMMDD o YYYY-MM-DD
  const datePatternMatch = fileName.match(/(\d{4})[\-_]?(\d{2})[\-_]?(\d{2})/);
  if (datePatternMatch) {
    const year = parseInt(datePatternMatch[1], 10);
    const month = parseInt(datePatternMatch[2], 10) - 1;
    const day = parseInt(datePatternMatch[3], 10);
    // Asegurarse de que el año sea razonable (ej. entre 2020 y 2030)
    if (year >= 2020 && year <= 2035 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        const dayOfWeek = date.getDay();
        return {
          dateStr: date.toISOString().split('T')[0],
          isWeekendRate: dayOfWeek === 0 || dayOfWeek === 1
        };
      }
    }
  }

  // Fallback a lastModified si es una captura vieja y no el momento actual
  // Si la captura se tomó hoy, lastModified será hoy. Pero si es una imagen guardada,
  // lastModified puede ser la fecha en que se descargó/guardó.
  if (lastModified) {
    const diffMs = Date.now() - lastModified;
    // Si la fecha es de hace más de 12 horas, es probable que no sea una captura instantánea de ahora mismo
    if (diffMs > 12 * 60 * 60 * 1000) {
      const date = new Date(lastModified);
      const dayOfWeek = date.getDay();
      return {
        dateStr: date.toISOString().split('T')[0],
        isWeekendRate: dayOfWeek === 0 || dayOfWeek === 1
      };
    }
  }

  return null;
}

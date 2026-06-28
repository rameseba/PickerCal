/**
 * Valida un RUT chileno (con o sin puntos y guión).
 * 
 * @param {string} rut - El RUT a validar (ej: "20.382.650-8" o "203826508")
 * @returns {boolean} true si es válido, false de lo contrario
 */
export function validateRut(rut) {
  if (!rut || typeof rut !== 'string') return false;

  // Limpiar el RUT de puntos y guiones y pasar a mayúsculas
  const cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
  if (cleanRut.length < 2) return false;

  // Separar cuerpo y dígito verificador
  const cuerpo = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // Calcular dígito verificador esperado
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const dvEsperado = 11 - (suma % 11);
  let dvCalc = '0';
  if (dvEsperado === 10) dvCalc = 'K';
  else if (dvEsperado === 11) dvCalc = '0';
  else dvCalc = dvEsperado.toString();

  return dv === dvCalc;
}

/**
 * Formatea un string como un RUT chileno en tiempo real.
 * Agrega puntos y guión a medida que el usuario escribe.
 * 
 * @param {string} value - El texto ingresado
 * @returns {string} El RUT formateado (ej: "20.382.650-8")
 */
export function formatRut(value) {
  if (!value) return '';

  // Limpiar caracteres no válidos (solo números y K)
  let clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean;

  // Dividir cuerpo y DV
  const dv = clean.slice(-1);
  let cuerpo = clean.slice(0, -1);

  // Formatear cuerpo con puntos
  let cuerpoFormateado = '';
  let cont = 0;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    cuerpoFormateado = cuerpo.charAt(i) + cuerpoFormateado;
    cont++;
    if (cont === 3 && i > 0) {
      cuerpoFormateado = '.' + cuerpoFormateado;
      cont = 0;
    }
  }

  return `${cuerpoFormateado}-${dv}`;
}

/**
 * Desformatea un RUT para guardarlo en formato limpio (sin puntos ni guion).
 * 
 * @param {string} rut 
 * @returns {string} RUT limpio (ej: "203826508")
 */
export function cleanRut(rut) {
  if (!rut) return '';
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

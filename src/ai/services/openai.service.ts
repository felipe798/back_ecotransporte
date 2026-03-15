import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('=== OPENAI SERVICE INIT ===');
    console.log('OPENAI_API_KEY presente:', !!apiKey);
    console.log('OPENAI_API_KEY longitud:', apiKey ? apiKey.length : 0);
    console.log('OPENAI_API_KEY prefijo:', apiKey ? apiKey.substring(0, 7) + '...' : 'NO CONFIGURADA');
    if (!apiKey) {
      console.error('ERROR CRITICO: OPENAI_API_KEY no está configurada en las variables de entorno');
    }
    this.openai = new OpenAI({
      apiKey,
    });
    console.log('=== FIN OPENAI SERVICE INIT ===');
  }

  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    console.log('=== EXTRAYENDO TEXTO DEL PDF ===');
    console.log('Buffer recibido:', !!pdfBuffer);
    console.log('Tamaño del buffer:', pdfBuffer ? pdfBuffer.length : 0, 'bytes');

    // pdf-parse v2.x API (según documentación oficial):
    //   const { PDFParse } = require('pdf-parse');
    //   const parser = new PDFParse({ data: buffer });
    //   const result = await parser.getText();
    //   await parser.destroy();
    //   result.text contiene el texto extraído
    let data: { text: string; numpages?: number };
    try {
      const mod = require('pdf-parse');
      console.log('pdf-parse módulo cargado, tipo:', typeof mod);

      if (mod?.PDFParse) {
        // v2.x — API correcta con clase PDFParse
        console.log('pdf-parse: v2.x detectado, usando new PDFParse({ data: buffer }).getText()');
        const PDFParseClass = mod.PDFParse;
        const parser = new PDFParseClass({ data: pdfBuffer });
        const result = await parser.getText();
        await parser.destroy();
        data = { text: result.text ?? '', numpages: result.total ?? null };
      } else if (typeof mod === 'function') {
        // v1.x — la función es el export directamente
        console.log('pdf-parse: v1.x detectado, llamando como función');
        data = await mod(pdfBuffer);
      } else if (typeof mod?.default === 'function') {
        // v1.x en .default
        console.log('pdf-parse: v1.x detectado en .default');
        data = await mod.default(pdfBuffer);
      } else {
        console.error('pdf-parse: estructura desconocida. Keys:', Object.keys(mod || {}));
        throw new Error(`Estructura de pdf-parse no reconocida. Keys: ${Object.keys(mod || {}).join(', ')}`);
      }

      console.log('pdf-parse ejecutado correctamente');
      console.log('Páginas detectadas:', data?.numpages);
      console.log('Texto extraído (longitud):', data?.text ? data.text.trim().length : 0, 'caracteres');
      if (data?.text) {
        console.log('Primeros 200 chars del texto:', data.text.trim().substring(0, 200));
      }
    } catch (parseErr) {
      console.error('ERROR en pdf-parse al procesar el buffer:', parseErr?.message);
      console.error('Stack pdf-parse:', parseErr?.stack);
      throw parseErr;
    }

    if (!data.text || data.text.trim().length < 50) {
      console.error('TEXTO INSUFICIENTE: longitud=', data?.text?.trim().length ?? 0, '(mínimo 50)');
      throw new Error('PDF sin texto extraíble (posiblemente escaneado o vacío)');
    }

    console.log('=== TEXTO EXTRAÍDO OK ===');
    return data.text;
  }

  /**
   * Normaliza nombres de empresa: extrae el nombre comercial corto
   * "PALTARUMI SOCIEDAD ANONIMA CERRADA - PALTARUMI S.A.C." → "PALTARUMI S.A.C."
   * "ECO GOLD SOCIEDAD ANONIMA CERRADA" → "ECO GOLD S.A.C."
   */
  private normalizeCompanyName(name: string): string {
    if (!name) return name;

    let normalized = name.trim();

    // Si tiene formato "NOMBRE LARGO - NOMBRE CORTO", usar la parte después del guión
    const dashParts = normalized.split(/\s+-\s+/);
    if (dashParts.length >= 2) {
      // La parte corta generalmente es la última que contiene S.A.C., S.A., etc.
      const lastPart = dashParts[dashParts.length - 1].trim();
      if (/S\.?A\.?C?\.?/i.test(lastPart)) {
        normalized = lastPart;
      }
    }

    // Corregir errores comunes de OCR en palabras legales
    normalized = normalized.replace(/S\.?C\.?IEDAD/gi, 'SOCIEDAD');

    // Reemplazar variaciones de razón social con abreviaciones
    normalized = normalized.replace(/\s*SOCIEDAD\s+ANONIMA\s+CERRADA\s*/gi, ' S.A.C. ');
    normalized = normalized.replace(/\s*SOCIEDAD\s+ANONIMA\s*/gi, ' S.A. ');
    normalized = normalized.replace(/\s*SOCIEDAD\s+COMERCIAL\s+DE\s+RESPONSABILIDAD\s+LIMITADA\s*/gi, ' S.R.L. ');
    normalized = normalized.replace(/\s*EMPRESA\s+INDIVIDUAL\s+DE\s+RESPONSABILIDAD\s+LIMITADA\s*/gi, ' E.I.R.L. ');

    // Limpiar espacios múltiples y guiones sueltos
    normalized = normalized.replace(/\s+/g, ' ').trim();
    normalized = normalized.replace(/^-\s*|\s*-$/g, '').trim();

    return normalized;
  }

  /**
   * Normaliza el material/producto transportado:
   * - Quita prefijo "POR " al inicio
   * - Quita códigos de lote (ej: "0012-21416")
   * - Quita clasificaciones ONU (ej: "/ CLASE: 09 UN: 3077")
   * - Quita sufijos como "- GRANEL"
   * - Limpia espacios extra
   */
  private normalizeMaterial(material: string): string {
    if (!material) return material;

    let cleaned = material.trim().toUpperCase();

    // Quitar prefijo "POR "
    cleaned = cleaned.replace(/^POR\s+/i, '');

    // Quitar clasificaciones ONU: "/ CLASE: 09 UN: 3077", "CLASE 9", "UN 3077", "UN: 3077"
    cleaned = cleaned.replace(/\s*\/?\s*CLASE\s*:?\s*\d+\s*(UN\s*:?\s*\d+)?/gi, '');
    cleaned = cleaned.replace(/\s+UN\s*:?\s*\d+/gi, '');

    // Quitar códigos de lote: "0012-21416", etc.
    cleaned = cleaned.replace(/\s+\d{4}-\d{4,}/g, '');

    // Quitar sufijo "- GRANEL" o "/ GRANEL" (mantener "A GRANEL" que es parte del nombre del material)
    cleaned = cleaned.replace(/\s*[-/]\s*GRANEL\s*$/i, '');

    // Limpiar espacios múltiples y guiones/barras sueltos al final
    cleaned = cleaned.replace(/\s*[-/]\s*$/, '').replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Extrae campos críticos directamente del texto PDF usando regex.
   * Determinista — no depende de OpenAI. Sobreescribe los valores alucinados.
   */
  private extractCriticalFieldsFromText(pdfText: string): {
    partida?: string;
    llegada?: string;
    cliente?: string;
    grt?: string;
    transportista?: string;
    unidad?: string;
    tn_enviado?: number;
  } {
    const result: any = {};

    // GRT — línea con "ELECTRÓNICA" seguida del código
    const grtMatch = pdfText.match(/ELECTR[OÓ]NICA\s+([A-Z0-9]+-\d+)/i);
    if (grtMatch) result.grt = grtMatch[1].trim();

    // TRANSPORTISTA — "CONDUCTOR PRINCIPAL:DNI XXXXXXXX - NOMBRE"
    const transportistaMatch = pdfText.match(/CONDUCTOR PRINCIPAL\s*:\s*DNI\s+\d+\s*-\s*(.+)/i);
    if (transportistaMatch) result.transportista = transportistaMatch[1].trim();

    // UNIDAD — placa de "VEHÍCULO PRINCIPAL:" (6-7 chars alfanuméricos)
    const unidadMatch = pdfText.match(/VEH[IÍ]CULO PRINCIPAL\s*:\s*([A-Z0-9]{2,3}-?[A-Z0-9]{3,4})(?:\b|\s)/i);
    if (unidadMatch) result.unidad = unidadMatch[1].replace(/-/g, '').trim();

    // TN_ENVIADO — suma TODAS las filas con U/M = TNE (el material no importa para el peso)
    // Estrategia 1: filas estructuradas con Nro. + CÓD. + descripción + TNE + cantidad
    // Estrategia 2 (fallback): busca todas las ocurrencias de "TNE <número>" en texto plano
    // La fila KGM es ignorada porque el regex solo captura TNE.
    // "PESO BRUTO TOTAL (TNE): 53.21" es ignorado porque va seguido de ")" no de espacio+número.

    // --- Estrategia 1: filas estructuradas ---
    const tneRowRegex = /\d+\s+\d+\s+.*?\s+TNE\s+([\d.,]+)/gi;
    const tneRowAmounts: number[] = [];
    let tneRowMatch;
    while ((tneRowMatch = tneRowRegex.exec(pdfText)) !== null) {
      const amount = parseFloat(tneRowMatch[1].replace(',', '.'));
      if (!isNaN(amount)) tneRowAmounts.push(amount);
    }

    if (tneRowAmounts.length >= 1) {
      const total = tneRowAmounts.reduce((sum, a) => sum + a, 0);
      result.tn_enviado = Math.round(total * 100) / 100;
      if (tneRowAmounts.length > 1) {
        console.log(`  📦 Estrategia 1: ${tneRowAmounts.length} filas TNE → suma: ${result.tn_enviado}`);
      }
    } else {
      // --- Estrategia 2 (fallback): busca todas las ocurrencias de "TNE <número>" ---
      const tneAllRegex = /\bTNE[\s\t\r\n]+([\d.,]+)/gi;
      const tneAllAmounts: number[] = [];
      let tneAllMatch;
      while ((tneAllMatch = tneAllRegex.exec(pdfText)) !== null) {
        const amount = parseFloat(tneAllMatch[1].replace(',', '.'));
        if (!isNaN(amount)) tneAllAmounts.push(amount);
      }

      if (tneAllAmounts.length >= 1) {
        const total = tneAllAmounts.reduce((sum, a) => sum + a, 0);
        result.tn_enviado = Math.round(total * 100) / 100;
        if (tneAllAmounts.length > 1) {
          console.log(`  📦 Estrategia 2 (fallback): ${tneAllAmounts.length} valores TNE → suma: ${result.tn_enviado}`);
        }
      }
      // Si length === 0 → no se encontró TNE → result.tn_enviado queda undefined
    }

    // CLIENTE — primera aparición de "DENOMINACIÓN:" (sección REMITENTE)
    const denominacionMatch = pdfText.match(/DENOMINACI[OÓ]N\s*:\s*(.+)/i);
    if (denominacionMatch) result.cliente = this.normalizeCompanyName(denominacionMatch[1].trim());

    // PARTIDA — "PUNTO DE PARTIDA:(UBIGEO) DEPT - PROV - DIST - dirección..."
    const partidaRaw = pdfText.match(/PUNTO DE PARTIDA\s*:\s*\(\d+\)\s*(.+)/i);
    if (partidaRaw) {
      const parts = partidaRaw[1].split(/\s+-\s+/);
      if (parts.length >= 3) {
        const dep = parts[0].trim();
        const prov = parts[1].trim();
        const dist = parts[2].trim();
        result.partida = `${dep}-${prov}-${dist}`;
      }
    }

    // LLEGADA — "PUNTO DE LLEGADA:(UBIGEO) DEPT - PROV - DIST [(SUFIJO)] - dirección..."
    // El distrito puede tener un sufijo entre paréntesis ej: "CALLAO (IMPALA)"
    const llegadaRaw = pdfText.match(/PUNTO DE LLEGADA\s*:\s*\(\d+\)\s*(.+)/i);
    if (llegadaRaw) {
      const parts = llegadaRaw[1].split(/\s+-\s+/);
      if (parts.length >= 3) {
        const dep = parts[0].trim();
        const prov = parts[1].trim();
        // El distrito es parts[2] — puede incluir "(IMPALA)" etc.
        // Limpiar texto de dirección que haya escapado (empieza con mayúsculas + punto)
        let dist = parts[2].trim();
        // Quitar cualquier texto de dirección que pueda haber quedado al final
        dist = dist.replace(/\s+[A-Z]{3,}\..*$/, '').trim();
        result.llegada = `${dep}-${prov}-${dist}`;
      }
    }

    console.log('=== REGEX EXTRACCIÓN DIRECTA ===');
    console.log('GRT:', result.grt ?? '(no encontrado)');
    console.log('Transportista:', result.transportista ?? '(no encontrado)');
    console.log('Unidad:', result.unidad ?? '(no encontrado)');
    console.log('Cliente (remitente):', result.cliente ?? '(no encontrado)');
    console.log('Partida:', result.partida ?? '(no encontrado)');
    console.log('Llegada:', result.llegada ?? '(no encontrado)');
    console.log('================================');
    return result;
  }

  /**
   * Valida que los campos extraídos por OpenAI existan literalmente en el PDF.
   * Detecta alucinaciones — si un campo no aparece en el texto, lo pone en null.
   */
  private validateAgainstPdfText(extractedData: any, pdfText: string): any {
    const validated = { ...extractedData };
    const pdfUpper = pdfText.toUpperCase();

    // Validar GRT
    if (validated.grt && !pdfUpper.includes(validated.grt.toUpperCase())) {
      console.warn(`⚠️ VALIDACIÓN: grt "${validated.grt}" no encontrado en PDF → null`);
      validated.grt = null;
    }

    // Validar transportista — al menos 2 palabras del nombre deben estar en el PDF
    if (validated.transportista) {
      const words = validated.transportista.split(' ').filter((w: string) => w.length > 3);
      const foundCount = words.filter((w: string) => pdfUpper.includes(w.toUpperCase())).length;
      if (foundCount < Math.min(2, words.length)) {
        console.warn(`⚠️ VALIDACIÓN: transportista "${validated.transportista}" no encontrado en PDF → null`);
        validated.transportista = null;
      }
    }

    // Validar cliente — la palabra principal debe estar en el PDF
    if (validated.cliente) {
      const mainWord = validated.cliente
        .replace(/S\.A\.C\.|S\.A\.|S\.R\.L\.|E\.I\.R\.L\./gi, '')
        .trim()
        .split(' ')
        .find((w: string) => w.length > 3);
      if (mainWord && !pdfUpper.includes(mainWord.toUpperCase())) {
        console.warn(`⚠️ VALIDACIÓN: cliente "${validated.cliente}" ("${mainWord}") no encontrado en PDF → null`);
        validated.cliente = null;
      }
    }

    return validated;
  }

  async extractDocumentData(pdfBuffer: Buffer, materiales: string[] = []): Promise<any> {
    try {
      console.log('=== EXTRACT DOCUMENT DATA - INICIO ===');
      console.log('Buffer recibido:', !!pdfBuffer, '- tamaño:', pdfBuffer?.length, 'bytes');

      let pdfText: string;
      try {
        pdfText = await this.extractTextFromPdf(pdfBuffer);
        console.log('Texto PDF extraído OK, longitud total:', pdfText.length);
      } catch (pdfErr) {
        console.error('FALLO EN extractTextFromPdf:', pdfErr?.message);
        throw pdfErr;
      }

      const prompt = `Analiza el siguiente texto extraído de un documento y determina si es una Guía de Remisión Transportista Electrónica u otro documento comercial de transporte de Perú.

⚠️ REGLA FUNDAMENTAL: SOLO extrae información que aparezca LITERALMENTE en el texto del documento. NUNCA inventes datos, NUNCA uses información de documentos anteriores, NUNCA completes campos con suposiciones. Si no encuentras exactamente la etiqueta indicada, devuelve null. Cada campo debe poder verificarse palabra por palabra en el texto proporcionado.

PRIMERO: Si el texto NO corresponde a un documento de transporte (recetas, facturas no relacionadas, documentos personales, etc.), responde SOLO con:
{"es_documento_valido": false, "motivo_rechazo": "Descripción breve"}

Si SÍ es válido, extrae los campos indicados buscando EXACTAMENTE las etiquetas descritas en el texto. Copia los valores tal como aparecen, sin modificar, sin añadir ni quitar caracteres.

=== CAMPOS A EXTRAER ===

- fecha: Fecha de emisión del documento en formato YYYY-MM-DD.

- mes: Mes de la fecha de emisión en español minúsculas (enero, febrero, marzo, etc.).

- semana: Número de semana DEL MES correspondiente a la fecha. La semana 1 va del día 1 al primer domingo del mes; la semana 2 del primer lunes al segundo domingo; y así sucesivamente. SIN ceros a la izquierda ("1", "2", "5", nunca "01"). Nota: el servidor recalcula este valor, devuelve tu mejor estimación.

- grt: Busca la línea que contiene "GUÍA DE REMISIÓN TRANSPORTISTA ELECTRÓNICA" y copia ÚNICAMENTE el código que aparece entre comillas en esa línea.
  Ejemplo de línea: GUÍA DE REMISIÓN TRANSPORTISTA ELECTRÓNICA "VVV1-000558" → extraes: "VVV1-000558"
  Cópialo tal cual, sin añadir ni cambiar ningún carácter.

- transportista: Busca la línea que contiene "CONDUCTOR PRINCIPAL:". Esa línea tiene el formato:
  CONDUCTOR PRINCIPAL:DNI XXXXXXXX - NOMBRE APELLIDO(S)
  Extrae ÚNICAMENTE el nombre y apellido(s) que aparecen después del guión. No incluyas el DNI ni el número.
  Ejemplo: "CONDUCTOR PRINCIPAL:DNI 40386126 - JULIO CESAR ESPINOZA LAVADO" → extraes: "JULIO CESAR ESPINOZA LAVADO"

- unidad: Busca la línea que contiene "VEHÍCULO PRINCIPAL:" o "VEHICULO PRINCIPAL:". Extrae ÚNICAMENTE la placa que aparece después de los dos puntos.
  La placa tiene formato peruano: 3 caracteres alfanuméricos + 3 dígitos (ej: CBS840, BXX714, AWW898).
  Si tiene guión (ej: BEA-768), quítalo y devuelve BEA768. Solo la placa, nada más.
  NO confundir con el TUC que es un código largo (ej: 15M21034987E).

- tn_enviado: Busca la tabla del documento que tiene las columnas "Nro.", "CÓD.", "DESCRIPCIÓN", "U/M", "CANTIDAD". Extrae el número de la columna CANTIDAD de cada fila donde U/M sea "TNE".
  - Si hay UNA sola fila TNE → devuelve ese número.
  - Si hay VARIAS filas TNE con el MISMO material → SUMA todas las CANTIDAD y devuelve el total.
  - Si hay VARIAS filas TNE con MATERIALES DISTINTOS → devuelve solo la CANTIDAD de la fila 1.
  Ejemplo fila única: "1 2001 POR CONCENTRADO DE ZINC TNE 34.560" → devuelves: 34.56
  Ejemplo filas mismo material: "1 2001 POR LOTE MINERAL TNE 34.550" y "2 2001 POR LOTE MINERAL TNE 1.980" → devuelves: 36.53 (34.550 + 1.980)
  Redondea siempre a exactamente 2 decimales.

- grr: Busca la línea que contiene "GUÍA DE REMISIÓN REMITENTE" y extrae ÚNICAMENTE el código alfanumérico al final (empieza con EG o GR).
  Ejemplo: "GUÍA DE REMISIÓN REMITENTE EG07-5784" → extraes: "EG07-5784"
  Cópialo tal cual.

- cliente: Busca el campo "DENOMINACIÓN:" que aparece en la sección del REMITENTE (es la PRIMERA aparición de "DENOMINACIÓN:" en el documento, NO la que está dentro de OBSERVACIONES o la sección DESTINATARIO al final). El REMITENTE es quien envía la carga, es el cliente de transporte.
  Extrae el nombre que aparece después.
  Si el nombre tiene formato "NOMBRE LARGO - NOMBRE CORTO S.A.C.", usa SOLO la parte después del último guión.
  Si no tiene guión, abrevia: reemplaza "SOCIEDAD ANONIMA CERRADA" por "S.A.C.", "SOCIEDAD ANONIMA" por "S.A.".
  Ejemplo: "DENOMINACIÓN:PALTARUMI SOCIEDAD ANONIMA CERRADA - PALTARUMI S.A.C." → extraes: "PALTARUMI S.A.C."
  Ejemplo: "DENOMINACIÓN:MONARCA GOLD S.A.C." → extraes: "MONARCA GOLD S.A.C."
  IMPORTANTE: Si en OBSERVACIONES dice "DESTINATARIO: ... - OTRA EMPRESA", ignora eso. El cliente es siempre el REMITENTE.

- partida: Busca la línea que contiene "PUNTO DE PARTIDA:". Esa línea tiene el formato:
  PUNTO DE PARTIDA:(CÓDIGO) DEPARTAMENTO - PROVINCIA - DISTRITO - dirección extra...
  Extrae ÚNICAMENTE los tres primeros niveles geográficos separados por guión SIN espacios: DEPARTAMENTO-PROVINCIA-DISTRITO.
  Ignora el código ubigeo entre paréntesis y todo texto adicional después del tercer nivel.
  Ejemplo: "PUNTO DE PARTIDA:(130104) LA LIBERTAD - TRUJILLO - HUANCHACO - CAR. PANAMERICANA KM. 584" → extraes: "LA LIBERTAD-TRUJILLO-HUANCHACO"

- llegada: Igual que partida pero busca "PUNTO DE LLEGADA:". Mismas reglas de extracción.
  CRÍTICO: si el nombre del distrito incluye una aclaración entre paréntesis (ej: "CALLAO (IMPALA)", "CALLAO (CONCHÁN)"), DEBES incluirla en el resultado separada por espacio.
  Ejemplo: "PUNTO DE LLEGADA:(070101) CALLAO - CALLAO - CALLAO (IMPALA) - AV. NÉSTOR GAMBETA..." → extraes: "CALLAO-CALLAO-CALLAO (IMPALA)"
  Ejemplo: "PUNTO DE LLEGADA:(021806) ANCASH - SANTA - NEPEÑA - OTR. QUEBRADA SANTA LUCIA..." → extraes: "ANCASH-SANTA-NEPEÑA"
  Ejemplo: "PUNTO DE LLEGADA:(150202) LIMA - BARRANCA - PARAMONGA - PALTARUMI NRO S/N..." → extraes: "LIMA-BARRANCA-PARAMONGA"
  Recuerda: SOLO los 3 primeros niveles geográficos (con sufijo entre paréntesis si lo hay), nada de direcciones.

- transportado: Busca en la tabla del documento que tiene columnas "Nro.", "CÓD.", "DESCRIPCIÓN", "U/M", "CANTIDAD".
  Extrae ÚNICAMENTE el contenido de la columna DESCRIPCIÓN de esa tabla (la fila con número 1, 2, etc.).
  Limpia el valor extraído: quita el prefijo "POR " si lo hay, quita códigos ONU ("UN 3077", "CLASE 9", "/ CLASE: 09"), quita lotes numéricos tipo "0012-21416" (secuencias de dígitos con guión), quita sufijos "- GRANEL" o "/ GRANEL" (pero mantén "A GRANEL" si es parte del nombre).
  Si la columna DESCRIPCIÓN dice literalmente "LOTE MINERAL" u otro texto con "LOTE", extráelo tal cual — puede ser un nombre de material válido.
${materiales.length > 0 ? `  IMPORTANTE: Una vez extraido el nombre del material, compáralo semánticamente con esta lista del catálogo registrado y devuelve EXACTAMENTE el valor más adecuado de la lista (copia textual), o null si ningúno corresponde:
  ${materiales.map(m => `"${m}"`).join(', ')}
  Equivalencias de símbolos químicos que DEBES aplicar al comparar:
  - COBRE = CU,  ZINC = ZN,  ORO = AU,  PLATA = AG,  PLOMO = PB,  HIERRO = FE,  ESTAÑO = SN
  Ejemplos de matching semántico:
  - "CONCENTRADO DE ZN UN 3077" → si existe "CONCENTRADO DE ZN" en la lista → devuelves: "CONCENTRADO DE ZN"
  - "MINERAL AURIFERO" → si existe "MINERAL AURIFERO" → devuelves: "MINERAL AURIFERO"
  - "CONCENTRADO DE ORO" → si existe "CONCENTRADO DE AU" en la lista → devuelves: "CONCENTRADO DE AU" (AU = ORO)
  - "CONCENTRADO DE COBRE" → si existe "CONCENTRADO DE CU" o "CONCETRADO DE CU" en la lista → devuelves ese valor exacto (COBRE = CU)
  - "CONCENTRADO DE COBRE - GRANEL" → busca "CU" en la lista → devuelves el que contenga "CU"
  - "LOTE MINERAL" → si existe "LOTE MINERAL" en la lista → devuelves: "LOTE MINERAL"; si no existe → devuelves: null
  - Si el material no tiene equivalente claro en la lista → devuelves: null` : `  El resultado debe ser solo el nombre del material.`}  
  Ejemplos de extracción:
  "POR CONCENTRADO DE ZN UN 3077 CLASE 9 MISCELANEOS MATERIALES PELIGROSOS" → extraes: "CONCENTRADO DE ZN"
  "POR CONCENTRADO DE PLATA Y ORO - GRANEL / CLASE: 09 UN: 3077" → extraes: "CONCENTRADO DE PLATA Y ORO"
  "POR MINERAL AURIFERO" → extraes: "MINERAL AURIFERO"
  "POR CONCENTRADO DE COBRE - GRANEL" → extrae "CONCENTRADO DE COBRE" y mapea a "CONCETRADO DE CU" si existe en el catálogo

=== CAMPOS QUE SIEMPRE VAN NULL (no busques estos en el documento) ===
- empresa: null (se determina automáticamente desde la base de datos según la placa)
- deposito: null (se calcula automáticamente según el punto de llegada)
- tn_recibida: null (se carga manualmente desde el ticket)
- tn_recibida_data_cruda: null
- ticket: null
- precio_unitario, divisa, precio_final, pcosto, divisa_cost, costo_final, margen_operativo: null (se calculan desde el tarifario)

Responde ÚNICAMENTE con el JSON, sin texto ni markdown adicional:
{
  "es_documento_valido": true,
  "fecha": "...",
  "mes": "...",
  "semana": "...",
  "grt": "...",
  "transportista": "...",
  "unidad": "...",
  "empresa": null,
  "tn_enviado": ...,
  "deposito": null,
  "tn_recibida": null,
  "tn_recibida_data_cruda": null,
  "ticket": null,
  "grr": "...",
  "cliente": "...",
  "partida": "...",
  "llegada": "...",
  "transportado": "...",
  "precio_unitario": null,
  "divisa": null,
  "precio_final": null,
  "pcosto": null,
  "divisa_cost": null,
  "costo_final": null,
  "margen_operativo": null
}`;

      console.log('=== LLAMANDO A OPENAI API ===');
      console.log('Modelo: gpt-4o');
      console.log('Tokens del prompt (aproximado):', Math.ceil((prompt.length + pdfText.length) / 4));
      let response: any;
      try {
        response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente de extracción de datos para documentos comerciales de logística. Tu trabajo es leer documentos de transporte (guías de remisión) y extraer información estructurada en formato JSON. Esto es para automatizar procesos administrativos de una empresa de transporte.',
          },
          {
            role: 'user',
            content: `${prompt}\n\n---CONTENIDO DEL DOCUMENTO---\n${pdfText}`,
          },
        ],
          max_tokens: 2048,
          temperature: 0,
        });
        console.log('OpenAI respondió OK');
        console.log('Finish reason:', response?.choices?.[0]?.finish_reason);
        // Desglose de tokens y costo estimado (GPT-4o: $2.50/1M input, $10.00/1M output)
        const promptTokens = response?.usage?.prompt_tokens ?? 0;
        const completionTokens = response?.usage?.completion_tokens ?? 0;
        const totalTokens = response?.usage?.total_tokens ?? 0;
        const costInput  = (promptTokens    / 1_000_000) * 2.50;
        const costOutput = (completionTokens / 1_000_000) * 10.00;
        const costTotal  = costInput + costOutput;
        console.log(`💰 Tokens: ${totalTokens} (input: ${promptTokens}, output: ${completionTokens})`);
        console.log(`💵 Costo estimado: $${costTotal.toFixed(6)} USD (input: $${costInput.toFixed(6)} + output: $${costOutput.toFixed(6)})`);
      } catch (openaiErr: any) {
        console.error('=== ERROR EN LLAMADA A OPENAI ===');
        console.error('Tipo:', openaiErr?.constructor?.name);
        console.error('Mensaje:', openaiErr?.message);
        console.error('HTTP Status:', openaiErr?.status);
        console.error('Código:', openaiErr?.code);
        console.error('Tipo de error OpenAI:', openaiErr?.type);
        console.error('Param:', openaiErr?.param);
        if (openaiErr?.headers) {
          console.error('Response headers:', JSON.stringify(openaiErr.headers));
        }
        console.error('Stack:', openaiErr?.stack);
        console.error('=================================');
        throw openaiErr;
      }

      const content = response.choices[0].message.content;
      console.log('Respuesta cruda de OpenAI (primeros 300 chars):', content?.substring(0, 300));

      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error('NO SE ENCONTRÓ JSON en la respuesta. Respuesta completa:', content);
        throw new Error('No se pudo extraer JSON válido de la respuesta de OpenAI');
      }

      let extractedData: any;
      try {
        extractedData = JSON.parse(jsonMatch[0]);
        console.log('JSON parseado correctamente, campos:', Object.keys(extractedData).join(', '));
      } catch (jsonErr) {
        console.error('ERROR al parsear JSON de OpenAI:', jsonErr?.message);
        console.error('JSON recibido:', jsonMatch[0]?.substring(0, 500));
        throw jsonErr;
      }

      // Validar si el documento es relevante
      if (extractedData.es_documento_valido === false) {
        return {
          success: false,
          rejected: true,
          rejectionReason: extractedData.motivo_rechazo || 'El documento no es una guía de remisión ni un documento de transporte válido.',
        };
      }

      // Remover el campo de validación antes de pasar los datos
      delete extractedData.es_documento_valido;

      // Normalizar fecha: convertir DD/MM/YYYY → YYYY-MM-DD si OpenAI devuelve formato peruano
      if (extractedData.fecha && typeof extractedData.fecha === 'string') {
        const ddmmyyyy = extractedData.fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (ddmmyyyy) {
          const converted = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
          console.log(`📅 Fecha normalizada: "${extractedData.fecha}" → "${converted}"`);
          extractedData.fecha = converted;
        }
      }

      // Normalizar nombre de cliente (empresa ya no se extrae del PDF)
      if (extractedData.cliente) {
        extractedData.cliente = this.normalizeCompanyName(extractedData.cliente);
      }

      // Normalizar material/transportado: limpiar prefijos, códigos de lote, clases ONU
      if (extractedData.transportado) {
        const normalized = this.normalizeMaterial(extractedData.transportado);
        extractedData.transportado = normalized || null;
      }

      // Normalizar semana: quitar ceros a la izquierda ("01" → "1")
      if (extractedData.semana) {
        const weekNum = parseInt(String(extractedData.semana), 10);
        if (!isNaN(weekNum)) {
          extractedData.semana = String(weekNum);
        }
      }

      // === SOLUCIÓN 3: Validación cruzada contra texto PDF ===
      // Detecta alucinaciones comparando campos con el texto real del PDF
      extractedData = this.validateAgainstPdfText(extractedData, pdfText);

      // === SOLUCIÓN 4: Sobreescribir con extracción directa por regex ===
      // Los campos críticos (partida, llegada, cliente, grt, transportista, unidad, tn_enviado)
      // se extraen directamente del PDF — son más confiables que OpenAI
      const regexFields = this.extractCriticalFieldsFromText(pdfText);
      let overrideCount = 0;
      for (const [key, value] of Object.entries(regexFields)) {
        if (value !== undefined && value !== null) {
          if (extractedData[key] !== value) {
            console.log(`🔧 OVERRIDE regex: ${key}: "${extractedData[key]}" → "${value}"`);
            overrideCount++;
          }
          extractedData[key] = value;
        }
      }
      if (overrideCount > 0) {
        console.log(`🔧 Total overrides por regex: ${overrideCount} campos corregidos`);
      }

      // === SOLUCIÓN 5: Reintento si campos críticos siguen en null ===
      // Se reintenta si grt o transportista están vacíos (probable falla de extracción)
      const criticalFieldsMissing = !extractedData.grt || !extractedData.transportista;
      if (criticalFieldsMissing) {
        console.warn('⚠️ REINTENTO: campos críticos nulos, reintentando con prompt más estricto...');
        try {
          const retryResponse = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'Eres un extractor estricto de datos de guías de remisión peruana. Tu ÚNICA tarea es encontrar valores exactos que aparecen en el texto. Nunca inventes. Si no está, pon null.',
              },
              {
                role: 'user',
                content: `Extrae SOLO estos campos del texto. Copia los valores EXACTAMENTE como aparecen:\n\n- grt: código después de "GUÍA DE REMISIÓN TRANSPORTISTA ELECTRÓNICA" (formato: XXX1-000000)\n- transportista: nombre después de "CONDUCTOR PRINCIPAL:DNI XXXXXXXX -"\n- cliente: nombre en la primera "DENOMINACIÓN:" del documento (sección REMITENTE, NO el destinatario de OBSERVACIONES)\n\nResponde SOLO con JSON: {"grt": "...", "transportista": "...", "cliente": "..."}\n\n---TEXTO---\n${pdfText}`,
              },
            ],
            max_tokens: 256,
            temperature: 0,
          });
          const retryContent = retryResponse.choices[0].message.content;
          const retryJson = retryContent?.match(/\{[\s\S]*\}/);
          if (retryJson) {
            const retryData = JSON.parse(retryJson[0]);
            if (retryData.grt && !extractedData.grt) {
              console.log(`🔁 REINTENTO: grt recuperado: "${retryData.grt}"`);
              extractedData.grt = retryData.grt;
            }
            if (retryData.transportista && !extractedData.transportista) {
              console.log(`🔁 REINTENTO: transportista recuperado: "${retryData.transportista}"`);
              extractedData.transportista = retryData.transportista;
            }
            if (retryData.cliente && !extractedData.cliente) {
              console.log(`🔁 REINTENTO: cliente recuperado: "${retryData.cliente}"`);
              extractedData.cliente = this.normalizeCompanyName(retryData.cliente);
            }
          }
        } catch (retryErr: any) {
          console.warn('⚠️ REINTENTO falló:', retryErr?.message);
        }
      }

      console.log('=== EXTRACT DOCUMENT DATA - ÉXITO ===');
      return {
        success: true,
        data: extractedData,
        rawResponse: content,
        pdfText,
      };
    } catch (error) {
      console.error('=== OPENAI SERVICE ERROR FINAL ===');
      console.error('Tipo:', error?.constructor?.name);
      console.error('Mensaje:', error?.message);
      console.error('HTTP Status:', error?.status ?? 'N/A');
      console.error('Código:', error?.code ?? 'N/A');
      console.error('Tipo OpenAI:', error?.type ?? 'N/A');
      console.error('¿Es HttpException?:', error instanceof HttpException);
      console.error('Stack completo:', error?.stack);
      console.error('==================================');
      throw new HttpException(
        {
          message: 'Error al procesar el documento con la IA',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

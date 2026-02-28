import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { pdfToPng } from 'pdf-to-png-converter';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async convertPdfToImage(pdfBuffer: Buffer): Promise<string> {
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    );
    
    const pages = await pdfToPng(arrayBuffer as ArrayBuffer, {
      disableFontFace: false,
      useSystemFonts: true,
      viewportScale: 4.0,
      pagesToProcess: [1],
    });
    
    if (!pages || pages.length === 0) {
      throw new Error('No se pudo convertir el PDF a imagen');
    }

    return pages[0].content.toString('base64');
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

  async extractDocumentData(pdfBuffer: Buffer): Promise<any> {
    try {
      const imageBase64 = await this.convertPdfToImage(pdfBuffer);

      const prompt = `Analiza esta imagen y determina si es un documento comercial de transporte de Perú (Guía de Remisión, Guía de Remisión Transportista Electrónica, documento de carga, ticket de balanza, o similar relacionado a logística/transporte).

PRIMERO: Evalúa si el documento está relacionado con transporte, logística o carga. Si NO es un documento de transporte (por ejemplo: facturas no relacionadas, recetas, documentos personales, imágenes aleatorias, etc.), responde SOLO con:
{"es_documento_valido": false, "motivo_rechazo": "Descripción breve de por qué no es un documento de transporte válido"}

Si SÍ es un documento de transporte válido, extrae los datos solicitados en formato JSON.

IMPORTANTE: Extrae los valores EXACTAMENTE como aparecen en el documento, sin modificar, sin añadir ceros, sin cambiar el formato.

Campos a extraer del documento:
- fecha: Fecha de emisión (formato YYYY-MM-DD)
- mes: Mes en español (enero, febrero, etc.)
- semana: Número de semana ISO del año SIN ceros a la izquierda (ej: "1", "2", "10", "52", NO "01", "02")
- grt: Código de la guía EXACTAMENTE como aparece (ej: T001-123, VVV1-644, etc. - NO añadir ceros)
- transportista: SOLO el nombre del CONDUCTOR PRINCIPAL (persona física, ej: "GUTIERREZ TOLENTINO ENGILBERTO"). Busca etiquetas como "CONDUCTOR PRINCIPAL", "CHOFER", "CONDUCTOR". NO uses el nombre de la empresa de transporte. Extrae SOLO el nombre, sin el DNI ni número de documento.
- unidad: SOLO la PLACA del VEHÍCULO PRINCIPAL (formato peruano: 3 caracteres alfanuméricos + 3 dígitos, ej: AWW898, CBS840, BXX714). NO confundir con el TUC (Tarjeta Única de Circulación) que es un código largo tipo 15M21034987E o 1SM25000482. El TUC NO es la placa. La placa está junto a "VEHÍCULO PRINCIPAL" y tiene exactamente 6 caracteres (puede tener guión: BEA-768 → BEA768). Quitar espacios y guiones de la placa. IMPORTANTE SOBRE LECTURA DE PLACAS: Lee cada carácter individualmente con máximo cuidado. Errores comunes que DEBES evitar: (1) Confundir S con 5 (ej: leer "C5B840" cuando dice "CBS840"), (2) Confundir B con 8, (3) Confundir O con 0, (4) Confundir I con 1, (5) Transponer letras adyacentes (ej: leer "CSB" cuando dice "CBS"). Las placas peruanas tienen formato: 3 caracteres (mayormente LETRAS) + 3 DÍGITOS. Si en los primeros 3 caracteres ves un "5", verifica si no es una "S". Si ves un "8", verifica si no es una "B". Lee el carácter por el contexto visual, no asumas.
- empresa: Nombre COMERCIAL CORTO del remitente. Si el documento muestra algo como "PALTARUMI SOCIEDAD ANONIMA CERRADA - PALTARUMI S.A.C.", usa SOLO la parte corta después del guión: "PALTARUMI S.A.C.". Si no hay guión, abrevia: quita "SOCIEDAD ANONIMA CERRADA" y pon "S.A.C.", quita "SOCIEDAD ANONIMA" y pon "S.A.". Ejemplos correctos: "LOGISMINSA S.A.", "PALTARUMI S.A.C.", "TRAFIGURA PERU S.A.C.", "ECO GOLD S.A.C.", "POLIMETALICOS DEL NORTE S.A.C."
- tn_enviado: PESO BRUTO TOTAL (TNE) en toneladas (número decimal)
- grr: Código de documento relacionado (empieza con EG o GR)
- cliente: Nombre COMERCIAL CORTO del destinatario. Extráelo EXCLUSIVAMENTE del campo "DENOMINACIÓN" que aparece en la sección del destinatario del documento (junto a la etiqueta "DENOMINACIÓN:" o "DENOMINACION:"). NO uses el texto de la sección "DESTINATARIO" que aparece al final del documento. Si el campo DENOMINACIÓN dice algo como "P.A.Y. METAL TRADING SOCIEDAD ANONIMA CERRADA - P.A.Y. METAL TRADING S.A.C.", usa SOLO la parte corta después del guión: "P.A.Y. METAL TRADING S.A.C.". Si no hay guión, abrevia: quita "SOCIEDAD ANONIMA CERRADA" y pon "S.A.C.". Ejemplos: "ECO GOLD SOCIEDAD ANONIMA CERRADA" → "ECO GOLD S.A.C.", "MONARCA GOLD S.A.C" → "MONARCA GOLD S.A.C".
- partida: Punto de partida en formato DEPARTAMENTO-PROVINCIA-DISTRITO (solo esos 3 niveles separados por guión SIN espacios alrededor del guión). Extrae SOLO el departamento, provincia y distrito. NO incluyas direcciones, carreteras, kilómetros ni detalles adicionales. Ejemplos correctos: "LA LIBERTAD-TRUJILLO-HUANCHACO", "LIMA-BARRANCA-PARAMONGA", "CALLAO-CALLAO-VENTANILLA", "ANCASH-SANTA-NEPEÑA", "PIURA-AYABACA-SUYO". Si el documento dice "LIMA - BARRANCA - PARAMONGA - CAR. PANAMERICANA NORTE KM. 221...", extrae SOLO "LIMA-BARRANCA-PARAMONGA".
- llegada: Punto de llegada en formato DEPARTAMENTO-PROVINCIA-DISTRITO (mismo formato que partida). Extrae SOLO departamento, provincia y distrito. Si el distrito incluye un dato adicional entre paréntesis como "CALLAO (IMPALA)", manténlo: "CALLAO-CALLAO-CALLAO (IMPALA)". NO incluyas direcciones, carreteras, kilómetros, comunidades ni detalles adicionales después del distrito. Ejemplos correctos: "CALLAO-CALLAO-CALLAO (IMPALA)", "CALLAO-CALLAO-VENTANILLA", "LIMA-BARRANCA-PARAMONGA", "LA LIBERTAD-TRUJILLO-HUANCHACO".
- transportado: Descripción del producto/material transportado. Extráelo EXCLUSIVAMENTE de la TABLA PRINCIPAL del documento que tiene columnas como "Nro.", "CÓD.", "DESCRIPCIÓN", "U/M", "CANTIDAD". Usa SOLO el texto de la columna DESCRIPCIÓN de esa tabla. NO uses el texto de las secciones inferiores del documento donde aparecen especificaciones técnicas, clases ONU, números UN, observaciones o detalles adicionales. Limpia el valor: quita prefijos como "POR " al inicio, quita códigos de lote (ej: "0012-21416"), quita clasificaciones ONU (ej: "/ CLASE: 09 UN: 3077", "CLASE 9", "UN 3077"), quita sufijos como "- GRANEL". Ejemplos de extracción correcta: "POR CONCENTRADO DE ZINC - GRANEL / CLASE: 09 UN: 3077" → "CONCENTRADO DE ZINC", "POR LOTE MINERAL 0012-21416" → "LOTE MINERAL", "POR CONCENTRADO DE PLATA Y ORO" → "CONCENTRADO DE PLATA Y ORO", "CONCENTRADO DE AU" → "CONCENTRADO DE AU"

Campos que SIEMPRE deben ser null (se calculan o ingresan manualmente):
- deposito: null (se calcula automáticamente según el punto de llegada)
- tn_recibida: null (viene del ticket)
- tn_recibida_data_cruda: null (viene del ticket)
- ticket: null (viene del ticket)

Campos financieros (siempre null, se calculan automáticamente):
- precio_unitario, divisa, precio_final, pcosto, divisa_cost, costo_final, margen_operativo

Responde SOLO con el JSON, sin texto adicional ni markdown.
Si es válido, incluye "es_documento_valido": true al inicio del JSON:
{
  "es_documento_valido": true,
  "mes": "...",
  "semana": "...",
  "fecha": "...",
  "grt": "...",
  "transportista": "...",
  "unidad": "...",
  "empresa": "...",
  "tn_enviado": null,
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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente de extracción de datos para documentos comerciales de logística. Tu trabajo es leer documentos de transporte (guías de remisión) y extraer información estructurada en formato JSON. Esto es para automatizar procesos administrativos de una empresa de transporte.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON válido de la respuesta de OpenAI');
      }

      const extractedData = JSON.parse(jsonMatch[0]);

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

      // Normalizar nombres de empresa y cliente
      if (extractedData.empresa) {
        extractedData.empresa = this.normalizeCompanyName(extractedData.empresa);
      }
      if (extractedData.cliente) {
        extractedData.cliente = this.normalizeCompanyName(extractedData.cliente);
      }

      // Normalizar material/transportado: limpiar prefijos, códigos de lote, clases ONU
      if (extractedData.transportado) {
        extractedData.transportado = this.normalizeMaterial(extractedData.transportado);
      }

      // Normalizar semana: quitar ceros a la izquierda ("01" → "1")
      if (extractedData.semana) {
        const weekNum = parseInt(String(extractedData.semana), 10);
        if (!isNaN(weekNum)) {
          extractedData.semana = String(weekNum);
        }
      }

      return {
        success: true,
        data: extractedData,
        rawResponse: content,
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Error processing document with OpenAI',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

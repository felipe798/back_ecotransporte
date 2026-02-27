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
- semana: Número de semana ISO del año
- grt: Código de la guía EXACTAMENTE como aparece (ej: T001-123, VVV1-644, etc. - NO añadir ceros)
- transportista: SOLO el nombre del CONDUCTOR PRINCIPAL (persona física, ej: "GUTIERREZ TOLENTINO ENGILBERTO"). Busca etiquetas como "CONDUCTOR PRINCIPAL", "CHOFER", "CONDUCTOR". NO uses el nombre de la empresa de transporte. Extrae SOLO el nombre, sin el DNI ni número de documento.
- unidad: SOLO la PLACA del VEHÍCULO PRINCIPAL (formato peruano: 3 caracteres alfanuméricos + 3 dígitos, ej: AWW898, C8S840, BXX714). NO confundir con el TUC (Tarjeta Única de Circulación) que es un código largo tipo 15M21034987E o 1SM25000482. El TUC NO es la placa. La placa está junto a "VEHÍCULO PRINCIPAL" y tiene exactamente 6 caracteres (puede tener guión: B4E-768 → B4E768). Quitar espacios y guiones de la placa.
- empresa: Nombre COMERCIAL CORTO del remitente. Si el documento muestra algo como "PALTARUMI SOCIEDAD ANONIMA CERRADA - PALTARUMI S.A.C.", usa SOLO la parte corta después del guión: "PALTARUMI S.A.C.". Si no hay guión, abrevia: quita "SOCIEDAD ANONIMA CERRADA" y pon "S.A.C.", quita "SOCIEDAD ANONIMA" y pon "S.A.". Ejemplos correctos: "LOGISMINSA S.A.", "PALTARUMI S.A.C.", "TRAFIGURA PERU S.A.C.", "ECO GOLD S.A.C.", "POLIMETALICOS DEL NORTE S.A.C."
- tn_enviado: PESO BRUTO TOTAL (TNE) en toneladas (número decimal)
- deposito: Tipo de punto de partida (CONCESION, DEPOSITO, ALMACEN, PLANTA, MINA)
- grr: Código de documento relacionado (empieza con EG o GR)
- cliente: Nombre COMERCIAL CORTO del destinatario. Misma regla que empresa: usa la versión corta. Si dice "ECO GOLD SOCIEDAD ANONIMA CERRADA", extrae "ECO GOLD S.A.C.". Si dice "MONARCA GOLD S.A.C", déjalo así.
- partida: Punto de partida (DEPARTAMENTO - PROVINCIA - DISTRITO)
- llegada: Dirección completa del punto de llegada
- transportado: Descripción del producto en la tabla

Campos que SIEMPRE deben ser null (se ingresan manualmente del ticket físico):
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
  "deposito": "...",
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

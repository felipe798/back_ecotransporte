import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../entities/document.entity';
import { OpenAIService } from '../../ai/services/openai.service';
import { ClientTariffService } from '../../client-tariff/services/client-tariff.service';
import { UnidadService } from '../../unidad/services/unidad.service';

const cloudinary: any = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentsRepository: Repository<DocumentEntity>,
    private openaiService: OpenAIService,
    private clientTariffService: ClientTariffService,
    private unidadService: UnidadService,
  ) {}

  private normalizeFechaToUtcDate(fecha: unknown): { isoDate: string; dateUtc: Date } | null {
    if (!fecha) return null;

    if (typeof fecha === 'string') {
      const ddmmyyyy = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (ddmmyyyy) {
        const isoDate = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
        const year = Number(ddmmyyyy[3]);
        const month = Number(ddmmyyyy[2]) - 1;
        const day = Number(ddmmyyyy[1]);
        return { isoDate, dateUtc: new Date(Date.UTC(year, month, day)) };
      }

      const fechaParts = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (fechaParts) {
        const year = Number(fechaParts[1]);
        const month = Number(fechaParts[2]) - 1;
        const day = Number(fechaParts[3]);
        return { isoDate: `${fechaParts[1]}-${fechaParts[2]}-${fechaParts[3]}`, dateUtc: new Date(Date.UTC(year, month, day)) };
      }

      const parsed = new Date(fecha);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getUTCFullYear();
        const month = parsed.getUTCMonth();
        const day = parsed.getUTCDate();
        const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { isoDate, dateUtc: new Date(Date.UTC(year, month, day)) };
      }

      return null;
    }

    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
      const year = fecha.getUTCFullYear();
      const month = fecha.getUTCMonth();
      const day = fecha.getUTCDate();
      const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { isoDate, dateUtc: new Date(Date.UTC(year, month, day)) };
    }

    return null;
  }

  // Semana del ano con inicio en domingo. Cumple: 01/03/2026 => semana 10.
  private getWeekOfYearFromDate(dateUtc: Date): number {
    const startOfYear = new Date(Date.UTC(dateUtc.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((dateUtc.getTime() - startOfYear.getTime()) / 86400000) + 1;
    const jan1Dow = startOfYear.getUTCDay();
    return Math.floor((dayOfYear + jan1Dow - 1) / 7) + 1;
  }

  private assignMesSemanaFromFecha(documentData: Partial<DocumentEntity>): void {
    const parsed = this.normalizeFechaToUtcDate(documentData.fecha as any);
    if (!parsed) return;

    const { isoDate, dateUtc } = parsed;
    documentData.fecha = isoDate as any;

    const weekOfYear = this.getWeekOfYearFromDate(dateUtc);
    documentData.semana = String(weekOfYear);

    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    documentData.mes = meses[dateUtc.getUTCMonth()];
  }

  async uploadAndProcessDocument(
    pdfBuffer: Buffer,
    fileName: string,
    userId: number,
    filePath: string,
  ): Promise<{ document: DocumentEntity; placaNoRegistrada: string | null; tarifaNoEncontrada: { cliente: string | null; partida: string | null; llegada: string | null; transportado: string | null } | null; }> {
    try {
      // Cargar catálogo de materiales antes de llamar a OpenAI para que GPT haga el matching directo
      let materialesCatalogo: string[] = [];
      try {
        const uniqueVals = await this.clientTariffService.getUniqueValues();
        materialesCatalogo = uniqueVals.materiales || [];
      } catch (e) {
        console.warn('No se pudo cargar catálogo de materiales para OpenAI:', e?.message);
      }

      // Enviar Buffer ----- directamente a OpenAI (la conversión PDF→Imagen se hace internamente)
      const aiResponse = await this.openaiService.extractDocumentData(pdfBuffer, materialesCatalogo);
      const pdfText: string = aiResponse.pdfText || '';

      // Verificar si el documento fue rechazado por no ser válido
      if (aiResponse.rejected) {
        throw new HttpException(
          {
            message: 'Documento rechazado',
            rejected: true,
            reason: aiResponse.rejectionReason,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Crear objeto con los datos extraídos
      const documentData: Partial<DocumentEntity> = {
        uploaded_by: userId,
        pdf_file_path: filePath,
        pdf_original_name: fileName,
        ...aiResponse.data,
      };

      // Validar si existe un documento con la misma GRT (Guía de Remisión Transportista)
      if (documentData.grt) {
        const grtExistente = await this.documentsRepository.findOne({
          where: { grt: documentData.grt }
        });

        if (grtExistente) {
          throw new HttpException(
            {
              message: 'Documento duplicado',
              rejected: true,
              reason: `El documento con la GRT "${documentData.grt}" ya se encuentra registrado en el sistema.`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Array para acumular razones de campos incompletos
      const motivoArray: string[] = [];

      this.assignMesSemanaFromFecha(documentData);

      // Por ahora TN Recibida = TN Enviado al subir la guía
      if (documentData.tn_enviado && !documentData.tn_recibida) {
        documentData.tn_recibida = documentData.tn_enviado;
      }

      // Normalizar campos de ubicación comparando con el tarifario
      await this.normalizeLocationFields(documentData, pdfText);

      // Determinar depósito según regla de negocio (basado en punto de llegada)
      this.determineDeposito(documentData);

      // Log para debugging
      console.log('=== DATOS DESPUÉS DE NORMALIZACIÓN ===');
      console.log('Cliente:', documentData.cliente);
      console.log('Partida:', documentData.partida);
      console.log('Llegada:', documentData.llegada);
      console.log('Transportado:', documentData.transportado);
      console.log('Empresa:', documentData.empresa);
      console.log('TN Recibida:', documentData.tn_recibida);

      // Detectar campos críticos faltantes y registrar motivo
      if (!documentData.grt) motivoArray.push('GRT no identificado en el PDF');
      if (!documentData.cliente) motivoArray.push('Cliente no identificado en el PDF');
      if (!documentData.partida) motivoArray.push('Punto de partida no identificado');
      if (!documentData.llegada) motivoArray.push('Punto de llegada no identificado');
      if (!documentData.transportado) motivoArray.push('Material transportado no reconocido');
      if (!documentData.tn_enviado) motivoArray.push('Tonelaje enviado no encontrado');

      // Normalizar nombre de transportista contra existentes en BD
      await this.normalizeTransportistaNombre(documentData);

      // Calcular campos financieros basados en tarifario
      const tarifaEncontrada = await this.calculateFinancialFields(documentData);

      if (!tarifaEncontrada) {
        const clienteStr = documentData.cliente || 'desconocido';
        const rutaStr = `${documentData.partida || '?'} → ${documentData.llegada || '?'}`;
        const materialStr = documentData.transportado || 'sin material';
        motivoArray.push(`Tarifa no encontrada: cliente=[${clienteStr}] ruta=[${rutaStr}] material=[${materialStr}]`);
      }

      // Validar y normalizar placa del vehículo
      await this.normalizeUnidad(documentData);

      // Buscar y asociar unidad (placa) con empresa de transporte
      await this.associateUnidad(documentData);

      // Detectar si la placa es nueva (no registrada en la tabla unidades)
      let placaNoRegistrada: string | null = null;
      if (documentData.unidad) {
        const unidadExiste = await this.unidadService.findByPlaca(documentData.unidad);
        if (!unidadExiste) {
          placaNoRegistrada = documentData.unidad;
          motivoArray.push(`Placa [${documentData.unidad}] no registrada en la base de datos`);
        }
      } else {
        motivoArray.push('Placa del vehículo no identificada');
      }

      // Asignar motivo acumulado (null si todo salió bien)
      documentData.motivo = motivoArray.length > 0 ? motivoArray.join(' | ') : null;
      if (documentData.motivo) {
        console.log('=== MOTIVO REGISTRADO ===', documentData.motivo);
      }

      // Log para debugging
      console.log('=== DATOS FINANCIEROS CALCULADOS ===');
      console.log('Precio Unitario:', documentData.precio_unitario);
      console.log('Divisa:', documentData.divisa);
      console.log('Precio Final:', documentData.precio_final);
      console.log('PCosto:', documentData.pcosto);
      console.log('Divisa Cost:', documentData.divisa_cost);
      console.log('Costo Final:', documentData.costo_final);
      console.log('Margen:', documentData.margen_operativo);
      console.log('=====================================');

      // Guardar en BD — siempre intentar guardar aunque falten campos
      let savedDocument: DocumentEntity | null = null;
      try {
        const doc = this.documentsRepository.create(documentData);
        savedDocument = await this.documentsRepository.save(doc) as DocumentEntity;
      } catch (saveErr: any) {
        console.error('=== ERROR AL GUARDAR EN BD ===');
        console.error('Mensaje:', saveErr?.message);
        motivoArray.push(`Error técnico al guardar: ${saveErr?.message}`);
        // Último intento: guardar solo los campos mínimos seguros
        console.warn('Intentando guardar con campos mínimos...');
        const minimalDoc = this.documentsRepository.create({
          uploaded_by: documentData.uploaded_by,
          pdf_file_path: documentData.pdf_file_path,
          pdf_original_name: documentData.pdf_original_name,
          grt: documentData.grt || null,
          transportista: documentData.transportista || null,
          unidad: documentData.unidad || null,
          cliente: documentData.cliente || null,
          partida: documentData.partida || null,
          llegada: documentData.llegada || null,
          transportado: documentData.transportado || null,
          tn_enviado: documentData.tn_enviado || null,
          tn_recibida: documentData.tn_recibida || null,
          mes: documentData.mes || null,
          semana: documentData.semana || null,
          grr: documentData.grr || null,
          motivo: motivoArray.join(' | '),
        });
        savedDocument = await this.documentsRepository.save(minimalDoc) as DocumentEntity;
        console.warn('✓ Documento guardado con campos mínimos, id=', savedDocument.id);
      }

      // Subir el PDF original a Cloudinary y guardar URL
      try {
        const cloudUrl = await this.uploadToCloudinary(pdfBuffer, fileName);
        const finalSaved = Array.isArray(savedDocument) ? savedDocument[0] : savedDocument;
        await this.addFileUrl(finalSaved.id, cloudUrl);
        savedDocument = await this.documentsRepository.findOne({ where: { id: finalSaved.id } });
      } catch (err) {
        console.error('Cloudinary upload failed', err);
      }

      const finalDoc = Array.isArray(savedDocument) ? savedDocument[0] : savedDocument;

      // Detectar si no se encontró tarifa.
      // Se dispara aunque cliente/partida sean null para que el wizard del front
      // permita completar los datos faltantes en el momento.
      let tarifaNoEncontrada: { cliente: string | null; partida: string | null; llegada: string | null; transportado: string | null } | null = null;
      if (!tarifaEncontrada) {
        tarifaNoEncontrada = {
          cliente: documentData.cliente || null,
          partida: documentData.partida || null,
          llegada: documentData.llegada || null,
          transportado: documentData.transportado || null,
        };
      }

      return { document: finalDoc, placaNoRegistrada, tarifaNoEncontrada };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Determina el depósito basado en el punto de llegada (regla de negocio):
   * - Si llegada contiene "CALLAO" → "IMPALA"
   * - En cualquier otro caso → "LOGIMINSA"
   */
  private determineDeposito(documentData: Partial<DocumentEntity>): void {
    const llegada = (documentData.llegada || '').toUpperCase().trim();

    if (llegada.includes('CALLAO') && llegada.includes('VENTANILLA')) {
      // CALLAO-CALLAO-VENTANILLA → LOGIMINSA
      documentData.deposito = 'LOGIMINSA';
    } else if (llegada.includes('CALLAO')) {
      // CALLAO-CALLAO-CALLAO o CALLAO-CALLAO-CALLAO (IMPALA) → IMPALA
      documentData.deposito = 'IMPALA';
    } else {
      // Cualquier otra llegada → CONCESION
      documentData.deposito = 'CONCESION';
    }
    console.log(`Depósito determinado: ${documentData.deposito} (llegada: ${documentData.llegada})`);
  }

  /**
   * Valida y normaliza la placa del vehículo:
   * - Quita espacios y guiones
   * - Verifica formato peruano (6 chars alfanuméricos: 3 letras/números + 3 dígitos)
   * - Descarta códigos TUC que la IA pudo confundir con placas
   * - Busca match similar entre placas existentes en BD
   */
  private async normalizeUnidad(documentData: Partial<DocumentEntity>): Promise<void> {
    let { unidad } = documentData;
    if (!unidad) return;

    console.log('=== VALIDANDO PLACA ===');
    console.log('  Valor extraído:', unidad);

    // Limpiar: quitar espacios, guiones
    unidad = unidad.replace(/[\s-]/g, '').toUpperCase();

    // Formato placa peruana: exactamente 6 caracteres alfanuméricos
    // Los 3 últimos deben ser dígitos, los 3 primeros letras o dígitos
const placaRegex = /^[A-Z0-9]{6}$/;

    if (!placaRegex.test(unidad)) {
      console.log(`  ✗ "${unidad}" NO es una placa válida (posible TUC u otro código). Se descarta.`);
      documentData.unidad = null;
      return;
    }

    documentData.unidad = unidad;
    console.log('  ✓ Placa válida:', unidad);

    // Buscar si existe una placa similar en BD (por errores de OCR: 0↔O, 8↔B, etc.)
    const existingPlates: { unidad: string; cnt: string }[] = await this.documentsRepository
      .createQueryBuilder('doc')
      .select('doc.unidad', 'unidad')
      .addSelect('COUNT(*)', 'cnt')
      .where('doc.unidad IS NOT NULL')
      .andWhere('doc.anulado = false')
      .groupBy('doc.unidad')
      .orderBy('cnt', 'DESC')
      .getRawMany();

    // También verificar contra tablas de unidades registradas
    const registeredPlates = await this.unidadService.findAll();
    const allPlates = new Set<string>();
      // Prioridad 1: tabla maestra (fuente de verdad) — va primero para que el motor OCR apunte a placas reales
      registeredPlates.forEach(u => allPlates.add(u.placa));
      // Prioridad 2: historial de documentos (puede contener errores OCR viejos, va después)
      existingPlates.forEach(p => allPlates.add(p.unidad));
    const normalizedInput = this.normalizeStringAggressive(unidad);
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const plate of allPlates) {
      if (!plate) continue;
      const normalizedPlate = this.normalizeStringAggressive(plate);
      if (normalizedInput === normalizedPlate) {
        if (plate !== unidad) {
          console.log(`  ✓ Match exacto normalizado: "${unidad}" → "${plate}"`);
          documentData.unidad = plate;
        }
        console.log('=== FIN VALIDACIÓN PLACA ===\n');
        return;
      }
    }

    // Intentar corregir errores de OCR + transposición de caracteres adyacentes
    // Ej: "CSB886" → "CBS886" (transposición), "C5B840" → "CBS840" (OCR 5→S + transposición)
    const placaVariants = this.generatePlacaVariants(unidad);
    for (const plate of allPlates) {
      if (!plate) continue;
      const normalizedPlate = plate.replace(/[\s-]/g, '').toUpperCase();
      if (placaVariants.has(normalizedPlate)) {
        console.log(`  ✓ Match por corrección OCR/transposición: "${unidad}" → "${plate}"`);
        documentData.unidad = plate;
        console.log('=== FIN VALIDACIÓN PLACA ===\n');
        return;
      }
    }

    for (const plate of allPlates) {
      if (!plate) continue;
      const normalizedPlate = this.normalizeStringAggressive(plate);
      const score = this.calculateSimilarity(normalizedInput, normalizedPlate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = plate;
      }
    }

    // Umbral alto para placas (83% ≈ 1 carácter distinto de 6)
    if (bestScore >= 0.83 && bestMatch) {
      console.log(`  ✓ Placa normalizada por similitud (${(bestScore * 100).toFixed(0)}%): "${unidad}" → "${bestMatch}"`);
      documentData.unidad = bestMatch;
    } else {
      // No se encontró match confiable (ya sea BD vacía o similitud insuficiente).
      // Se guarda null para no asignar una placa incorrecta.
      console.log(`  ✗ Placa "${unidad}" sin match confiable (mejor: "${bestMatch ?? 'ninguno'}" ${(bestScore * 100).toFixed(0)}%) → null`);
      documentData.unidad = null;
    }

    console.log('=== FIN VALIDACIÓN PLACA ===\n');
  }

  /**
   * Busca la placa en la tabla de unidades y asocia la empresa de transporte
   */
  private async associateUnidad(documentData: Partial<DocumentEntity>): Promise<void> {
    const { unidad } = documentData;

    if (!unidad) {
      console.log('=== No hay placa para asociar ===');
      return;
    }

    console.log('=== BUSCANDO UNIDAD ===');
    console.log('Placa extraída del PDF:', unidad);

    const unidadEncontrada = await this.unidadService.findByPlaca(unidad);

    if (unidadEncontrada) {
      console.log('✓ Unidad encontrada:', unidadEncontrada.placa);
      // Asignar empresa desde la BD (siempre que exista)
      if (unidadEncontrada.empresa) {
        documentData.empresa = unidadEncontrada.empresa.nombre;
        console.log('✓ Empresa asignada desde BD:', unidadEncontrada.empresa.nombre);
      }
      // Solo usar el nombre de la empresa como transportista si el AI no extrajo uno
      if (!documentData.transportista && unidadEncontrada.empresa) {
        documentData.transportista = unidadEncontrada.empresa.nombre;
        console.log('✓ Transportista establecido desde empresa:', unidadEncontrada.empresa.nombre);
      } else if (unidadEncontrada.empresa) {
        console.log('✓ Empresa asociada:', unidadEncontrada.empresa.nombre, '(transportista del PDF:', documentData.transportista, ')');
      }
    } else {
      console.log('✗ Unidad no encontrada en la base de datos');
      console.log('Se mantendrá el transportista extraído del PDF');
    }

    console.log('=== FIN BÚSQUEDA UNIDAD ===\n');
  }

  /**
   * Normaliza nombres geográficos con variantes oficiales largas.
   * El PDF a veces usa el nombre oficial completo de la provincia/departamento
   * mientras que el tarifario usa el nombre corto/común.
   * Ej: "PROV. CONST. DEL CALLAO" → "CALLAO"
   *     "PROVINCIA CONSTITUCIONAL DEL CALLAO" → "CALLAO"
   */
  private normalizeGeoName(name: string): string {
    if (!name) return name;
    return name
      // Variantes de la Provincia Constitucional del Callao
      .replace(/PROV\.?\s*CONST\.?\s*DEL\s+CALLAO/gi, 'CALLAO')
      .replace(/PROVINCIA\s+CONSTITUCIONAL\s+DEL\s+CALLAO/gi, 'CALLAO')
      // Limpiar espacios extra resultantes
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normaliza los campos cliente, partida, llegada y transportado (material)
   * comparándolos con los valores del tarifario y ajustando al más parecido
   */
  private async normalizeLocationFields(documentData: Partial<DocumentEntity>, pdfText: string = ''): Promise<void> {
    const { cliente, partida, llegada, transportado, empresa } = documentData;

    // Obtener valores únicos del tarifario
    const uniqueValues = await this.clientTariffService.getUniqueValues();
    
    console.log('=== INICIANDO NORMALIZACIÓN ===');
    console.log('Valores originales:');
    console.log('  Cliente:', cliente);
    console.log('  Empresa:', empresa);
    console.log('  Partida:', partida);
    console.log('  Llegada:', llegada);
    console.log('  Transportado:', transportado);
    console.log('');
    console.log('Tarifario cargado:');
    console.log('  Clientes:', uniqueValues.clientes.length, uniqueValues.clientes);
    console.log('  Partidas:', uniqueValues.partidas.length, uniqueValues.partidas);
    console.log('  Llegadas:', uniqueValues.llegadas.length, uniqueValues.llegadas);
    console.log('  Materiales:', uniqueValues.materiales.length, uniqueValues.materiales);

    // Normalizar cliente: comparar el nombre extraído del campo DENOMINACIÓN con el tarifario
    console.log('\n--- Normalizando CLIENTE ---');
    if (cliente) {
      console.log('Probando con cliente:', cliente);
      const normalizedCliente = this.findBestMatch(cliente, uniqueValues.clientes);
      if (normalizedCliente) {
        documentData.cliente = normalizedCliente;
      } else {
        // El nombre del PDF no coincide con ningún cliente conocido del tarifario.
        // Se guarda null para que el usuario lo asigne manualmente desde la edición,
        // evitando que se almacene un nombre incorrecto o inventado.
        console.log(`  ⚠️ Cliente "${cliente}" no coincide con ninguno del tarifario → null`);
        documentData.cliente = null;
      }
    }

    // Normalizar partida
    console.log('\n--- Normalizando PARTIDA ---');
    if (partida) {
      const normalizedPartida = this.findBestMatch(this.normalizeGeoName(partida), uniqueValues.partidas);
      if (normalizedPartida) {
        documentData.partida = normalizedPartida;
      }
    }

    // Normalizar llegada
    console.log('\n--- Normalizando LLEGADA ---');
    if (llegada) {
      const normalizedLlegada = this.findBestMatch(this.normalizeGeoName(llegada), uniqueValues.llegadas);
      if (normalizedLlegada) {
        documentData.llegada = normalizedLlegada;
      }
    }

    // Normalizar transportado (material)
    // Estrategia: primero filtrar candidatos por contexto (cliente+partida ya normalizados),
    // así se evita confundir materiales distintos del mismo tipo (ej: varios CONCENTRADO).
    // Si no hay coincidencia en el contexto, se busca en todos los materiales del tarifario.
    console.log('\n--- Normalizando MATERIAL ---');
    if (transportado) {
      let normalizedMaterial: string | null = null;

      // Paso 1: candidatos filtrados por cliente + partida ya normalizados
      const ctxCliente = documentData.cliente;
      const ctxPartida = documentData.partida;
      if (ctxCliente && ctxPartida) {
        try {
          const contextTarifas = await this.clientTariffService.findByClienteAndPartida(ctxCliente, ctxPartida);
          const contextMaterials = contextTarifas
            .map(t => t.material)
            .filter(Boolean) as string[];
          console.log(`  Candidatos por contexto (${ctxCliente} / ${ctxPartida}): [${contextMaterials.join(', ')}]`);
          if (contextMaterials.length > 0) {
            normalizedMaterial = this.findMaterialMatch(transportado, contextMaterials);
            if (normalizedMaterial) {
              console.log(`  ✓ Material resuelto por contexto de ruta: "${normalizedMaterial}"`);
            }
          }
        } catch (e) {
          console.log('  Error al obtener tarifas por contexto:', e?.message);
        }
      }

      // Paso 2: fallback — buscar en todos los materiales del tarifario
      if (!normalizedMaterial) {
        console.log('  Fallback: buscando en todos los materiales del tarifario...');
        normalizedMaterial = this.findMaterialMatch(transportado, uniqueValues.materiales);
      }

      if (normalizedMaterial) {
        documentData.transportado = normalizedMaterial;
      } else {
        // No matchea el catálogo pero guardar el texto original para que sea visible
        console.log(`  ⚠️ Material "${transportado}" no coincide con ninguno del tarifario → guardando original`);
        documentData.transportado = transportado;
      }
    }

    // Fallback del único candidato: si transportado quedó null pero el contexto
    // cliente+partida tiene exactamente 1 material en el tarifario, asignarlo automáticamente.
    // Si hay múltiples candidatos, intentar matchear contra el texto crudo del PDF.
    if (!documentData.transportado) {
      const ctxCliente = documentData.cliente;
      const ctxPartida = documentData.partida;
      if (ctxCliente && ctxPartida) {
        try {
          const contextTarifas = await this.clientTariffService.findByClienteAndPartida(ctxCliente, ctxPartida);
          const contextMaterials = contextTarifas
            .map(t => t.material)
            .filter(Boolean) as string[];
          if (contextMaterials.length === 1) {
            documentData.transportado = contextMaterials[0];
            console.log(`  ✓ Material asignado por único candidato en ruta: "${contextMaterials[0]}"`);
          } else if (contextMaterials.length > 1 && pdfText) {
            // Múltiples candidatos: intentar match directo contra el texto crudo del PDF
            const matchFromPdf = this.findMaterialMatch(pdfText, contextMaterials);
            if (matchFromPdf) {
              documentData.transportado = matchFromPdf;
              console.log(`  ✓ Material encontrado en texto PDF crudo: "${matchFromPdf}"`);
            } else {
              console.log(`  ⚠️ Múltiples materiales en ruta (${contextMaterials.join(', ')}), no se encontró en texto PDF → null`);
            }
          } else if (contextMaterials.length > 1) {
            console.log(`  ⚠️ Múltiples materiales en ruta (${contextMaterials.join(', ')}), no hay texto PDF disponible → null`);
          }
        } catch (e) {
          console.log('  Error al obtener tarifas para fallback único candidato:', e?.message);
        }
      }
    }

    console.log('=== FIN NORMALIZACIÓN ===\n');
  }

  /**
   * Normaliza el nombre del transportista comparándolo con nombres existentes en la BD.
   * Evita que variaciones de OCR creen "personas fantasma".
   * Ej: "JAMES NINO ROSALES CAYSAYHUANA" → "JAMES NINO ROSALES CAYSAHUANA" (el más frecuente)
   */
  private async normalizeTransportistaNombre(documentData: Partial<DocumentEntity>): Promise<void> {
    const { transportista } = documentData;
    if (!transportista) return;

    console.log('=== NORMALIZANDO TRANSPORTISTA ===');
    console.log('  Nombre extraído:', transportista);

    // Obtener nombres existentes con su frecuencia (el más frecuente = canónico)
    const existingNames = await this.documentsRepository
      .createQueryBuilder('doc')
      .select('doc.transportista', 'transportista')
      .addSelect('COUNT(*)', 'cnt')
      .where('doc.transportista IS NOT NULL')
      .andWhere('doc.anulado = false')
      .groupBy('doc.transportista')
      .orderBy('cnt', 'DESC')
      .getRawMany();

    if (existingNames.length === 0) {
      console.log('  No hay transportistas existentes en BD, se mantiene el nombre extraído');
      return;
    }

    const normalizedInput = this.normalizeStringAggressive(transportista);
    const threshold = 0.85; // 85% — exigente para evitar confundir personas distintas
    const matches: { name: string; score: number; count: number }[] = [];

    for (const row of existingNames) {
      const candidate = row.transportista;
      const normalizedCandidate = this.normalizeStringAggressive(candidate);

      // Match exacto agresivo — usar el existente directamente
      if (normalizedInput === normalizedCandidate) {
        if (candidate !== transportista) {
          console.log(`  ✓ Match exacto (normalizado): "${transportista}" → "${candidate}"`);
          documentData.transportista = candidate;
        } else {
          console.log(`  ✓ Nombre ya existe exacto en BD: "${candidate}"`);
        }
        return;
      }

      const score = this.calculateSimilarity(normalizedInput, normalizedCandidate);
      if (score >= threshold) {
        matches.push({ name: candidate, score, count: Number(row.cnt) });
      }
    }

    if (matches.length > 0) {
      // Elegir el más frecuente entre los similares
      matches.sort((a, b) => b.count - a.count);
      const best = matches[0];
      console.log(`  ✓ Transportista normalizado (${(best.score * 100).toFixed(0)}%, ${best.count} registros): "${transportista}" → "${best.name}"`);
      documentData.transportista = best.name;
    } else {
      console.log(`  Nuevo transportista (sin match en BD): "${transportista}"`);
    }

    console.log('=== FIN NORMALIZACIÓN TRANSPORTISTA ===\n');
  }

  /**
   * Busca si algún material del tarifario está contenido en el texto extraído.
   * Ordena los candidatos de MAYOR a MENOR longitud antes de comparar,
   * para que nombres más específicos ("CONCENTRADO DE PLATA Y ORO") ganen
   * sobre nombres más cortos ("CONCENTRADO DE ZN") cuando ambos están contenidos.
   */
  private findMaterialMatch(input: string, materials: string[]): string | null {
    if (!input || materials.length === 0) {
      return null;
    }

    // normalizeStringAggressive quita espacios → útil para substring pero NO para split
    // normalizarPalabras: lowercase + sin acentos + sin especiales PERO mantiene espacios
    const normWords = (s: string) => s
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ').trim();

    // Mapa de sinónimos: nombre español ↔ símbolo químico
    // Permite que "COBRE" haga match con "CU", "ORO" con "AU", etc.
    // También cubre el typo frecuente "CONCETRADO" (sin N) = "CONCENTRADO"
    const SYNONYM_MAP: Record<string, string[]> = {
      'cobre':       ['cu'],
      'copper':      ['cu'],
      'zinc':        ['zn'],
      'oro':         ['au'],
      'gold':        ['au'],
      'plata':       ['ag'],
      'silver':      ['ag'],
      'plomo':       ['pb'],
      'lead':        ['pb'],
      'hierro':      ['fe'],
      'iron':        ['fe'],
      // inverso: símbolo → nombre español
      'cu':          ['cobre'],
      'au':          ['oro'],
      'ag':          ['plata'],
      'zn':          ['zinc'],
      'pb':          ['plomo'],
      'fe':          ['hierro'],
      // typo frecuente en catálogo: "CONCETRADO" en lugar de "CONCENTRADO"
      'concetrado':  ['concentrado'],
      'concentrado': ['concetrado'],
    };

    const expandSynonyms = (words: Set<string>): Set<string> => {
      const expanded = new Set(words);
      for (const w of words) {
        for (const syn of (SYNONYM_MAP[w] ?? [])) expanded.add(syn);
      }
      return expanded;
    };

    const normalizedInput = this.normalizeStringAggressive(input);
    const rawInputWords = new Set(normWords(input).split(' ').filter(w => w.length > 1));
    const inputWords = expandSynonyms(rawInputWords);

    // Ordenar de más largo a más corto para que el más específico gane
    const sortedMaterials = [...materials].sort((a, b) => b.length - a.length);

    // Paso 1: Substring (agresivo, sin espacios) — más largo primero
    for (const material of sortedMaterials) {
      const normalizedMaterial = this.normalizeStringAggressive(material);
      if (normalizedMaterial && normalizedInput.includes(normalizedMaterial)) {
        console.log(`  ✓ Material encontrado por contenido: "${material}" en "${input.substring(0, 60)}"`);
        return material;
      }
    }

    // Paso 2: Todas las palabras del candidato (expandidas) están en el input (expandido) Y viceversa
    // Expansión cubre: COBRE↔CU, ORO↔AU, CONCETRADO↔CONCENTRADO (typo del catálogo)
    console.log(`  Buscando material por intersección de palabras...`);
    for (const material of sortedMaterials) {
      const rawCandidateWords = normWords(material).split(' ').filter(w => w.length > 1);
      if (rawCandidateWords.length === 0) continue;
      const candidateWords = expandSynonyms(new Set(rawCandidateWords));
      const allCandidateInInput = rawCandidateWords.every(w => inputWords.has(w) || [...(SYNONYM_MAP[w] ?? [])].some(s => inputWords.has(s)));
      const allInputInCandidate = [...rawInputWords].every(w => candidateWords.has(w) || [...(SYNONYM_MAP[w] ?? [])].some(s => candidateWords.has(s)));
      if (allCandidateInInput && allInputInCandidate) {
        console.log(`  ✓ Material encontrado por palabras exactas (con sinónimos): "${material}"`);
        return material;
      }
    }

    // Paso 3: Subset — todas las palabras del candidato (expandidas) están en el input (expandido)
    for (const material of sortedMaterials) {
      const rawCandidateWords = normWords(material).split(' ').filter(w => w.length > 1);
      if (rawCandidateWords.length === 0) continue;
      if (rawCandidateWords.every(w => inputWords.has(w) || [...(SYNONYM_MAP[w] ?? [])].some(s => inputWords.has(s)))) {
        console.log(`  ✓ Material encontrado por subset candidato⊆input (con sinónimos): "${material}"`);
        return material;
      }
    }

    // Sin match seguro → null
    console.log(`  ✗ No se encontró material seguro para: "${input}" → null`);
    return null;
  }

  /**
   * Encuentra el valor más parecido en una lista usando múltiples estrategias:
   * 1. Match exacto normalizado (incluyendo normalización agresiva)
   * 2. Match después de limpiar sufijos legales (S.A.C, SAC, etc)
   * 3. Similitud Levenshtein con threshold ALTO (75%)
   * 
   * IMPORTANTE: Siempre retorna el valor EXACTO de la tabla client_tariff
   */
  private findBestMatch(input: string, candidates: string[]): string | null {
    if (!input || candidates.length === 0) {
      console.log(`  findBestMatch: input vacío o sin candidatos`);
      return null;
    }

    const normalizedInput = this.normalizeString(input);
    const aggressiveInput = this.normalizeStringAggressive(input);
    const cleanInput = this.cleanLegalSuffix(normalizedInput);
    
    console.log(`  Buscando match para: "${input}"`);
    console.log(`  Normalizado: "${normalizedInput}"`);
    console.log(`  Sin sufijo legal: "${cleanInput}"`);
    console.log(`  Agresivo: "${aggressiveInput}"`);
    console.log(`  Candidatos disponibles: ${candidates.length}`);
    
    let bestMatch: string | null = null;
    let bestScore = 0;
    const threshold = 0.75; // 75% de similitud mínima (MÁS EXIGENTE)

    for (const candidate of candidates) {
      const normalizedCandidate = this.normalizeString(candidate);
      const aggressiveCandidate = this.normalizeStringAggressive(candidate);
      const cleanCandidate = this.cleanLegalSuffix(normalizedCandidate);
      
      // 1. Match exacto (normal o agresivo)
      if (normalizedInput === normalizedCandidate || aggressiveInput === aggressiveCandidate) {
        console.log(`  ✓ Match EXACTO: "${input}" → "${candidate}"`);
        return candidate;
      }

      // 2. Match después de limpiar sufijos legales
      // Ej: "PALTARUMI S.A.C" vs "PALTARUMI SAC" → ambos se convierten a "PALTARUMI"
      if (cleanInput === cleanCandidate && cleanInput.length > 0) {
        console.log(`  ✓ Match por limpieza de sufijo legal: "${input}" → "${candidate}"`);
        return candidate;
      }

      // 3. Similitud Levenshtein (usando normalización agresiva)
      // Solo considerar si la diferencia de longitud no es muy grande
      const lenDiff = Math.abs(aggressiveInput.length - aggressiveCandidate.length);
      if (lenDiff <= 5) { // Máximo 5 caracteres de diferencia
        const levenshteinScore = this.calculateSimilarity(aggressiveInput, aggressiveCandidate);
        if (levenshteinScore > bestScore) {
          bestScore = levenshteinScore;
          bestMatch = candidate;
        }
      }
    }

    // Solo retornar si supera el umbral más exigente (75%)
    if (bestScore >= threshold && bestMatch) {
      console.log(`  ✓ Match por similitud (${(bestScore * 100).toFixed(0)}%): "${input}" → "${bestMatch}"`);
      return bestMatch;
    }
    
    console.log(`  ✗ Sin match para: "${input}" (mejor score: ${(bestScore * 100).toFixed(0)}%, umbral requerido: 75%)`);
    return null;
  }

  /**
   * Elimina sufijos legales comunes: S.A.C, SAC, S.A.C., S.A., SA, SRL, S.R.L., EIRL, etc.
   * Ej: "paltarumi sac" → "paltarumi"
   *     "eco gold s a c" → "eco gold"
   */
  private cleanLegalSuffix(normalizedStr: string): string {
    return normalizedStr
      .replace(/\s+(sac|s\s*a\s*c|sa|s\s*a|srl|s\s*r\s*l|eirl|e\s*i\s*r\s*l|ltda|ltd|cia)$/i, '')
      .trim();
  }

  /**
   * Normaliza un string para comparación
   * Quita acentos, convierte a minúsculas, normaliza espacios y guiones
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9\s-]/g, '')    // Solo letras, números, espacios y guiones
      .replace(/\s*-\s*/g, '-')        // Normalizar espacios alrededor de guiones
      .replace(/\s+/g, ' ')            // Múltiples espacios a uno
      .trim();
  }

  /**
   * Normaliza un string de forma más agresiva (solo letras y números)
   * Útil para comparaciones donde los separadores varían
   */
  private normalizeStringAggressive(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]/g, '');      // Solo letras y números, quitar TODO lo demás
  }

  /**
   * Genera variantes de una placa combinando correcciones OCR y transposiciones adyacentes.
   * Cubre errores como: 5→S, 0→O, 8→B y letras intercambiadas (CSB→CBS).
   */
  private generatePlacaVariants(placa: string): Set<string> {
    const variants = new Set<string>();
    const ocrMap: Record<string, string[]> = {
      '0': ['O'], 'O': ['0', 'Q', 'D'],
      '8': ['B'], 'B': ['8'],
      '1': ['I', 'L'], 'I': ['1', 'L'], 'L': ['1', 'I'],
      '5': ['S'], 'S': ['5'],
      '6': ['G'], 'G': ['6'],
      '2': ['Z'], 'Z': ['2'],
      'C': ['G'], 'V': ['Y', 'U'], 'Y': ['V'], 'U': ['V'],
    };

    // Generar variantes con una sola sustitución OCR
    const ocrVariants = [placa];
    for (let i = 0; i < placa.length; i++) {
      const char = placa[i];
      if (ocrMap[char]) {
        for (const replacement of ocrMap[char]) {
          ocrVariants.push(placa.substring(0, i) + replacement + placa.substring(i + 1));
        }
      }
    }

    // Para cada variante OCR, agregar la variante original + todas las transposiciones adyacentes
    for (const variant of ocrVariants) {
      variants.add(variant);
      for (let i = 0; i < variant.length - 1; i++) {
        const chars = variant.split('');
        [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
        variants.add(chars.join(''));
      }
    }

    // Eliminar la placa original del set (no queremos matchear consigo misma)
    variants.delete(placa);
    return variants;
  }

  /**
   * Calcula la similitud entre dos strings usando Damerau-Levenshtein
   * (transposiciones adyacentes cuentan como 1 operación, no 2)
   * Retorna un valor entre 0 y 1 (1 = idénticos)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Algoritmo de Damerau-Levenshtein
    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // eliminación
          matrix[i][j - 1] + 1,      // inserción
          matrix[i - 1][j - 1] + cost // sustitución
        );
        // Transposición de caracteres adyacentes (Damerau-Levenshtein)
        if (i > 1 && j > 1 &&
            str1[i - 1] === str2[j - 2] && str1[i - 2] === str2[j - 1]) {
          matrix[i][j] = Math.min(
            matrix[i][j],
            matrix[i - 2][j - 2] + 1  // transposición = 1 operación
          );
        }
      }
    }

    const distance = matrix[str1.length][str2.length];
    const maxLength = Math.max(str1.length, str2.length);
    
    return 1 - distance / maxLength;
  }

  /**
   * Calcula los campos financieros basados en el tarifario
   * Estrategia de búsqueda:
   * 1. Buscar por cliente + partida + llegada + material (exacto, más específico)
   * 2. Buscar por cliente + partida + llegada (sin material)
   * 3. Buscar por cliente + partida + material (sin llegada)
   * 4. Buscar por cliente + partida (primera coincidencia)
   */
  private async calculateFinancialFields(documentData: Partial<DocumentEntity>): Promise<boolean> {
    const { cliente, partida, llegada, transportado, empresa, tn_recibida } = documentData;

    console.log('=== BUSCANDO TARIFA ===');
    console.log('Cliente:', cliente);
    console.log('Partida:', partida);
    console.log('Llegada:', llegada);
    console.log('Material:', transportado);

    // Si no hay datos suficientes para buscar, salir
    if (!cliente || !partida) {
      console.log('✗ Datos insuficientes para buscar tarifa');
      return false;
    }

    let tarifa = null;

    // 1. Búsqueda más específica: cliente + partida + llegada + material
    if (llegada && transportado) {
      tarifa = await this.clientTariffService.findByFullRoute(cliente, partida, llegada, transportado);
      if (tarifa) {
        console.log('✓ Tarifa encontrada por cliente+partida+llegada+material');
      }
    }

    // 2. Fallback: cliente + partida + llegada (sin material)
    if (!tarifa && llegada) {
      tarifa = await this.clientTariffService.findByRoute(partida, llegada, cliente);
      if (tarifa) {
        console.log('✓ Tarifa encontrada por cliente+partida+llegada');
      }
    }

    // 3. Si no encuentra y hay material, buscar por cliente + partida + material (sin llegada)
    if (!tarifa && transportado) {
      tarifa = await this.clientTariffService.findByClientePartidaMaterial(cliente, partida, transportado);
      if (tarifa) {
        console.log('✓ Tarifa encontrada por cliente+partida+material');
        // Actualizar la llegada con la del tarifario
        documentData.llegada = tarifa.llegada;
      }
    }

    // 4. Si todavía no encuentra, buscar por cliente + partida (primera coincidencia)
    if (!tarifa) {
      const tarifas = await this.clientTariffService.findByClienteAndPartida(cliente, partida);
      if (tarifas.length > 0) {
        tarifa = tarifas[0];
        console.log('✓ Tarifa encontrada por cliente+partida (primera coincidencia)');
        // Actualizar la llegada con la del tarifario
        documentData.llegada = tarifa.llegada;
      }
    }

    // 4. Fallback: buscar por partida + llegada + material SIN cliente
    // Esto ocurre cuando el PDF muestra el almacén/terminal como destinatario
    // en vez del cliente real (ej: LOGISMINSA en vez de ECO GOLD S.A.C.)
    if (!tarifa && llegada && transportado) {
      tarifa = await this.clientTariffService.findByRutaAndMaterial(partida, llegada, transportado);
      if (tarifa) {
        console.log(`✓ Tarifa encontrada por ruta+material (sin cliente). Cliente corregido: "${cliente}" → "${tarifa.cliente}"`);
        documentData.cliente = tarifa.cliente; // corregir el cliente al real
      }
    }

    // 5. Último fallback: buscar solo por partida + llegada
    if (!tarifa && llegada) {
      tarifa = await this.clientTariffService.findByRuta(partida, llegada);
      if (tarifa) {
        console.log(`✓ Tarifa encontrada por ruta (sin cliente ni material). Cliente corregido: "${cliente}" → "${tarifa.cliente}"`);
        documentData.cliente = tarifa.cliente;
      }
    }

    if (tarifa) {
      console.log('Tarifa seleccionada:', {
        cliente: tarifa.cliente,
        partida: tarifa.partida,
        llegada: tarifa.llegada,
        material: tarifa.material,
        precioVenta: tarifa.precioVentaConIgv,
        precioCosto: tarifa.precioCostoConIgv,
      });

      // Asignar precio unitario y divisa desde tarifario
      documentData.precio_unitario = Number(tarifa.precioVentaConIgv) || null;
      documentData.divisa = tarifa.moneda || null;

      // Asignar costo y divisa de costo desde tarifario
      documentData.pcosto = Number(tarifa.precioCostoConIgv) || null;
      documentData.divisa_cost = tarifa.divisa || null;

      // Verificar si es un cliente con tarifa fija (no se multiplica por tn_recibida)
      const esTarifaFija = ['NUKLEO PERU S.A.C.', 'PAY METAL TRADING S.A.C.'].includes(documentData.cliente?.toUpperCase() || tarifa.cliente?.toUpperCase());

      // Calcular precio final
      if (documentData.precio_unitario && tn_recibida) {
        if (esTarifaFija) {
          documentData.precio_final = Number(documentData.precio_unitario.toFixed(2));
        } else {
          documentData.precio_final = Number((documentData.precio_unitario * Number(tn_recibida)).toFixed(2));
        }
      }

      // Calcular costo final
      // Fórmula Excel: =SI.ERROR(SI([@[Empresa]]<>"ECOTRANSPORTE",[@PCOSTO]*[@[TN RECIBIDA]],0),"")
      // Si transportista NO ES ECOTRANSPORTE → costo_final = pcosto * tn_recibida (o fijo si es tarifa fija)
      // Si transportista ES ECOTRANSPORTE → costo_final = 0
      const transportista = documentData.transportista || '';
      if (transportista.toUpperCase().includes('ECOTRANSPORTE')) {
        documentData.pcosto = 0;
        documentData.costo_final = 0;
        documentData.margen_operativo = 0;
        console.log('Transportista es ECOTRANSPORTE, pcosto/costo_final/margen_operativo = 0');
      } else {
        if (documentData.pcosto && tn_recibida) {
          if (esTarifaFija) {
            documentData.costo_final = Number(documentData.pcosto.toFixed(2));
          } else {
            documentData.costo_final = Number((documentData.pcosto * Number(tn_recibida)).toFixed(2));
          }
        }
        // Calcular margen operativo = precio_final - costo_final
        if (documentData.precio_final !== null && documentData.costo_final !== null) {
          documentData.margen_operativo = Number((documentData.precio_final - documentData.costo_final).toFixed(2));
        }
      }
      console.log('=== FIN BÚSQUEDA TARIFA ===\n');
      return true;
    } else {
      console.log('✗ No se encontró tarifa para esta combinación');
      // No se encontró tarifa, dejar campos en null
      documentData.precio_unitario = null;
      documentData.divisa = null;
      documentData.precio_final = null;
      documentData.pcosto = null;
      documentData.divisa_cost = null;
      documentData.costo_final = null;
      documentData.margen_operativo = null;
      console.log('=== FIN BÚSQUEDA TARIFA ===\n');
      return false;
    }
  }

  async getDocumentById(id: number): Promise<DocumentEntity | null> {
    return await this.documentsRepository.findOne({
      where: { id },
      relations: ['uploader', 'uploader.userInformation', 'updater'],
    });
  }

  async getAllDocuments(): Promise<DocumentEntity[]> {
    return await this.documentsRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.uploader', 'uploader')
      .leftJoinAndSelect('uploader.userInformation', 'userInformation')
      .orderBy(`CAST(SUBSTRING(doc.grt FROM '([0-9]+)$') AS INTEGER)`, 'ASC')
      .addOrderBy('doc.grt', 'ASC')
      .getMany();
  }

  async getDocumentsByUser(userId: number): Promise<DocumentEntity[]> {
    return await this.documentsRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.uploader', 'uploader')
      .leftJoinAndSelect('uploader.userInformation', 'userInformation')
      .where('doc.uploaded_by = :userId', { userId })
      .orderBy(`CAST(SUBSTRING(doc.grt FROM '([0-9]+)$') AS INTEGER)`, 'ASC')
      .addOrderBy('doc.grt', 'ASC')
      .getMany();
  }

  async updateDocument(
    id: number,
    updateData: Partial<DocumentEntity>,
    userId?: number,
  ): Promise<DocumentEntity | null> {
    // Si se proporciona userId, guardarlo como updated_by
    if (userId) {
      updateData.updated_by = userId;
    }

    // Si cambia fecha, remapear mes y semana con la regla centralizada.
    if (updateData.fecha) {
      this.assignMesSemanaFromFecha(updateData);
    }

    // Si se actualiza tn_recibida, recalcular campos financieros
    // Usar los valores del request (updateData) si vienen, sino los de la BD (existingDoc)
    if (updateData.tn_recibida !== undefined) {
      const existingDoc = await this.getDocumentById(id);
      if (existingDoc) {
        const tn_recibida = Number(updateData.tn_recibida);
        const precioUnitario = updateData.precio_unitario ?? existingDoc.precio_unitario;
        const pcosto = updateData.pcosto ?? existingDoc.pcosto;
        const transportista = updateData.transportista ?? existingDoc.transportista ?? '';
        const cliente = (updateData.cliente ?? existingDoc.cliente ?? '').toUpperCase();
        const esTarifaFija = cliente.includes('NUKLEO') || cliente.includes('PAY METAL');

        // Recalcular precio_final
        // Si es tarifa fija (Nukleo/Pay Metal) → precio_final = precio_unitario (sin × TN)
        if (precioUnitario) {
          updateData.precio_final = esTarifaFija
            ? Number(Number(precioUnitario).toFixed(2))
            : Number((Number(precioUnitario) * tn_recibida).toFixed(2));
        }

        // Recalcular costo_final
        // Si transportista es ECOTRANSPORTE, costo_final = 0
        // Si es tarifa fija → costo_final = pcosto (sin × TN)
        // Sino, costo_final = pcosto * tn_recibida
        if (transportista.toUpperCase().includes('ECOTRANSPORTE')) {
          updateData.pcosto = 0;
          updateData.costo_final = 0;
          updateData.margen_operativo = 0;
        } else {
          if (pcosto) {
            updateData.costo_final = esTarifaFija
              ? Number(Number(pcosto).toFixed(2))
              : Number((Number(pcosto) * tn_recibida).toFixed(2));
          }
          // Recalcular margen_operativo = precio_final - costo_final
          const precioFinal = updateData.precio_final ?? existingDoc.precio_final ?? 0;
          const costoFinal = updateData.costo_final ?? existingDoc.costo_final ?? 0;
          updateData.margen_operativo = Number((Number(precioFinal) - Number(costoFinal)).toFixed(2));
        }
      }
    }

    await this.documentsRepository.update(id, updateData);

    // Reconstruir motivo basado en el estado actual del documento
    const updatedDoc = await this.getDocumentById(id);
    if (updatedDoc) {
      const motivoArray: string[] = [];
      if (!updatedDoc.cliente) motivoArray.push('Cliente no identificado');
      if (!updatedDoc.partida) motivoArray.push('Punto de partida no identificado');
      if (!updatedDoc.llegada) motivoArray.push('Punto de llegada no identificado');
      if (!updatedDoc.transportado) motivoArray.push('Material transportado no reconocido');
      if (!updatedDoc.precio_unitario) motivoArray.push('Tarifa no encontrada');
      if (!updatedDoc.unidad) motivoArray.push('Placa del vehículo no identificada');

      const nuevoMotivo = motivoArray.length > 0 ? motivoArray.join(' | ') : null;
      if (nuevoMotivo !== updatedDoc.motivo) {
        await this.documentsRepository.update(id, { motivo: nuevoMotivo });
        if (!nuevoMotivo) {
          console.log(`✅ motivo limpiado automáticamente para doc ${id}: todos los campos críticos completos`);
        } else {
          console.log(`⚠️ motivo actualizado para doc ${id}: ${nuevoMotivo}`);
        }
        return await this.getDocumentById(id);
      }

      return updatedDoc;
    }

    return updatedDoc;
  }

  async createManualDocument(
    data: Partial<DocumentEntity>,
    userId: number,
  ): Promise<DocumentEntity> {
    const documentData: Partial<DocumentEntity> = { ...data, uploaded_by: userId };

    this.assignMesSemanaFromFecha(documentData);

    // TN Recibida defaults to TN Enviado
    if (documentData.tn_enviado && !documentData.tn_recibida) {
      documentData.tn_recibida = documentData.tn_enviado;
    }

    // Determine deposito
    this.determineDeposito(documentData);

    // Associate unidad with empresa
    if (documentData.unidad) {
      const unidadEntity = await this.unidadService.findByPlaca(documentData.unidad);
      if (unidadEntity && unidadEntity.empresa) {
        documentData.empresa = unidadEntity.empresa.nombre;
      }
    }

    // Calculate financial fields from tariff
    await this.calculateFinancialFields(documentData);

    // Detect missing fields
    const motivoArray: string[] = [];
    if (!documentData.cliente) motivoArray.push('Cliente no ingresado');
    if (!documentData.partida) motivoArray.push('Punto de partida no ingresado');
    if (!documentData.llegada) motivoArray.push('Punto de llegada no ingresado');
    if (!documentData.transportado) motivoArray.push('Material no ingresado');
    if (!documentData.precio_unitario) motivoArray.push('Tarifa no encontrada');
    documentData.motivo = motivoArray.length > 0 ? motivoArray.join(' | ') : null;

    const doc = this.documentsRepository.create(documentData);
    return await this.documentsRepository.save(doc) as DocumentEntity;
  }

  async toggleAnulado(id: number): Promise<DocumentEntity | null> {
    const doc = await this.getDocumentById(id);
    if (!doc) return null;
    doc.anulado = !doc.anulado;
    return await this.documentsRepository.save(doc);
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await this.documentsRepository.delete(id);
    return result.affected > 0;
  }

  /**
   * Re-asocia documentos que tienen placas sin registrar.
   * Se ejecuta después de que el usuario registra nuevas empresas/unidades.
   */
  async reassociateUnregistered(): Promise<number> {
    // Buscar documentos que tengan placa pero no tengan empresa asignada
    const docs = await this.documentsRepository.find(); // Se debería optimizar con un queryBuilder
    const docsSinEmpresa = docs.filter(d => d.unidad && !d.empresa);

    let updated = 0;
    for (const doc of docsSinEmpresa) {
      const unidad = await this.unidadService.findByPlaca(doc.unidad);
      if (unidad && unidad.empresa) {
        doc.empresa = unidad.empresa.nombre;
        await this.documentsRepository.save(doc);
        updated++;
        console.log(`✓ Documento ${doc.id} (${doc.grt}) re-asociado con placa ${unidad.placa} y empresa ${doc.empresa}`);
      }
    }
    return updated;
  }

  /**
   * Recalcula los campos financieros de un documento existente.
   * Se usa después de crear una nueva tarifa para un documento que no tenía.
   */
  async recalculateDocumentFinancials(id: number): Promise<DocumentEntity | null> {
    const doc = await this.getDocumentById(id);
    if (!doc) return null;

    const documentData: Partial<DocumentEntity> = {
      cliente: doc.cliente,
      partida: doc.partida,
      llegada: doc.llegada,
      transportado: doc.transportado,
      empresa: doc.empresa,
      transportista: doc.transportista,
      tn_recibida: doc.tn_recibida,
    };

    const found = await this.calculateFinancialFields(documentData);

    if (found) {
      await this.documentsRepository.update(id, {
        precio_unitario: documentData.precio_unitario,
        divisa: documentData.divisa,
        precio_final: documentData.precio_final,
        pcosto: documentData.pcosto,
        divisa_cost: documentData.divisa_cost,
        costo_final: documentData.costo_final,
        margen_operativo: documentData.margen_operativo,
      });
    }

    return await this.getDocumentById(id);
  }

  async uploadToCloudinary(buffer: Buffer, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'documents',
          public_id: `${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  async addFileUrl(documentId: number, url: string): Promise<DocumentEntity> {
    const doc = await this.documentsRepository.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }
    doc.documentos = doc.documentos || [];
    doc.documentos.push(url);
    return this.documentsRepository.save(doc);
  }

  async removeFileUrl(documentId: number, url: string): Promise<DocumentEntity> {
    const doc = await this.documentsRepository.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }
    doc.documentos = (doc.documentos || []).filter(u => u !== url);
    return this.documentsRepository.save(doc);
  }

  async streamRemoteFile(url: string, res: any, redirectCount = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'));
      }
      const client = url.startsWith('https') ? require('https') : require('http');
      client.get(url, (remoteRes) => {
        const { statusCode, headers } = remoteRes;
        if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
          const nextUrl = headers.location.startsWith('http') ? headers.location : new URL(headers.location, url).toString();
          remoteRes.resume();
          return this.streamRemoteFile(nextUrl, res, redirectCount + 1).then(resolve).catch(reject);
        }
        if (statusCode !== 200) {
          return reject(new Error(`Remote status ${statusCode}`));
        }
        const dispositionName = url.split('/').pop() || 'file';
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${dispositionName}"`);
        remoteRes.pipe(res);
        remoteRes.on('end', () => resolve());
      }).on('error', reject);
    });
  }
}

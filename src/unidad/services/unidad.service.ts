import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UnidadEntity } from '../entities/unidad.entity';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Injectable()
export class UnidadService {
  constructor(
    @InjectRepository(UnidadEntity)
    private unidadRepository: Repository<UnidadEntity>,
    @InjectRepository(DocumentEntity)
    private documentsRepository: Repository<DocumentEntity>,
  ) {}

  private normalizePlaca(placa: string): string {
    return (placa || '').replace(/[\s-]/g, '').toUpperCase().trim();
  }

  private async validateActivePlacaUniqueness(
    placa: string,
    estado: string,
    currentId?: number,
  ): Promise<void> {
    if (!placa || estado !== 'activo') return;

    const placaNormalizada = this.normalizePlaca(placa);
    const unidades = await this.unidadRepository.find();

    const conflict = unidades.find(
      (u) =>
        u.id !== currentId &&
        u.estado === 'activo' &&
        this.normalizePlaca(u.placa) === placaNormalizada,
    );

    if (conflict) {
      throw new BadRequestException(
        `La placa ${placaNormalizada} ya está habilitada en otra empresa. Debes deshabilitar la actual antes de habilitar esta.`,
      );
    }
  }

  async findAll(): Promise<UnidadEntity[]> {
    return await this.unidadRepository.find({
      where: { estado: Not('eliminado') },
      relations: ['empresa'],
      order: { id: 'ASC' },
    });
  }

  async findById(id: number): Promise<UnidadEntity | null> {
    return await this.unidadRepository.findOne({
      where: { id },
      relations: ['empresa'],
    });
  }

  async findByPlaca(placa: string): Promise<UnidadEntity | null> {
    // Normalizar placa: quitar espacios, guiones y convertir a mayúsculas
    const placaNormalizada = placa.replace(/[\s-]/g, '').toUpperCase();
    
    console.log('=== FUZZY MATCHING PLACA ===');
    console.log('Placa extraída del PDF:', placa);
    console.log('Placa normalizada:', placaNormalizada);
    
    const unidades = await this.unidadRepository.find({
      relations: ['empresa'],
    });

    // Filtramos solo las unidades activas para el matching, ya que no queremos asignar a empresas dadas de baja
    const unidadesActivas = unidades.filter(u => u.estado === 'activo');

    // 1. Primero buscar coincidencia exacta
    for (const unidad of unidadesActivas) {
      const unidadPlacaNorm = unidad.placa.replace(/[\s-]/g, '').toUpperCase();
      if (unidadPlacaNorm === placaNormalizada) {
        console.log('✓ Coincidencia EXACTA encontrada:', unidad.placa);
        return unidad;
      }
    }

    // 2. Buscar si una contiene a la otra
    for (const unidad of unidadesActivas) {
      const unidadPlacaNorm = unidad.placa.replace(/[\s-]/g, '').toUpperCase();
      if (placaNormalizada.includes(unidadPlacaNorm) ||
          unidadPlacaNorm.includes(placaNormalizada)) {
        console.log('✓ Coincidencia por CONTENIDO:', placaNormalizada, '→', unidad.placa);
        return unidad;
      }
    }

    // 3. Buscar por variantes OCR + transposiciones adyacentes
    // Ej: "CSB886" genera "CBS886" (transposición), "C5B840" genera "CSB840" → "CBS840"
    console.log('Buscando por variantes OCR + transposición...');
    const variants = this.generarVariantesPlaca(placaNormalizada);
    for (const unidad of unidadesActivas) {
      const unidadPlacaNorm = unidad.placa.replace(/[\s-]/g, '').toUpperCase();
      if (variants.has(unidadPlacaNorm)) {
        console.log(`✓ Coincidencia por OCR/transposición: "${placaNormalizada}" → "${unidad.placa}"`);
        return unidad;
      }
    }

    // 4. Fuzzy matching: buscar la placa más similar usando Damerau-Levenshtein
    console.log('Buscando por SIMILITUD (fuzzy matching)...');
    let mejorCoincidencia: UnidadEntity | null = null;
    let mejorSimilitud = 0;
    const umbralMinimo = 0.7; // 70% de similitud mínima

    for (const unidad of unidadesActivas) {
      const unidadPlacaNorm = unidad.placa.replace(/[\s-]/g, '').toUpperCase();
      const similitud = this.calcularSimilitud(placaNormalizada, unidadPlacaNorm);
      
      console.log(`  Comparando "${placaNormalizada}" vs "${unidadPlacaNorm}": ${(similitud * 100).toFixed(0)}%`);
      
      if (similitud > mejorSimilitud) {
        mejorSimilitud = similitud;
        mejorCoincidencia = unidad;
      }
    }

    // Si la mejor coincidencia supera el umbral, usarla
    if (mejorSimilitud >= umbralMinimo && mejorCoincidencia) {
      console.log(`✓ Coincidencia FUZZY: "${placaNormalizada}" → "${mejorCoincidencia.placa}" (${(mejorSimilitud * 100).toFixed(0)}%)`);
      console.log('  Posible error de OCR detectado y corregido');
      return mejorCoincidencia;
    }

    console.log(`✗ No se encontró coincidencia para: "${placaNormalizada}" (mejor: ${(mejorSimilitud * 100).toFixed(0)}%)`);
    console.log('=== FIN FUZZY MATCHING ===\n');
    return null;
  }

  /**
   * Calcula la similitud entre dos strings usando distancia de Levenshtein
   * También considera caracteres visualmente similares (0/O, 8/B, 1/I/L, 5/S, etc.)
   * Retorna un valor entre 0 y 1 (1 = idénticos)
   */
  private calcularSimilitud(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Normalizar caracteres visualmente similares para comparación
    const normalized1 = this.normalizarCaracteresOCR(str1);
    const normalized2 = this.normalizarCaracteresOCR(str2);
    
    // Si son iguales después de normalizar caracteres similares, alta probabilidad de match
    if (normalized1 === normalized2) {
      return 0.95; // 95% porque hubo confusión de caracteres
    }

    // Calcular distancia de Levenshtein
    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        // Costo reducido si son caracteres visualmente similares
        let cost = 1;
        if (str1[i - 1] === str2[j - 1]) {
          cost = 0;
        } else if (this.sonCaracteresSimilares(str1[i - 1], str2[j - 1])) {
          cost = 0.3; // Penalización reducida para caracteres similares
        }
        
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,          // eliminación
          matrix[i][j - 1] + 1,          // inserción
          matrix[i - 1][j - 1] + cost    // sustitución
        );

        // Transposición de caracteres adyacentes (Damerau-Levenshtein)
        if (i > 1 && j > 1 &&
            str1[i - 1] === str2[j - 2] && str1[i - 2] === str2[j - 1]) {
          const transpCost = this.sonCaracteresSimilares(str1[i - 2], str1[i - 1]) ? 0.5 : 1;
          matrix[i][j] = Math.min(
            matrix[i][j],
            matrix[i - 2][j - 2] + transpCost  // transposición
          );
        }
      }
    }

    const distance = matrix[str1.length][str2.length];
    const maxLength = Math.max(str1.length, str2.length);
    
    return 1 - distance / maxLength;
  }

  /**
   * Normaliza caracteres que el OCR suele confundir
   */
  private normalizarCaracteresOCR(str: string): string {
    return str
      .replace(/0/g, 'O')  // 0 → O
      .replace(/8/g, 'B')  // 8 → B
      .replace(/1/g, 'I')  // 1 → I
      .replace(/5/g, 'S')  // 5 → S
      .replace(/6/g, 'G')  // 6 → G
      .replace(/2/g, 'Z'); // 2 → Z
  }

  /**
   * Verifica si dos caracteres son visualmente similares (confusiones típicas de OCR)
   */
  private sonCaracteresSimilares(char1: string, char2: string): boolean {
    const gruposSimilares = [
      ['0', 'O', 'Q', 'D'],    // Cero, O, Q, D
      ['8', 'B'],              // 8 y B
      ['1', 'I', 'L', '|'],    // 1, I, L
      ['5', 'S'],              // 5 y S
      ['6', 'G'],              // 6 y G
      ['2', 'Z'],              // 2 y Z
      ['C', 'G'],              // C y G (a veces)
      ['V', 'Y'],              // V y Y
      ['U', 'V'],              // U y V
    ];

    for (const grupo of gruposSimilares) {
      if (grupo.includes(char1) && grupo.includes(char2)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Genera variantes de una placa combinando correcciones OCR y transposiciones adyacentes.
   * Cubre errores como: 5→S, 0→O, 8→B y letras intercambiadas (CSB→CBS).
   */
  private generarVariantesPlaca(placa: string): Set<string> {
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

    // Para cada variante OCR, agregar todas las transposiciones adyacentes
    for (const variant of ocrVariants) {
      variants.add(variant);
      for (let i = 0; i < variant.length - 1; i++) {
        const chars = variant.split('');
        [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
        variants.add(chars.join(''));
      }
    }

    variants.delete(placa);
    return variants;
  }

  async findByEmpresa(empresaId: number): Promise<UnidadEntity[]> {
    return await this.unidadRepository.find({
      where: { empresaId, estado: Not('eliminado') },
      relations: ['empresa'],
      order: { id: 'ASC' },
    });
  }

  async create(data: Partial<UnidadEntity>): Promise<UnidadEntity> {
    const placaNormalizada = this.normalizePlaca(data.placa || '');
    const estadoFinal = data.estado || 'activo';

    await this.validateActivePlacaUniqueness(placaNormalizada, estadoFinal);

    const unidad = this.unidadRepository.create({
      ...data,
      placa: placaNormalizada,
      estado: estadoFinal,
    });
    return await this.unidadRepository.save(unidad);
  }

  async update(id: number, data: Partial<UnidadEntity>): Promise<UnidadEntity | null> {
    const oldUnidad = await this.findById(id);
    if (!oldUnidad) return null;

    const nuevaPlaca = this.normalizePlaca(data.placa || oldUnidad.placa);
    const nuevoEstado = data.estado || oldUnidad.estado;

    await this.validateActivePlacaUniqueness(nuevaPlaca, nuevoEstado, id);

    // Si se está cambiando la placa, propagar el cambio a todos los documentos
    if (oldUnidad.placa !== nuevaPlaca) {
      // Actualizar por texto de placa en los documentos
      await this.documentsRepository
        .createQueryBuilder()
        .update(DocumentEntity)
        .set({ unidad: nuevaPlaca })
        .where('unidad = :oldPlaca', { oldPlaca: oldUnidad.placa })
        .execute();
      console.log(`Cascada: placa "${oldUnidad.placa}" → "${nuevaPlaca}" actualizada en documentos`);
    }

    await this.unidadRepository.update(id, {
      ...data,
      placa: nuevaPlaca,
      estado: nuevoEstado,
    });
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.unidadRepository.update(id, { estado: 'eliminado' });
    return result.affected > 0;
  }

  async getActivas(): Promise<UnidadEntity[]> {
    return await this.unidadRepository.find({
      where: { estado: 'activo' },
      relations: ['empresa'],
      order: { id: 'ASC' },
    });
  }
}

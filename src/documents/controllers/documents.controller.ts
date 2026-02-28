import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { DocumentsService } from '../services/documents.service';
import { AuthGuard } from '../../auth/auth.guard';
import { BlacklistInterceptor } from '../../auth/blackllist.interceptor';
import { UpdateDocumentDto } from '../dto/update-document.dto';

@ApiTags('Documents')
@Controller('documents')
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    description: 'Upload and process a PDF document with OpenAI Vision',
    operationId: 'UploadDocument',
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    if (file.mimetype !== 'application/pdf') {
      throw new HttpException(
        'Only PDF files are allowed',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const userId = req.session?.id || 1;
      console.log('=== UPLOAD DEBUG ===');
      console.log('User ID from session:', userId);
      console.log('Session data:', req.session);
      
      const filePath = `/uploads/${Date.now()}_${file.originalname}`;

      const result = await this.documentsService.uploadAndProcessDocument(
        file.buffer,
        file.originalname,
        userId,
        filePath,
      );

      return {
        success: true,
        message: 'Document processed successfully',
        document: result.document,
        placaNoRegistrada: result.placaNoRegistrada,
        tarifaNoEncontrada: result.tarifaNoEncontrada,
      };
    } catch (error) {
      console.error('=== UPLOAD ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw new HttpException(
        {
          message: 'Error processing document',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/files')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    description: 'Upload an image or PDF to Cloudinary and attach its URL to the document',
    operationId: 'UploadFileToDocument',
  })
  async uploadFileToDocument(
    @Param('id') id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    try {
      const url = await this.documentsService.uploadToCloudinary(file.buffer, file.originalname);
      const document = await this.documentsService.addFileUrl(id, url);
      return { success: true, url, document };
    } catch (err) {
      throw new HttpException(err.message || 'Upload failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id/files')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'Remove a previously stored file URL from the document',
    operationId: 'RemoveFileFromDocument',
  })
  async deleteFileFromDocument(
    @Param('id') id: number,
    @Body('url') url: string,
  ) {
    if (!url) {
      throw new HttpException('URL is required', HttpStatus.BAD_REQUEST);
    }
    const document = await this.documentsService.removeFileUrl(id, url);
    return { success: true, document };
  }

  @Get(':id/files/:idx')
  @ApiOperation({
    description: 'Proxy download of a stored file by index',
    operationId: 'DownloadFileFromDocument',
  })
  async downloadFile(
    @Param('id') id: number,
    @Param('idx') idx: number,
    @Res() res,
  ) {
    const doc = await this.documentsService.getDocumentById(id);
    if (!doc) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }
    const list = doc.documentos || [];
    if (idx < 0 || idx >= list.length) {
      throw new HttpException('File index out of range', HttpStatus.BAD_REQUEST);
    }
    const url = list[idx];
    await this.documentsService.streamRemoteFile(url, res);
  }

  @Get()
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'Get all documents',
    operationId: 'GetAllDocuments',
  })
  async getAllDocuments() {
    const documents = await this.documentsService.getAllDocuments();
    return {
      success: true,
      data: documents,
      count: documents.length,
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'Get a document by ID',
    operationId: 'GetDocumentById',
  })
  async getDocumentById(@Param('id') id: number) {
    const document = await this.documentsService.getDocumentById(id);

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data: document,
    };
  }

  @Get('user/documents')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'Get documents uploaded by current user',
    operationId: 'GetUserDocuments',
  })
  async getUserDocuments(@Request() req) {
    const userId = req.session?.id || 1;
    const documents = await this.documentsService.getDocumentsByUser(userId);

    return {
      success: true,
      data: documents,
      count: documents.length,
    };
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'Update document data',
    operationId: 'UpdateDocument',
  })
  async updateDocument(
    @Param('id') id: number,
    @Body() updateData: UpdateDocumentDto,
    @Request() req,
  ) {
    const userId = req.session?.id || 1;
    const document = await this.documentsService.updateDocument(id, updateData, userId);

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Document updated successfully',
      data: document,
    };
  }

  @Patch('reassociate')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'Re-associate documents with newly registered placas/empresas',
    operationId: 'ReassociateDocuments',
  })
  async reassociateDocuments() {
    const updated = await this.documentsService.reassociateUnregistered();
    return {
      success: true,
      message: `${updated} documento(s) re-asociado(s)`,
      updated,
    };
  }

  @Patch(':id/anular')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'Toggle anulado status of a document',
    operationId: 'AnularDocument',
  })
  async anularDocument(@Param('id') id: number) {
    const document = await this.documentsService.toggleAnulado(id);

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: document.anulado ? 'Documento anulado' : 'Documento restaurado',
      data: document,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'Delete a document',
    operationId: 'DeleteDocument',
  })
  async deleteDocument(@Param('id') id: number) {
    const deleted = await this.documentsService.deleteDocument(id);

    if (!deleted) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  @Patch(':id/recalculate')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'Recalculate financial fields for a document after a new tariff is created',
    operationId: 'RecalculateDocument',
  })
  async recalculateDocument(@Param('id') id: number) {
    const document = await this.documentsService.recalculateDocumentFinancials(id);

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Financial fields recalculated',
      data: document,
    };
  }
}

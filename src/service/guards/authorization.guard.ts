import {
  Injectable,
  Inject,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {TokenService} from "../../auth/service/token.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const secured = this.reflector.get<string[]>(
      'secured',
      context.getHandler(),
    );

    if (!secured) {
      return true;
    }
    const request = context.switchToHttp().getRequest();

    let bearerToken = '';
    let validate = false;
    if (
      request.headers.authorization &&
      request.headers.authorization.startsWith('Bearer ')
    ) {
      const tokenArray = request.headers.authorization.split(' ');
      bearerToken = tokenArray[1];
    } else {
      throw new HttpException(
        {
          message: 'token_decode_error',
          data: null,
          errors: 'No ha enviado authorization en header',
        },
        HttpStatus.FORBIDDEN,
      );
    }


    const userTokenInfo = await this.tokenService.decodeToken(bearerToken);

    if (userTokenInfo.status === HttpStatus.OK) {
      validate = true;
      if (!validate) {
        throw new HttpException(
          {
            message: 'token_decode_error',
            data: null,
            errors: 'No tiene permisos para acceder a este recurso',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
    } else {
      throw new HttpException(
        {
          message: 'token_decode_error',
          data: null,
          errors: 'No se ha podido decodificar el token',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}

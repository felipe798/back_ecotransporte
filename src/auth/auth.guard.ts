import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { TokenService } from 'src/auth/service/token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  tokenService: TokenService;
  constructor() {
    this.tokenService = new TokenService();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const methodKey = context.getHandler().name;
    const className = context.getClass().name;
    if (request) {
      if (!request.headers.authorization) {
        throw new HttpException(
          'You are not authorized to use this method',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const auth = await this.validateToken(request.headers.authorization);
      request.session = auth;
      return request;
    }
  }

  async validateToken(auth: string) {
    const define = auth.split(' ')[0];
    const token = auth.split(' ')[1];

    if (define === 'Bearer') {
      try {
        let decoded: any = await this.tokenService.verifyAccessToken(token);
        return decoded;
      } catch (err) {
        const message = 'Bearer error: ' + (err.message || err.name);
        Logger.log(message);
        throw new HttpException(message, HttpStatus.UNAUTHORIZED);
      }
    } else {
      throw new HttpException(
        'Invalid authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}

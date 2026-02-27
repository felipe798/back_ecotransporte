import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {decode, sign, verify} from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TokenService {
  constructor() {}

  async createAccessToken(payload: any): Promise<string> {
    const options = {
      jwtid: uuidv4(),
      expiresIn: '1 hour',
    };

    if (process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      options['expiresIn'] = '30 days';
    }

    const tokenAccess = sign(payload, process.env.PS_SECRET, options);
    return tokenAccess;
  }

  async verifyAccessToken(accessToken: string) {
    return verify(accessToken, process.env.PS_SECRET);
  }

  async verifyAccessTokenIgnoreExp(accessToken: string) {
    return verify(accessToken, process.env.PS_SECRET, {
      ignoreExpiration: true,
    });
  }
  public async decodeToken(token: string) {
    try {
      let result = null;
      const payload = verify(token, process.env.PS_SECRET);
      const tokenData = decode(token) as {
        exp: number;
        userId: any;
      };
      if (payload) {
        if (!tokenData || tokenData.exp <= Math.floor(+new Date() / 1000)) {
          throw new Error('El token ha expirado.');
        } else {
          result = {
            status: HttpStatus.OK,
            message: 'token_decode_success',
            data: {
              userinfo: tokenData,
            },
            errors: null,
          };
        }
      } else throw new Error('Token no válido.');

      return result;
    } catch (e) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        message: 'token_decode_error',
        data: null,
        errors: e.message,
      };
    }
  }
  public async roleValidation(token: string, role: number) {
    try {

      let bearerToken = '';
      if (token.startsWith('Bearer ')) {
        const tokenArray = token.split(' ');
        bearerToken = tokenArray[1];
      } else {
        throw new HttpException(
          {
            message: 'token_decode_error',
            data: null,
            errors: 'You have not sent authorization in header.',
          },
          HttpStatus.FORBIDDEN,
        );
      }
      const userTokenInfo = await this.decodeToken(bearerToken);
      if (userTokenInfo.status !== HttpStatus.OK) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            message: 'list_users_error',
            data: null,
            errors: 'No user information found',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (userTokenInfo.data.userinfo.role !== role) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            message: 'list_users_error',
            data: null,
            errors: 'You do not have permission to access this resource',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      return {
        status: HttpStatus.OK,
        message: 'list_users_success',
        data: userTokenInfo.data.userinfo,
        errors: null,
      };

    } catch (e) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        message: 'token_decode_error',
        data: null,
        errors: e.message,
      };
    }
  }
}

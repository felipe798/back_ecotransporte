import {HttpStatus} from '@nestjs/common';

export const responseError = (res, e) => {
  const response = e.response;
  res.status(response.status ?? HttpStatus.INTERNAL_SERVER_ERROR).json({
    status: response.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
    message: response.message,
    data: null,
    errors: response.errors,
  });
}

export const responseOk = (res ,response,) => {
  return res.status(response.status).json({
    ...response,
    status: response.status == HttpStatus.OK ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR
  });
}

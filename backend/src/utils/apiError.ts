import { ErrorCodes, ErrorCodeKey } from './ErrorCodes.js';

export class ApiError extends Error {
  statusCode: number;
  errorCode: number;
  isOperational: boolean;
  data?: any;

  constructor(
    statusCode: number,
    message: string,
    errorCode?: number,
    isOperational = true,
    data?: any,
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || ErrorCodes.INTERNAL_SERVER_ERROR.code;
    this.isOperational = isOperational;
    this.data = data;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, errorCode?: number, data?: any) {
    return new ApiError(400, message, errorCode || ErrorCodes.INVALID_INPUT.code, true, data);
  }

  static unauthorized(message?: string, errorCode?: number) {
    return new ApiError(
      401,
      message || ErrorCodes.UNAUTHORIZED.message,
      errorCode || ErrorCodes.UNAUTHORIZED.code
    );
  }

  static forbidden(message?: string, errorCode?: number) {
    return new ApiError(
      403,
      message || ErrorCodes.FORBIDDEN.message,
      errorCode || ErrorCodes.FORBIDDEN.code
    );
  }

  static notFound(message: string, errorCode?: number) {
    return new ApiError(
      404,
      message,
      errorCode || ErrorCodes.RESOURCE_NOT_FOUND.code
    );
  }

  static conflict(message: string, errorCode?: number) {
    return new ApiError(
      409,
      message,
      errorCode || ErrorCodes.RESOURCE_CONFLICT.code
    );
  }

  static validationError(message: string, data?: any) {
    return new ApiError(
      422,
      message,
      ErrorCodes.VALIDATION_ERROR.code,
      true,
      data
    );
  }

  static internal(message?: string, errorCode?: number) {
    return new ApiError(
      500,
      message || ErrorCodes.INTERNAL_SERVER_ERROR.message,
      errorCode || ErrorCodes.INTERNAL_SERVER_ERROR.code,
      false
    );
  }

  static fromErrorCode(errorCodeKey: ErrorCodeKey, statusCode = 400, data?: any) {
    const errorInfo = ErrorCodes[errorCodeKey];
    return new ApiError(statusCode, errorInfo.message, errorInfo.code, true, data);
  }
}

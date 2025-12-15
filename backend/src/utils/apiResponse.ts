import { Response } from 'express';

interface ApiResponseData {
  message?: string;
  data?: any;
  errors?: any;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    [key: string]: any;
  };
}

export class ApiResponse {
  static success(
    res: Response,
    data: any = null,
    message = 'Success',
    statusCode = 200
  ) {
    const response: ApiResponseData = {
      message,
    };

    if (data !== null) {
      // Handle paginated responses
      if (data && typeof data === 'object' && 'items' in data) {
        response.data = data.items;
        response.meta = {
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
        };
      } else {
        response.data = data;
      }
    }

    return res.status(statusCode).json(response);
  }

  static created(
    res: Response,
    data: any = null,
    message = 'Resource created successfully'
  ) {
    return ApiResponse.success(res, data, message, 201);
  }

  static updated(
    res: Response,
    data: any = null,
    message = 'Resource updated successfully'
  ) {
    return ApiResponse.success(res, data, message, 200);
  }

  static deleted(
    res: Response,
    message = 'Resource deleted successfully'
  ) {
    return ApiResponse.success(res, null, message, 200);
  }

  static error(
    res: Response,
    message = 'An error occurred',
    statusCode = 500,
    errors?: any,
    errorCode?: number
  ) {
    const response: any = {
      message,
      success: false,
    };

    if (errorCode) {
      response.errorCode = errorCode;
    }

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static paginated(
    res: Response,
    items: any[],
    page: number,
    pageSize: number,
    total: number,
    message = 'Success'
  ) {
    return res.status(200).json({
      message,
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }
}

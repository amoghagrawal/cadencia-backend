import { Request, Response, NextFunction } from 'express';

/**
 * Error response interface
 */
interface ErrorResponse {
  message: string;
  stack?: string;
  status: number;
}

/**
 * Custom error class with status code
 */
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
  }
}

/**
 * Handle 404 errors for routes that don't exist
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new ApiError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status = (err as ApiError).status || 500;
  
  const errorResponse: ErrorResponse = {
    message: err.message || 'Server Error',
    status
  };
  
  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  console.error(`[ERROR] ${err.message}`, err.stack);
  
  res.status(status).json(errorResponse);
}; 
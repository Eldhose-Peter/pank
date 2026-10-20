export class GroupError extends Error {
  constructor(message: string, public code: string = 'GROUP_ERROR', public statusCode: number = 400) {
    super(message);
    this.name = 'GroupError';
  }
}

export class NotFoundError extends GroupError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends GroupError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends GroupError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends GroupError {
  constructor(message: string, public errors?: unknown) {
    super(message, 'VALIDATION_ERROR', 422);
    this.name = 'ValidationError';
  }
}

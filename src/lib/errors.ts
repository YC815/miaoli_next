import { Prisma } from '@prisma/client';

export enum ErrorType {
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  UNKNOWN = 'UNKNOWN',
}

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  userMessage: string;
  statusCode: number;
  retryable: boolean;
  details?: unknown;
}

/**
 * Prisma 錯誤代碼對照
 * P1001: 無法連接到資料庫伺服器
 * P1002: 資料庫伺服器逾時
 * P1008: 操作逾時
 * P2002: 唯一性約束違反
 * P2025: 記錄未找到
 */
export function classifyError(error: unknown): ClassifiedError {
  // Prisma 連線錯誤
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P1001':
        return {
          type: ErrorType.DATABASE_CONNECTION,
          message: 'Cannot reach database server',
          userMessage: '無法連接到資料庫伺服器，請稍後再試',
          statusCode: 503,
          retryable: true,
          details: error.meta,
        };

      case 'P1002':
      case 'P1008':
        return {
          type: ErrorType.DATABASE_TIMEOUT,
          message: 'Database operation timeout',
          userMessage: '資料庫操作逾時，請稍後再試',
          statusCode: 504,
          retryable: true,
          details: error.meta,
        };

      case 'P2002':
        return {
          type: ErrorType.CONFLICT,
          message: 'Unique constraint violation',
          userMessage: '該資料已存在，請檢查後重試',
          statusCode: 409,
          retryable: false,
          details: error.meta,
        };

      case 'P2025':
        return {
          type: ErrorType.NOT_FOUND,
          message: 'Record not found',
          userMessage: '找不到指定的資料',
          statusCode: 404,
          retryable: false,
          details: error.meta,
        };

      default:
        return {
          type: ErrorType.UNKNOWN,
          message: error.message,
          userMessage: '操作失敗，請稍後再試',
          statusCode: 500,
          retryable: false,
          details: { code: error.code, meta: error.meta },
        };
    }
  }

  // Prisma 初始化錯誤
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      type: ErrorType.DATABASE_CONNECTION,
      message: 'Database initialization error',
      userMessage: '資料庫連線初始化失敗，請稍後再試',
      statusCode: 503,
      retryable: true,
      details: { errorCode: error.errorCode },
    };
  }

  // Prisma 驗證錯誤
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      type: ErrorType.VALIDATION,
      message: 'Validation error',
      userMessage: '資料驗證失敗，請檢查輸入內容',
      statusCode: 400,
      retryable: false,
    };
  }

  // 自訂驗證錯誤
  if (error instanceof Error && (error as Error & { code?: string }).code === 'VALIDATION_ERROR') {
    return {
      type: ErrorType.VALIDATION,
      message: error.message,
      userMessage: error.message,
      statusCode: 400,
      retryable: false,
    };
  }

  // 一般錯誤
  if (error instanceof Error) {
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      userMessage: '系統發生錯誤，請稍後再試',
      statusCode: 500,
      retryable: false,
    };
  }

  // 未知錯誤
  return {
    type: ErrorType.UNKNOWN,
    message: 'Unknown error',
    userMessage: '系統發生未知錯誤，請稍後再試',
    statusCode: 500,
    retryable: false,
  };
}

/**
 * 為 API route 建立統一的錯誤回應
 */
export function createErrorResponse(error: unknown) {
  const classified = classifyError(error);

  console.error(`[${classified.type}] ${classified.message}`, classified.details);

  return {
    error: classified.userMessage,
    type: classified.type,
    retryable: classified.retryable,
  };
}

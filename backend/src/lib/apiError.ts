export const ApiErrorCode = {
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  EMAIL_IN_USE: "EMAIL_IN_USE",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  CATEGORY_PERCENT_TOTAL_INVALID: "CATEGORY_PERCENT_TOTAL_INVALID",
  ITEM_PERCENT_TOTAL_INVALID: "ITEM_PERCENT_TOTAL_INVALID",
  FULLY_FUNDED_ITEM_HAS_ALLOCATION: "FULLY_FUNDED_ITEM_HAS_ALLOCATION",
  NEGATIVE_BALANCE: "NEGATIVE_BALANCE",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  PURCHASE_CASH_INVARIANT_FAILED: "PURCHASE_CASH_INVARIANT_FAILED",
  CANCEL_CASH_INVARIANT_FAILED: "CANCEL_CASH_INVARIANT_FAILED",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ApiErrorCodeValue =
  (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export class ApiError extends Error {
  status: number;
  code: ApiErrorCodeValue;
  details?: unknown;

  constructor(
    status: number,
    code: ApiErrorCodeValue,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function assertApi(
  condition: unknown,
  status: number,
  code: ApiErrorCodeValue,
  message: string,
  details?: unknown,
): asserts condition {
  if (!condition) {
    throw new ApiError(status, code, message, details);
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return new ApiError(
      409,
      ApiErrorCode.EMAIL_IN_USE,
      "A record with that unique value already exists.",
    );
  }

  console.error(error);
  return new ApiError(
    500,
    ApiErrorCode.DATABASE_ERROR,
    "Something went wrong while processing the request.",
  );
}

export function sendApiError(
  res: { status: (status: number) => { json: (body: unknown) => unknown } },
  error: unknown,
) {
  const apiError = toApiError(error);
  return res.status(apiError.status).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    },
  });
}

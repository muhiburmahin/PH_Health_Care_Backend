export type TErrorSources = {
  path: string;
  message: string;
};

export type TErrorResponse = {
  success: false;
  message: string;
  errorSources: TErrorSources[];
  statusCode?: number;
  error?: unknown;
  stack?: string;
};

export type TApiResponse<T> = {
  success: boolean;
  message?: string | null;
  data?: T | null;
  meta?: Record<string, unknown>;
};

export class OpenSlaqError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenSlaqError";
  }
}

export class OpenSlaqApiError extends OpenSlaqError {
  readonly status: number;
  readonly errorMessage: string;

  constructor(status: number, errorMessage: string) {
    super(`API error ${status}: ${errorMessage}`);
    this.name = "OpenSlaqApiError";
    this.status = status;
    this.errorMessage = errorMessage;
  }
}

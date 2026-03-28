/**
 * Structured error classes for the API.
 *
 * Throw these from route handlers or middleware instead of returning
 * `c.json({ error: "..." }, status)` directly. The global `onError`
 * handler in app.ts catches them and serializes a consistent
 * `{ error: string }` response.
 */

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// ── 400 ─────────────────────────────────────────────────────────────────

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

// ── 401 ─────────────────────────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

// ── 403 ─────────────────────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

// ── 404 ─────────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(404, `${resource} not found`);
  }
}

// ── 409 ─────────────────────────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

// ── 410 ─────────────────────────────────────────────────────────────────

export class GoneError extends AppError {
  constructor(message: string) {
    super(410, message);
  }
}

// ── 503 ─────────────────────────────────────────────────────────────────

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable") {
    super(503, message);
  }
}

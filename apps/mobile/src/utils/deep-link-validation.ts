const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/;
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSlug(value: string): boolean {
  return SLUG_RE.test(value);
}

export function isValidId(value: string): boolean {
  return UUID_V4_RE.test(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidInviteToken(token: unknown): token is string {
  if (!isNonEmptyString(token)) return false;
  const trimmed = token.trim();
  if (trimmed.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

export function createInviteLink(origin: string, token: string): string {
  const safeOrigin = isNonEmptyString(origin) ? origin.replace(/\/$/, "") : "";
  const encodedToken = encodeURIComponent(token);
  return `${safeOrigin}/invite?token=${encodedToken}`;
}

export function parseInviteTokenFromUrl(urlOrPath: string, fallbackOrigin = "http://localhost"): string | null {
  if (!isNonEmptyString(urlOrPath)) return null;

  let parsed: URL;
  try {
    parsed = new URL(urlOrPath);
  } catch {
    try {
      parsed = new URL(urlOrPath, fallbackOrigin);
    } catch {
      return null;
    }
  }

  const candidate = parsed.searchParams.get("token");
  return isValidInviteToken(candidate) ? candidate : null;
}

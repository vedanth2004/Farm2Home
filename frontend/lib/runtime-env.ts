function normalizeUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function ensureScheme(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getAppBaseUrl(): string {
  return (
    normalizeUrl(process.env.NEXTAUTH_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeUrl(ensureScheme(process.env.VERCEL_URL)) ??
    "http://localhost:3000"
  );
}


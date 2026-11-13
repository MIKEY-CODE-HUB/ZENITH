const localOrigins = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);

export function isClientOriginAllowed(origin: string | undefined) {
  if (!origin || localOrigins.has(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return [process.env.CLIENT_ORIGIN, ...(process.env.CLIENT_ORIGINS ?? '').split(',')]
    .some(configured => configured?.trim() === origin);
}

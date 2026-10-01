export type RuntimeCapability = { configured: boolean; reason?: string };
export type RuntimeCapabilities = {
  database: RuntimeCapability; googleOAuth: RuntimeCapability; canvaOAuth: RuntimeCapability;
  registerRead: RuntimeCapability; bridgeWrite: RuntimeCapability; photoDrive: RuntimeCapability;
  enrichment: RuntimeCapability; generation: RuntimeCapability; exportArchive: RuntimeCapability;
};
const has = (env: Record<string, string | undefined>, ...keys: string[]) => keys.every((key) => Boolean(env[key]?.trim()));
export function getRuntimeCapabilities(env: Record<string, string | undefined> = process.env): RuntimeCapabilities {
  const database = has(env, "DATABASE_URL");
  const encryption = has(env, "ENCRYPTION_KEY");
  const googleOAuth = has(env, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI") && encryption;
  const canvaOAuth = has(env, "CANVA_CLIENT_ID", "CANVA_CLIENT_SECRET", "CANVA_REDIRECT_URI") && encryption;
  const registerId = has(env, "GOOGLE_REGISTER_SPREADSHEET_ID");
  const bridgeId = has(env, "GOOGLE_BRIDGE_SPREADSHEET_ID");
  const photoFolder = has(env, "GOOGLE_PHOTO_FOLDER_ID");
  const canvaSource = has(env, "CANVA_MB01_SOURCE_DESIGN_ID");
  return {
    database: { configured: database, reason: database ? undefined : "DATABASE_URL belum tersedia" },
    googleOAuth: { configured: googleOAuth, reason: googleOAuth ? undefined : "Google OAuth atau ENCRYPTION_KEY belum lengkap" },
    canvaOAuth: { configured: canvaOAuth, reason: canvaOAuth ? undefined : "Canva OAuth atau ENCRYPTION_KEY belum lengkap" },
    registerRead: { configured: database && googleOAuth && registerId, reason: database && googleOAuth && registerId ? undefined : "Neon, OAuth Google, atau ID Register belum siap" },
    bridgeWrite: { configured: database && googleOAuth && bridgeId, reason: database && googleOAuth && bridgeId ? undefined : "Neon, OAuth Google, atau ID Content Bridge belum siap" },
    photoDrive: { configured: database && googleOAuth && photoFolder, reason: database && googleOAuth && photoFolder ? undefined : "Neon, OAuth Google, atau folder foto belum siap" },
    enrichment: { configured: database && googleOAuth && registerId && bridgeId, reason: database && googleOAuth && registerId && bridgeId ? undefined : "Neon, Register, dan Bridge harus sehat" },
    generation: { configured: database && canvaOAuth && canvaSource, reason: database && canvaOAuth && canvaSource ? undefined : "Neon, Canva OAuth, dan template MB-01 harus sehat" },
    exportArchive: { configured: database && googleOAuth && photoFolder, reason: database && googleOAuth && photoFolder ? undefined : "Neon dan Google Drive harus sehat" },
  };
}

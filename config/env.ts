// ============================================================
// YUMI — Typed Environment Variables
// ============================================================

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing required env var: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  // Supabase
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: optionalEnv('SUPABASE_SERVICE_ROLE_KEY'),

  // Google Maps
  googleMapsKey: requireEnv('NEXT_PUBLIC_GOOGLE_MAPS_KEY'),

  // WhatsApp
  whatsappPhoneNumberId: optionalEnv('WHATSAPP_PHONE_NUMBER_ID'),
  whatsappAccessToken: optionalEnv('WHATSAPP_ACCESS_TOKEN'),
  whatsappWabaId: optionalEnv('WHATSAPP_WABA_ID'),
  whatsappVerifyToken: optionalEnv('WHATSAPP_VERIFY_TOKEN'),
  whatsappWebhookUrl: optionalEnv('WHATSAPP_WEBHOOK_URL'),
  whatsappPublicLink: optionalEnv('WHATSAPP_PUBLIC_LINK', 'https://wa.me/51953211536'),

  // DeepSeek
  deepseekApiKey: optionalEnv('DEEPSEEK_API_KEY'),
  deepseekModel: optionalEnv('DEEPSEEK_MODEL', 'deepseek-chat'),
  deepseekApiUrl: optionalEnv('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1/chat/completions'),

  // Chatwoot
  chatwootUrl: optionalEnv('CHATWOOT_URL'),
  chatwootApiToken: optionalEnv('CHATWOOT_API_TOKEN'),
  chatwootInboxId: optionalEnv('CHATWOOT_INBOX_ID'),
  chatwootAccountId: optionalEnv('CHATWOOT_ACCOUNT_ID'),

  // Domain
  domain: optionalEnv('NEXT_PUBLIC_DOMAIN', 'yumi.pe'),
  appUrl: optionalEnv('NEXT_PUBLIC_APP_URL', 'https://yumi.pe'),
  brainUrl: optionalEnv('NEXT_PUBLIC_BRAIN_URL', 'https://brain.yumi.pe'),

  // Business
  currency: optionalEnv('NEXT_PUBLIC_CURRENCY', 'PEN'),
  currencySymbol: optionalEnv('NEXT_PUBLIC_CURRENCY_SYMBOL', 'S/'),
  countryCode: optionalEnv('NEXT_PUBLIC_COUNTRY_CODE', 'PE'),
  phonePrefix: optionalEnv('NEXT_PUBLIC_PHONE_PREFIX', '+51'),
  timezone: optionalEnv('NEXT_PUBLIC_TIMEZONE', 'America/Lima'),
  defaultCitySlug: optionalEnv('NEXT_PUBLIC_DEFAULT_CITY_SLUG', 'jaen'),
} as const;

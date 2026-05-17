export function getMakeWebhookConfig(): { url: string; apiKey: string } | null {
  const url = process.env.MAKE_WEBHOOK_URL?.trim();
  const apiKey = process.env.MAKE_API_KEY?.trim();
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

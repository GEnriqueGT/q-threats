import { getMakeWebhookConfig } from './config';
import { mapLegislationToAnalysis } from './mapLegislationToAnalysis';
import { parseMakeWebhookJson } from './repairMakeWebhookJson';
import type { MakeWebhookResponse } from './types';
import type { ThreatAnalysis } from '@/lib/types';

export class MakeFetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'MakeFetchError';
  }
}

export async function fetchLegislationFromMake(id: string): Promise<ThreatAnalysis> {
  const config = getMakeWebhookConfig();
  if (!config) {
    throw new MakeFetchError(
      'Configura MAKE_WEBHOOK_URL y MAKE_API_KEY en las variables de entorno.',
      503,
    );
  }

  const trimmed = id.trim();
  if (!trimmed) {
    throw new MakeFetchError('Indica un ID de iniciativa o decreto.', 400);
  }

  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-make-apikey': config.apiKey,
    },
    body: JSON.stringify({ iniciativa_id: trimmed }),
    cache: 'no-store',
  });

  const text = await res.text();
  let json: MakeWebhookResponse;
  try {
    json = text ? parseMakeWebhookJson<MakeWebhookResponse>(text) : {};
  } catch {
    throw new MakeFetchError(
      'Respuesta inválida del webhook de Make (JSON mal formado).',
      502,
    );
  }

  if (!res.ok) {
    throw new MakeFetchError(
      json.message ?? json.error ?? `Error del webhook (${res.status})`,
      res.status,
    );
  }

  if (!json.ok || !json.data) {
    throw new MakeFetchError(
      json.message ?? json.error ?? 'No se encontró análisis para este ID.',
      404,
    );
  }

  return mapLegislationToAnalysis(json.data, trimmed);
}

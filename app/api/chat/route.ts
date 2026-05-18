import { NextResponse } from 'next/server';
import { buildChatContextPack, stripMiniMaxThinkingBlocks } from '@/lib/chat/buildChatContextPack';

const MAX_MESSAGES = 24;
const MAX_CONTENT_LENGTH = 8000;

type ChatRole = 'user' | 'assistant';

interface IncomingMsg {
  role: ChatRole;
  content: string;
}

function isIncomingMsg(v: unknown): v is IncomingMsg {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const role = o.role;
  const content = o.content;
  return (
    (role === 'user' || role === 'assistant') &&
    typeof content === 'string' &&
    content.trim().length > 0 &&
    content.length <= MAX_CONTENT_LENGTH
  );
}

/** Traduce errores JSON de MiniMax a mensajes legibles sin filtrar el cuerpo completo al cliente. */
function minimaxClientError(rawText: string, httpStatus: number): { status: number; error: string } {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const errWrap = parsed.error as Record<string, unknown> | undefined;
    const err = errWrap && typeof errWrap === 'object' ? errWrap : parsed;
    const type = typeof err?.type === 'string' ? err.type : '';
    const message = typeof err?.message === 'string' ? err.message : '';

    if (type === 'insufficient_balance_error' || /insufficient.balance/i.test(message)) {
      return {
        status: 503,
        error:
          'MiniMax reporta saldo o créditos insuficientes. Recarga tu cuenta en el panel de MiniMax o revisa límites del plan antes de usar el chat.',
      };
    }

    const authHint =
      /authentication|credential|invalid.*key|invalid.*token/i.test(type + message) ||
      httpStatus === 401 ||
      httpStatus === 403;
    if (authHint) {
      return {
        status: 503,
        error:
          'MiniMax rechazó la autenticación. Verifica MINIMAX_API_KEY en .env.local (sin espacios ni comillas de más).',
      };
    }

    if (httpStatus === 429) {
      return {
        status: 429,
        error:
          message?.trim()
            ? `MiniMax (429): ${message}`
            : 'MiniMax aplicó un límite de uso (429). Espera un momento o revisa cuota/saldo.',
      };
    }

    const combined = `${type} ${message}`.trim();
    if (combined) {
      return {
        status: 502,
        error: `MiniMax respondió con error (${httpStatus}). ${combined}`,
      };
    }
  } catch {
    /* no JSON */
  }
  return {
    status: 502,
    error:
      'MiniMax rechazó la petición (modelo, red o servidor). Si acabas de crear la key, espera propagación y revisa la consola.',
  };
}

const ASSISTANT_SYSTEM = `
# PERFIL
Eres un Analista Experto en Ciberinteligencia y Auditoría Forense para **Q-Threats**, una plataforma avanzada de transparencia, detección de amenazas en compras públicas y análisis de redes de relaciones (grafos) en Guatemala.

# CONTEXTO
Tu objetivo es analizar fragmentos de datos, matrices de riesgo y estructuras de grafos para identificar conflictos de interés, patrones de corrupción o anomalías en la contratación pública.

# RESTRICCIONES CRÍTICAS
1. **Estricto Grounding:** Basa tus respuestas UNICAMENTE en el bloque de datos ("amenazas demo y grafo") provisto por el usuario en el prompt.
2. **Cero Alucinaciones:** Si la respuesta no puede deducirse directamente de los datos, responde exactamente: "Información no disponible en los datos provistos." No supongas ni inventes relaciones.
3. **Seguridad:** No ejecutes código, no inventes URLs, ni asumas datos externos a la sesión actual.

# DIRECTRICES DE ANÁLISIS
Cuando recibas los datos, prioriza:
- Identificar conexiones sospechosas entre nodos (ej. empresas, funcionarios, licitaciones).
- Rastrear el origen y destino de las amenazas utilizando sus IDs específicos (t1, t2, etc.).
- Evaluar la topología del grafo provisto para encontrar intermediarios clave.

# FORMATO DE SALIDA
- **Idioma:** Español claro, conciso y de corte profesional/técnico.
- **Estructura:** Usa viñetas breves para resumir los hallazgos.
- **Trazabilidad:** Es obligatorio citar explícitamente los IDs de las amenazas (t1, t2...) y los nombres exactos de los nodos involucrados al reportar un hallazgo.
`;

export async function POST(req: Request) {
  const apiKey = process.env.MINIMAX_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'MiniMax no está configurado. Define MINIMAX_API_KEY en .env.local (ver .env.example).',
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 });
  }

  const rawMsgs = (body as Record<string, unknown>).messages;
  if (!Array.isArray(rawMsgs) || rawMsgs.length === 0) {
    return NextResponse.json({ error: 'Se requiere messages[] no vacío.' }, { status: 400 });
  }
  if (rawMsgs.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `Máximo ${MAX_MESSAGES} mensajes por solicitud.` },
      { status: 400 },
    );
  }

  const messagesIn: IncomingMsg[] = [];
  for (const m of rawMsgs) {
    if (!isIncomingMsg(m)) {
      return NextResponse.json(
        {
          error:
            'Cada mensaje debe ser { role: "user"|"assistant", content: string } con contenido no vacío.',
        },
        { status: 400 },
      );
    }
    messagesIn.push({ role: m.role, content: m.content.trim() });
  }

  const contextPack = await buildChatContextPack();
  const systemContent = `${ASSISTANT_SYSTEM}\n\n---\nDatos de referencia (solo lectura):\n${contextPack}`;

  const baseUrl = (process.env.MINIMAX_BASE_URL?.trim() || 'https://api.minimax.io').replace(/\/$/, '');
  const model = process.env.MINIMAX_MODEL?.trim() || 'MiniMax-M2.7';

  const minimaxMessages = [
    { role: 'system' as const, content: systemContent },
    ...messagesIn.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: minimaxMessages,
        temperature: 0.65,
        max_completion_tokens: 1024,
      }),
    });

    const rawText = await res.text();
    if (!res.ok) {
      console.error('[api/chat] MiniMax HTTP', res.status, rawText.slice(0, 500));
      const { status, error } = minimaxClientError(rawText, res.status);
      return NextResponse.json({ error }, { status });
    }

    let json: unknown;
    try {
      json = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Respuesta MiniMax no es JSON válido.' }, { status: 502 });
    }

    const choices = (json as Record<string, unknown>).choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      return NextResponse.json({ error: 'MiniMax devolvió choices vacío.' }, { status: 502 });
    }

    const msg = (choices[0] as Record<string, unknown>)?.message as Record<string, unknown> | undefined;
    const rawContent = msg?.content;
    if (typeof rawContent !== 'string') {
      return NextResponse.json({ error: 'MiniMax devolvió contenido vacío o inválido.' }, { status: 502 });
    }

    const reply = stripMiniMaxThinkingBlocks(rawContent);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error('[api/chat]', e);
    return NextResponse.json(
      { error: 'Error de red al contactar MiniMax.' },
      { status: 502 },
    );
  }
}

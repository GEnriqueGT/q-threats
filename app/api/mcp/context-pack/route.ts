import { NextResponse } from 'next/server';
import { buildChatContextPack } from '@/lib/chat/buildChatContextPack';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Texto del paquete de contexto del chat; mismo backend que Neo4j/demo consolidado. */
export async function GET() {
  try {
    const text = await buildChatContextPack();
    return NextResponse.json({ text });
  } catch (e) {
    console.error('[api/mcp/context-pack]', e);
    const message = e instanceof Error ? e.message : 'Error al generar context pack';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

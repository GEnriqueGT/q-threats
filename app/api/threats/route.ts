import { NextResponse } from 'next/server';
import { threats } from '@/lib/data';

export async function GET() {
  return NextResponse.json({ data: threats });
}

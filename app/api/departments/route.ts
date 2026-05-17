import { NextResponse } from 'next/server';
import { departments } from '@/lib/data';

export async function GET() {
  return NextResponse.json({ data: departments });
}

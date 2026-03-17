import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versions: {
      framework: '1.0.0'
    },
    dbSource: 'integrated'
  });
}

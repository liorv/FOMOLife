import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';

export async function GET() {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasKey = !!process.env.GROQ_API_KEY;
  const providerType = (process.env.LLM_PROVIDER || '').toLowerCase();
  const isMock = !hasKey && providerType !== 'groq';

  if (isMock) {
    return NextResponse.json({
      available: false,
      provider: 'Mock (not connected)',
      message: 'AI assistant is not configured. Contact the administrator to set up the GROQ_API_KEY.',
    });
  }

  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  const modelLabel = model.replace(/-instant$/, '').replace(/-/g, ' ');
  return NextResponse.json({ available: true, provider: `Groq · ${modelLabel}`, message: '' });
}

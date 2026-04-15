import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { LLMFactory } from '@/lib/llm/factory';

function sanitizeInput(input: string, maxLength: number): string {
  if (!input) return '';
  let sanitized = String(input).slice(0, maxLength);
  sanitized = sanitized.replace(/<[^>]*>?/gm, '');
  sanitized = sanitized.replace(/```/g, '');
  return sanitized.trim();
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { message, project, history, jsonMode } = body;

    const userMessage = sanitizeInput(String(message || ''), 600);
    const context = sanitizeInput(JSON.stringify(project || {}), 4000);
    // Limit history to the last 6 turns to stay under TPM limits
    const trimmedHistory = Array.isArray(history) ? history.slice(-6) : [];

    if (!userMessage) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    const provider = LLMFactory.getProvider();
    const chatResp = await provider.generateChat({ message: userMessage, context, history: trimmedHistory, jsonMode: !!jsonMode });
    return NextResponse.json(chatResp);
  } catch (err: any) {
    console.error('AI chat error:', err);
    return NextResponse.json({ error: err?.message ?? 'LLM error' }, { status: 500 });
  }
}

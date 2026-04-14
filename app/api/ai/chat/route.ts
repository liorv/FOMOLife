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
    const { message, project, history } = body;

    const userMessage = sanitizeInput(String(message || ''), 800);
    const context = sanitizeInput(JSON.stringify(project || {}), 2000);

    if (!userMessage) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    const provider = LLMFactory.getProvider();

    // Simple intent heuristic: if message looks conversational, use generateChat
    const lower = userMessage.toLowerCase();
    const projectIntentKeywords = ['add', 'create', 'rename', 'delete', 'remove', 'update', 'move', 'subproject', 'task', 'project'];
    const isProjectIntent = projectIntentKeywords.some(k => lower.includes(k));

    if (!isProjectIntent) {
      // Treat as conversational question
      const chatResp = await provider.generateChat({ message: userMessage, context, history });
      return NextResponse.json(chatResp);
    }

    // For project-intent messages, ask provider for a set of actionable options via chat
    const projectChat = await provider.generateChat({ message: userMessage, context, history });
    return NextResponse.json(projectChat);
  } catch (err: any) {
    console.error('AI chat error:', err);
    return NextResponse.json({ error: err?.message ?? 'LLM error' }, { status: 500 });
  }
}

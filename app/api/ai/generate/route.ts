import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { LLMFactory } from '@/lib/llm/factory';

function sanitizeInput(input: string, maxLength: number): string {
  if (!input) return '';
  // 1. Truncate to prevent buffer/length-based attacks
  let sanitized = String(input).slice(0, maxLength);
  // 2. Strip obvious HTML/Script tags
  sanitized = sanitized.replace(/<[^>]*>?/gm, '');
  // 3. Strip Markdown code block boundaries that might try to break out of JSON/Prompt
  sanitized = sanitized.replace(/```/g, '');
  return sanitized.trim();
}

function isPromptInjection(input: string): boolean {
  if (!input) return false;
  const normalized = String(input).toLowerCase();
  
  const blockedPhrases = [
    'ignore previous',
    'ignore all previous',
    'disregard previous',
    'forget previous',
    'forget all previous',
    'system prompt',
    'system message',
    'you are now',
    'act as',
    'developer mode',
    'print your instructions',
    'bypass'
  ];

  return blockedPhrases.some(phrase => normalized.includes(phrase));
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    let { goal, targetDate, complexity, context, existingSubprojects, isForExistingProject } = body;

    // 1. Validate Prompt Injection keywords
    if (isPromptInjection(goal) || isPromptInjection(context)) {
      return NextResponse.json({ error: 'Invalid input: potentially unsafe content detected.' }, { status: 400 });
    }

    // 2. Sanitize and enforce length constraints
    goal = sanitizeInput(goal, 300); // Strict length limit for the primary goal
    context = sanitizeInput(context, 1000); // Longer allowed for context, but still capped

    // 3. Validate Complexity against Allowed Enum
    const allowedComplexities = ['Simple', 'Standard', 'Detailed'];
    if (!allowedComplexities.includes(complexity)) {
      complexity = 'Standard'; // Fallback to safe default
    }

    // Check if empty after sanitization
    if (!goal) {
      return NextResponse.json({ error: 'Project goal is required and must contain valid text.' }, { status: 400 });
    }
    console.log('LLM_PROVIDER inside route:', process.env.LLM_PROVIDER);
        const llmProvider = LLMFactory.getProvider();
    
    const payload = await llmProvider.generateBlueprint({
      goal, targetDate, complexity, context, existingSubprojects, isForExistingProject
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('AI generate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate blueprint' }, { status: 500 });
  }
}

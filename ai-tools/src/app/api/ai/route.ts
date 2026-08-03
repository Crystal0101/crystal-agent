import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MAX_BODY_BYTES = 128 * 1024;
const MAX_TOKENS = 4096;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

type Message = { role: 'user' | 'assistant'; content: string };
type RequestBody = {
  system?: string;
  messages: Message[];
  maxTokens?: number;
  stream?: boolean;
};

const requests = new Map<string, { count: number; resetAt: number }>();

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(req: NextRequest): boolean {
  const now = Date.now();
  const key = clientIp(req);
  const entry = requests.get(key);
  if (!entry || now >= entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function parseBody(value: unknown): RequestBody | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 50) {
    return null;
  }
  const messages: Message[] = [];
  for (const item of body.messages) {
    if (!item || typeof item !== 'object') return null;
    const message = item as Record<string, unknown>;
    if ((message.role !== 'user' && message.role !== 'assistant') ||
        typeof message.content !== 'string' || message.content.length > 20_000) {
      return null;
    }
    messages.push({ role: message.role, content: message.content });
  }
  if (body.system !== undefined && (typeof body.system !== 'string' || body.system.length > 20_000)) {
    return null;
  }
  const maxTokens = body.maxTokens === undefined ? 2000 : body.maxTokens;
  if (!Number.isInteger(maxTokens) || Number(maxTokens) < 1 || Number(maxTokens) > MAX_TOKENS) {
    return null;
  }
  return {
    system: body.system as string | undefined,
    messages,
    maxTokens: Number(maxTokens),
    stream: body.stream === true,
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return error('AI service is not configured', 503);
  if (Number(req.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return error('Request body is too large', 413);
  }
  if (isRateLimited(req)) return error('Too many requests', 429);

  let body: RequestBody | null;
  try {
    body = parseBody(await req.json());
  } catch {
    return error('Invalid JSON body', 400);
  }
  if (!body) return error('Invalid request body', 400);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const request = {
    model: MODEL,
    max_tokens: body.maxTokens!,
    system: body.system,
    messages: body.messages,
  };

  try {
    if (body.stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const stream = await client.messages.stream(request);
            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (cause) {
            console.error('Anthropic streaming request failed', cause);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI request failed' })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const response = await client.messages.create(request);
    const text = response.content.find((block) => block.type === 'text');
    return NextResponse.json({ text: text?.type === 'text' ? text.text : '' });
  } catch (cause) {
    console.error('Anthropic request failed', cause);
    return error('AI request failed', 502);
  }
}

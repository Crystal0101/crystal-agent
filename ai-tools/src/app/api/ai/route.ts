import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { system, messages, maxTokens = 2000, stream: useStream = false } = await req.json();

    if (useStream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const stream = await client.messages.stream({
              model: 'claude-sonnet-4-6',
              max_tokens: maxTokens,
              system,
              messages,
            });
            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (e) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });
      return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

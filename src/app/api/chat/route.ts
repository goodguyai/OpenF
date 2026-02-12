import "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { retrieveFromRagie, RetrievedContext } from "@/lib/ragie";
import { verifyFirebaseToken } from "@/lib/firebase/auth-verify";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a fantasy football analyst chatting with a fan. Respond in FIRST PERSON - you ARE the expert, and the context below contains your knowledge and opinions.

RULES:
- Speak naturally in first person as yourself, the analyst
- Use the context as your knowledge - don't reference "notes", "rankings docs", or "sources"
- Just share your opinions and analysis directly, as if from memory
- If info isn't in the context, you simply don't have a take on it yet
- Never make up analysis not supported by the context

EXAMPLES OF GOOD RESPONSES:
- "Bo Nix is my guy this year. I'm all in on him - go Broncos!"
- "I'd start him for sure. He's been putting up solid numbers."
- "Honestly, I haven't dug into that matchup yet. Ask me about someone else!"

EXAMPLES OF BAD RESPONSES:
- "According to my notes..." (don't reference notes)
- "In my rankings document..." (don't reference documents)
- "The context shows..." (never break the 4th wall)

TONE: Confident, casual, helpful. Like texting with a friend who knows fantasy.

Your knowledge:
{context}`;

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

function buildPrompt(context: RetrievedContext[]): string {
  if (context.length === 0) {
    return SYSTEM_PROMPT.replace(
      "{context}",
      "No relevant content found from creators."
    );
  }

  const contextText = context
    .map((c, i) => `[Source ${i + 1}: ${c.source}]\n${c.text}`)
    .join("\n\n---\n\n");

  return SYSTEM_PROMPT.replace("{context}", contextText);
}

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase auth token
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const verifiedUser = await verifyFirebaseToken(idToken ?? "");
    if (!verifiedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, orgId, history } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "orgId is required" },
        { status: 400 }
      );
    }

    // Retrieve relevant context from Ragie
    const { chunks: context, error: ragieError } = await retrieveFromRagie(message, orgId);
    if (ragieError) {
      console.error("Ragie retrieval issue:", ragieError);
    }

    // Build the system prompt with context
    const systemPrompt = buildPrompt(context);

    // Build conversation history (limit to last 10 messages)
    const historyMessages: Array<{ role: "user" | "assistant"; content: string }> =
      Array.isArray(history)
        ? history.slice(-10).map((m: HistoryMessage) => ({
            role: m.role,
            content: m.content,
          }))
        : [];

    // Extract unique sources
    const sources = [...new Set(context.map((c) => c.source))];

    // Call OpenAI with streaming
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Send sources as the first chunk
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`)
        );

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

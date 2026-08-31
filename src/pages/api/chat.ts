import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { z } from 'astro:content';


const chatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string().max(1000)
  })).max(10).optional().default([])
});

const getSystemPrompt = (data: any) => `You are a helpful AI assistant representing ${data.basics.name} on their portfolio website.
Answer questions based ONLY on the provided portfolio data.
Do not invent experience, skills, projects, employers, or other portfolio information.
If the information is not available in the portfolio data, state clearly that you don't have that information.
Here is the portfolio data: ${JSON.stringify(data)}`;


// Simple in-memory rate limiting (Note: in serverless/edge environments, this is per-isolate)
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userRecord = rateLimitMap.get(ip);
  if (!userRecord) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (now - userRecord.timestamp > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (userRecord.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  userRecord.count++;
  return true;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown-ip';
    if (!checkRateLimit(ip)) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { status: 429 });
    }

    const resumeData = await getEntry('resume', 'me');
    const data = resumeData?.data;
    if (!data) throw new Error("Portfolio data not found");

    const env = locals.runtime.env;
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), { status: 500 });
    }

    // 2. Parse and validate request body
    const bodyText = await request.text();
    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400 });
    }

    const parseResult = chatRequestSchema.safeParse(payload);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: "Invalid request payload", details: parseResult.error.format() }), { status: 400 });
    }

    const { message: userMessage, history } = parseResult.data;

    // Map history to Gemini format
    const contents = [];

    // Always start with the system prompt context
    contents.push({
      role: 'user',
      parts: [{ text: getSystemPrompt(data) }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: `Understood. I will answer based on ${data.basics.name}'s portfolio context.` }]
    });

    for (const msg of history) {
        contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    // 4. Call Gemini REST API

    const model = env.GEMINI_MODEL || 'gemini-1.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contents })
    });

    if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini API error:", errorText);
        return new Response(JSON.stringify({ error: "Failed to communicate with AI provider." }), { status: 500 });
    }

    const geminiData = await geminiResponse.json();

    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";

    // 5. Return JSON response
    return new Response(JSON.stringify({ reply: replyText }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};

import type { APIRoute } from 'astro';

const SYSTEM_PROMPT = `You are a helpful AI assistant representing Alex in his portfolio website. Answer questions based only on his experience and tech stack.`;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Get GEMINI_API_KEY from locals
    // Depending on Astro Cloudflare adapter version, it might be in locals.runtime.env or locals.env
    const env = (locals as any).runtime?.env || (locals as any).env || import.meta.env;
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), { status: 500 });
    }

    // 2. Parse request body
    const bodyText = await request.text();
    const payload = JSON.parse(bodyText);
    const userMessage = payload.message || '';

    if (userMessage.length > 500) {
      return new Response(JSON.stringify({ error: "Payload too large. Max 500 characters." }), { status: 400 });
    }
    let history = payload.history || [];

    if (!userMessage) {
        return new Response(JSON.stringify({ error: "Message is required." }), { status: 400 });
    }

    // 3. Truncate history to the last 5 turns (each turn is a user/model pair or similar)
    // Actually, just limit the history array to the last 10 elements (5 turns)
    if (history.length > 10) {
        history = history.slice(-10);
    }

    // Map history to Gemini format
    const contents = [];

    // Always start with the system prompt context
    contents.push({
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: "Understood. I will answer based on Alex's portfolio context." }]
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
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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

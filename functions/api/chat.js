
export async function onRequestPost({ request, env }) {
  try {
    const { message, history = [] } = await request.json();

    if (typeof message !== "string" || !message.trim()) {
      return Response.json({ error: "Message is required." }, { status: 400 });
    }

    if (message.length > 1000) {
      return Response.json({ error: "Message is too long." }, { status: 400 });
    }

    if (!env.GEMINI_API_KEY) {
      return Response.json({ error: "AI service is not configured yet." }, { status: 503 });
    }

    const contents = [
      ...history.slice(-8).map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: String(item.content).slice(0, 1000) }]
      })),
      { role: "user", parts: [{ text: message.trim() }] }
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are the Northstar Digital website assistant. Northstar Digital offers premium website design and redesign services to businesses across industries. Explain services, process, and website features clearly. Help visitors decide whether to enquire. Never invent prices, clients, testimonials, awards, guarantees, staff, offices, or completed projects. If asked for a quote, direct them to the contact form or team.northstar.digital@gmail.com. Be professional, concise, and helpful."
            }]
          },
          contents,
          generationConfig: { maxOutputTokens: 500, temperature: 0.6 }
        })
      }
    );

    if (!response.ok) {
      return Response.json({ error: "AI service temporarily unavailable." }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "").join("").trim();

    if (!reply) {
      return Response.json({ error: "No response received." }, { status: 502 });
    }

    return Response.json({ reply });
  } catch {
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}

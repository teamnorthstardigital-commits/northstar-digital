
export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  try {
    if (!env.GEMINI_API_KEY) {
      return Response.json(
        { error: "AI assistant is not configured yet." },
        { status: 503, headers }
      );
    }

    const body = await request.json();
    const message = String(body.message || "").trim();

    if (!message || message.length > 2000) {
      return Response.json(
        { error: "Please enter a message under 2,000 characters." },
        { status: 400, headers }
      );
    }

    // Keep only a short, validated conversation history.
    const history = Array.isArray(body.history)
      ? body.history.slice(-10)
      : [];

    const contents = [];

    for (const item of history) {
      if (!item || typeof item !== "object") continue;

      const role =
        item.role === "assistant" || item.role === "model"
          ? "model"
          : item.role === "user"
          ? "user"
          : null;

      const content = String(item.content || item.text || "").trim();

      if (role && content && content.length <= 2000) {
        contents.push({
          role,
          parts: [{ text: content }]
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const model = env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                "You are the Northstar Digital AI Assistant. " +
                "Northstar Digital offers website design, website redesign, " +
                "AI assistant integration, and digital strategy for businesses " +
                "across industries. Be professional, helpful, concise, and " +
                "welcoming. Ask useful questions about a visitor's website needs. " +
                "Do not invent clients, testimonials, awards, prices, guarantees, " +
                "or completed projects. If someone wants a quote or consultation, " +
                "direct them to team.northstar.digital@gmail.com or the website's " +
                "contact form. Never claim that you have booked or sent anything."
            }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 700
          }
        })
      }
    );

    if (!response.ok) {
      return Response.json(
        { error: "The AI assistant is temporarily unavailable." },
        { status: 502, headers }
      );
    }

    const data = await response.json();

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return Response.json(
        { error: "I couldn't generate a reply. Please try again." },
        { status: 502, headers }
      );
    }

    return Response.json({ reply }, { headers });

  } catch (error) {
    return Response.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500, headers }
    );
  }
}

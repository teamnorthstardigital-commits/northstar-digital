
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

export async function onRequestPost({ request, env }) {
  try {
    const { name, email, service, description, website } =
      await request.json();

    if (website) {
      return Response.json({ success: true });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof service !== "string" ||
      typeof description !== "string"
    ) {
      return Response.json({ error: "Please complete all fields." }, { status: 400 });
    }

    const clean = {
      name: name.trim().slice(0, 100),
      email: email.trim().slice(0, 254),
      service: service.trim().slice(0, 100),
      description: description.trim().slice(0, 3000)
    };

    if (
      !clean.name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email) ||
      !clean.service ||
      !clean.description
    ) {
      return Response.json({ error: "Please enter valid details." }, { status: 400 });
    }

    if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
      return Response.json({ error: "Email service is not configured yet." }, { status: 503 });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: ["team.northstar.digital@gmail.com"],
        reply_to: clean.email,
        subject: `New Northstar Digital enquiry — ${clean.service}`,
        html: `
          <h2>New website enquiry</h2>
          <p><strong>Name:</strong> ${escapeHTML(clean.name)}</p>
          <p><strong>Email:</strong> ${escapeHTML(clean.email)}</p>
          <p><strong>Service:</strong> ${escapeHTML(clean.service)}</p>
          <p><strong>Project details:</strong></p>
          <p>${escapeHTML(clean.description).replace(/\n/g, "<br>")}</p>
        `
      })
    });

    if (!emailResponse.ok) {
      return Response.json({ error: "Email could not be sent. Please try again." }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

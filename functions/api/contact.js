
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
      return Response.json(
        { error: "The contact service is not configured yet." },
        { status: 503, headers }
      );
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const service = String(body.service || "Not specified").trim();
    const details = String(body.details || "").trim();

    if (!name || name.length > 100) {
      return Response.json(
        { error: "Please enter a valid name." },
        { status: 400, headers }
      );
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400, headers }
      );
    }

    if (!details || details.length > 5000) {
      return Response.json(
        { error: "Please describe your project (up to 5,000 characters)." },
        { status: 400, headers }
      );
    }

    const safeName = escapeHTML(name);
    const safeEmail = escapeHTML(email);
    const safeService = escapeHTML(service.slice(0, 150));
    const safeDetails = escapeHTML(details);

    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.RESEND_FROM,
          to: ["team.northstar.digital@gmail.com"],
          reply_to: email,
          subject: `New Northstar Digital enquiry from ${name}`,
          html: `
            <h2>New Website Enquiry</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Service:</strong> ${safeService}</p>
            <p><strong>Project details:</strong></p>
            <p>${safeDetails.replace(/\n/g, "<br>")}</p>
          `,
          text:
            `New Northstar Digital enquiry\n\n` +
            `Name: ${name}\n` +
            `Email: ${email}\n` +
            `Service: ${service}\n\n` +
            `Project details:\n${details}`
        })
      }
    );

    if (!emailResponse.ok) {
      return Response.json(
        { error: "Your message could not be sent. Please try again later." },
        { status: 502, headers }
      );
    }

    return Response.json(
      { success: true, message: "Your enquiry has been sent successfully." },
      { headers }
    );

  } catch (error) {
    return Response.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500, headers }
    );
  }
}

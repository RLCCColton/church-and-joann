function normalizeName(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendWinnerEmail(name) {
  try {
    if (process.env.SKIP_EMAIL === "1") {
      console.log(`SKIP_EMAIL=1, not sending email for winner: ${name}`);
      return false;
    }

    const { RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_TO_EMAIL } = process.env;

    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || !RESEND_TO_EMAIL) {
      console.warn("Resend env vars are missing. Winner was recorded without email.");
      return false;
    }

    const payload = {
      from: RESEND_FROM_EMAIL,
      to: [RESEND_TO_EMAIL],
      subject: "Chuck & Jo Ann cheesecake winner",
      html: `
        <div style="font-family: Georgia, serif; line-height: 1.6;">
          <h1 style="margin-bottom: 12px;">Cheesecake claimed</h1>
          <p><strong>${escapeHtml(name)}</strong> submitted the form and won the cheesecake.</p>
        </div>
      `,
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend email failed:", errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email send failed", error);
    return false;
  }
}

module.exports = {
  normalizeName,
  sendWinnerEmail,
};

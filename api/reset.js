const { resetWinner } = require("./_lib/winner-store");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const token = typeof request.body?.token === "string" ? request.body.token : "";

    if (!process.env.RESET_TOKEN || token !== process.env.RESET_TOKEN) {
      response.status(401).json({ error: "Invalid reset token." });
      return;
    }

    await resetWinner();
    response.status(200).json({ status: "reset" });
  } catch (error) {
    console.error("Reset failed", error);
    response.status(500).json({ error: "Could not reset claim." });
  }
};

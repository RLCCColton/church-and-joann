const { resetWinner } = require("./_lib/winner-store");

const ADMIN_PASSWORD = "Golf2026";

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const password =
      typeof request.body?.password === "string" ? request.body.password : "";

    if (password !== ADMIN_PASSWORD) {
      response.status(401).json({ error: "Invalid admin password." });
      return;
    }

    await resetWinner();
    response.status(200).json({ status: "reset" });
  } catch (error) {
    console.error("Reset failed", error);
    response.status(500).json({ error: "Could not reset claim." });
  }
};

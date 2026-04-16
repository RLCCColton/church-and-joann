const { normalizeName, sendWinnerEmail } = require("./_lib/helpers");
const { createWinner } = require("./_lib/winner-store");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const name = normalizeName(request.body?.name);

    if (!name) {
      response.status(400).json({ error: "A name is required." });
      return;
    }

    const winner = {
      name,
      claimedAt: new Date().toISOString(),
    };

    const result = await createWinner(winner);

    if (!result.created) {
      response.status(409).json({ status: "already_claimed" });
      return;
    }

    const emailSent = await sendWinnerEmail(name);
    response.status(200).json({ status: "claimed", emailSent });
  } catch (error) {
    console.error("Claim failed", error);
    response.status(500).json({
      error: "Could not submit the claim. Please try again.",
    });
  }
};

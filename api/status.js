const { getWinner } = require("./_lib/winner-store");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const winner = await getWinner();
    response.setHeader("Cache-Control", "no-store");
    response.status(200).json({ claimed: Boolean(winner) });
  } catch (error) {
    console.error("Status lookup failed", error);
    response.status(500).json({ error: "Unable to load status." });
  }
};

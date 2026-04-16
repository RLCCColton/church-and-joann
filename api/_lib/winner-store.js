const fs = require("node:fs");
const path = require("node:path");
const { BlobNotFoundError, head, put, del } = require("@vercel/blob");

const ROOT = path.join(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT, "data");
const WINNER_FILE = path.join(DATA_DIR, "winner.json");
const BLOB_PATH = "church-and-joann/winner.json";

async function getWinner() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await head(BLOB_PATH);

      const downloadUrl = blob?.downloadUrl || blob?.url;

      if (!downloadUrl) {
        return null;
      }

      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return null;
      }

      throw error;
    }
  }

  if (!fs.existsSync(WINNER_FILE)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(WINNER_FILE, "utf8"));
}

async function createWinner(winner) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(BLOB_PATH, JSON.stringify(winner, null, 2), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: false,
      });

      return { created: true, winner };
    } catch (error) {
      if (String(error?.message || "").includes("already exists")) {
        return { created: false, winner: await getWinner() };
      }

      throw error;
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  try {
    fs.writeFileSync(WINNER_FILE, JSON.stringify(winner, null, 2), {
      flag: "wx",
    });

    return { created: true, winner };
  } catch (error) {
    if (error.code === "EEXIST") {
      return { created: false, winner: await getWinner() };
    }

    throw error;
  }
}

async function resetWinner() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(BLOB_PATH);
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) {
        throw error;
      }
    }

    return;
  }

  if (fs.existsSync(WINNER_FILE)) {
    fs.unlinkSync(WINNER_FILE);
  }
}

module.exports = {
  createWinner,
  getWinner,
  resetWinner,
};

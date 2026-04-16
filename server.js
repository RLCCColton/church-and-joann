const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const WINNER_FILE = path.join(DATA_DIR, "winner.json");
const ENV_FILE = path.join(ROOT, ".env");

loadEnvFile();
fs.mkdirSync(DATA_DIR, { recursive: true });
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/status") {
    return sendJson(response, 200, { claimed: hasWinner() });
  }

  if (request.method === "POST" && url.pathname === "/api/claim") {
    return handleClaim(request, response);
  }

  if (request.method === "POST" && url.pathname === "/api/reset") {
    return handleReset(request, response);
  }

  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  return serveStatic(url.pathname, response);
});

server.listen(PORT, () => {
  console.log(`Church & Jo Ann page running at http://localhost:${PORT}`);
});

async function handleClaim(request, response) {
  try {
    const body = await readJsonBody(request);
    const name = normalizeName(body?.name);

    if (!name) {
      return sendJson(response, 400, { error: "A name is required." });
    }

    const winner = {
      name,
      claimedAt: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(WINNER_FILE, JSON.stringify(winner, null, 2), {
        flag: "wx",
      });
    } catch (error) {
      if (error.code === "EEXIST") {
        return sendJson(response, 409, { status: "already_claimed" });
      }

      throw error;
    }

    const emailSent = await sendWinnerEmail(name);
    return sendJson(response, 200, { status: "claimed", emailSent });
  } catch (error) {
    console.error("Claim failed", error);
    return sendJson(response, 500, {
      error: "Could not submit the claim. Please try again.",
    });
  }
}

async function handleReset(request, response) {
  try {
    const body = await readJsonBody(request);
    const token = typeof body?.token === "string" ? body.token : "";

    if (!process.env.RESET_TOKEN || token !== process.env.RESET_TOKEN) {
      return sendJson(response, 401, { error: "Invalid reset token." });
    }

    if (fs.existsSync(WINNER_FILE)) {
      fs.unlinkSync(WINNER_FILE);
    }

    return sendJson(response, 200, { status: "reset" });
  } catch (error) {
    console.error("Reset failed", error);
    return sendJson(response, 500, { error: "Could not reset claim." });
  }
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
      subject: "Church & Jo Ann cheesecake winner",
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

function serveStatic(requestPath, response) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(PUBLIC_DIR, safePath);
  const normalizedPath = path.normalize(filePath);

  if (!normalizedPath.startsWith(PUBLIC_DIR)) {
    return sendJson(response, 403, { error: "Forbidden." });
  }

  if (!fs.existsSync(normalizedPath) || fs.statSync(normalizedPath).isDirectory()) {
    return sendJson(response, 404, { error: "Not found." });
  }

  const extension = path.extname(normalizedPath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(normalizedPath).pipe(response);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;

      if (rawBody.length > 1_000_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function normalizeName(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

function hasWinner() {
  return fs.existsSync(WINNER_FILE);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    return;
  }

  const contents = fs.readFileSync(ENV_FILE, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = stripQuotes(value);
    }
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

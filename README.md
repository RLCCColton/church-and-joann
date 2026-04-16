# Chuck & Jo Ann Giveaway Page

Small dependency-free Node site for a one-time cheesecake claim.

## Setup

1. Copy `.env.example` to `.env`
2. Fill in:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `RESEND_TO_EMAIL`
3. Start the server:

```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000).

## Behavior

- The page asks for a name and submits it once.
- The first successful claim is stored in `data/winner.json`.
- After a successful claim, the form closes and the winner sees the Liz pickup message.
- Any later visitor sees that the cheesecake has already been claimed.
- An email is sent through Resend with the winner's name.

## Local Testing

Set `SKIP_EMAIL=1` in `.env` to test without sending a real email.

If you want to clear the current winner, send:

```bash
curl -X POST http://localhost:3000/api/reset \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_RESET_TOKEN"}'
```

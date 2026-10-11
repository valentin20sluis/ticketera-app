import { spawn, spawnSync } from "node:child_process";

// Forwards Stripe events to the local webhook using the SAME account as the app
// (STRIPE_SECRET_KEY), not whatever `stripe login` points to. The key travels in
// STRIPE_API_KEY so it never shows up in the process list.
const EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "invoice.paid",
].join(",");
const FORWARD_TO = "localhost:3000/api/webhooks/stripe";

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  console.error("Falta STRIPE_SECRET_KEY en .env");
  process.exit(1);
}

// npm's `stripe` is a .cmd shim on Windows, which needs a shell to run.
const options = {
  env: { ...process.env, STRIPE_API_KEY: apiKey },
  shell: process.platform === "win32",
};

// One command string (no args array): Node warns (DEP0190) when args + shell are mixed.
const printed = spawnSync("stripe listen --print-secret", {
  ...options,
  encoding: "utf8",
}).stdout?.trim();

if (printed && printed !== process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn(
    `\n⚠ STRIPE_WEBHOOK_SECRET en .env no coincide con el de esta cuenta.\n` +
      `  Pon STRIPE_WEBHOOK_SECRET=${printed} y reinicia 'npm run dev', o el webhook responderá 400.\n`,
  );
}

const child = spawn(`stripe listen --events ${EVENTS} --forward-to ${FORWARD_TO}`, {
  ...options,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));

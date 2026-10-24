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
// Thin events (Accounts v2) go to their own endpoint with their own secret.
const CONNECT_EVENTS = "v2.core.account[configuration.recipient].capability_status_updated";
const CONNECT_FORWARD_TO = "localhost:3000/api/webhooks/stripe-connect";

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

const warnIfMismatch = (name: string) => {
  if (printed && printed !== process.env[name]) {
    console.warn(
      `\n⚠ ${name} en .env no coincide con el de esta cuenta.\n` +
        `  Pon ${name}=${printed} y reinicia 'npm run dev', o el webhook responderá 400.\n`,
    );
  }
};
warnIfMismatch("STRIPE_WEBHOOK_SECRET");
warnIfMismatch("STRIPE_CONNECT_WEBHOOK_SECRET");

// ponytail: assumes the whsec_ is identical for both listeners (CLI secret is per account/device).
const children = [
  spawn(`stripe listen --events ${EVENTS} --forward-to ${FORWARD_TO}`, {
    ...options,
    stdio: "inherit",
  }),
  // Double quotes: cmd.exe ignores single quotes and the [] must not be globbed by sh.
  spawn(`stripe listen --events "${CONNECT_EVENTS}" --forward-to ${CONNECT_FORWARD_TO}`, {
    ...options,
    stdio: "inherit",
  }),
];
// If either listener dies, stop both so a half-working setup is not silent.
for (const child of children) {
  child.on("exit", (code) => {
    for (const other of children) other.kill();
    process.exit(code ?? 0);
  });
}

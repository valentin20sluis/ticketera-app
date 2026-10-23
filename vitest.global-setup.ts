import { buildSnapshot } from "./lib/db/test-snapshot";

export default async function setup() {
  await buildSnapshot();
}

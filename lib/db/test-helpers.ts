import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { SNAPSHOT_PATH } from "./test-snapshot";

// vitest.global-setup.ts migrates once per run; every test gets its own fresh database
// cloned from that snapshot instead of re-running all migrations.
let snapshot: Promise<Buffer> | undefined;

export async function createTestDb() {
  snapshot ??= readFile(SNAPSHOT_PATH);
  const client = new PGlite({ loadDataDir: new Blob([new Uint8Array(await snapshot)]) });
  return drizzle(client, { schema });
}

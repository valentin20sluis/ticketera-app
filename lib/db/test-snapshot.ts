import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export const SNAPSHOT_PATH = "node_modules/.cache/pglite-snapshot.tar";

/** Migrates the full schema once and saves it, so no test pays for migrations. */
export async function buildSnapshot() {
  const client = new PGlite();
  await migrate(drizzle(client, { schema }), { migrationsFolder: "./drizzle" });
  const dump = await client.dumpDataDir("none");
  await mkdir(dirname(SNAPSHOT_PATH), { recursive: true });
  await writeFile(SNAPSHOT_PATH, Buffer.from(await dump.arrayBuffer()));
  await client.close();
}

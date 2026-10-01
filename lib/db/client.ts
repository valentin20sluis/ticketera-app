import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db =
  | ReturnType<typeof drizzleNeon<typeof schema>>
  | ReturnType<typeof drizzlePg<typeof schema>>
  | ReturnType<typeof drizzlePglite<typeof schema>>;

export interface DbConfig {
  driver: "neon" | "pg";
  connectionString: string;
}

export function resolveDbConfig(env: Record<string, string | undefined>): DbConfig {
  const driver = env.DATABASE_DRIVER;
  if (driver !== "neon" && driver !== "pg") {
    throw new Error('DATABASE_DRIVER must be "neon" or "pg"');
  }
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  return { driver, connectionString };
}

async function createCloudSqlPool(instanceConnectionName: string): Promise<Pool> {
  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
  });
  return new Pool({
    ...clientOpts,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 5,
  });
}

let dbInstance: Db | null = null;

export async function getDb(): Promise<Db> {
  if (dbInstance) return dbInstance;

  const config = resolveDbConfig(process.env);

  if (config.driver === "neon") {
    dbInstance = drizzleNeon(neon(config.connectionString), { schema });
    return dbInstance;
  }

  const instanceConnectionName = process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME;
  const pool = instanceConnectionName
    ? await createCloudSqlPool(instanceConnectionName)
    : new Pool({ connectionString: config.connectionString });
  dbInstance = drizzlePg(pool, { schema });
  return dbInstance;
}

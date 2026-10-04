import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { getDb } from "@/lib/db/client";
import {
  markClerkUserDeleted,
  upsertClerkUser,
} from "@/modules/users/services/user-sync.service";
import { fromWebhookUser } from "@/modules/users/utils/clerk-user-mappers";

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const db = await getDb();
  if (event.type === "user.created" || event.type === "user.updated") {
    await upsertClerkUser(db, fromWebhookUser(event.data));
  } else if (event.type === "user.deleted" && event.data.id) {
    await markClerkUserDeleted(db, event.data.id);
  }

  return new Response("ok", { status: 200 });
}

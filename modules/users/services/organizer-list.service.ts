import { and, asc, eq, ilike, isNull, notInArray, or, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { events, users } from "@/lib/db/schema";
import { HIDDEN_FROM_PANEL_EMAILS } from "@/modules/users/constants";
import { escapeLike } from "@/modules/users/utils/escape-like";

export interface OrganizerRow {
  id: string;
  fullName: string;
  email: string;
  isSuspended: boolean;
  createdAt: Date;
  activeEvents: number;
  totalEvents: number;
}

export interface OrganizerListParams {
  q: string;
  page: number;
  porPagina: number;
}

// Active = published. Total counts every event the organizer ever created, in any status.
export async function listOrganizers(db: Db, { q, page: requestedPage, porPagina }: OrganizerListParams) {
  const pattern = `%${escapeLike(q)}%`;
  const where = and(
    eq(users.role, "organizer"),
    isNull(users.deletedAt),
    notInArray(users.email, HIDDEN_FROM_PANEL_EMAILS),
    q ? or(ilike(users.fullName, pattern), ilike(users.email, pattern)) : undefined,
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(where);
  const totalPages = Math.max(1, Math.ceil(total / porPagina));
  const page = Math.min(requestedPage, totalPages);

  const rows: OrganizerRow[] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      isSuspended: users.isSuspended,
      createdAt: users.createdAt,
      activeEvents: sql<number>`count(${events.id}) filter (where ${events.status} = 'published')`.mapWith(Number),
      totalEvents: sql<number>`count(${events.id})`.mapWith(Number),
    })
    .from(users)
    .leftJoin(events, eq(events.organizerId, users.id))
    .where(where)
    .groupBy(users.id)
    .orderBy(asc(users.fullName), asc(users.id))
    .limit(porPagina)
    .offset((page - 1) * porPagina);

  return { rows, total, page, pageSize: porPagina, totalPages };
}

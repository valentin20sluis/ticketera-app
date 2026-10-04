import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  doublePrecision,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "admin",
  "organizer",
  "customer",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled",
  "suspended",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
  "cancelled",
]);

export const ticketStatusEnum = pgEnum("ticket_status", ["valid", "used"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeChargesEnabled: boolean("stripe_charges_enabled").notNull().default(false),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventCategories = pgTable("event_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  iconKey: varchar("icon_key", { length: 100 }).notNull(),
  colorKey: varchar("color_key", { length: 50 }).notNull(),
});

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id").notNull().references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address").notNull(),
    city: varchar("city", { length: 150 }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizerIdx: index("venues_organizer_idx").on(table.organizerId),
  }),
);

export const venueZones = pgTable(
  "venue_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id").notNull().references(() => venues.id),
    name: varchar("name", { length: 150 }).notNull(),
    shapeX: doublePrecision("shape_x").notNull(),
    shapeY: doublePrecision("shape_y").notNull(),
    shapeWidth: doublePrecision("shape_width").notNull(),
    shapeHeight: doublePrecision("shape_height").notNull(),
    capacity: integer("capacity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    venueIdx: index("venue_zones_venue_idx").on(table.venueId),
    capacityNonNegative: check("venue_zones_capacity_non_negative", sql`${table.capacity} >= 0`),
  }),
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id").notNull().references(() => users.id),
    categoryId: uuid("category_id").notNull().references(() => eventCategories.id),
    venueId: uuid("venue_id").notNull().references(() => venues.id),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url").notNull(),
    doorsOpenTime: varchar("doors_open_time", { length: 50 }).notNull(),
    showStartTime: varchar("show_start_time", { length: 50 }).notNull(),
    minimumAge: varchar("minimum_age", { length: 50 }).notNull(),
    admissionType: varchar("admission_type", { length: 100 }).notNull(),
    status: eventStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizerIdx: index("events_organizer_idx").on(table.organizerId),
    categoryIdx: index("events_category_idx").on(table.categoryId),
    venueIdx: index("events_venue_idx").on(table.venueId),
  }),
);

export const eventFunctions = pgTable(
  "event_functions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIdx: index("event_functions_event_idx").on(table.eventId),
  }),
);

export const functionZones = pgTable(
  "function_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    functionId: uuid("function_id").notNull().references(() => eventFunctions.id),
    venueZoneId: uuid("venue_zone_id").notNull().references(() => venueZones.id),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PEN"),
    capacity: integer("capacity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    functionIdx: index("function_zones_function_idx").on(table.functionId),
    venueZoneIdx: index("function_zones_venue_zone_idx").on(table.venueZoneId),
    capacityNonNegative: check("function_zones_capacity_non_negative", sql`${table.capacity} >= 0`),
    priceNonNegative: check("function_zones_price_non_negative", sql`${table.price} >= 0`),
  }),
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull().references(() => users.id),
    status: orderStatusEnum("status").notNull().default("pending"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PEN"),
    stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("orders_customer_idx").on(table.customerId),
    statusExpiresIdx: index("orders_status_expires_idx").on(table.status, table.expiresAt),
    totalAmountNonNegative: check("orders_total_amount_non_negative", sql`${table.totalAmount} >= 0`),
  }),
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    functionZoneId: uuid("function_zone_id").notNull().references(() => functionZones.id),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
    functionZoneIdx: index("order_items_function_zone_idx").on(table.functionZoneId),
    quantityPositive: check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    unitPriceNonNegative: check("order_items_unit_price_non_negative", sql`${table.unitPrice} >= 0`),
  }),
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id),
    qrCode: varchar("qr_code", { length: 255 }).notNull().unique(),
    status: ticketStatusEnum("status").notNull().default("valid"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderItemIdx: index("tickets_order_item_idx").on(table.orderItemId),
  }),
);

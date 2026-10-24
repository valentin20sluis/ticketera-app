CREATE TABLE "order_item_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"function_zone_id" uuid NOT NULL,
	"seat_row" integer NOT NULL,
	"seat_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_item_seats_zone_seat_unique" UNIQUE("function_zone_id","seat_row","seat_number"),
	CONSTRAINT "order_item_seats_positive" CHECK ("order_item_seats"."seat_row" > 0 and "order_item_seats"."seat_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "order_item_seat_id" uuid;--> statement-breakpoint
ALTER TABLE "venue_zones" ADD COLUMN "seat_rows" integer;--> statement-breakpoint
ALTER TABLE "venue_zones" ADD COLUMN "seat_columns" integer;--> statement-breakpoint
ALTER TABLE "order_item_seats" ADD CONSTRAINT "order_item_seats_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_seats" ADD CONSTRAINT "order_item_seats_function_zone_id_function_zones_id_fk" FOREIGN KEY ("function_zone_id") REFERENCES "public"."function_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_item_seats_order_item_idx" ON "order_item_seats" USING btree ("order_item_id");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_item_seat_id_order_item_seats_id_fk" FOREIGN KEY ("order_item_seat_id") REFERENCES "public"."order_item_seats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_item_seat_id_unique" UNIQUE("order_item_seat_id");--> statement-breakpoint
ALTER TABLE "venue_zones" ADD CONSTRAINT "venue_zones_seat_layout_valid" CHECK (("venue_zones"."seat_rows" is null and "venue_zones"."seat_columns" is null) or ("venue_zones"."seat_rows" is not null and "venue_zones"."seat_columns" is not null and "venue_zones"."seat_rows" > 0 and "venue_zones"."seat_columns" > 0 and "venue_zones"."capacity" = "venue_zones"."seat_rows" * "venue_zones"."seat_columns"));
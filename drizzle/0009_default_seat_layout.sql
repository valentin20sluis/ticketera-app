-- Every zone becomes numbered with the default 10x10 layout (100 seats).
-- function_zones keeps its own capacity (used by availability), so it is aligned too.
UPDATE "venue_zones" SET "seat_rows" = 10, "seat_columns" = 10, "capacity" = 100;--> statement-breakpoint
UPDATE "function_zones" SET "capacity" = 100;

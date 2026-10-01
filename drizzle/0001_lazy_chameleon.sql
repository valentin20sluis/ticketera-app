ALTER TABLE "function_zones" ADD CONSTRAINT "function_zones_capacity_non_negative" CHECK ("function_zones"."capacity" >= 0);--> statement-breakpoint
ALTER TABLE "function_zones" ADD CONSTRAINT "function_zones_price_non_negative" CHECK ("function_zones"."price" >= 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_non_negative" CHECK ("order_items"."unit_price" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_amount_non_negative" CHECK ("orders"."total_amount" >= 0);--> statement-breakpoint
ALTER TABLE "venue_zones" ADD CONSTRAINT "venue_zones_capacity_non_negative" CHECK ("venue_zones"."capacity" >= 0);
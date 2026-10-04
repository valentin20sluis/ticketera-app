CREATE INDEX "event_functions_event_idx" ON "event_functions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_organizer_idx" ON "events" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "events_category_idx" ON "events" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "events_venue_idx" ON "events" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "function_zones_function_idx" ON "function_zones" USING btree ("function_id");--> statement-breakpoint
CREATE INDEX "function_zones_venue_zone_idx" ON "function_zones" USING btree ("venue_zone_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "tickets_order_item_idx" ON "tickets" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "venue_zones_venue_idx" ON "venue_zones" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "venues_organizer_idx" ON "venues" USING btree ("organizer_id");
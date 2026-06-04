import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  shelf: integer("shelf").notNull().unique(),
  name: text("name").notNull(),
  measureType: text("measure_type").notNull().default("count"),
  count: integer("count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  weightG: integer("weight_g").notNull().default(0),
  lowCount: integer("low_count").notNull().default(3),
  lowWeightG: integer("low_weight_g").notNull().default(200),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const sensorReadingsTable = pgTable("sensor_readings", {
  id: serial("id").primaryKey(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  temperature: real("temperature"),
  doorOpen: boolean("door_open").notNull().default(false),
  shelf1Count: integer("shelf1_count").notNull().default(0),
  shelf2WeightG: integer("shelf2_weight_g").notNull().default(0),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  ntype: text("ntype").notNull(),
  message: text("message").notNull(),
  shelf: integer("shelf"),
  level: text("level").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

export const insertSensorReadingSchema = createInsertSchema(sensorReadingsTable).omit({ id: true, recordedAt: true });
export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type SensorReading = typeof sensorReadingsTable.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;

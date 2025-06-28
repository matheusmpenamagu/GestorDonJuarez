import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Points of Sale table
export const pointsOfSale = pgTable("points_of_sale", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Beer Styles table
export const beerStyles = pgTable("beer_styles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Taps table
export const taps = pgTable("taps", {
  id: varchar("id", { length: 5 }).primaryKey(), // 5-digit alphanumeric code
  name: varchar("name", { length: 255 }).notNull(),
  posId: integer("pos_id").references(() => pointsOfSale.id),
  currentBeerStyleId: integer("current_beer_style_id").references(() => beerStyles.id),
  kegCapacityMl: integer("keg_capacity_ml").default(30000), // Default 30L
  currentVolumeUsedMl: integer("current_volume_used_ml").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pour Events table (webhook data from ESP32)
export const pourEvents = pgTable("pour_events", {
  id: serial("id").primaryKey(),
  tapId: varchar("tap_id", { length: 5 }).references(() => taps.id).notNull(),
  totalVolumeMl: integer("total_volume_ml").notNull(),
  pourVolumeMl: integer("pour_volume_ml").notNull(), // Calculated difference
  datetime: timestamp("datetime").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Keg Change Events table (webhook data for barrel changes)
export const kegChangeEvents = pgTable("keg_change_events", {
  id: serial("id").primaryKey(),
  tapId: varchar("tap_id", { length: 5 }).references(() => taps.id).notNull(),
  previousVolumeMl: integer("previous_volume_ml"), // Volume remaining before change
  datetime: timestamp("datetime").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  // Add user-specific relations if needed
}));

export const pointsOfSaleRelations = relations(pointsOfSale, ({ many }) => ({
  taps: many(taps),
}));

export const beerStylesRelations = relations(beerStyles, ({ many }) => ({
  taps: many(taps),
}));

export const tapsRelations = relations(taps, ({ one, many }) => ({
  pointOfSale: one(pointsOfSale, {
    fields: [taps.posId],
    references: [pointsOfSale.id],
  }),
  currentBeerStyle: one(beerStyles, {
    fields: [taps.currentBeerStyleId],
    references: [beerStyles.id],
  }),
  pourEvents: many(pourEvents),
  kegChangeEvents: many(kegChangeEvents),
}));

export const pourEventsRelations = relations(pourEvents, ({ one }) => ({
  tap: one(taps, {
    fields: [pourEvents.tapId],
    references: [taps.id],
  }),
}));

export const kegChangeEventsRelations = relations(kegChangeEvents, ({ one }) => ({
  tap: one(taps, {
    fields: [kegChangeEvents.tapId],
    references: [taps.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertPointOfSaleSchema = createInsertSchema(pointsOfSale).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeerStyleSchema = createInsertSchema(beerStyles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTapSchema = createInsertSchema(taps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPourEventSchema = createInsertSchema(pourEvents).omit({
  id: true,
  createdAt: true,
});

export const insertKegChangeEventSchema = createInsertSchema(kegChangeEvents).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PointOfSale = typeof pointsOfSale.$inferSelect;
export type InsertPointOfSale = z.infer<typeof insertPointOfSaleSchema>;
export type BeerStyle = typeof beerStyles.$inferSelect;
export type InsertBeerStyle = z.infer<typeof insertBeerStyleSchema>;
export type Tap = typeof taps.$inferSelect;
export type InsertTap = z.infer<typeof insertTapSchema>;
export type PourEvent = typeof pourEvents.$inferSelect;
export type InsertPourEvent = z.infer<typeof insertPourEventSchema>;
export type KegChangeEvent = typeof kegChangeEvents.$inferSelect;
export type InsertKegChangeEvent = z.infer<typeof insertKegChangeEventSchema>;

// Extended types for API responses
export type TapWithRelations = Tap & {
  pointOfSale?: PointOfSale;
  currentBeerStyle?: BeerStyle;
  currentVolumeAvailableMl: number;
  lastPourEvent?: PourEvent & { datetime: string };
};

export type PourEventWithRelations = PourEvent & {
  tap: Tap & {
    pointOfSale?: PointOfSale;
    currentBeerStyle?: BeerStyle;
  };
};

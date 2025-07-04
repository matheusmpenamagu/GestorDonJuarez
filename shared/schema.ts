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
  ebcColor: integer("ebc_color"), // EBC color value (0-80+ range)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Devices table (ESP32 hardware controllers)
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 5 }).notNull().unique(), // Alphanumeric 5-digit identifier
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  lastHeartbeat: timestamp("last_heartbeat"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Taps table
export const taps = pgTable("taps", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  posId: integer("pos_id").references(() => pointsOfSale.id),
  currentBeerStyleId: integer("current_beer_style_id").references(() => beerStyles.id),
  deviceId: integer("device_id").references(() => devices.id), // Reference to ESP32 device
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pour Events table (webhook data from ESP32)
export const pourEvents = pgTable("pour_events", {
  id: serial("id").primaryKey(),
  tapId: integer("tap_id").references(() => taps.id).notNull(),
  totalVolumeMl: integer("total_volume_ml").notNull(),
  pourVolumeMl: integer("pour_volume_ml").notNull(), // Calculated difference
  datetime: timestamp("datetime").notNull(),
  // Snapshot data captured at the moment of the webhook
  tapName: varchar("tap_name"), // Nome da torneira no momento do webhook
  posName: varchar("pos_name"), // Nome do ponto de venda no momento do webhook
  beerStyleName: varchar("beer_style_name"), // Nome do estilo de chope no momento do webhook
  beerStyleEbcColor: integer("beer_style_ebc_color"), // Cor EBC do estilo no momento do webhook
  deviceCode: varchar("device_code"), // Código do dispositivo no momento do webhook
  createdAt: timestamp("created_at").defaultNow(),
});

// Keg Change Events table (webhook data for barrel changes)
export const kegChangeEvents = pgTable("keg_change_events", {
  id: serial("id").primaryKey(),
  tapId: integer("tap_id").references(() => taps.id).notNull(),
  previousVolumeMl: integer("previous_volume_ml"), // Volume remaining before change
  kegCapacityLiters: integer("keg_capacity_liters").notNull(), // 30 or 50 liters
  datetime: timestamp("datetime").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employee management tables
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default([]), // Array of permission slugs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 15 }),
  roleId: integer("role_id").references(() => roles.id),
  employmentType: varchar("employment_type", { length: 50 }).notNull().default("Funcionário"),
  avatar: varchar("avatar", { length: 10 }).notNull().default("😊"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const co2Refills = pgTable("co2_refills", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  supplier: varchar("supplier", { length: 255 }).notNull(),
  kilosRefilled: decimal("kilos_refilled", { precision: 5, scale: 2 }).notNull(),
  valuePaid: decimal("value_paid", { precision: 10, scale: 2 }).notNull(),
  unitId: integer("unit_id").references(() => units.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const devicesRelations = relations(devices, ({ many }) => ({
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
  device: one(devices, {
    fields: [taps.deviceId],
    references: [devices.id],
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

export const rolesRelations = relations(roles, ({ many }) => ({
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  role: one(roles, {
    fields: [employees.roleId],
    references: [roles.id],
  }),
}));

export const unitsRelations = relations(units, ({ many }) => ({
  co2Refills: many(co2Refills),
}));

export const co2RefillsRelations = relations(co2Refills, ({ one }) => ({
  unit: one(units, {
    fields: [co2Refills.unitId],
    references: [units.id],
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

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTapSchema = createInsertSchema(taps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  deviceId: z.number().nullable().optional(),
});

export const insertPourEventSchema = createInsertSchema(pourEvents).omit({
  id: true,
  createdAt: true,
});

export const insertKegChangeEventSchema = createInsertSchema(kegChangeEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  kegCapacityLiters: z.number().min(1).max(100), // Allow 30L or 50L keg sizes
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  employmentType: z.enum(["Sócio", "Funcionário", "Freelancer"]),
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCo2RefillSchema = createInsertSchema(co2Refills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  kilosRefilled: z.number().min(0.01),
  valuePaid: z.number().min(0),
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PointOfSale = typeof pointsOfSale.$inferSelect;
export type InsertPointOfSale = z.infer<typeof insertPointOfSaleSchema>;
export type BeerStyle = typeof beerStyles.$inferSelect;
export type InsertBeerStyle = z.infer<typeof insertBeerStyleSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Tap = typeof taps.$inferSelect;
export type InsertTap = z.infer<typeof insertTapSchema>;
export type PourEvent = typeof pourEvents.$inferSelect;
export type InsertPourEvent = z.infer<typeof insertPourEventSchema>;
export type KegChangeEvent = typeof kegChangeEvents.$inferSelect;
export type InsertKegChangeEvent = z.infer<typeof insertKegChangeEventSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Co2Refill = typeof co2Refills.$inferSelect;
export type InsertCo2Refill = z.infer<typeof insertCo2RefillSchema>;

// Extended types for API responses
export type Co2RefillWithRelations = Co2Refill & {
  unit?: Unit;
};
export type TapWithRelations = Tap & {
  pointOfSale?: PointOfSale;
  currentBeerStyle?: BeerStyle;
  device?: Device;
  currentVolumeAvailableMl: number;
  kegCapacityMl: number;
  lastPourEvent?: PourEvent & { datetime: string };
};

export type PourEventWithRelations = PourEvent & {
  tap: {
    id: number;
    name: string;
    pointOfSale?: { name: string };
    currentBeerStyle?: { name: string; ebcColor?: number | null };
  };
};

export type EmployeeWithRelations = Employee & {
  role?: Role;
};

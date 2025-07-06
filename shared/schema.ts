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
  unique,
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
  employmentTypes: text("employment_types").array().notNull().default(["Funcionário"]), // Array of employment types
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

// Freelancer time tracking table
export const freelancerTimeEntries = pgTable("freelancer_time_entries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id),
  freelancerPhone: varchar("freelancer_phone", { length: 20 }).notNull(), // Required field
  freelancerName: varchar("freelancer_name", { length: 100 }), // Mantido para compatibilidade
  unitId: integer("unit_id").references(() => units.id),
  entryType: varchar("entry_type", { length: 10 }).notNull(), // 'entrada' or 'saida'
  timestamp: timestamp("timestamp").notNull(),
  message: varchar("message", { length: 50 }), // 'Cheguei' or 'Fui'
  isManualEntry: boolean("is_manual_entry").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Categories table for inventory categorization
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table for inventory management
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  stockCategory: varchar("stock_category", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  unitOfMeasure: varchar("unit_of_measure", { length: 20 }).notNull(),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de relacionamento produto-unidade (many-to-many)
export const productUnits = pgTable("product_units", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  stockQuantity: decimal("stock_quantity", { precision: 10, scale: 3 }).default("0"),
  minQuantity: decimal("min_quantity", { precision: 10, scale: 3 }).default("0"),
  maxQuantity: decimal("max_quantity", { precision: 10, scale: 3 }),
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
  productUnits: many(productUnits),
  stockCounts: many(stockCounts),
}));

export const co2RefillsRelations = relations(co2Refills, ({ one }) => ({
  unit: one(units, {
    fields: [co2Refills.unitId],
    references: [units.id],
  }),
}));

export const freelancerTimeEntriesRelations = relations(freelancerTimeEntries, ({ one }) => ({
  employee: one(employees, {
    fields: [freelancerTimeEntries.employeeId],
    references: [employees.id],
  }),
  unit: one(units, {
    fields: [freelancerTimeEntries.unitId],
    references: [units.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  productUnits: many(productUnits),
  stockCountItems: many(stockCountItems),
}));

export const productUnitsRelations = relations(productUnits, ({ one }) => ({
  product: one(products, {
    fields: [productUnits.productId],
    references: [products.id],
  }),
  unit: one(units, {
    fields: [productUnits.unitId],
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
  employmentTypes: z.array(z.enum(["Sócio", "Funcionário", "Freelancer"])).min(1), // Array of employment types
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

export const insertFreelancerTimeEntrySchema = createInsertSchema(freelancerTimeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  currentValue: z.number().min(0),
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
export type FreelancerTimeEntry = typeof freelancerTimeEntries.$inferSelect;
export type InsertFreelancerTimeEntry = z.infer<typeof insertFreelancerTimeEntrySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductUnit = typeof productUnits.$inferSelect;
export type InsertProductUnit = typeof productUnits.$inferInsert;

// Extended types for API responses
export type Co2RefillWithRelations = Co2Refill & {
  unit?: Unit;
};

export type FreelancerTimeEntryWithRelations = FreelancerTimeEntry & {
  employee?: EmployeeWithRelations;
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

// Stock Counts table
export const stockCounts = pgTable("stock_counts", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  responsibleId: integer("responsible_id").notNull().references(() => employees.id),
  unitId: integer("unit_id").notNull().references(() => units.id),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default("rascunho"), // rascunho, pronta_para_contagem, em_contagem, contagem_finalizada
  publicToken: varchar("public_token", { length: 32 }).unique(), // For public access
  categoryOrder: text("category_order"), // JSON string for custom category ordering
  productOrder: text("product_order"), // JSON string for custom product ordering within categories
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stock Count Items table
export const stockCountItems = pgTable("stock_count_items", {
  id: serial("id").primaryKey(),
  stockCountId: integer("stock_count_id").notNull().references(() => stockCounts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  countedQuantity: decimal("counted_quantity", { precision: 10, scale: 3 }).notNull(),
  systemQuantity: decimal("system_quantity", { precision: 10, scale: 3 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for Stock Counts
export const stockCountsRelations = relations(stockCounts, ({ one, many }) => ({
  responsible: one(employees, {
    fields: [stockCounts.responsibleId],
    references: [employees.id],
  }),
  unit: one(units, {
    fields: [stockCounts.unitId],
    references: [units.id],
  }),
  items: many(stockCountItems),
}));

export const stockCountItemsRelations = relations(stockCountItems, ({ one }) => ({
  stockCount: one(stockCounts, {
    fields: [stockCountItems.stockCountId],
    references: [stockCounts.id],
  }),
  product: one(products, {
    fields: [stockCountItems.productId],
    references: [products.id],
  }),
}));

// Types for Stock Counts
export type StockCount = typeof stockCounts.$inferSelect;
export type InsertStockCount = typeof stockCounts.$inferInsert;
export type StockCountItem = typeof stockCountItems.$inferSelect;
export type InsertStockCountItem = typeof stockCountItems.$inferInsert;

export const insertStockCountSchema = createInsertSchema(stockCounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  unitId: z.number().min(1, "Selecione uma unidade"),
  status: z.enum(["rascunho", "pronta_para_contagem", "em_contagem", "contagem_finalizada"]).optional(),
});

export const insertStockCountItemSchema = createInsertSchema(stockCountItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StockCountWithRelations = StockCount & {
  responsible?: EmployeeWithRelations;
  unit?: Unit;
  items?: (StockCountItem & { product?: Product })[];
};

export type StockCountItemWithRelations = StockCountItem & {
  product?: Product;
};

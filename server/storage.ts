import {
  users,
  pointsOfSale,
  beerStyles,
  devices,
  taps,
  pourEvents,
  kegChangeEvents,
  roles,
  employees,
  units,
  co2Refills,
  freelancerTimeEntries,
  productCategories,
  products,
  productUnits,
  stockCounts,
  stockCountItems,
  cashRegisterClosures,
  settings,
  fuels,
  gasStations,
  vehicles,
  fuelEntries,
  productShelfLifes,
  productPortions,
  labels,
  printers,
  type User,
  type UpsertUser,
  type PointOfSale,
  type InsertPointOfSale,
  type BeerStyle,
  type InsertBeerStyle,
  type Device,
  type InsertDevice,
  type Tap,
  type InsertTap,
  type PourEvent,
  type InsertPourEvent,
  type KegChangeEvent,
  type InsertKegChangeEvent,
  type Role,
  type InsertRole,
  type Employee,
  type InsertEmployee,
  type Unit,
  type InsertUnit,
  type Co2Refill,
  type InsertCo2Refill,
  type Co2RefillWithRelations,
  type FreelancerTimeEntry,
  type InsertFreelancerTimeEntry,
  type FreelancerTimeEntryWithRelations,
  type ProductCategory,
  type InsertProductCategory,
  type Product,
  type InsertProduct,
  type ProductUnit,
  type InsertProductUnit,
  type StockCount,
  type InsertStockCount,
  type StockCountWithRelations,
  type StockCountItem,
  type InsertStockCountItem,
  type StockCountItemWithRelations,
  type CashRegisterClosure,
  type InsertCashRegisterClosure,
  type TapWithRelations,
  type PourEventWithRelations,
  type EmployeeWithRelations,
  type Setting,
  type InsertSetting,
  type Fuel,
  type InsertFuel,
  type GasStation,
  type InsertGasStation,
  type Vehicle,
  type InsertVehicle,
  type ProductShelfLife,
  type InsertProductShelfLife,
  type ProductPortion,
  type InsertProductPortion,
  type Label,
  type InsertLabel,
  type FuelEntry,
  type InsertFuelEntry,
  type Printer,
  type InsertPrinter,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, or, gte, lte, lt, sql, sum } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Points of Sale operations
  getPointsOfSale(): Promise<PointOfSale[]>;
  getPointOfSale(id: number): Promise<PointOfSale | undefined>;
  createPointOfSale(pos: InsertPointOfSale): Promise<PointOfSale>;
  updatePointOfSale(id: number, pos: Partial<InsertPointOfSale>): Promise<PointOfSale>;
  deletePointOfSale(id: number): Promise<void>;
  
  // Beer Styles operations
  getBeerStyles(): Promise<BeerStyle[]>;
  getBeerStyle(id: number): Promise<BeerStyle | undefined>;
  createBeerStyle(style: InsertBeerStyle): Promise<BeerStyle>;
  updateBeerStyle(id: number, style: Partial<InsertBeerStyle>): Promise<BeerStyle>;
  deleteBeerStyle(id: number): Promise<void>;
  
  // Devices operations
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByCode(code: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device>;
  deleteDevice(id: number): Promise<void>;
  updateDeviceHeartbeat(deviceId: number): Promise<void>;
  
  // Taps operations
  getTaps(): Promise<TapWithRelations[]>;
  getTap(id: number): Promise<TapWithRelations | undefined>;
  createTap(tap: InsertTap): Promise<Tap>;
  updateTap(id: number, tap: Partial<InsertTap>): Promise<Tap>;
  deleteTap(id: number): Promise<void>;
  
  // Pour Events operations
  createPourEvent(event: InsertPourEvent): Promise<PourEvent>;
  getPourEvents(startDate?: Date, endDate?: Date, tapId?: number): Promise<PourEventWithRelations[]>;
  getRecentPourEvents(limit?: number): Promise<PourEventWithRelations[]>;
  
  // Keg Change Events operations
  createKegChangeEvent(event: InsertKegChangeEvent): Promise<KegChangeEvent>;
  getKegChangeEvents(startDate?: Date, endDate?: Date, tapId?: number): Promise<(KegChangeEvent & { tap: Tap & { pointOfSale?: PointOfSale } })[]>;
  
  // Analytics
  getDashboardStats(): Promise<{
    activeTaps: number;
    todayVolumeLiters: number;
    weekVolumeLiters: number;
    lowKegs: number;
  }>;
  
  // Roles operations
  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  
  // Employees operations
  getEmployees(): Promise<EmployeeWithRelations[]>;
  getEmployee(id: number): Promise<EmployeeWithRelations | undefined>;
  getEmployeeByEmail(email: string): Promise<EmployeeWithRelations | undefined>;
  authenticateEmployeeByPin(pin: string): Promise<EmployeeWithRelations | null>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
  
  // Units operations
  getUnits(): Promise<Unit[]>;
  getUnit(id: number): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit>;
  deleteUnit(id: number): Promise<void>;
  
  // CO2 Refills operations
  getCo2Refills(): Promise<Co2RefillWithRelations[]>;
  getCo2Refill(id: number): Promise<Co2RefillWithRelations | undefined>;
  createCo2Refill(refill: InsertCo2Refill): Promise<Co2Refill>;
  updateCo2Refill(id: number, refill: Partial<InsertCo2Refill>): Promise<Co2Refill>;
  deleteCo2Refill(id: number): Promise<void>;
  getCo2Stats(): Promise<{
    last30DaysTotal: { kg: number; cost: number };
    previous30DaysTotal: { kg: number; cost: number };
    percentageChange: number;
    kgPerLiterLast30Days: number;
    kgPerLiterPrevious30Days: number;
    efficiencyChange: number;
  }>;
  
  // Freelancer Time Entries operations
  getFreelancerTimeEntries(startDate?: Date, endDate?: Date, freelancerPhone?: string): Promise<FreelancerTimeEntryWithRelations[]>;
  getFreelancerTimeEntry(id: number): Promise<FreelancerTimeEntryWithRelations | undefined>;
  createFreelancerTimeEntry(entry: InsertFreelancerTimeEntry): Promise<FreelancerTimeEntry>;
  updateFreelancerTimeEntry(id: number, entry: Partial<InsertFreelancerTimeEntry>): Promise<FreelancerTimeEntry>;
  deleteFreelancerTimeEntry(id: number): Promise<void>;
  getLastEntryUnitForFreelancer(freelancerPhone: string | null, employeeId: number | null): Promise<number | null>;
  getFreelancerStats(startDate: Date, endDate: Date): Promise<{
    freelancerPhone: string;
    freelancerName: string | null;
    totalHours: number;
    totalDays: number;
    entries: FreelancerTimeEntryWithRelations[];
  }[]>;
  
  // Product Categories operations
  getProductCategories(): Promise<ProductCategory[]>;
  getProductCategory(id: number): Promise<ProductCategory | undefined>;
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;
  updateProductCategory(id: number, category: Partial<InsertProductCategory>): Promise<ProductCategory>;
  deleteProductCategory(id: number): Promise<void>;
  
  // Products operations
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductByCode(code: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  upsertProductByCode(product: InsertProduct): Promise<Product>;
  
  // Bulk cleanup operations
  clearAllProducts(): Promise<void>;
  clearAllProductUnits(): Promise<void>;
  clearAllStockCountItems(): Promise<void>;
  
  // Stock Counts operations
  getStockCounts(): Promise<StockCountWithRelations[]>;
  getStockCount(id: number): Promise<StockCountWithRelations | undefined>;
  getStockCountByPublicToken(publicToken: string): Promise<StockCountWithRelations | undefined>;
  createStockCount(stockCount: InsertStockCount): Promise<StockCount>;
  updateStockCount(id: number, stockCount: Partial<InsertStockCount>): Promise<StockCount>;
  deleteStockCount(id: number): Promise<void>;
  // Status transitions
  startStockCount(id: number): Promise<StockCount>; // rascunho -> pronta_para_contagem
  beginCounting(publicToken: string): Promise<StockCount>; // pronta_para_contagem -> em_contagem
  finalizeStockCount(id: number): Promise<StockCount>; // em_contagem -> contagem_finalizada
  generatePublicToken(id: number): Promise<string>;
  
  // Stock Count Items operations
  getStockCountItems(stockCountId: number): Promise<StockCountItemWithRelations[]>;
  createStockCountItem(item: InsertStockCountItem): Promise<StockCountItem>;
  updateStockCountItem(id: number, item: Partial<InsertStockCountItem>): Promise<StockCountItem>;
  deleteStockCountItem(id: number): Promise<void>;
  deleteStockCountItemByProduct(stockCountId: number, productId: number): Promise<void>;
  
  // Bulk operations for stock count items
  createStockCountItems(items: InsertStockCountItem[]): Promise<StockCountItem[]>;
  updateStockCountItems(stockCountId: number, items: { productId: number; countedQuantity: string; notes?: string }[]): Promise<void>;
  upsertStockCountItem(stockCountId: number, item: { productId: number; countedQuantity: string; notes?: string }): Promise<void>;
  
  // Settings operations
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string, description?: string): Promise<Setting>;
  updateSetting(key: string, value: string): Promise<Setting>;
  
  // Fleet Management operations
  // Fuels
  getFuels(): Promise<Fuel[]>;
  getFuel(id: number): Promise<Fuel | undefined>;
  createFuel(fuel: InsertFuel): Promise<Fuel>;
  updateFuel(id: number, fuel: Partial<InsertFuel>): Promise<Fuel>;
  
  // Gas Stations
  getGasStations(): Promise<GasStation[]>;
  getGasStation(id: number): Promise<GasStation | undefined>;
  createGasStation(gasStation: InsertGasStation): Promise<GasStation>;
  updateGasStation(id: number, gasStation: Partial<InsertGasStation>): Promise<GasStation>;
  
  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  
  // Fuel Entries
  getFuelEntries(): Promise<FuelEntry[]>;
  getFuelEntry(id: number): Promise<FuelEntry | undefined>;
  createFuelEntry(fuelEntry: InsertFuelEntry): Promise<FuelEntry>;
  updateFuelEntry(id: number, fuelEntry: Partial<InsertFuelEntry>): Promise<FuelEntry>;
  
  // Cash Register Closures operations
  getCashRegisterClosures(): Promise<CashRegisterClosure[]>;
  getCashRegisterClosure(id: number): Promise<CashRegisterClosure | undefined>;
  createCashRegisterClosure(closure: InsertCashRegisterClosure): Promise<CashRegisterClosure>;
  updateCashRegisterClosure(id: number, closure: Partial<InsertCashRegisterClosure>): Promise<CashRegisterClosure>;
  deleteCashRegisterClosure(id: number): Promise<void>;

  // Label Module operations
  // Product Shelf Lifes
  getProductShelfLifes(): Promise<ProductShelfLife[]>;
  getProductShelfLife(id: number): Promise<ProductShelfLife | undefined>;
  getProductShelfLifeByProduct(productId: number): Promise<ProductShelfLife | undefined>;
  createProductShelfLife(shelfLife: InsertProductShelfLife): Promise<ProductShelfLife>;
  updateProductShelfLife(id: number, shelfLife: Partial<InsertProductShelfLife>): Promise<ProductShelfLife>;
  deleteProductShelfLife(id: number): Promise<void>;
  
  // Product Portions
  getProductPortions(): Promise<ProductPortion[]>;
  getProductPortion(id: number): Promise<ProductPortion | undefined>;
  getProductPortionsByProduct(productId: number): Promise<ProductPortion[]>;
  createProductPortion(portion: InsertProductPortion): Promise<ProductPortion>;
  updateProductPortion(id: number, portion: Partial<InsertProductPortion>): Promise<ProductPortion>;
  deleteProductPortion(id: number): Promise<void>;
  
  // Labels
  getLabels(): Promise<Label[]>;
  getLabel(id: number): Promise<Label | undefined>;
  createLabel(label: InsertLabel): Promise<Label>;
  updateLabel(id: number, label: Partial<InsertLabel>): Promise<Label>;
  deleteLabel(id: number): Promise<void>;
  getLabelByIdentifier(identifier: string): Promise<Label | null>;
  updateLabelWithdrawal(id: number, withdrawalData: { withdrawalDate: Date; withdrawalResponsibleId: number }): Promise<Label>;
  generateLabelIdentifier(): Promise<string>;
  
  // Printers operations
  getPrinters(): Promise<Printer[]>;
  getPrinter(id: number): Promise<Printer | undefined>;
  createPrinter(printer: InsertPrinter): Promise<Printer>;
  updatePrinter(id: number, printer: Partial<InsertPrinter>): Promise<Printer>;
  deletePrinter(id: number): Promise<void>;
  getDefaultPrinter(): Promise<Printer | undefined>;
  setDefaultPrinter(id: number): Promise<Printer>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  // Points of Sale operations
  async getPointsOfSale(): Promise<PointOfSale[]> {
    return await db.select().from(pointsOfSale).orderBy(pointsOfSale.name);
  }

  async getPointOfSale(id: number): Promise<PointOfSale | undefined> {
    const [pos] = await db.select().from(pointsOfSale).where(eq(pointsOfSale.id, id));
    return pos;
  }

  async createPointOfSale(pos: InsertPointOfSale): Promise<PointOfSale> {
    const [created] = await db.insert(pointsOfSale).values(pos).returning();
    return created;
  }

  async updatePointOfSale(id: number, pos: Partial<InsertPointOfSale>): Promise<PointOfSale> {
    const [updated] = await db
      .update(pointsOfSale)
      .set({ ...pos, updatedAt: new Date() })
      .where(eq(pointsOfSale.id, id))
      .returning();
    return updated;
  }

  async deletePointOfSale(id: number): Promise<void> {
    await db.delete(pointsOfSale).where(eq(pointsOfSale.id, id));
  }
  
  // Beer Styles operations
  async getBeerStyles(): Promise<BeerStyle[]> {
    return await db.select().from(beerStyles).orderBy(beerStyles.name);
  }

  async getBeerStyle(id: number): Promise<BeerStyle | undefined> {
    const [style] = await db.select().from(beerStyles).where(eq(beerStyles.id, id));
    return style;
  }

  async createBeerStyle(style: InsertBeerStyle): Promise<BeerStyle> {
    const [created] = await db.insert(beerStyles).values(style).returning();
    return created;
  }

  async updateBeerStyle(id: number, style: Partial<InsertBeerStyle>): Promise<BeerStyle> {
    const [updated] = await db
      .update(beerStyles)
      .set({ ...style, updatedAt: new Date() })
      .where(eq(beerStyles.id, id))
      .returning();
    return updated;
  }

  async deleteBeerStyle(id: number): Promise<void> {
    await db.delete(beerStyles).where(eq(beerStyles.id, id));
  }
  
  // Devices operations
  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices).orderBy(devices.createdAt);
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async getDeviceByCode(code: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.code, code));
    return device;
  }



  async createDevice(device: InsertDevice): Promise<Device> {
    const [created] = await db
      .insert(devices)
      .values(device)
      .returning();
    return created;
  }

  async updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device> {
    const [updated] = await db
      .update(devices)
      .set({ ...device, updatedAt: new Date() })
      .where(eq(devices.id, id))
      .returning();
    return updated;
  }

  async deleteDevice(id: number): Promise<void> {
    await db.delete(devices).where(eq(devices.id, id));
  }

  async updateDeviceHeartbeat(deviceId: number): Promise<void> {
    await db
      .update(devices)
      .set({ lastHeartbeat: new Date() })
      .where(eq(devices.id, deviceId));
  }
  
  // Taps operations
  async getTaps(): Promise<TapWithRelations[]> {
    const results = await db
      .select({
        tap: taps,
        pointOfSale: pointsOfSale,
        currentBeerStyle: beerStyles,
        device: devices,
      })
      .from(taps)
      .leftJoin(pointsOfSale, eq(taps.posId, pointsOfSale.id))
      .leftJoin(beerStyles, eq(taps.currentBeerStyleId, beerStyles.id))
      .leftJoin(devices, eq(taps.deviceId, devices.id))
      .where(eq(taps.isActive, true))
      .orderBy(taps.id);

    // Calculate volume for each tap based on last keg change
    const tapsWithVolume = await Promise.all(
      results.map(async ({ tap, pointOfSale, currentBeerStyle, device }) => {
        // Get last pour event for display
        const [lastPourEvent] = await db
          .select()
          .from(pourEvents)
          .where(eq(pourEvents.tapId, tap.id))
          .orderBy(desc(pourEvents.datetime))
          .limit(1);

        // Get last keg change to determine capacity
        const [lastKegChange] = await db
          .select()
          .from(kegChangeEvents)
          .where(eq(kegChangeEvents.tapId, tap.id))
          .orderBy(desc(kegChangeEvents.datetime))
          .limit(1);

        let currentVolumeAvailableMl = 0;
        
        if (lastKegChange) {
          // Calculate total consumption since last keg change
          const consumptionResult = await db
            .select({
              totalConsumption: sum(pourEvents.pourVolumeMl),
            })
            .from(pourEvents)
            .where(
              and(
                eq(pourEvents.tapId, tap.id),
                gte(pourEvents.datetime, lastKegChange.datetime)
              )
            );
            
          const totalConsumptionMl = Number(consumptionResult[0]?.totalConsumption || 0);
          const kegCapacityMl = lastKegChange.kegCapacityLiters * 1000;
          currentVolumeAvailableMl = Math.max(0, kegCapacityMl - totalConsumptionMl);
        }
        
        return {
          ...tap,
          pointOfSale: pointOfSale || undefined,
          currentBeerStyle: currentBeerStyle || undefined,
          device: device || undefined,
          currentVolumeAvailableMl,
          kegCapacityMl: lastKegChange ? lastKegChange.kegCapacityLiters * 1000 : 0,
          lastPourEvent: lastPourEvent ? {
            ...lastPourEvent,
            datetime: lastPourEvent.datetime.toISOString(),
          } as any : undefined,
        };
      })
    );

    return tapsWithVolume;
  }

  async getTap(id: number): Promise<TapWithRelations | undefined> {
    const [result] = await db
      .select({
        tap: taps,
        pointOfSale: pointsOfSale,
        currentBeerStyle: beerStyles,
        device: devices,
      })
      .from(taps)
      .leftJoin(pointsOfSale, eq(taps.posId, pointsOfSale.id))
      .leftJoin(beerStyles, eq(taps.currentBeerStyleId, beerStyles.id))
      .leftJoin(devices, eq(taps.deviceId, devices.id))
      .where(eq(taps.id, id));

    if (!result) return undefined;

    // Get last pour event
    const [lastEvent] = await db
      .select()
      .from(pourEvents)
      .where(eq(pourEvents.tapId, id))
      .orderBy(desc(pourEvents.datetime))
      .limit(1);

    // Get last keg change to calculate volume
    const [lastKegChange] = await db
      .select()
      .from(kegChangeEvents)
      .where(eq(kegChangeEvents.tapId, id))
      .orderBy(desc(kegChangeEvents.datetime))
      .limit(1);

    let currentVolumeAvailableMl = 0;
    
    if (lastKegChange) {
      // Calculate total consumption since last keg change
      const consumptionResult = await db
        .select({
          totalConsumption: sum(pourEvents.pourVolumeMl),
        })
        .from(pourEvents)
        .where(
          and(
            eq(pourEvents.tapId, id),
            gte(pourEvents.datetime, lastKegChange.datetime)
          )
        );
        
      const totalConsumptionMl = Number(consumptionResult[0]?.totalConsumption || 0);
      const kegCapacityMl = lastKegChange.kegCapacityLiters * 1000;
      currentVolumeAvailableMl = Math.max(0, kegCapacityMl - totalConsumptionMl);
    }

    return {
      ...result.tap,
      pointOfSale: result.pointOfSale || undefined,
      currentBeerStyle: result.currentBeerStyle || undefined,
      device: result.device || undefined,
      currentVolumeAvailableMl,
      kegCapacityMl: lastKegChange ? lastKegChange.kegCapacityLiters * 1000 : 0,
      lastPourEvent: lastEvent ? {
        ...lastEvent,
        datetime: lastEvent.datetime.toISOString(),
      } as any : undefined,
    };
  }

  async createTap(tap: InsertTap): Promise<Tap> {
    // Check if device is already assigned to another tap
    if (tap.deviceId) {
      const existingTap = await db
        .select()
        .from(taps)
        .where(and(
          eq(taps.deviceId, tap.deviceId),
          eq(taps.isActive, true)
        ))
        .limit(1);
      
      if (existingTap.length > 0) {
        throw new Error(`Device is already assigned to tap: ${existingTap[0].name}`);
      }
    }

    const [created] = await db.insert(taps).values(tap).returning();
    return created;
  }

  async updateTap(id: number, tap: Partial<InsertTap>): Promise<Tap> {
    // Check if device is already assigned to another tap
    if (tap.deviceId) {
      const existingTap = await db
        .select()
        .from(taps)
        .where(and(
          eq(taps.deviceId, tap.deviceId),
          eq(taps.isActive, true)
        ))
        .limit(1);
      
      if (existingTap.length > 0 && existingTap[0].id !== id) {
        throw new Error(`Device is already assigned to tap: ${existingTap[0].name}`);
      }
    }

    const [updated] = await db
      .update(taps)
      .set({ ...tap, updatedAt: new Date() })
      .where(eq(taps.id, id))
      .returning();
    return updated;
  }

  async deleteTap(id: number): Promise<void> {
    await db.update(taps).set({ isActive: false }).where(eq(taps.id, id));
  }
  
  // Pour Events operations
  async createPourEvent(event: InsertPourEvent): Promise<PourEvent> {
    // Get current tap information to capture snapshot data
    const currentTap = await this.getTap(event.tapId);
    
    // The event.totalVolumeMl contains the individual pour volume from ESP32
    const pourVolumeMl = event.totalVolumeMl;

    // Capture snapshot information at the moment of creation
    const eventWithSnapshot = {
      ...event,
      totalVolumeMl: pourVolumeMl, // Individual volume for this event
      pourVolumeMl: pourVolumeMl,   // Same as totalVolumeMl for individual events
      tapName: currentTap?.name || null,
      posName: currentTap?.pointOfSale?.name || null,
      beerStyleName: currentTap?.currentBeerStyle?.name || null,
      deviceCode: currentTap?.device?.code || null,
    };

    const [created] = await db
      .insert(pourEvents)
      .values(eventWithSnapshot)
      .returning();

    return created;
  }

  async getPourEvents(startDate?: Date, endDate?: Date, tapId?: number): Promise<PourEventWithRelations[]> {
    let query = db
      .select()
      .from(pourEvents);

    const conditions = [];
    if (startDate) conditions.push(gte(pourEvents.datetime, startDate));
    if (endDate) conditions.push(lte(pourEvents.datetime, endDate));
    if (tapId) conditions.push(eq(pourEvents.tapId, tapId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(pourEvents.datetime));

    return results.map((pourEvent) => ({
      ...pourEvent,
      tap: {
        id: pourEvent.tapId,
        name: pourEvent.tapName || '',
        pointOfSale: pourEvent.posName ? { name: pourEvent.posName } : undefined,
        currentBeerStyle: pourEvent.beerStyleName ? { name: pourEvent.beerStyleName } : undefined,
      },
    } as PourEventWithRelations));
  }

  async getRecentPourEvents(limit = 10): Promise<PourEventWithRelations[]> {
    const results = await db
      .select()
      .from(pourEvents)
      .orderBy(desc(pourEvents.datetime))
      .limit(limit);

    // Filter out events that don't have snapshot data captured
    const validEvents = results.filter(event => {
      // Only keep events that have captured snapshot data (tapName is not null)
      return event.tapName !== null && event.tapName !== undefined;
    });

    return validEvents.map((pourEvent) => ({
      ...pourEvent,
      tap: {
        id: pourEvent.tapId,
        name: pourEvent.tapName || `Torneira ${pourEvent.tapId}`,
        pointOfSale: pourEvent.posName ? { name: pourEvent.posName } : undefined,
        currentBeerStyle: pourEvent.beerStyleName ? { 
          name: pourEvent.beerStyleName,
          ebcColor: pourEvent.beerStyleEbcColor 
        } : undefined,
      },
    } as PourEventWithRelations));
  }
  
  // Keg Change Events operations
  async createKegChangeEvent(event: InsertKegChangeEvent): Promise<KegChangeEvent> {
    const [created] = await db.insert(kegChangeEvents).values(event).returning();
    return created;
  }

  async getKegChangeEvents(startDate?: Date, endDate?: Date, tapId?: number) {
    const conditions = [];
    if (startDate) conditions.push(gte(kegChangeEvents.datetime, startDate));
    if (endDate) conditions.push(lte(kegChangeEvents.datetime, endDate));
    if (tapId) conditions.push(eq(kegChangeEvents.tapId, tapId));

    let query = db
      .select({
        kegChangeEvent: kegChangeEvents,
        tap: taps,
        pointOfSale: pointsOfSale,
      })
      .from(kegChangeEvents)
      .leftJoin(taps, eq(kegChangeEvents.tapId, taps.id))
      .leftJoin(pointsOfSale, eq(taps.posId, pointsOfSale.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(kegChangeEvents.datetime));

    return results.map(({ kegChangeEvent, tap, pointOfSale }) => ({
      ...kegChangeEvent,
      tap: {
        ...tap!,
        pointOfSale: pointOfSale || undefined,
      },
    }));
  }
  
  // Analytics
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    // Active taps count
    const [activeTapsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(taps)
      .where(eq(taps.isActive, true));

    // Today's volume in liters
    const [todayVolumeResult] = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${pourEvents.pourVolumeMl}), 0)` 
      })
      .from(pourEvents)
      .where(gte(pourEvents.datetime, today));

    // Week's volume in liters
    const [weekVolumeResult] = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${pourEvents.pourVolumeMl}), 0)` 
      })
      .from(pourEvents)
      .where(gte(pourEvents.datetime, weekAgo));

    // For now, we'll calculate low kegs by checking each tap individually
    // This could be optimized later with a more complex SQL query
    const activeTaps = await this.getTaps();
    const lowKegs = activeTaps.filter(tap => {
      // Consider low if less than 10% of capacity remains
      const totalCapacity = tap.currentVolumeAvailableMl + (30 * 1000 - tap.currentVolumeAvailableMl); // Assume 30L default
      return tap.currentVolumeAvailableMl < (totalCapacity * 0.1);
    }).length;

    return {
      activeTaps: activeTapsResult.count || 0,
      todayVolumeLiters: Math.round((todayVolumeResult.total || 0) / 1000 * 10) / 10,
      weekVolumeLiters: Math.round((weekVolumeResult.total || 0) / 1000 * 10) / 10,
      lowKegs: lowKegs,
    };
  }

  // Roles operations
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values(roleData)
      .returning();
    return role;
  }

  async updateRole(id: number, roleData: Partial<InsertRole>): Promise<Role> {
    const [role] = await db
      .update(roles)
      .set({ ...roleData, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  // Employees operations
  async getEmployees(): Promise<EmployeeWithRelations[]> {
    // Use sql operator from Drizzle ORM for complex queries with arrays
    const result = await db.execute(sql`
      SELECT 
        e.id, e.email, e.password, e.first_name as "firstName", e.last_name as "lastName",
        e.whatsapp, e.role_id as "roleId", e.employment_types as "employmentTypes", 
        e.avatar, e.is_active as "isActive", e.created_at as "createdAt", e.updated_at as "updatedAt",
        r.id as "role_id", r.name as "role_name", r.description as "role_description", 
        r.permissions as "role_permissions", r.created_at as "role_createdAt", r.updated_at as "role_updatedAt"
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      ORDER BY e.first_name, e.last_name
    `);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      whatsapp: row.whatsapp,
      roleId: row.roleId,
      employmentTypes: row.employmentTypes || ["Funcionário"],
      avatar: row.avatar,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      role: row.role_id ? {
        id: row.role_id,
        name: row.role_name,
        description: row.role_description,
        permissions: row.role_permissions,
        createdAt: row.role_createdAt,
        updatedAt: row.role_updatedAt,
      } : undefined,
    })) as EmployeeWithRelations[];
  }

  async getEmployee(id: number): Promise<EmployeeWithRelations | undefined> {
    const result = await db.execute(sql`
      SELECT 
        e.id, e.email, e.password, e.first_name as "firstName", e.last_name as "lastName",
        e.whatsapp, e.role_id as "roleId", e.employment_types as "employmentTypes", 
        e.avatar, e.is_active as "isActive", e.created_at as "createdAt", e.updated_at as "updatedAt",
        r.id as "role_id", r.name as "role_name", r.description as "role_description", 
        r.permissions as "role_permissions", r.created_at as "role_createdAt", r.updated_at as "role_updatedAt"
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = ${id}
      LIMIT 1
    `);
    
    if (!result.rows.length) return undefined;
    
    const row: any = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      whatsapp: row.whatsapp,
      roleId: row.roleId,
      employmentTypes: row.employmentTypes || ["Funcionário"],
      avatar: row.avatar,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      role: row.role_id ? {
        id: row.role_id,
        name: row.role_name,
        description: row.role_description,
        permissions: row.role_permissions,
        createdAt: row.role_createdAt,
        updatedAt: row.role_updatedAt,
      } : undefined,
    } as EmployeeWithRelations;
  }

  async getEmployeeByEmail(email: string): Promise<EmployeeWithRelations | undefined> {
    const result = await db.execute(sql`
      SELECT 
        e.id, e.email, e.password, e.first_name as "firstName", e.last_name as "lastName",
        e.whatsapp, e.role_id as "roleId", e.employment_types as "employmentTypes", 
        e.avatar, e.is_active as "isActive", e.created_at as "createdAt", e.updated_at as "updatedAt",
        r.id as "role_id", r.name as "role_name", r.description as "role_description", 
        r.permissions as "role_permissions", r.created_at as "role_createdAt", r.updated_at as "role_updatedAt"
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.email = ${email}
      LIMIT 1
    `);

    if (!result.rows.length) return undefined;

    const row: any = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      whatsapp: row.whatsapp,
      roleId: row.roleId,
      employmentTypes: row.employmentTypes || ["Funcionário"],
      avatar: row.avatar,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      role: row.role_id ? {
        id: row.role_id,
        name: row.role_name,
        description: row.role_description,
        permissions: row.role_permissions,
        createdAt: row.role_createdAt,
        updatedAt: row.role_updatedAt,
      } : undefined,
    } as EmployeeWithRelations;
  }

  async authenticateEmployeeByPin(pin: string): Promise<EmployeeWithRelations | null> {
    try {
      const bcrypt = await import('bcryptjs');
      
      const result = await db.execute(sql`
        SELECT 
          e.id, e.email, e.password, e.pin, e.first_name as "firstName", e.last_name as "lastName",
          e.whatsapp, e.role_id as "roleId", e.employment_types as "employmentTypes", 
          e.avatar, e.is_active as "isActive", e.created_at as "createdAt", e.updated_at as "updatedAt",
          r.id as "role_id", r.name as "role_name", r.description as "role_description", 
          r.permissions as "role_permissions", r.created_at as "role_createdAt", r.updated_at as "role_updatedAt"
        FROM employees e
        LEFT JOIN roles r ON e.role_id = r.id
        WHERE e.is_active = true AND e.pin IS NOT NULL
      `);

      // Check all active employees with PINs
      for (const row of result.rows) {
        const employee: any = row;
        if (employee.pin && await bcrypt.compare(pin, employee.pin)) {
          return {
            id: employee.id,
            email: employee.email,
            password: employee.password,
            firstName: employee.firstName,
            lastName: employee.lastName,
            whatsapp: employee.whatsapp,
            roleId: employee.roleId,
            employmentTypes: employee.employmentTypes || ["Funcionário"],
            avatar: employee.avatar,
            isActive: employee.isActive,
            createdAt: employee.createdAt,
            updatedAt: employee.updatedAt,
            role: employee.role_id ? {
              id: employee.role_id,
              name: employee.role_name,
              description: employee.role_description,
              permissions: employee.role_permissions,
              createdAt: employee.role_createdAt,
              updatedAt: employee.role_updatedAt,
            } : undefined,
          } as EmployeeWithRelations;
        }
      }

      return null;
    } catch (error) {
      console.error('Error authenticating employee by PIN:', error);
      return null;
    }
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    // Hash password if provided
    if (employeeData.password) {
      const { hashPassword } = await import('./localAuth');
      employeeData.password = await hashPassword(employeeData.password);
    }
    
    // Hash PIN if provided
    if (employeeData.pin && employeeData.pin.trim() !== '') {
      const { hashPassword } = await import('./localAuth');
      employeeData.pin = await hashPassword(employeeData.pin);
    }
    
    const [employee] = await db
      .insert(employees)
      .values(employeeData)
      .returning();
    return employee;
  }

  async updateEmployee(id: number, employeeData: Partial<InsertEmployee>): Promise<Employee> {
    // Hash password if provided and not empty
    if (employeeData.password && employeeData.password.trim() !== '') {
      const { hashPassword } = await import('./localAuth');
      employeeData.password = await hashPassword(employeeData.password);
    } else if (employeeData.password === '') {
      // Don't update password if empty string is provided
      delete employeeData.password;
    }
    
    // Hash PIN if provided and not empty
    if (employeeData.pin && employeeData.pin.trim() !== '') {
      const { hashPassword } = await import('./localAuth');
      employeeData.pin = await hashPassword(employeeData.pin);
    } else if (employeeData.pin === '') {
      // Don't update PIN if empty string is provided
      delete employeeData.pin;
    }
    
    const [employee] = await db
      .update(employees)
      .set({ ...employeeData, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return employee;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // Units operations
  async getUnits(): Promise<Unit[]> {
    return await db.select().from(units).orderBy(units.id);
  }

  async getUnit(id: number): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit;
  }

  async createUnit(unitData: InsertUnit): Promise<Unit> {
    const [unit] = await db
      .insert(units)
      .values(unitData)
      .returning();
    return unit;
  }

  async updateUnit(id: number, unitData: Partial<InsertUnit>): Promise<Unit> {
    const [unit] = await db
      .update(units)
      .set({ ...unitData, updatedAt: new Date() })
      .where(eq(units.id, id))
      .returning();
    return unit;
  }

  async deleteUnit(id: number): Promise<void> {
    await db.delete(units).where(eq(units.id, id));
  }

  // CO2 Refills operations
  async getCo2Refills(): Promise<Co2RefillWithRelations[]> {
    const result = await db
      .select()
      .from(co2Refills)
      .leftJoin(units, eq(co2Refills.unitId, units.id))
      .orderBy(desc(co2Refills.date));

    return result.map(row => ({
      ...row.co2_refills,
      unit: row.units || undefined,
    }));
  }

  async getCo2Refill(id: number): Promise<Co2RefillWithRelations | undefined> {
    const result = await db
      .select()
      .from(co2Refills)
      .leftJoin(units, eq(co2Refills.unitId, units.id))
      .where(eq(co2Refills.id, id));

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      ...row.co2_refills,
      unit: row.units || undefined,
    };
  }

  async createCo2Refill(refillData: InsertCo2Refill): Promise<Co2Refill> {
    const [refill] = await db
      .insert(co2Refills)
      .values({
        date: refillData.date,
        supplier: refillData.supplier,
        kilosRefilled: refillData.kilosRefilled.toString(),
        valuePaid: refillData.valuePaid.toString(),
        unitId: refillData.unitId,
        transactionType: refillData.transactionType || 'entrada',
      })
      .returning();
    return refill;
  }

  async updateCo2Refill(id: number, refillData: Partial<InsertCo2Refill>): Promise<Co2Refill> {
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (refillData.date) updateData.date = refillData.date;
    if (refillData.supplier) updateData.supplier = refillData.supplier;
    if (refillData.kilosRefilled) updateData.kilosRefilled = refillData.kilosRefilled.toString();
    if (refillData.valuePaid) updateData.valuePaid = refillData.valuePaid.toString();
    if (refillData.unitId) updateData.unitId = refillData.unitId;

    const [refill] = await db
      .update(co2Refills)
      .set(updateData)
      .where(eq(co2Refills.id, id))
      .returning();
    return refill;
  }

  async deleteCo2Refill(id: number): Promise<void> {
    await db.delete(co2Refills).where(eq(co2Refills.id, id));
  }

  async getCo2Stats(): Promise<{
    last30DaysTotal: { kg: number; cost: number };
    previous30DaysTotal: { kg: number; cost: number };
    percentageChange: number;
    kgPerLiterLast30Days: number;
    kgPerLiterPrevious30Days: number;
    efficiencyChange: number;
    last30DaysWithdrawals: { kg: number; cost: number };
    previous30DaysWithdrawals: { kg: number; cost: number };
    withdrawalPercentageChange: number;
  }> {
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous60Days = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    // IDs das unidades para considerar: Don Juarez Grão Pará (1), Beer Truck (3) e Chopeira (4)
    const targetUnits = [1, 3, 4];

    // Recargas dos últimos 30 dias (apenas unidades específicas e apenas entradas)
    const last30DaysRefills = await db
      .select()
      .from(co2Refills)
      .where(and(
        gte(co2Refills.date, last30Days),
        eq(co2Refills.transactionType, 'entrada'),
        sql`${co2Refills.unitId} IN (${sql.join(targetUnits, sql`, `)})`
      ));

    // Recargas dos 30 dias anteriores (30-60 dias atrás, apenas unidades específicas e apenas entradas)
    const previous30DaysRefills = await db
      .select()
      .from(co2Refills)
      .where(and(
        gte(co2Refills.date, previous60Days),
        lt(co2Refills.date, last30Days),
        eq(co2Refills.transactionType, 'entrada'),
        sql`${co2Refills.unitId} IN (${sql.join(targetUnits, sql`, `)})`
      ));

    // Retiradas dos últimos 30 dias (apenas unidades específicas e apenas saídas)
    const last30DaysWithdrawalsData = await db
      .select()
      .from(co2Refills)
      .where(and(
        gte(co2Refills.date, last30Days),
        eq(co2Refills.transactionType, 'saida'),
        sql`${co2Refills.unitId} IN (${sql.join(targetUnits, sql`, `)})`
      ));

    // Retiradas dos 30 dias anteriores (30-60 dias atrás, apenas unidades específicas e apenas saídas)
    const previous30DaysWithdrawalsData = await db
      .select()
      .from(co2Refills)
      .where(and(
        gte(co2Refills.date, previous60Days),
        lt(co2Refills.date, last30Days),
        eq(co2Refills.transactionType, 'saida'),
        sql`${co2Refills.unitId} IN (${sql.join(targetUnits, sql`, `)})`
      ));

    // Calcular totais dos últimos 30 dias
    const last30DaysTotal = last30DaysRefills.reduce(
      (acc, refill) => ({
        kg: acc.kg + parseFloat(refill.kilosRefilled),
        cost: acc.cost + parseFloat(refill.valuePaid)
      }),
      { kg: 0, cost: 0 }
    );

    // Calcular totais dos 30 dias anteriores
    const previous30DaysTotal = previous30DaysRefills.reduce(
      (acc, refill) => ({
        kg: acc.kg + parseFloat(refill.kilosRefilled),
        cost: acc.cost + parseFloat(refill.valuePaid)
      }),
      { kg: 0, cost: 0 }
    );

    // Calcular totais de retiradas dos últimos 30 dias
    const last30DaysWithdrawals = last30DaysWithdrawalsData.reduce(
      (acc, withdrawal) => ({
        kg: acc.kg + parseFloat(withdrawal.kilosRefilled),
        cost: acc.cost + parseFloat(withdrawal.valuePaid)
      }),
      { kg: 0, cost: 0 }
    );

    // Calcular totais de retiradas dos 30 dias anteriores
    const previous30DaysWithdrawals = previous30DaysWithdrawalsData.reduce(
      (acc, withdrawal) => ({
        kg: acc.kg + parseFloat(withdrawal.kilosRefilled),
        cost: acc.cost + parseFloat(withdrawal.valuePaid)
      }),
      { kg: 0, cost: 0 }
    );

    // Calcular porcentagem de mudança
    const percentageChange = previous30DaysTotal.cost > 0 
      ? ((last30DaysTotal.cost - previous30DaysTotal.cost) / previous30DaysTotal.cost) * 100
      : 0;

    // Calcular porcentagem de mudança para retiradas
    const withdrawalPercentageChange = previous30DaysWithdrawals.kg > 0 
      ? ((last30DaysWithdrawals.kg - previous30DaysWithdrawals.kg) / previous30DaysWithdrawals.kg) * 100
      : 0;

    // Calcular consumo de chope dos últimos 30 dias
    const last30DaysPours = await db
      .select()
      .from(pourEvents)
      .where(gte(pourEvents.datetime, last30Days));

    const previous30DaysPours = await db
      .select()
      .from(pourEvents)
      .where(and(
        gte(pourEvents.datetime, previous60Days),
        lt(pourEvents.datetime, last30Days)
      ));

    // Calcular volume total em litros
    const last30DaysVolumeLiters = last30DaysPours.reduce(
      (acc, pour) => acc + (pour.totalVolumeMl / 1000), 0
    );

    const previous30DaysVolumeLiters = previous30DaysPours.reduce(
      (acc, pour) => acc + (pour.totalVolumeMl / 1000), 0
    );

    // Calcular kg de CO2 líquido (recargas - retiradas) por litro
    const netCo2Last30Days = last30DaysTotal.kg - last30DaysWithdrawals.kg;
    const netCo2Previous30Days = previous30DaysTotal.kg - previous30DaysWithdrawals.kg;

    const kgPerLiterLast30Days = last30DaysVolumeLiters > 0 
      ? netCo2Last30Days / last30DaysVolumeLiters 
      : 0;

    const kgPerLiterPrevious30Days = previous30DaysVolumeLiters > 0 
      ? netCo2Previous30Days / previous30DaysVolumeLiters 
      : 0;

    // Calcular mudança na eficiência
    const efficiencyChange = kgPerLiterPrevious30Days > 0 
      ? ((kgPerLiterLast30Days - kgPerLiterPrevious30Days) / kgPerLiterPrevious30Days) * 100
      : 0;

    return {
      last30DaysTotal,
      previous30DaysTotal,
      percentageChange,
      kgPerLiterLast30Days,
      kgPerLiterPrevious30Days,
      efficiencyChange,
      last30DaysWithdrawals,
      previous30DaysWithdrawals,
      withdrawalPercentageChange
    };
  }

  // Freelancer Time Entries operations
  async getFreelancerTimeEntries(startDate?: Date, endDate?: Date, freelancerPhone?: string): Promise<FreelancerTimeEntryWithRelations[]> {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(freelancerTimeEntries.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(freelancerTimeEntries.timestamp, endDate));
    }
    if (freelancerPhone) {
      conditions.push(eq(freelancerTimeEntries.freelancerPhone, freelancerPhone));
    }

    const result = await db
      .select()
      .from(freelancerTimeEntries)
      .leftJoin(employees, eq(freelancerTimeEntries.employeeId, employees.id))
      .leftJoin(roles, eq(employees.roleId, roles.id))
      .leftJoin(units, eq(freelancerTimeEntries.unitId, units.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(freelancerTimeEntries.timestamp));
    
    return result.map(row => ({
      ...row.freelancer_time_entries,
      employee: row.employees ? {
        ...row.employees,
        role: row.roles || undefined,
      } : undefined,
      unit: row.units || undefined,
    }));
  }

  async getFreelancerTimeEntry(id: number): Promise<FreelancerTimeEntryWithRelations | undefined> {
    const [result] = await db.select({
      id: freelancerTimeEntries.id,
      employeeId: freelancerTimeEntries.employeeId,
      freelancerPhone: freelancerTimeEntries.freelancerPhone,
      freelancerName: freelancerTimeEntries.freelancerName,
      unitId: freelancerTimeEntries.unitId,
      entryType: freelancerTimeEntries.entryType,
      timestamp: freelancerTimeEntries.timestamp,
      message: freelancerTimeEntries.message,
      isManualEntry: freelancerTimeEntries.isManualEntry,
      notes: freelancerTimeEntries.notes,
      createdAt: freelancerTimeEntries.createdAt,
      updatedAt: freelancerTimeEntries.updatedAt,
      unit: {
        id: units.id,
        name: units.name,
        address: units.address,
        createdAt: units.createdAt,
        updatedAt: units.updatedAt,
      }
    }).from(freelancerTimeEntries)
    .leftJoin(units, eq(freelancerTimeEntries.unitId, units.id))
    .where(eq(freelancerTimeEntries.id, id));

    if (!result) return undefined;

    return {
      id: result.id,
      employeeId: result.employeeId,
      freelancerPhone: result.freelancerPhone,
      freelancerName: result.freelancerName,
      unitId: result.unitId,
      entryType: result.entryType,
      timestamp: result.timestamp,
      message: result.message,
      isManualEntry: result.isManualEntry,
      notes: result.notes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      unit: result.unit?.id ? result.unit : undefined,
    };
  }

  async createFreelancerTimeEntry(entryData: InsertFreelancerTimeEntry): Promise<FreelancerTimeEntry> {
    const [entry] = await db
      .insert(freelancerTimeEntries)
      .values(entryData)
      .returning();
    return entry;
  }

  async updateFreelancerTimeEntry(id: number, entryData: Partial<InsertFreelancerTimeEntry>): Promise<FreelancerTimeEntry> {
    const [entry] = await db
      .update(freelancerTimeEntries)
      .set({ ...entryData, updatedAt: new Date() })
      .where(eq(freelancerTimeEntries.id, id))
      .returning();
    return entry;
  }

  async deleteFreelancerTimeEntry(id: number): Promise<void> {
    await db.delete(freelancerTimeEntries).where(eq(freelancerTimeEntries.id, id));
  }

  async getLastEntryUnitForFreelancer(freelancerPhone: string | null, employeeId: number | null): Promise<number | null> {
    const conditions = [];
    
    // Build search conditions based on what's available
    if (freelancerPhone) {
      conditions.push(eq(freelancerTimeEntries.freelancerPhone, freelancerPhone));
    }
    if (employeeId) {
      conditions.push(eq(freelancerTimeEntries.employeeId, employeeId));
    }
    
    if (conditions.length === 0) {
      return null;
    }

    // Find the last "entrada" entry for this freelancer
    const [result] = await db
      .select({ unitId: freelancerTimeEntries.unitId })
      .from(freelancerTimeEntries)
      .where(and(
        or(...conditions),
        eq(freelancerTimeEntries.entryType, 'entrada')
      ))
      .orderBy(desc(freelancerTimeEntries.timestamp))
      .limit(1);

    return result?.unitId || null;
  }

  async getFreelancerStats(startDate: Date, endDate: Date): Promise<{
    freelancerPhone: string;
    freelancerName: string | null;
    totalHours: number;
    totalDays: number;
    entries: FreelancerTimeEntryWithRelations[];
  }[]> {
    // Buscar todas as entradas no período
    const entries = await this.getFreelancerTimeEntries(startDate, endDate);
    
    // Agrupar por freelancer
    const freelancerGroups = new Map<string, FreelancerTimeEntryWithRelations[]>();
    
    for (const entry of entries) {
      const phone = entry.freelancerPhone || 'unknown';
      if (!freelancerGroups.has(phone)) {
        freelancerGroups.set(phone, []);
      }
      freelancerGroups.get(phone)!.push(entry);
    }

    const stats: {
      freelancerPhone: string;
      freelancerName: string | null;
      totalHours: number;
      totalDays: number;
      entries: FreelancerTimeEntryWithRelations[];
    }[] = [];

    freelancerGroups.forEach((freelancerEntries, phone) => {
      // Ordenar por timestamp
      freelancerEntries.sort((a: FreelancerTimeEntryWithRelations, b: FreelancerTimeEntryWithRelations) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      let totalHours = 0;
      const workDays = new Set<string>();
      
      // Primeiro, criar pares entrada/saída baseados na lógica de negócio
      const workSessions = [];
      const entradas = freelancerEntries.filter(e => e.entryType === 'entrada');
      const saidas = freelancerEntries.filter(e => e.entryType === 'saida');
      
      // Para cada entrada, encontrar a saída correspondente mais próxima
      for (const entrada of entradas) {
        const entradaTime = new Date(entrada.timestamp).getTime();
        
        // Procurar saída mais próxima APÓS a entrada
        let correspondingSaida = saidas.find(saida => {
          const saidaTime = new Date(saida.timestamp).getTime();
          return saidaTime > entradaTime;
        });
        
        // Se não achou saída APÓS entrada, procurar saída antes (considerando regra das 5h)
        if (!correspondingSaida) {
          correspondingSaida = saidas.find(saida => {
            const saidaTime = new Date(saida.timestamp).getTime();
            const saidaHour = new Date(saida.timestamp).getHours();
            // Saída antes da entrada só é válida se for antes das 5h (próximo dia)
            return saidaTime < entradaTime && saidaHour < 5;
          });
        }
        
        if (correspondingSaida) {
          workSessions.push({ entrada, saida: correspondingSaida });
          
          // Remover saída usada para não reutilizar
          const saidaIndex = saidas.indexOf(correspondingSaida);
          saidas.splice(saidaIndex, 1);
        }
      }
      
      // Calcular horas para cada sessão de trabalho
      for (const session of workSessions) {
        const { entrada, saida } = session;
        
        // Adicionar dia de trabalho baseado na entrada
        const entradaDate = new Date(entrada.timestamp);
        const entradaHour = entradaDate.getHours();
        let workDay: string;
        
        if (entradaHour < 5) {
          const previousDay = new Date(entradaDate);
          previousDay.setDate(entradaDate.getDate() - 1);
          workDay = previousDay.toDateString();
        } else {
          workDay = entradaDate.toDateString();
        }
        
        workDays.add(workDay);
        
        // Calcular horas trabalhadas
        let saidaTime = new Date(saida.timestamp).getTime();
        const entradaTime = new Date(entrada.timestamp).getTime();
        
        // Verificar se a saída é antes das 5h e anterior à entrada (deve ser considerada do dia seguinte)
        const saidaHour = new Date(saida.timestamp).getHours();
        
        if (saidaHour < 5 && saidaTime < entradaTime) {
          // Saída é antes das 5h e antes da entrada, adicionar 24h
          saidaTime += 24 * 60 * 60 * 1000;
        }
        
        let hoursWorked = (saidaTime - entradaTime) / (1000 * 60 * 60);
        
        // Validar período razoável (até 24h)
        if (hoursWorked > 0 && hoursWorked <= 24) {
          totalHours += hoursWorked;
        }
      }

      stats.push({
        freelancerPhone: phone,
        freelancerName: freelancerEntries[0]?.freelancerName || null,
        totalHours: Math.round(totalHours * 100) / 100,
        totalDays: workDays.size,
        entries: freelancerEntries,
      });
    });

    return stats.sort((a, b) => b.totalHours - a.totalHours);
  }

  // Products operations
  // Product Categories operations
  async getProductCategories(): Promise<ProductCategory[]> {
    return await db.select().from(productCategories).orderBy(productCategories.name);
  }

  async getProductCategory(id: number): Promise<ProductCategory | undefined> {
    const [category] = await db.select().from(productCategories).where(eq(productCategories.id, id));
    return category;
  }

  async createProductCategory(categoryData: InsertProductCategory): Promise<ProductCategory> {
    const [category] = await db
      .insert(productCategories)
      .values({
        ...categoryData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return category;
  }

  async updateProductCategory(id: number, categoryData: Partial<InsertProductCategory>): Promise<ProductCategory> {
    const [category] = await db
      .update(productCategories)
      .set({
        ...categoryData,
        updatedAt: new Date(),
      })
      .where(eq(productCategories.id, id))
      .returning();
    return category;
  }

  async deleteProductCategory(id: number): Promise<void> {
    await db.delete(productCategories).where(eq(productCategories.id, id));
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.name);
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    console.log('🔍 [STORAGE] === GET PRODUCTS BY CATEGORY ===');
    console.log('🔍 [STORAGE] Category ID:', categoryId);
    
    // Products use category ID as string in stockCategory field, not category name
    const categoryIdStr = categoryId.toString();
    console.log('🔍 [STORAGE] Searching products with stockCategory:', categoryIdStr);
    
    // Filter products by stockCategory matching the category ID
    const filteredProducts = await db.select().from(products)
      .where(eq(products.stockCategory, categoryIdStr))
      .orderBy(products.name);
    
    console.log('🔍 [STORAGE] Found', filteredProducts.length, 'products with matching stockCategory');
    filteredProducts.forEach(product => {
      console.log(`🔍 [STORAGE] - Found product: ${product.name} (ID: ${product.id})`);
    });
    
    console.log('🔍 [STORAGE] === END GET PRODUCTS BY CATEGORY ===');
    return filteredProducts;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductByCode(code: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.code, code));
    return product;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...productData,
        currentValue: productData.currentValue.toString()
      })
      .returning();
    return product;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product> {
    const updateData: any = { ...productData, updatedAt: new Date() };
    if (updateData.currentValue !== undefined) {
      updateData.currentValue = updateData.currentValue.toString();
    }
    
    const [product] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async upsertProductByCode(productData: InsertProduct): Promise<Product> {
    const insertData = {
      ...productData,
      currentValue: productData.currentValue.toString()
    };
    
    const updateData: any = { ...productData, updatedAt: new Date() };
    if (updateData.currentValue !== undefined) {
      updateData.currentValue = updateData.currentValue.toString();
    }
    
    const [product] = await db
      .insert(products)
      .values(insertData)
      .onConflictDoUpdate({
        target: products.code,
        set: updateData,
      })
      .returning();
    return product;
  }

  // Stock Counts operations
  async getStockCounts(): Promise<StockCountWithRelations[]> {
    const result = await db
      .select({
        stockCount: stockCounts,
        responsible: employees,
        unit: units,
      })
      .from(stockCounts)
      .leftJoin(employees, eq(stockCounts.responsibleId, employees.id))
      .leftJoin(units, eq(stockCounts.unitId, units.id))
      .orderBy(desc(stockCounts.createdAt));

    return result.map(row => ({
      ...row.stockCount,
      responsible: row.responsible ? {
        ...row.responsible,
        name: `${row.responsible.firstName} ${row.responsible.lastName}`,
        phone: row.responsible.whatsapp
      } as any : undefined,
      unit: row.unit || undefined,
    })) as any;
  }

  async getStockCount(id: number): Promise<StockCountWithRelations | undefined> {
    const result = await db
      .select({
        stockCount: stockCounts,
        responsible: employees,
        unit: units,
      })
      .from(stockCounts)
      .leftJoin(employees, eq(stockCounts.responsibleId, employees.id))
      .leftJoin(units, eq(stockCounts.unitId, units.id))
      .where(eq(stockCounts.id, id));

    if (result.length === 0) return undefined;

    const stockCount = result[0];
    
    // Get items for this stock count
    const items = await this.getStockCountItems(id);

    return {
      ...stockCount.stockCount,
      responsible: stockCount.responsible ? {
        ...stockCount.responsible,
        name: `${stockCount.responsible.firstName} ${stockCount.responsible.lastName}`,
        phone: stockCount.responsible.whatsapp
      } as any : undefined,
      unit: stockCount.unit || undefined,
      items,
    };
  }

  async getStockCountByPublicToken(publicToken: string): Promise<StockCountWithRelations | undefined> {
    const result = await db
      .select({
        stockCount: stockCounts,
        responsible: employees,
        unit: units,
      })
      .from(stockCounts)
      .leftJoin(employees, eq(stockCounts.responsibleId, employees.id))
      .leftJoin(units, eq(stockCounts.unitId, units.id))
      .where(eq(stockCounts.publicToken, publicToken));

    if (result.length === 0) return undefined;

    const stockCount = result[0];
    
    // Get items for this stock count
    const items = await this.getStockCountItems(stockCount.stockCount.id);

    return {
      ...stockCount.stockCount,
      responsible: stockCount.responsible ? {
        ...stockCount.responsible,
        name: `${stockCount.responsible.firstName} ${stockCount.responsible.lastName}`,
        phone: stockCount.responsible.whatsapp
      } as any : undefined,
      unit: stockCount.unit || undefined,
      items,
    };
  }

  async createStockCount(stockCountData: InsertStockCount): Promise<StockCount> {
    const [stockCount] = await db
      .insert(stockCounts)
      .values(stockCountData)
      .returning();
    return stockCount;
  }

  async updateStockCount(id: number, stockCountData: Partial<InsertStockCount>): Promise<StockCount> {
    const [stockCount] = await db
      .update(stockCounts)
      .set({ ...stockCountData, updatedAt: new Date() })
      .where(eq(stockCounts.id, id))
      .returning();
    return stockCount;
  }

  async deleteStockCount(id: number): Promise<void> {
    await db.delete(stockCounts).where(eq(stockCounts.id, id));
  }

  // Status transition methods
  async startStockCount(id: number): Promise<StockCount> {
    // Generates public token and changes status from 'rascunho' to 'pronta_para_contagem'
    const publicToken = this.generateRandomToken();
    const [stockCount] = await db
      .update(stockCounts)
      .set({ 
        status: 'pronta_para_contagem',
        publicToken: publicToken,
        updatedAt: new Date() 
      })
      .where(and(eq(stockCounts.id, id), eq(stockCounts.status, 'rascunho')))
      .returning();
    
    if (!stockCount) {
      throw new Error('Contagem não encontrada ou não está em status de rascunho');
    }
    
    return stockCount;
  }

  async beginCounting(publicToken: string): Promise<StockCount> {
    console.log(`[STORAGE] beginCounting called with token: ${publicToken}`);
    
    // First, let's check if the stock count exists and what status it has
    const existingCount = await db
      .select()
      .from(stockCounts)
      .where(eq(stockCounts.publicToken, publicToken))
      .limit(1);
    
    console.log(`[STORAGE] Found stock count:`, existingCount[0] || 'NOT FOUND');
    
    if (existingCount.length === 0) {
      throw new Error('Contagem não encontrada com este token');
    }
    
    const currentStatus = existingCount[0].status;
    console.log(`[STORAGE] Current status: ${currentStatus}`);
    
    // Changes status from 'pronta_para_contagem' or 'started' to 'em_contagem'
    const [stockCount] = await db
      .update(stockCounts)
      .set({ 
        status: 'em_contagem',
        updatedAt: new Date() 
      })
      .where(and(
        eq(stockCounts.publicToken, publicToken), 
        or(eq(stockCounts.status, 'pronta_para_contagem'), eq(stockCounts.status, 'started'))
      ))
      .returning();
    
    console.log(`[STORAGE] Update result:`, stockCount || 'NO UPDATE');
    
    if (!stockCount) {
      throw new Error(`Contagem não está pronta para contagem (status atual: ${currentStatus})`);
    }
    
    console.log(`[STORAGE] Successfully updated to status: ${stockCount.status}`);
    return stockCount;
  }

  async finalizeStockCount(id: number): Promise<StockCount> {
    // Get the stock count to find the unit
    const stockCountData = await db
      .select({ unitId: stockCounts.unitId })
      .from(stockCounts)
      .where(eq(stockCounts.id, id))
      .limit(1);
    
    if (stockCountData.length === 0) {
      throw new Error('Contagem não encontrada');
    }
    
    const unitId = stockCountData[0].unitId;
    
    // Calculate uncounted items based on which products were actually processed via public interface
    const allProductsForUnit = await db
      .select({ productId: products.id })
      .from(products)
      .innerJoin(productUnits, eq(products.id, productUnits.productId))
      .where(eq(productUnits.unitId, unitId));
    
    // Get all items that exist in stock count items table
    const stockCountItemsInDb = await db
      .select({ 
        productId: stockCountItems.productId,
        countedQuantity: stockCountItems.countedQuantity,
        updatedAt: stockCountItems.updatedAt,
        createdAt: stockCountItems.createdAt
      })
      .from(stockCountItems)
      .where(eq(stockCountItems.stockCountId, id));
    
    // Items are considered "actually counted" if:
    // 1. They were updated after creation (updatedAt > createdAt), OR
    // 2. They have a non-zero quantity (meaning someone actively set it)
    const actuallyCountedItems = stockCountItemsInDb.filter(item => {
      // If updated after creation, it was touched by user
      if (item.updatedAt && item.createdAt && item.updatedAt > item.createdAt) {
        return true;
      }
      
      // If quantity is not "0.000" or "0", it was actively counted
      const quantity = parseFloat(item.countedQuantity || "0");
      return quantity > 0;
    });
    
    const countedProductIds = new Set(actuallyCountedItems.map(item => item.productId));
    const uncountedCount = allProductsForUnit.filter(product => !countedProductIds.has(product.productId)).length;
    
    console.log(`[FINALIZE] Stock count ${id}: Total products: ${allProductsForUnit.length}, Actually counted: ${actuallyCountedItems.length}, Uncounted: ${uncountedCount}`);
    
    // Changes status from 'em_contagem' to 'contagem_finalizada' and store uncounted items count
    const [stockCount] = await db
      .update(stockCounts)
      .set({ 
        status: 'contagem_finalizada',
        uncountedItems: uncountedCount,
        updatedAt: new Date() 
      })
      .where(and(eq(stockCounts.id, id), eq(stockCounts.status, 'em_contagem')))
      .returning();
    
    if (!stockCount) {
      throw new Error('Contagem não encontrada ou não está em contagem');
    }
    
    return stockCount;
  }

  async generatePublicToken(id: number): Promise<string> {
    const publicToken = this.generateRandomToken();
    await db
      .update(stockCounts)
      .set({ publicToken, updatedAt: new Date() })
      .where(eq(stockCounts.id, id));
    return publicToken;
  }

  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2, 34); // 32 character token
  }

  // Stock Count Items operations
  async getStockCountItems(stockCountId: number): Promise<StockCountItemWithRelations[]> {
    const result = await db
      .select({
        item: stockCountItems,
        product: products,
      })
      .from(stockCountItems)
      .leftJoin(products, eq(stockCountItems.productId, products.id))
      .where(eq(stockCountItems.stockCountId, stockCountId))
      .orderBy(products.name);

    return result.map(row => ({
      ...row.item,
      product: row.product || undefined,
    })) as any;
  }

  async createStockCountItem(itemData: InsertStockCountItem): Promise<StockCountItem> {
    const [item] = await db
      .insert(stockCountItems)
      .values(itemData)
      .returning();
    return item;
  }

  async updateStockCountItem(id: number, itemData: Partial<InsertStockCountItem>): Promise<StockCountItem> {
    const [item] = await db
      .update(stockCountItems)
      .set({ ...itemData, updatedAt: new Date() })
      .where(eq(stockCountItems.id, id))
      .returning();
    return item;
  }

  async deleteStockCountItem(id: number): Promise<void> {
    await db.delete(stockCountItems).where(eq(stockCountItems.id, id));
  }

  async deleteStockCountItemByProduct(stockCountId: number, productId: number): Promise<void> {
    await db.delete(stockCountItems)
      .where(and(
        eq(stockCountItems.stockCountId, stockCountId),
        eq(stockCountItems.productId, productId)
      ));
  }

  // Bulk operations for stock count items
  async createStockCountItems(items: InsertStockCountItem[]): Promise<StockCountItem[]> {
    if (items.length === 0) return [];
    
    const result = await db
      .insert(stockCountItems)
      .values(items)
      .returning();
    return result;
  }

  async updateStockCountItems(stockCountId: number, items: { productId: number; countedQuantity: string; notes?: string }[]): Promise<void> {
    if (items.length === 0) return;

    // Delete existing items for this stock count
    await db.delete(stockCountItems).where(eq(stockCountItems.stockCountId, stockCountId));

    // Insert new items
    const newItems: InsertStockCountItem[] = items.map(item => ({
      stockCountId,
      productId: item.productId,
      countedQuantity: item.countedQuantity,
      notes: item.notes,
    }));

    await this.createStockCountItems(newItems);
  }

  async upsertStockCountItem(stockCountId: number, item: { productId: number; countedQuantity: string; notes?: string }): Promise<void> {
    // Check if item already exists
    const existingItem = await db
      .select()
      .from(stockCountItems)
      .where(
        and(
          eq(stockCountItems.stockCountId, stockCountId),
          eq(stockCountItems.productId, item.productId)
        )
      )
      .limit(1);

    if (existingItem.length > 0) {
      // Update existing item
      await db
        .update(stockCountItems)
        .set({
          countedQuantity: item.countedQuantity,
          notes: item.notes,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(stockCountItems.stockCountId, stockCountId),
            eq(stockCountItems.productId, item.productId)
          )
        );
    } else {
      // Insert new item
      const newItem: InsertStockCountItem = {
        stockCountId,
        productId: item.productId,
        countedQuantity: item.countedQuantity,
        notes: item.notes,
      };
      await this.createStockCountItems([newItem]);
    }
  }

  // Product Units operations
  async getProductsByUnit(unitId: number): Promise<Product[]> {
    const result = await db
      .select({
        product: products,
      })
      .from(productUnits)
      .innerJoin(products, eq(productUnits.productId, products.id))
      .where(eq(productUnits.unitId, unitId))
      .orderBy(products.name);

    return result.map(row => row.product);
  }

  async getProductUnits(productId?: number, unitId?: number): Promise<ProductUnit[]> {
    let query = db.select().from(productUnits);
    
    const conditions = [];
    if (productId) conditions.push(eq(productUnits.productId, productId));
    if (unitId) conditions.push(eq(productUnits.unitId, unitId));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query;
  }

  async createProductUnit(productUnitData: InsertProductUnit): Promise<ProductUnit> {
    const [productUnit] = await db
      .insert(productUnits)
      .values(productUnitData)
      .returning();
    return productUnit;
  }

  async updateProductUnit(id: number, productUnitData: Partial<InsertProductUnit>): Promise<ProductUnit> {
    const [productUnit] = await db
      .update(productUnits)
      .set({ ...productUnitData, updatedAt: new Date() })
      .where(eq(productUnits.id, id))
      .returning();
    return productUnit;
  }

  async deleteProductUnit(id: number): Promise<void> {
    await db.delete(productUnits).where(eq(productUnits.id, id));
  }

  async addProductToUnit(productId: number, unitId: number, stockQuantity: number = 0): Promise<ProductUnit> {
    return this.createProductUnit({
      productId,
      unitId,
      stockQuantity: stockQuantity.toString(),
    });
  }

  async removeProductFromUnit(productId: number, unitId: number): Promise<void> {
    await db.delete(productUnits).where(
      and(
        eq(productUnits.productId, productId),
        eq(productUnits.unitId, unitId)
      )
    );
  }

  // Settings operations
  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string, description?: string): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values({ key, value, description })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, description, updatedAt: new Date() }
      })
      .returning();
    return setting;
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    const [setting] = await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();
    return setting;
  }

  // Bulk cleanup operations
  async clearAllProducts(): Promise<void> {
    await db.delete(products);
  }

  async clearAllProductUnits(): Promise<void> {
    await db.delete(productUnits);
  }

  async clearAllStockCountItems(): Promise<void> {
    await db.delete(stockCountItems);
  }

  // Cash Register Closures operations
  async getCashRegisterClosures(): Promise<CashRegisterClosure[]> {
    return await db.select().from(cashRegisterClosures).orderBy(desc(cashRegisterClosures.datetime));
  }

  async getCashRegisterClosure(id: number): Promise<CashRegisterClosure | undefined> {
    const [closure] = await db.select().from(cashRegisterClosures).where(eq(cashRegisterClosures.id, id));
    return closure || undefined;
  }

  async createCashRegisterClosure(closure: InsertCashRegisterClosure): Promise<CashRegisterClosure> {
    const [created] = await db.insert(cashRegisterClosures).values(closure).returning();
    return created;
  }

  async updateCashRegisterClosure(id: number, closure: Partial<InsertCashRegisterClosure>): Promise<CashRegisterClosure> {
    const [updated] = await db
      .update(cashRegisterClosures)
      .set({ ...closure, updatedAt: new Date() })
      .where(eq(cashRegisterClosures.id, id))
      .returning();
    return updated;
  }

  async deleteCashRegisterClosure(id: number): Promise<void> {
    console.log(`Storage: Attempting to delete cash register closure with ID: ${id}`);
    const result = await db.delete(cashRegisterClosures).where(eq(cashRegisterClosures.id, id));
    console.log(`Storage: Delete operation completed for ID: ${id}`, result);
  }

  // Fleet Management operations implementation
  
  // Fuels operations
  async getFuels(): Promise<Fuel[]> {
    return await db.select().from(fuels).orderBy(fuels.name);
  }

  async getFuel(id: number): Promise<Fuel | undefined> {
    const [fuel] = await db.select().from(fuels).where(eq(fuels.id, id));
    return fuel;
  }

  async createFuel(fuelData: InsertFuel): Promise<Fuel> {
    const [fuel] = await db
      .insert(fuels)
      .values({
        ...fuelData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return fuel;
  }

  async updateFuel(id: number, fuelData: Partial<InsertFuel>): Promise<Fuel> {
    const [fuel] = await db
      .update(fuels)
      .set({
        ...fuelData,
        updatedAt: new Date(),
      })
      .where(eq(fuels.id, id))
      .returning();
    return fuel;
  }

  // Gas Stations operations
  async getGasStations(): Promise<GasStation[]> {
    return await db.select().from(gasStations).orderBy(gasStations.name);
  }

  async getGasStation(id: number): Promise<GasStation | undefined> {
    const [gasStation] = await db.select().from(gasStations).where(eq(gasStations.id, id));
    return gasStation;
  }

  async createGasStation(gasStationData: InsertGasStation): Promise<GasStation> {
    const [gasStation] = await db
      .insert(gasStations)
      .values({
        ...gasStationData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return gasStation;
  }

  async updateGasStation(id: number, gasStationData: Partial<InsertGasStation>): Promise<GasStation> {
    const [gasStation] = await db
      .update(gasStations)
      .set({
        ...gasStationData,
        updatedAt: new Date(),
      })
      .where(eq(gasStations.id, id))
      .returning();
    return gasStation;
  }

  // Vehicles operations
  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles).orderBy(vehicles.name);
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async createVehicle(vehicleData: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db
      .insert(vehicles)
      .values({
        ...vehicleData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return vehicle;
  }

  async updateVehicle(id: number, vehicleData: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set({
        ...vehicleData,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  // Fuel Entries operations
  async getFuelEntries(): Promise<FuelEntry[]> {
    return await db.select().from(fuelEntries).orderBy(desc(fuelEntries.date));
  }

  async getFuelEntry(id: number): Promise<FuelEntry | undefined> {
    const [fuelEntry] = await db.select().from(fuelEntries).where(eq(fuelEntries.id, id));
    return fuelEntry;
  }

  async createFuelEntry(fuelEntryData: InsertFuelEntry): Promise<FuelEntry> {
    const [fuelEntry] = await db
      .insert(fuelEntries)
      .values({
        ...fuelEntryData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return fuelEntry;
  }

  async updateFuelEntry(id: number, fuelEntryData: Partial<InsertFuelEntry>): Promise<FuelEntry> {
    const [fuelEntry] = await db
      .update(fuelEntries)
      .set({
        ...fuelEntryData,
        updatedAt: new Date(),
      })
      .where(eq(fuelEntries.id, id))
      .returning();
    return fuelEntry;
  }

  // Label Module operations
  // Product Shelf Lifes
  async getProductShelfLifes(): Promise<ProductShelfLife[]> {
    return await db.select().from(productShelfLifes);
  }

  async getProductShelfLife(id: number): Promise<ProductShelfLife | undefined> {
    const [shelfLife] = await db.select().from(productShelfLifes).where(eq(productShelfLifes.id, id));
    return shelfLife;
  }

  async getProductShelfLifeByProduct(productId: number): Promise<ProductShelfLife | undefined> {
    const [shelfLife] = await db.select().from(productShelfLifes).where(eq(productShelfLifes.productId, productId));
    return shelfLife;
  }

  async createProductShelfLife(shelfLifeData: InsertProductShelfLife): Promise<ProductShelfLife> {
    const [shelfLife] = await db
      .insert(productShelfLifes)
      .values({
        ...shelfLifeData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return shelfLife;
  }

  async updateProductShelfLife(id: number, shelfLifeData: Partial<InsertProductShelfLife>): Promise<ProductShelfLife> {
    const [shelfLife] = await db
      .update(productShelfLifes)
      .set({
        ...shelfLifeData,
        updatedAt: new Date(),
      })
      .where(eq(productShelfLifes.id, id))
      .returning();
    return shelfLife;
  }

  async deleteProductShelfLife(id: number): Promise<void> {
    await db.delete(productShelfLifes).where(eq(productShelfLifes.id, id));
  }

  // Product Portions
  async getProductPortions(): Promise<ProductPortion[]> {
    return await db.select().from(productPortions);
  }

  async getProductPortion(id: number): Promise<ProductPortion | undefined> {
    const [portion] = await db.select().from(productPortions).where(eq(productPortions.id, id));
    return portion;
  }

  async getProductPortionsByProduct(productId: number): Promise<ProductPortion[]> {
    return await db.select().from(productPortions).where(eq(productPortions.productId, productId));
  }

  async createProductPortion(portionData: InsertProductPortion): Promise<ProductPortion> {
    const [portion] = await db
      .insert(productPortions)
      .values({
        ...portionData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return portion;
  }

  async updateProductPortion(id: number, portionData: Partial<InsertProductPortion>): Promise<ProductPortion> {
    const [portion] = await db
      .update(productPortions)
      .set({
        ...portionData,
        updatedAt: new Date(),
      })
      .where(eq(productPortions.id, id))
      .returning();
    return portion;
  }

  async deleteProductPortion(id: number): Promise<void> {
    await db.delete(productPortions).where(eq(productPortions.id, id));
  }

  // Labels
  async getLabels(): Promise<Label[]> {
    return await db.select().from(labels).orderBy(desc(labels.date));
  }

  async getLabel(id: number): Promise<Label | undefined> {
    const [label] = await db.select().from(labels).where(eq(labels.id, id));
    return label;
  }

  async createLabel(labelData: InsertLabel): Promise<Label> {
    const [label] = await db
      .insert(labels)
      .values({
        ...labelData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return label;
  }

  async updateLabel(id: number, labelData: Partial<InsertLabel>): Promise<Label> {
    const [label] = await db
      .update(labels)
      .set({
        ...labelData,
        updatedAt: new Date(),
      })
      .where(eq(labels.id, id))
      .returning();
    return label;
  }

  async deleteLabel(id: number): Promise<void> {
    await db.delete(labels).where(eq(labels.id, id));
  }

  async getLabelByIdentifier(identifier: string): Promise<any | null> {
    const [labelWithData] = await db
      .select({
        id: labels.id,
        productId: labels.productId,
        responsibleId: labels.responsibleId,
        date: labels.date,
        portionId: labels.portionId,
        expiryDate: labels.expiryDate,
        storageMethod: labels.storageMethod,
        identifier: labels.identifier,
        withdrawalDate: labels.withdrawalDate,
        withdrawalResponsibleId: labels.withdrawalResponsibleId,
        createdAt: labels.createdAt,
        updatedAt: labels.updatedAt,
        product: {
          name: products.name,
          code: products.code
        },
        portion: {
          quantity: productPortions.quantity,
          unitOfMeasure: productPortions.unitOfMeasure
        },
        responsible: {
          firstName: employees.firstName,
          lastName: employees.lastName
        }
      })
      .from(labels)
      .leftJoin(products, eq(labels.productId, products.id))
      .leftJoin(productPortions, eq(labels.portionId, productPortions.id))
      .leftJoin(employees, eq(labels.responsibleId, employees.id))
      .where(eq(labels.identifier, identifier))
      .limit(1);
    
    return labelWithData || null;
  }

  async updateLabelWithdrawal(id: number, withdrawalData: { withdrawalDate: Date; withdrawalResponsibleId: number }): Promise<Label> {
    const [label] = await db
      .update(labels)
      .set({ 
        withdrawalDate: withdrawalData.withdrawalDate,
        withdrawalResponsibleId: withdrawalData.withdrawalResponsibleId,
        updatedAt: new Date() 
      })
      .where(eq(labels.id, id))
      .returning();
    
    if (!label) {
      throw new Error(`Label with id ${id} not found`);
    }
    
    return label;
  }

  async generateLabelIdentifier(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    // Gerar um identificador único de 6 caracteres
    do {
      result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Verificar se já existe
      const existing = await db.select().from(labels).where(eq(labels.identifier, result));
      if (existing.length === 0) {
        break;
      }
    } while (true);
    
    return result;
  }

  // Printers operations
  async getPrinters(): Promise<Printer[]> {
    const printerList = await db
      .select()
      .from(printers)
      .orderBy(desc(printers.isDefault), desc(printers.isActive), printers.name);
    return printerList;
  }

  async getPrinter(id: number): Promise<Printer | undefined> {
    const [printer] = await db
      .select()
      .from(printers)
      .where(eq(printers.id, id));
    return printer;
  }

  async createPrinter(printerData: InsertPrinter): Promise<Printer> {
    // If this printer is being set as default, unset all other defaults
    if (printerData.isDefault) {
      await db
        .update(printers)
        .set({ isDefault: false })
        .where(eq(printers.isDefault, true));
    }

    const [printer] = await db
      .insert(printers)
      .values(printerData)
      .returning();
    return printer;
  }

  async updatePrinter(id: number, printerData: Partial<InsertPrinter>): Promise<Printer> {
    // If this printer is being set as default, unset all other defaults
    if (printerData.isDefault) {
      await db
        .update(printers)
        .set({ isDefault: false })
        .where(eq(printers.isDefault, true));
    }

    const [printer] = await db
      .update(printers)
      .set({ ...printerData, updatedAt: new Date() })
      .where(eq(printers.id, id))
      .returning();
    return printer;
  }

  async deletePrinter(id: number): Promise<void> {
    await db.delete(printers).where(eq(printers.id, id));
  }

  async getDefaultPrinter(): Promise<Printer | undefined> {
    const [printer] = await db
      .select()
      .from(printers)
      .where(and(eq(printers.isDefault, true), eq(printers.isActive, true)));
    return printer;
  }

  async setDefaultPrinter(id: number): Promise<Printer> {
    // First, unset all current defaults
    await db
      .update(printers)
      .set({ isDefault: false })
      .where(eq(printers.isDefault, true));

    // Then set the new default
    const [printer] = await db
      .update(printers)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(printers.id, id))
      .returning();
    return printer;
  }
}

export const storage = new DatabaseStorage();

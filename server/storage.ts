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
  type TapWithRelations,
  type PourEventWithRelations,
  type EmployeeWithRelations,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, lt, sql, sum } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
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
    const result = await db
      .select({
        id: employees.id,
        email: employees.email,
        password: employees.password,
        firstName: employees.firstName,
        lastName: employees.lastName,
        whatsapp: employees.whatsapp,
        roleId: employees.roleId,
        employmentType: employees.employmentType,
        avatar: employees.avatar,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        role: {
          id: roles.id,
          name: roles.name,
          description: roles.description,
          permissions: roles.permissions,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        },
      })
      .from(employees)
      .leftJoin(roles, eq(employees.roleId, roles.id))
      .orderBy(employees.firstName, employees.lastName);

    return result.map(row => ({
      ...row,
      role: row.role.id ? row.role : undefined,
    })) as EmployeeWithRelations[];
  }

  async getEmployee(id: number): Promise<EmployeeWithRelations | undefined> {
    const result = await db
      .select({
        id: employees.id,
        email: employees.email,
        password: employees.password,
        firstName: employees.firstName,
        lastName: employees.lastName,
        whatsapp: employees.whatsapp,
        roleId: employees.roleId,
        employmentType: employees.employmentType,
        avatar: employees.avatar,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        role: {
          id: roles.id,
          name: roles.name,
          description: roles.description,
          permissions: roles.permissions,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        },
      })
      .from(employees)
      .leftJoin(roles, eq(employees.roleId, roles.id))
      .where(eq(employees.id, id));

    if (!result.length) return undefined;

    const row = result[0];
    return {
      ...row,
      role: row.role.id ? row.role : undefined,
    } as EmployeeWithRelations;
  }

  async getEmployeeByEmail(email: string): Promise<EmployeeWithRelations | undefined> {
    const result = await db
      .select({
        id: employees.id,
        email: employees.email,
        password: employees.password,
        firstName: employees.firstName,
        lastName: employees.lastName,
        whatsapp: employees.whatsapp,
        roleId: employees.roleId,
        employmentType: employees.employmentType,
        avatar: employees.avatar,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        role: {
          id: roles.id,
          name: roles.name,
          description: roles.description,
          permissions: roles.permissions,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        },
      })
      .from(employees)
      .leftJoin(roles, eq(employees.roleId, roles.id))
      .where(eq(employees.email, email));

    if (!result.length) return undefined;

    const row = result[0];
    return {
      ...row,
      role: row.role.id ? row.role : undefined,
    } as EmployeeWithRelations;
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(employeeData)
      .returning();
    return employee;
  }

  async updateEmployee(id: number, employeeData: Partial<InsertEmployee>): Promise<Employee> {
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
    return await db.select().from(units).orderBy(units.name);
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
  }> {
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous60Days = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    // IDs das unidades para considerar: Don Juarez Grão Pará (1) e Beer Truck (3)
    const targetUnits = [1, 3];

    // Recargas dos últimos 30 dias (apenas unidades específicas)
    const last30DaysRefills = await db
      .select()
      .from(co2Refills)
      .where(and(
        gte(co2Refills.date, last30Days),
        sql`${co2Refills.unitId} IN (${sql.join(targetUnits, sql`, `)})`
      ));

    // Recargas dos 30 dias anteriores (30-60 dias atrás, apenas unidades específicas)
    const previous30DaysRefills = await db
      .select()
      .from(co2Refills)
      .where(and(
        gte(co2Refills.date, previous60Days),
        lt(co2Refills.date, last30Days),
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

    // Calcular porcentagem de mudança
    const percentageChange = previous30DaysTotal.cost > 0 
      ? ((last30DaysTotal.cost - previous30DaysTotal.cost) / previous30DaysTotal.cost) * 100
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

    // Calcular kg de CO2 por litro
    const kgPerLiterLast30Days = last30DaysVolumeLiters > 0 
      ? last30DaysTotal.kg / last30DaysVolumeLiters 
      : 0;

    const kgPerLiterPrevious30Days = previous30DaysVolumeLiters > 0 
      ? previous30DaysTotal.kg / previous30DaysVolumeLiters 
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
      efficiencyChange
    };
  }
}

export const storage = new DatabaseStorage();

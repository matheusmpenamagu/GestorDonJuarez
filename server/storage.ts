import {
  users,
  pointsOfSale,
  beerStyles,
  devices,
  taps,
  pourEvents,
  kegChangeEvents,
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
  type TapWithRelations,
  type PourEventWithRelations,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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
  
  // Taps operations
  async getTaps(): Promise<TapWithRelations[]> {
    const results = await db
      .select({
        tap: taps,
        pointOfSale: pointsOfSale,
        currentBeerStyle: beerStyles,
      })
      .from(taps)
      .leftJoin(pointsOfSale, eq(taps.posId, pointsOfSale.id))
      .leftJoin(beerStyles, eq(taps.currentBeerStyleId, beerStyles.id))
      .where(eq(taps.isActive, true))
      .orderBy(taps.id);

    // Get last pour event for each tap
    const tapIds = results.map(r => r.tap.id);
    const lastPourEvents = await Promise.all(
      tapIds.map(async (tapId) => {
        const [lastEvent] = await db
          .select()
          .from(pourEvents)
          .where(eq(pourEvents.tapId, tapId))
          .orderBy(desc(pourEvents.datetime))
          .limit(1);
        return { tapId, lastEvent };
      })
    );

    return results.map(({ tap, pointOfSale, currentBeerStyle }) => {
      const lastPour = lastPourEvents.find(p => p.tapId === tap.id)?.lastEvent;
      const currentVolumeAvailableMl = tap.kegCapacityMl! - tap.currentVolumeUsedMl!;
      
      return {
        ...tap,
        pointOfSale: pointOfSale || undefined,
        currentBeerStyle: currentBeerStyle || undefined,
        currentVolumeAvailableMl,
        lastPourEvent: lastPour ? {
          ...lastPour,
          datetime: lastPour.datetime.toISOString(),
        } as any : undefined,
      };
    });
  }

  async getTap(id: number): Promise<TapWithRelations | undefined> {
    const [result] = await db
      .select({
        tap: taps,
        pointOfSale: pointsOfSale,
        currentBeerStyle: beerStyles,
      })
      .from(taps)
      .leftJoin(pointsOfSale, eq(taps.posId, pointsOfSale.id))
      .leftJoin(beerStyles, eq(taps.currentBeerStyleId, beerStyles.id))
      .where(eq(taps.id, id));

    if (!result) return undefined;

    const [lastEvent] = await db
      .select()
      .from(pourEvents)
      .where(eq(pourEvents.tapId, id))
      .orderBy(desc(pourEvents.datetime))
      .limit(1);

    const currentVolumeAvailableMl = result.tap.kegCapacityMl! - result.tap.currentVolumeUsedMl!;

    return {
      ...result.tap,
      pointOfSale: result.pointOfSale || undefined,
      currentBeerStyle: result.currentBeerStyle || undefined,
      currentVolumeAvailableMl,
      lastPourEvent: lastEvent ? {
        ...lastEvent,
        datetime: lastEvent.datetime.toISOString(),
      } as any : undefined,
    };
  }

  async createTap(tap: InsertTap): Promise<Tap> {
    const [created] = await db.insert(taps).values(tap).returning();
    return created;
  }

  async updateTap(id: number, tap: Partial<InsertTap>): Promise<Tap> {
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
    // Calculate pour volume from previous total
    const [previousEvent] = await db
      .select()
      .from(pourEvents)
      .where(eq(pourEvents.tapId, event.tapId))
      .orderBy(desc(pourEvents.datetime))
      .limit(1);

    const pourVolumeMl = previousEvent 
      ? event.totalVolumeMl - previousEvent.totalVolumeMl 
      : event.totalVolumeMl;

    const [created] = await db
      .insert(pourEvents)
      .values({
        ...event,
        pourVolumeMl,
      })
      .returning();

    // Update tap's current volume used
    await db
      .update(taps)
      .set({ 
        currentVolumeUsedMl: event.totalVolumeMl,
        updatedAt: new Date(),
      })
      .where(eq(taps.id, event.tapId));

    return created;
  }

  async getPourEvents(startDate?: Date, endDate?: Date, tapId?: number): Promise<PourEventWithRelations[]> {
    let query = db
      .select({
        pourEvent: pourEvents,
        tap: taps,
        pointOfSale: pointsOfSale,
        currentBeerStyle: beerStyles,
      })
      .from(pourEvents)
      .leftJoin(taps, eq(pourEvents.tapId, taps.id))
      .leftJoin(pointsOfSale, eq(taps.posId, pointsOfSale.id))
      .leftJoin(beerStyles, eq(taps.currentBeerStyleId, beerStyles.id));

    const conditions = [];
    if (startDate) conditions.push(gte(pourEvents.datetime, startDate));
    if (endDate) conditions.push(lte(pourEvents.datetime, endDate));
    if (tapId) conditions.push(eq(pourEvents.tapId, tapId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(pourEvents.datetime));

    return results.map(({ pourEvent, tap, pointOfSale, currentBeerStyle }) => ({
      ...pourEvent,
      tap: {
        ...tap!,
        pointOfSale: pointOfSale || undefined,
        currentBeerStyle: currentBeerStyle || undefined,
      },
    }));
  }

  async getRecentPourEvents(limit = 10): Promise<PourEventWithRelations[]> {
    const results = await db
      .select({
        pourEvent: pourEvents,
        tap: taps,
        pointOfSale: pointsOfSale,
        currentBeerStyle: beerStyles,
      })
      .from(pourEvents)
      .leftJoin(taps, eq(pourEvents.tapId, taps.id))
      .leftJoin(pointsOfSale, eq(taps.posId, pointsOfSale.id))
      .leftJoin(beerStyles, eq(taps.currentBeerStyleId, beerStyles.id))
      .orderBy(desc(pourEvents.datetime))
      .limit(limit);

    return results.map(({ pourEvent, tap, pointOfSale, currentBeerStyle }) => ({
      ...pourEvent,
      tap: {
        ...tap!,
        pointOfSale: pointOfSale || undefined,
        currentBeerStyle: currentBeerStyle || undefined,
      },
    }));
  }
  
  // Keg Change Events operations
  async createKegChangeEvent(event: InsertKegChangeEvent): Promise<KegChangeEvent> {
    const [created] = await db.insert(kegChangeEvents).values(event).returning();
    
    // Reset tap's current volume used to 0
    await db
      .update(taps)
      .set({ 
        currentVolumeUsedMl: 0,
        updatedAt: new Date(),
      })
      .where(eq(taps.id, event.tapId));

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

    // Low kegs (less than 10% capacity)
    const [lowKegsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(taps)
      .where(
        and(
          eq(taps.isActive, true),
          sql`(${taps.kegCapacityMl} - ${taps.currentVolumeUsedMl}) < (${taps.kegCapacityMl} * 0.1)`
        )
      );

    return {
      activeTaps: activeTapsResult.count || 0,
      todayVolumeLiters: Math.round((todayVolumeResult.total || 0) / 1000 * 10) / 10,
      weekVolumeLiters: Math.round((weekVolumeResult.total || 0) / 1000 * 10) / 10,
      lowKegs: lowKegsResult.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();

// Referenced from javascript_database blueprint
import { db } from "./db";
import { eq, and, or, like, desc, lt } from "drizzle-orm";
import {
  users, households, householdMembers, cards, perks, merchants, crowdsourcing, verificationTokens,
  ocrDraftPerks, ocrImages,
  type User, type InsertUser,
  type Household, type InsertHousehold,
  type HouseholdMember,
  type Card, type InsertCard,
  type Perk, type InsertPerk,
  type Merchant, type InsertMerchant,
  type Crowdsourcing, type InsertCrowdsourcing,
  type VerificationToken,
  type OcrDraftPerk, type InsertOcrDraftPerk,
  type OcrImage, type InsertOcrImage,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Households
  getHousehold(id: string): Promise<Household | undefined>;
  getHouseholdByOwnerId(ownerId: string): Promise<Household | undefined>;
  createHousehold(household: InsertHousehold & { ownerId: string }): Promise<Household>;
  deleteHousehold(id: string): Promise<boolean>;
  getHouseholdMembers(householdId: string): Promise<(HouseholdMember & { user: User })[]>;
  addHouseholdMember(householdId: string, userId: string): Promise<HouseholdMember>;
  removeHouseholdMember(householdId: string, userId: string): Promise<boolean>;
  getUserHousehold(userId: string): Promise<Household | undefined>;

  // Cards
  getCard(id: string): Promise<Card | undefined>;
  getUserCards(userId: string): Promise<Card[]>;
  getHouseholdCards(householdId: string): Promise<Card[]>;
  createCard(card: InsertCard & { ownerId: string }): Promise<Card>;
  updateCard(id: string, data: Partial<Card>): Promise<Card | undefined>;
  deleteCard(id: string): Promise<boolean>;

  // Perks
  getPerk(id: string): Promise<Perk | undefined>;
  getUserPerks(userId: string): Promise<Perk[]>;
  getUserAccessiblePerks(userId: string): Promise<Perk[]>;
  getCardPerks(cardId: string): Promise<Perk[]>;
  getMerchantPerks(merchantId: string): Promise<Perk[]>;
  createPerk(perk: InsertPerk & { createdBy: string }): Promise<Perk>;
  updatePerk(id: string, data: Partial<Perk>): Promise<Perk | undefined>;
  deletePerk(id: string): Promise<boolean>;

  // Merchants
  getMerchant(id: string): Promise<Merchant | undefined>;
  getAllMerchants(): Promise<Merchant[]>;
  searchMerchants(query: string): Promise<Merchant[]>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined>;
  deleteMerchant(id: string): Promise<boolean>;

  // Crowdsourcing
  getCrowdsourcing(id: string): Promise<Crowdsourcing | undefined>;
  getAllCrowdsourcing(): Promise<Crowdsourcing[]>;
  getUserCrowdsourcing(userId: string): Promise<Crowdsourcing[]>;
  createCrowdsourcing(data: InsertCrowdsourcing & { submittedBy: string }): Promise<Crowdsourcing>;
  updateCrowdsourcing(id: string, data: Partial<Crowdsourcing>): Promise<Crowdsourcing | undefined>;

  // Verification Tokens
  createVerificationToken(data: Omit<VerificationToken, 'id' | 'createdAt'>): Promise<VerificationToken>;
  getVerificationToken(token: string): Promise<VerificationToken | undefined>;
  deleteVerificationToken(token: string): Promise<boolean>;

  // OCR Draft Perks
  createOcrDraftPerk(perk: InsertOcrDraftPerk & { userId: string }): Promise<OcrDraftPerk>;
  getUserOcrDraftPerks(userId: string): Promise<OcrDraftPerk[]>;
  updateOcrDraftPerk(id: string, data: Partial<OcrDraftPerk>): Promise<OcrDraftPerk | undefined>;
  deleteOcrDraftPerk(id: string): Promise<boolean>;
  deleteUserOcrDraftPerks(userId: string): Promise<boolean>;

  // OCR Images
  createOcrImage(image: InsertOcrImage & { userId: string }): Promise<OcrImage>;
  getUserOcrImages(userId: string): Promise<OcrImage[]>;
  getExpiredOcrImages(): Promise<OcrImage[]>;
  updateOcrImage(id: string, data: Partial<OcrImage>): Promise<OcrImage | undefined>;
  deleteOcrImage(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  async getHousehold(id: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.id, id));
    return household || undefined;
  }

  async getHouseholdByOwnerId(ownerId: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.ownerId, ownerId));
    return household || undefined;
  }

  async createHousehold(household: InsertHousehold & { ownerId: string }): Promise<Household> {
    const [newHousehold] = await db.insert(households).values(household).returning();
    await db.insert(householdMembers).values({
      householdId: newHousehold.id,
      userId: household.ownerId,
    });
    return newHousehold;
  }

  async deleteHousehold(id: string): Promise<boolean> {
    const result = await db.delete(households).where(eq(households.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getHouseholdMembers(householdId: string): Promise<(HouseholdMember & { user: User })[]> {
    const members = await db
      .select()
      .from(householdMembers)
      .leftJoin(users, eq(householdMembers.userId, users.id))
      .where(eq(householdMembers.householdId, householdId));
    
    return members.map(m => ({
      ...m.household_members,
      user: m.users!
    }));
  }

  async addHouseholdMember(householdId: string, userId: string): Promise<HouseholdMember> {
    const [member] = await db.insert(householdMembers).values({
      householdId,
      userId,
    }).returning();
    return member;
  }

  async removeHouseholdMember(householdId: string, userId: string): Promise<boolean> {
    const result = await db.delete(householdMembers)
      .where(and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId)
      ));
    
    return (result.rowCount ?? 0) > 0;
  }

  async getUserHousehold(userId: string): Promise<Household | undefined> {
    const [member] = await db
      .select()
      .from(householdMembers)
      .leftJoin(households, eq(householdMembers.householdId, households.id))
      .where(eq(householdMembers.userId, userId));
    
    return member?.households || undefined;
  }

  async getCard(id: string): Promise<Card | undefined> {
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    return card || undefined;
  }

  async getUserCards(userId: string): Promise<Card[]> {
    const userCards = await db.select().from(cards).where(eq(cards.ownerId, userId));
    
    const household = await this.getUserHousehold(userId);
    if (!household) return userCards;
    
    const members = await db
      .select({ userId: householdMembers.userId })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, household.id));
    
    const otherMemberIds = members
      .map(m => m.userId)
      .filter(id => id !== userId);
    
    if (otherMemberIds.length === 0) return userCards;
    
    const householdCards = await db
      .select()
      .from(cards)
      .where(
        and(
          eq(cards.isHousehold, true),
          or(...otherMemberIds.map(id => eq(cards.ownerId, id)))
        )
      );
    
    return [...userCards, ...householdCards];
  }

  async getHouseholdCards(householdId: string): Promise<Card[]> {
    const members = await db.select().from(householdMembers).where(eq(householdMembers.householdId, householdId));
    const memberIds = members.map(m => m.userId);
    
    return await db
      .select()
      .from(cards)
      .where(and(
        eq(cards.isHousehold, true),
        or(...memberIds.map(id => eq(cards.ownerId, id)))
      ));
  }

  async createCard(card: InsertCard & { ownerId: string }): Promise<Card> {
    const [newCard] = await db.insert(cards).values(card).returning();
    return newCard;
  }

  async updateCard(id: string, data: Partial<Card>): Promise<Card | undefined> {
    const [updated] = await db.update(cards).set(data).where(eq(cards.id, id)).returning();
    return updated || undefined;
  }

  async deleteCard(id: string): Promise<boolean> {
    const result = await db.delete(cards).where(eq(cards.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getPerk(id: string): Promise<Perk | undefined> {
    const [perk] = await db.select().from(perks).where(eq(perks.id, id));
    return perk || undefined;
  }

  async getUserPerks(userId: string): Promise<Perk[]> {
    return await db.select().from(perks).where(eq(perks.createdBy, userId));
  }

  async getUserAccessiblePerks(userId: string): Promise<Perk[]> {
    // Get user's personal cards
    const userCards = await this.getUserCards(userId);
    let allAccessibleCards = [...userCards];
    
    // Get household cards if user is in a household
    const household = await this.getUserHousehold(userId);
    if (household) {
      const householdCards = await this.getHouseholdCards(household.id);
      allAccessibleCards = [...allAccessibleCards, ...householdCards];
    }
    
    const cardIds = allAccessibleCards.map(card => card.id);
    
    if (cardIds.length === 0) {
      return [];
    }
    
    // Get all perks for cards the user has access to
    return await db.select().from(perks).where(
      or(...cardIds.map(cardId => eq(perks.cardId, cardId)))
    );
  }

  async getCardPerks(cardId: string): Promise<Perk[]> {
    return await db.select().from(perks).where(eq(perks.cardId, cardId));
  }

  async getMerchantPerks(merchantId: string): Promise<Perk[]> {
    return await db.select().from(perks).where(eq(perks.merchantId, merchantId));
  }

  async createPerk(perk: InsertPerk & { createdBy: string }): Promise<Perk> {
    const [newPerk] = await db.insert(perks).values(perk).returning();
    return newPerk;
  }

  async updatePerk(id: string, data: Partial<Perk>): Promise<Perk | undefined> {
    const [updated] = await db.update(perks).set(data).where(eq(perks.id, id)).returning();
    return updated || undefined;
  }

  async deletePerk(id: string): Promise<boolean> {
    const result = await db.delete(perks).where(eq(perks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getMerchant(id: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    return merchant || undefined;
  }

  async getAllMerchants(): Promise<Merchant[]> {
    return await db.select().from(merchants).orderBy(desc(merchants.createdAt));
  }

  async searchMerchants(query: string): Promise<Merchant[]> {
    return await db
      .select()
      .from(merchants)
      .where(or(
        like(merchants.name, `%${query}%`),
        like(merchants.category, `%${query}%`)
      ));
  }

  async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
    const [newMerchant] = await db.insert(merchants).values(merchant).returning();
    return newMerchant;
  }

  async updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined> {
    const [updated] = await db.update(merchants).set(data).where(eq(merchants.id, id)).returning();
    return updated || undefined;
  }

  async deleteMerchant(id: string): Promise<boolean> {
    const result = await db.delete(merchants).where(eq(merchants.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getCrowdsourcing(id: string): Promise<Crowdsourcing | undefined> {
    const [item] = await db.select().from(crowdsourcing).where(eq(crowdsourcing.id, id));
    return item || undefined;
  }

  async getAllCrowdsourcing(): Promise<Crowdsourcing[]> {
    return await db.select().from(crowdsourcing).orderBy(desc(crowdsourcing.createdAt));
  }

  async getUserCrowdsourcing(userId: string): Promise<Crowdsourcing[]> {
    return await db.select().from(crowdsourcing).where(eq(crowdsourcing.submittedBy, userId));
  }

  async createCrowdsourcing(data: InsertCrowdsourcing & { submittedBy: string }): Promise<Crowdsourcing> {
    const [item] = await db.insert(crowdsourcing).values(data).returning();
    return item;
  }

  async updateCrowdsourcing(id: string, data: Partial<Crowdsourcing>): Promise<Crowdsourcing | undefined> {
    const [updated] = await db.update(crowdsourcing).set(data).where(eq(crowdsourcing.id, id)).returning();
    return updated || undefined;
  }

  async createVerificationToken(data: Omit<VerificationToken, 'id' | 'createdAt'>): Promise<VerificationToken> {
    const [token] = await db.insert(verificationTokens).values(data).returning();
    return token;
  }

  async getVerificationToken(token: string): Promise<VerificationToken | undefined> {
    const [item] = await db.select().from(verificationTokens).where(eq(verificationTokens.token, token));
    return item || undefined;
  }

  async deleteVerificationToken(token: string): Promise<boolean> {
    const result = await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // OCR Draft Perks
  async createOcrDraftPerk(perk: InsertOcrDraftPerk & { userId: string }): Promise<OcrDraftPerk> {
    const [newPerk] = await db.insert(ocrDraftPerks).values(perk).returning();
    return newPerk;
  }

  async getUserOcrDraftPerks(userId: string): Promise<OcrDraftPerk[]> {
    return await db.select().from(ocrDraftPerks)
      .where(eq(ocrDraftPerks.userId, userId))
      .orderBy(desc(ocrDraftPerks.createdAt));
  }

  async updateOcrDraftPerk(id: string, data: Partial<OcrDraftPerk>): Promise<OcrDraftPerk | undefined> {
    const [updated] = await db.update(ocrDraftPerks).set(data).where(eq(ocrDraftPerks.id, id)).returning();
    return updated || undefined;
  }

  async deleteOcrDraftPerk(id: string): Promise<boolean> {
    const result = await db.delete(ocrDraftPerks).where(eq(ocrDraftPerks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteUserOcrDraftPerks(userId: string): Promise<boolean> {
    const result = await db.delete(ocrDraftPerks).where(eq(ocrDraftPerks.userId, userId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // OCR Images
  async createOcrImage(image: InsertOcrImage & { userId: string }): Promise<OcrImage> {
    const [newImage] = await db.insert(ocrImages).values(image).returning();
    return newImage;
  }

  async getUserOcrImages(userId: string): Promise<OcrImage[]> {
    return await db.select().from(ocrImages)
      .where(eq(ocrImages.userId, userId))
      .orderBy(desc(ocrImages.createdAt));
  }

  async getExpiredOcrImages(): Promise<OcrImage[]> {
    return await db.select().from(ocrImages)
      .where(and(
        eq(ocrImages.processed, true),
        lt(ocrImages.expiresAt, new Date())
      ));
  }

  async updateOcrImage(id: string, data: Partial<OcrImage>): Promise<OcrImage | undefined> {
    const [updated] = await db.update(ocrImages).set(data).where(eq(ocrImages.id, id)).returning();
    return updated || undefined;
  }

  async deleteOcrImage(id: string): Promise<boolean> {
    const result = await db.delete(ocrImages).where(eq(ocrImages.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();

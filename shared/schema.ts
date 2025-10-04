import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  verified: boolean("verified").notNull().default(false),
  role: text("role").notNull().default("user"), // user, admin
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Households table
export const households = pgTable("households", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Household members junction table
export const householdMembers = pgTable("household_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: varchar("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Cards table
export const cards = pgTable("cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  network: text("network").notNull(), // Visa, Mastercard, Amex, Discover, etc.
  lastFourDigits: text("last_four_digits"),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isHousehold: boolean("is_household").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Merchants table
export const merchants = pgTable("merchants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Perks table
export const perks = pgTable("perks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  merchantId: varchar("merchant_id").references(() => merchants.id, { onDelete: "cascade" }),
  expirationDate: timestamp("expiration_date"),
  isPublic: boolean("is_public").notNull().default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  cardId: varchar("card_id").references(() => cards.id, { onDelete: "cascade" }),
  value: text("value"), // e.g., "5% cashback", "10x points"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Crowdsourcing submissions table
export const crowdsourcing = pgTable("crowdsourcing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "merchant" | "perk"
  payload: json("payload").notNull(), // Store submitted data
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  submittedBy: varchar("submitted_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Verification tokens for email verification and invites
export const verificationTokens = pgTable("verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: text("email"),
  type: text("type").notNull(), // "email_verification", "household_invite", "password_reset"
  metadata: json("metadata"), // Store additional data like householdId for invites
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedHouseholds: many(households),
  householdMemberships: many(householdMembers),
  cards: many(cards),
  perks: many(perks),
  crowdsourcingSubmissions: many(crowdsourcing),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
  owner: one(users, {
    fields: [households.ownerId],
    references: [users.id],
  }),
  members: many(householdMembers),
}));

export const householdMembersRelations = relations(householdMembers, ({ one }) => ({
  household: one(households, {
    fields: [householdMembers.householdId],
    references: [households.id],
  }),
  user: one(users, {
    fields: [householdMembers.userId],
    references: [users.id],
  }),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  owner: one(users, {
    fields: [cards.ownerId],
    references: [users.id],
  }),
  perks: many(perks),
}));

export const merchantsRelations = relations(merchants, ({ many }) => ({
  perks: many(perks),
}));

export const perksRelations = relations(perks, ({ one }) => ({
  merchant: one(merchants, {
    fields: [perks.merchantId],
    references: [merchants.id],
  }),
  creator: one(users, {
    fields: [perks.createdBy],
    references: [users.id],
  }),
  card: one(cards, {
    fields: [perks.cardId],
    references: [cards.id],
  }),
}));

export const crowdsourcingRelations = relations(crowdsourcing, ({ one }) => ({
  submitter: one(users, {
    fields: [crowdsourcing.submittedBy],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [crowdsourcing.reviewedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  verified: true,
  role: true,
  createdAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const insertHouseholdSchema = createInsertSchema(households).omit({
  id: true,
  ownerId: true,
  createdAt: true,
});

export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  ownerId: true,
  createdAt: true,
});

export const insertMerchantSchema = createInsertSchema(merchants).omit({
  id: true,
  createdAt: true,
});

export const insertPerkSchema = createInsertSchema(perks).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertCrowdsourcingSchema = createInsertSchema(crowdsourcing).omit({
  id: true,
  submittedBy: true,
  reviewedBy: true,
  reviewNote: true,
  createdAt: true,
  reviewedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Household = typeof households.$inferSelect;
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;

export type HouseholdMember = typeof householdMembers.$inferSelect;

export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;

export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;

export type Perk = typeof perks.$inferSelect;
export type InsertPerk = z.infer<typeof insertPerkSchema>;

export type Crowdsourcing = typeof crowdsourcing.$inferSelect;
export type InsertCrowdsourcing = z.infer<typeof insertCrowdsourcingSchema>;

export type VerificationToken = typeof verificationTokens.$inferSelect;

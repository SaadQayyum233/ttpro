import { pgTable, text, serial, integer, boolean, timestamp, json, unique } from "drizzle-orm/pg-core";
// Import text array type support if not automatically inferred
import { text as pgText } from 'drizzle-orm/pg-core';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Retained Tables ---

// Base user table from template
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Experiment variants table (Retained, might relate to email steps later?)
// Note: email_id here currently doesn't link to a defined table in this schema
export const experimentVariants = pgTable("experiment_variants", {
  id: serial("id").primaryKey(),
  email_id: integer("email_id"), // Review if this should link elsewhere
  variant_letter: text("variant_letter"),
  subject: text("subject"),
  body_html: text("body_html"),
  body_text: text("body_text"),
  key_angle: text("key_angle"),
  ai_parameters: json("ai_parameters").$type<Record<string, any>>().default({}),
  created_at: timestamp("created_at").defaultNow(),
});

// User settings table
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").unique().references(() => users.id, { onDelete: 'set null' }), // Link to users table
  avatar_name: text("avatar_name"),
  avatar_bio: text("avatar_bio"),
  avatar_company_name: text("avatar_company_name"),
  avatar_inspiration_name: text("avatar_inspiration_name"),
  avatar_role: text("avatar_role"),
  avatar_website: text("avatar_website"),
  email_signature_html: text("email_signature_html"),
  icp_fears: text("icp_fears"),
  icp_pain_points: text("icp_pain_points"),
  icp_insecurities: text("icp_insecurities"),
  icp_transformations: text("icp_transformations"),
  icp_description: text("icp_description"),
  icp_key_objectives: text("icp_key_objectives"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Error logs table
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  context: text("context"),
  error_message: text("error_message"),
  stack_trace: text("stack_trace"),
  payload: json("payload"),
});

// Integration connections table for storing OAuth tokens, API keys, etc.
export const integrationConnections = pgTable("integration_connections", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // Link to users table
  provider: text("provider").notNull(), // 'ghl', 'openai', etc.
  name: text("name"), // Display name for the connection
  iconUrl: text("icon_url"), // Icon URL for the connection
  backgroundColor: text("background_color"), // Background color for the icon
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  token_expires_at: timestamp("token_expires_at"),
  is_active: boolean("is_active").default(true),
  config: json("config").$type<Record<string, any>>().default({}),
  lastTested: timestamp("last_tested"), // When the connection was last tested
  lastTestSuccess: boolean("last_test_success"), // Whether the last test was successful
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Webhook type enum (Retained)
export const WebhookType = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing'
} as const;

export type WebhookTypeValues = typeof WebhookType[keyof typeof WebhookType];

// Webhooks table (Retained)
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // Link to users table
  type: text("type").$type<WebhookTypeValues>().notNull(), // 'incoming' or 'outgoing'
  name: text("name").notNull(),
  description: text("description"),
  provider: text("provider").notNull(), // 'custom', 'ghl', etc.

  // Fields for incoming webhooks
  endpoint_token: text("endpoint_token"), // Token part of the URL
  secret_key: text("secret_key"), // For signing/verifying
  event_handling: json("event_handling").$type<string[]>().default([]),
  notification_email: text("notification_email"),

  // Fields for outgoing webhooks
  trigger_event: text("trigger_event"),
  target_url: text("target_url"),
  http_method: text("http_method"), // GET, POST, PUT, DELETE, PATCH
  headers: json("headers").$type<Record<string, string>>().default({}),
  selected_fields: json("selected_fields").$type<string[]>().default([]),
  payload_template: text("payload_template"),

  is_active: boolean("is_active").default(true),
  last_triggered: timestamp("last_triggered"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});


// --- New/Updated Tables based on Google Sheet and Corrections ---

// Contact Table
export const contacts = pgTable("contacts", {
  contact_id: serial("contact_id").primaryKey(),
  full_name: text("full_name"),
  email_address: text("email_address").notNull().unique(),
  // Changed type to integer as requested
  email_number: integer("email_number"), 

  priority_emails: pgText("priority_emails", { mode: "array" }).default([]), // Array of strings like 'V1', 'P2'
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Contact Behaviour Table
export const contactBehaviour = pgTable("contact_behaviour", {
  id: serial("id").primaryKey(), // Separate PK for each behaviour record
  // REMOVED unique constraint - allows multiple records per contact
  contact_id: integer("contact_id").notNull().references(() => contacts.contact_id, { onDelete: 'cascade' }),
  // Included as requested, though potentially redundant with contact_id link.
  // Consider removing these and joining with `contacts` table in your application.
  full_name: text("full_name"),
  email_address: text("email_address"), // Linked via contact_id, storing here is redundant
  user_grade: text("user_grade"),
  country: text("country"),
  user_device: text("user_device"),
  // Version ID - likely refers to email version from conversations/stats
  version_id: integer("version_id"),
  total_emails_sent: integer("total_emails_sent").default(0).notNull(),
  total_emails_opened: integer("total_emails_opened").default(0).notNull(),
  total_emails_clicked: integer("total_emails_clicked").default(0).notNull(),
  open_days: text("open_days"), // Kept as text, could be JSON or array if structured
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Conversation Table
export const conversations = pgTable("conversations", {
  // Using user's spelling "converation_id" as primary key
  converation_id: serial("converation_id").primaryKey(),
  contact_id: integer("contact_id").notNull().references(() => contacts.contact_id, { onDelete: 'cascade' }),
  // Note: email_id currently doesn't link to a defined table in this schema
  // You might need an `emails` table later to define email templates/campaigns
  email_id: integer("email_id").notNull(),
  email_version: integer("email_version").default(1).notNull(),
  email_subject: text("email_subject"),
  email_body_plain_text: text("email_body_plain_text"), // Renamed from 'email_body (Plain Text)'
  send_at: timestamp("send_at"), // Renamed from 'send_date/time'
  send_day: text("send_day"), // Kept as requested
  user_device: text("user_device"), // Renamed from 'user_device (pc / mobile)'
  open_at: timestamp("open_at"), // Renamed from 'open_day/time'
  open_day: text("open_day"), // Kept as requested
  click_at: timestamp("click_at"), // Renamed from 'click_date/time'
  click_day: text("click_day"), // Kept as requested
  spam_at: timestamp("spam_at"), // Renamed from 'spam date/time'
  bounce_at: timestamp("bounce_at"), // Renamed from 'bounce date/time'
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Email Stats Table
export const emailStats = pgTable("email_stats", {
  id: serial("id").primaryKey(), // Separate PK for each stats record
  // Note: email_id currently doesn't link to a defined table in this schema
  email_id: integer("email_id").notNull(),
  email_version: integer("email_version").default(1).notNull(),
  total_opened: integer("total_opened").default(0).notNull(),
  total_clicked: integer("total_clicked").default(0).notNull(),
  total_spam: integer("total_spam").default(0).notNull(),
  total_bounce: integer("total_bounce").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint on email_id and version assumes one stats record per email version
  emailVersionUnq: unique().on(table.email_id, table.email_version),
}));


// --- Insert Schemas ---

// Retained Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertExperimentVariantSchema = createInsertSchema(experimentVariants).omit({
  id: true,
  created_at: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertIntegrationConnectionSchema = createInsertSchema(integrationConnections).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_triggered: true,
});

// New/Updated Schemas
export const insertContactSchema = createInsertSchema(contacts, {
  // Ensure Zod handles the text array correctly if needed
  priority_emails: z.array(z.string()).optional().default([]),
}).omit({
  contact_id: true,
  created_at: true,
  updated_at: true,
});

export const insertContactBehaviourSchema = createInsertSchema(contactBehaviour).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  converation_id: true,
  created_at: true,
  updated_at: true,
});

export const insertEmailStatsSchema = createInsertSchema(emailStats).omit({
  id: true,
  created_at: true,
  updated_at: true,
});


// --- Export Types ---

// Retained Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertExperimentVariant = z.infer<typeof insertExperimentVariantSchema>;
export type ExperimentVariant = typeof experimentVariants.$inferSelect;

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

export type InsertIntegrationConnection = z.infer<typeof insertIntegrationConnectionSchema>;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// New/Updated Types
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertContactBehaviour = z.infer<typeof insertContactBehaviourSchema>;
export type ContactBehaviour = typeof contactBehaviour.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertEmailStats = z.infer<typeof insertEmailStatsSchema>;
export type EmailStats = typeof emailStats.$inferSelect;

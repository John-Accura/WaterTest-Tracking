import { pgTable, serial, text, varchar, timestamp, date, integer, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("user_role", ["admin", "agent"]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    agentName: varchar("agent_name", { length: 120 }),
    role: roleEnum("role").notNull().default("agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({ emailIdx: uniqueIndex("users_email_idx").on(t.email) }),
);

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  agentName: varchar("agent_name", { length: 120 }).notNull(),
  dateOfEnquiry: date("date_of_enquiry").notNull(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull(),
  district: varchar("district", { length: 60 }).notNull(),
  area: varchar("area", { length: 200 }),
  pinCode: varchar("pin_code", { length: 10 }),
  waterSource: varchar("water_source", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("Confirmed"),
  assignedTechnician: varchar("assigned_technician", { length: 120 }),
  sampleCollectionDate: date("sample_collection_date"),
  receivedAtLabDate: date("received_at_lab_date"),
  resultDate: date("result_date"),
  paymentMode: varchar("payment_mode", { length: 30 }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const usersRelations = relations(users, ({ many }) => ({
  enquiries: many(enquiries),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
  agent: one(users, { fields: [enquiries.agentId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;

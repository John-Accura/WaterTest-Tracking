import { z } from "zod";
import { DISTRICTS, PAYMENT_MODES, STATUSES, WATER_SOURCES } from "./constants";

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), { message: "Invalid date" });

export const enquirySchema = z.object({
  dateOfEnquiry: z.string().min(1, "Date of enquiry is required"),
  customerName: z.string().trim().min(1, "Customer name is required").max(200),
  mobileNumber: z
    .string()
    .trim()
    .min(7, "Mobile number looks too short")
    .max(20),
  district: z.enum(DISTRICTS),
  area: z.string().trim().max(200).optional().or(z.literal("")),
  pinCode: z.string().trim().max(10).optional().or(z.literal("")),
  waterSource: z.enum(WATER_SOURCES),
  status: z.enum(STATUSES),
  assignedTechnician: z.string().trim().max(120).optional().or(z.literal("")),
  sampleCollectionDate: optionalDate,
  receivedAtLabDate: optionalDate,
  resultDate: optionalDate,
  paymentMode: z.enum(PAYMENT_MODES).optional().or(z.literal("")),
  remarks: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
  agentName: z.string().trim().max(120).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "agent"]).default("agent"),
});

export type UserInput = z.infer<typeof userSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

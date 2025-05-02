import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Template data structure
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fileHash: text("file_hash").notNull(),
  sections: jsonb("sections").$type<TemplateSection[]>().notNull(),
  numPages: integer("num_pages").notNull(),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

// Company data structure
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  linkedin: text("linkedin"),
  industry: text("industry"),
  additionalNotes: text("additional_notes"),
  documents: jsonb("documents").$type<CompanyDocument[]>(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// Project data structure
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  // Foreign keys for references, but without using relations
  templateId: integer("template_id").notNull(),
  companyId: integer("company_id").notNull(),
  strategy: text("strategy"),
  generatedContent: jsonb("generated_content").$type<GeneratedContent[]>(),
  createdAt: text("created_at").notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  generatedContent: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Type definitions
export type FileInfo = {
  id: string;
  name: string;
  size: number;
  type: string;
  buffer: Buffer;
};

export type TemplateSection = {
  title: string;
  format: string;
  expectedLength: string;
  page: number;
};

export type CompanyDocument = {
  id: string;
  name: string;
  size: number;
  content: string;
};

export type GeneratedContent = {
  sectionId: string;
  sectionTitle: string;
  content: string;
};

// Step form schemas
export const templateStepSchema = z.object({
  templateFile: z.any().optional(),
  templateId: z.number().optional(),
});

export const companyInfoStepSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.string()
    .refine(val => val === '' || val.startsWith('http'), {
      message: 'Website URL must start with http:// or https://'
    })
    .optional(),
  linkedin: z.string()
    .refine(val => val === '' || val.startsWith('http'), {
      message: 'LinkedIn URL must start with http:// or https://'
    })
    .optional(),
  industry: z.string().optional(),
  additionalNotes: z.string().optional(),
  documents: z.array(z.any()).optional(),
});

export const strategyStepSchema = z.object({
  strategy: z.string().min(1, "Strategy description is required"),
  strategyDocuments: z.array(z.any()).optional(),
});

// Users table (retained from original schema)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

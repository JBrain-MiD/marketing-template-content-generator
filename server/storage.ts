import {
  Template,
  InsertTemplate,
  Company,
  InsertCompany,
  Project,
  InsertProject,
  User,
  InsertUser,
  FileInfo,
  GeneratedContent,
  TemplateSection,
  CompanyDocument,
  templates,
  companies,
  projects,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Make sure the file storage directories exist
const STORAGE_DIR = path.join(process.cwd(), "data");
const TEMPLATE_DIR = path.join(STORAGE_DIR, "templates");
const DOCUMENT_DIR = path.join(STORAGE_DIR, "documents");

// Create directories if they don't exist
try {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR);
  }
  if (!fs.existsSync(DOCUMENT_DIR)) {
    fs.mkdirSync(DOCUMENT_DIR);
  }
} catch (error) {
  console.error("Error creating storage directories:", error);
}

// Storage interface with all required CRUD methods
export interface IStorage {
  // Template methods
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  
  // Company methods
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProjectContent(id: number, content: GeneratedContent[]): Promise<Project>;
  
  // File storage methods
  storeTemplateFile(fileInfo: FileInfo): Promise<string>;
  storeCompanyDocument(fileInfo: FileInfo): Promise<string>;
  getTemplateFile(fileHash: string): Promise<Buffer | undefined>;
  getCompanyDocument(documentId: string): Promise<Buffer | undefined>;
  
  // Legacy methods from original schema
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // Template methods
  async getTemplate(id: number): Promise<Template | undefined> {
    const result = await db.select().from(templates).where(eq(templates.id, id));
    return result[0];
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    // Handle the complex types with proper casting
    let sectionsArray: TemplateSection[];
    
    // Make sure sections is properly typed as an array
    if (Array.isArray(insertTemplate.sections)) {
      sectionsArray = insertTemplate.sections.map((section: any) => ({
        title: section.title,
        format: section.format,
        expectedLength: section.expectedLength,
        page: section.page
      }));
    } else {
      sectionsArray = [];
    }

    const [result] = await db.insert(templates)
      .values({
        name: insertTemplate.name,
        fileHash: insertTemplate.fileHash,
        sections: sectionsArray as any,
        numPages: insertTemplate.numPages
      })
      .returning();
    return result;
  }
  
  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id));
    return result[0];
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    // Handle the complex types with proper casting
    let documentsArray: CompanyDocument[] | null = null;
    
    // Make sure documents is properly typed as an array if it exists
    if (insertCompany.documents && Array.isArray(insertCompany.documents)) {
      documentsArray = insertCompany.documents.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        content: doc.content
      }));
    }
    
    const [result] = await db.insert(companies)
      .values({
        name: insertCompany.name,
        website: insertCompany.website || null,
        linkedin: insertCompany.linkedin || null,
        industry: insertCompany.industry || null,
        additionalNotes: insertCompany.additionalNotes || null,
        documents: documentsArray as any
      })
      .returning();
    return result;
  }
  
  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [result] = await db.insert(projects)
      .values({
        templateId: insertProject.templateId,
        companyId: insertProject.companyId,
        strategy: insertProject.strategy || null,
        createdAt: insertProject.createdAt,
        generatedContent: [] as any
      })
      .returning();
    return result;
  }
  
  async updateProjectContent(id: number, content: GeneratedContent[]): Promise<Project> {
    const [result] = await db.update(projects)
      .set({ generatedContent: content })
      .where(eq(projects.id, id))
      .returning();
    
    if (!result) {
      throw new Error(`Project with id ${id} not found`);
    }
    
    return result;
  }
  
  // File storage methods
  async storeTemplateFile(fileInfo: FileInfo): Promise<string> {
    const fileHash = `template_${fileInfo.id}`;
    const filePath = path.join(TEMPLATE_DIR, fileHash);
    
    await fs.promises.writeFile(filePath, fileInfo.buffer);
    return fileHash;
  }
  
  async storeCompanyDocument(fileInfo: FileInfo): Promise<string> {
    const documentId = `document_${fileInfo.id}`;
    const filePath = path.join(DOCUMENT_DIR, documentId);
    
    await fs.promises.writeFile(filePath, fileInfo.buffer);
    return documentId;
  }
  
  async getTemplateFile(fileHash: string): Promise<Buffer | undefined> {
    try {
      const filePath = path.join(TEMPLATE_DIR, fileHash);
      return await fs.promises.readFile(filePath);
    } catch (error) {
      console.error(`Error reading template file ${fileHash}:`, error);
      return undefined;
    }
  }
  
  async getCompanyDocument(documentId: string): Promise<Buffer | undefined> {
    try {
      const filePath = path.join(DOCUMENT_DIR, documentId);
      return await fs.promises.readFile(filePath);
    } catch (error) {
      console.error(`Error reading company document ${documentId}:`, error);
      return undefined;
    }
  }

  // Legacy methods from original schema
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(insertUser).returning();
    return result;
  }
}

// Create the file-based MemStorage as a fallback in case we need it
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private templates: Map<number, Template>;
  private companies: Map<number, Company>;
  private projects: Map<number, Project>;
  private fileStorage: Map<string, Buffer>;
  
  private userIdCounter: number;
  private templateIdCounter: number;
  private companyIdCounter: number;
  private projectIdCounter: number;

  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.companies = new Map();
    this.projects = new Map();
    this.fileStorage = new Map();
    
    this.userIdCounter = 1;
    this.templateIdCounter = 1;
    this.companyIdCounter = 1;
    this.projectIdCounter = 1;
  }

  // Template methods
  async getTemplate(id: number): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = this.templateIdCounter++;
    
    // Handle the complex types with proper casting
    let sectionsArray: TemplateSection[] = [];
    
    // Make sure sections is properly typed as an array
    if (Array.isArray(insertTemplate.sections)) {
      sectionsArray = insertTemplate.sections.map((section: any) => ({
        title: section.title,
        format: section.format,
        expectedLength: section.expectedLength,
        page: section.page
      }));
    }
    
    // Create a properly typed template object
    const template: Template = {
      id,
      name: insertTemplate.name,
      fileHash: insertTemplate.fileHash,
      sections: sectionsArray,
      numPages: insertTemplate.numPages
    };
    this.templates.set(id, template);
    return template;
  }
  
  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.companyIdCounter++;
    
    // Handle the complex types with proper casting
    let documentsArray: CompanyDocument[] | null = null;
    
    // Make sure documents is properly typed as an array if it exists
    if (insertCompany.documents && Array.isArray(insertCompany.documents)) {
      documentsArray = insertCompany.documents.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        content: doc.content
      }));
    }
    
    // Create a properly typed company object
    const company: Company = {
      id,
      name: insertCompany.name,
      website: insertCompany.website || null,
      linkedin: insertCompany.linkedin || null,
      industry: insertCompany.industry || null,
      additionalNotes: insertCompany.additionalNotes || null,
      documents: documentsArray
    };
    this.companies.set(id, company);
    return company;
  }
  
  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    // Create a properly typed project object
    const project: Project = {
      id,
      templateId: insertProject.templateId,
      companyId: insertProject.companyId,
      strategy: insertProject.strategy || null,
      generatedContent: [],
      createdAt: insertProject.createdAt
    };
    this.projects.set(id, project);
    return project;
  }
  
  async updateProjectContent(id: number, content: GeneratedContent[]): Promise<Project> {
    const project = await this.getProject(id);
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }
    
    const updatedProject = { ...project, generatedContent: content };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  // File storage methods
  async storeTemplateFile(fileInfo: FileInfo): Promise<string> {
    const fileHash = `template_${fileInfo.id}`;
    this.fileStorage.set(fileHash, fileInfo.buffer);
    return fileHash;
  }
  
  async storeCompanyDocument(fileInfo: FileInfo): Promise<string> {
    const documentId = `document_${fileInfo.id}`;
    this.fileStorage.set(documentId, fileInfo.buffer);
    return documentId;
  }
  
  async getTemplateFile(fileHash: string): Promise<Buffer | undefined> {
    return this.fileStorage.get(fileHash);
  }
  
  async getCompanyDocument(documentId: string): Promise<Buffer | undefined> {
    return this.fileStorage.get(documentId);
  }

  // Legacy methods from original schema
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

// Export the database storage as the default
export const storage = new DatabaseStorage();

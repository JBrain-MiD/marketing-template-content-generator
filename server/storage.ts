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
  TemplateSection,
  CompanyDocument,
  GeneratedContent
} from "@shared/schema";

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
    const template: Template = { ...insertTemplate, id };
    this.templates.set(id, template);
    return template;
  }
  
  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.companyIdCounter++;
    const company: Company = { ...insertCompany, id };
    this.companies.set(id, company);
    return company;
  }
  
  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    const project: Project = { ...insertProject, id, generatedContent: [] };
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

export const storage = new MemStorage();

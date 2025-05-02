import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import { analyzeTemplate } from "./pdf";
import { generateContent } from "./openai";
import {
  templateStepSchema,
  companyInfoStepSchema,
  strategyStepSchema,
  FileInfo,
  InsertTemplate,
  InsertCompany,
  InsertProject,
  GeneratedContent
} from "@shared/schema";
import { z } from "zod";

// Set up multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  
  // Template routes
  app.post("/api/templates/upload", upload.single("templateFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No template file uploaded" });
      }
      
      // Convert the uploaded file to FileInfo
      const fileInfo: FileInfo = {
        id: randomUUID(),
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        buffer: req.file.buffer
      };
      
      // Store the file and get the fileHash
      const fileHash = await storage.storeTemplateFile(fileInfo);
      
      // Analyze the template structure
      const analysisResult = await analyzeTemplate(fileInfo.buffer);
      
      // Create template record in storage
      const templateData: InsertTemplate = {
        name: fileInfo.name,
        fileHash: fileHash,
        sections: analysisResult.sections,
        numPages: analysisResult.numPages
      };
      
      const template = await storage.createTemplate(templateData);
      
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Template upload error:", error);
      res.status(500).json({ message: error.message || "Failed to process template" });
    }
  });
  
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to retrieve template" });
    }
  });
  
  // Company info routes
  app.post("/api/companies", upload.array("documents"), async (req, res) => {
    try {
      const parsedData = companyInfoStepSchema.parse(JSON.parse(req.body.data || "{}"));
      
      // Process uploaded documents if any
      const documents = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const fileInfo: FileInfo = {
            id: randomUUID(),
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            buffer: file.buffer
          };
          
          // Store document and get ID
          const documentId = await storage.storeCompanyDocument(fileInfo);
          
          // Extract content from document for later use
          let content = "";
          if (file.mimetype === "application/pdf") {
            const result = await analyzeTemplate(file.buffer);
            content = result.rawText || "";
          } else {
            // For text files or other formats
            content = file.buffer.toString("utf-8");
          }
          
          documents.push({
            id: documentId,
            name: file.originalname,
            size: file.size,
            content
          });
        }
      }
      
      // Create company record
      const companyData: InsertCompany = {
        ...parsedData,
        documents
      };
      
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to save company information" });
    }
  });
  
  app.get("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }
      
      const company = await storage.getCompany(id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to retrieve company" });
    }
  });
  
  // Project and content generation routes
  app.post("/api/projects", async (req, res) => {
    try {
      const { templateId, companyId, strategy } = req.body;
      
      // Validate required fields
      if (!templateId || !companyId) {
        return res.status(400).json({ message: "Template ID and Company ID are required" });
      }
      
      // Check if template and company exist
      const template = await storage.getTemplate(templateId);
      const company = await storage.getCompany(companyId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Create project
      const projectData: InsertProject = {
        templateId,
        companyId,
        strategy: strategy || "",
        createdAt: new Date().toISOString()
      };
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create project" });
    }
  });
  
  app.post("/api/projects/:id/generate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      // Get project with template and company info
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const template = await storage.getTemplate(project.templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      const company = await storage.getCompany(project.companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Generate content for each template section
      const generatedContent: GeneratedContent[] = [];
      
      for (const section of template.sections) {
        const content = await generateContent({
          section,
          company,
          strategy: project.strategy
        });
        
        generatedContent.push({
          sectionId: section.title.replace(/\s+/g, '_').toLowerCase(),
          sectionTitle: section.title,
          content
        });
      }
      
      // Update project with generated content
      const updatedProject = await storage.updateProjectContent(id, generatedContent);
      
      res.json(updatedProject);
    } catch (error: any) {
      console.error("Content generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate content" });
    }
  });
  
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get related template and company
      const template = await storage.getTemplate(project.templateId);
      const company = await storage.getCompany(project.companyId);
      
      res.json({
        ...project,
        template,
        company
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to retrieve project" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

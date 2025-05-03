import type { Express, Request, Response, NextFunction } from "express";
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

// TypeScript interfaces for multer
// We'll use type assertion instead of interface extension to avoid TypeScript errors
// The actual Express.Request type will be augmented by multer middleware at runtime

// Set up multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  
  // Template routes
  app.post("/api/templates/upload", (req, res, next) => {
    console.log("Received template upload request");
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Request body type:", typeof req.body);
    next();
  }, upload.single("templateFile"), async (req, res) => {
    try {
      console.log("Multer middleware processed the request");
      console.log("File present:", !!req.file);
      
      if (!req.file) {
        console.log("No file found in the request");
        return res.status(400).json({ message: "No template file uploaded" });
      }
      
      console.log("File details:", {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer ? "Buffer present" : "No buffer"
      });
      
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
    console.log("Received company info submission");
    console.log("Request body:", req.body);
    
    try {
      // Verify data is present and valid JSON
      if (!req.body.data) {
        console.log("Missing data field in request body");
        return res.status(400).json({ message: "Missing company data" });
      }
      
      let parsedJson;
      try {
        parsedJson = JSON.parse(req.body.data);
        console.log("Parsed JSON data:", parsedJson);
      } catch (e) {
        console.log("Error parsing JSON:", e);
        return res.status(400).json({ message: "Invalid JSON in data field" });
      }
      
      // Validate against schema
      try {
        const parsedData = companyInfoStepSchema.parse(parsedJson);
        console.log("Validation passed:", parsedData);
        
        // Process uploaded documents if any
        const documents = [];
        if (req.files && Array.isArray(req.files)) {
          console.log(`Processing ${req.files.length} uploaded document(s)`);
          
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
            try {
              if (file.mimetype === "application/pdf") {
                // For PDF files, use our enhanced extraction with safety checks
                const result = await analyzeTemplate(file.buffer);
                // Sanitize content to prevent database issues - remove non-printable chars
                content = result.rawText.substring(0, 20000)
                  .replace(/[^\x20-\x7E\r\n]/g, ' ')
                  .replace(/\u0000/g, ' '); // Specifically target null bytes
              } else {
                // For text files or other formats
                // Convert buffer to string and sanitize, limiting length to prevent issues
                const rawContent = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 10000));
                content = rawContent
                  .replace(/[^\x20-\x7E\r\n]/g, ' ')
                  .replace(/\u0000/g, ' ');
              }
              
              // Final verification to ensure content is safe for database
              content = content.trim().substring(0, 5000); // Limit length as a safeguard
              
              documents.push({
                id: documentId,
                name: file.originalname,
                size: file.size,
                content
              });
            } catch (contentError) {
              console.error(`Error extracting content from document ${file.originalname}:`, contentError);
              // Still add the document but with a safe placeholder content
              documents.push({
                id: documentId,
                name: file.originalname,
                size: file.size,
                content: "Document content could not be extracted safely."
              });
            }
          }
        } else {
          console.log("No documents uploaded");
        }
        
        // Create company record
        const companyData: InsertCompany = {
          ...parsedData,
          documents
        };
        
        console.log("Creating company with data:", {
          ...companyData,
          documents: companyData.documents ? `${companyData.documents.length} documents` : 'no documents'
        });
        
        const company = await storage.createCompany(companyData);
        console.log("Company created successfully:", company.id);
        res.status(201).json(company);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.log("Validation error:", validationError.errors);
          return res.status(400).json({ message: "Validation error", errors: validationError.errors });
        }
        throw validationError;
      }
    } catch (error: any) {
      console.error("Company info submission error:", error);
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
      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.error("Missing OpenAI API key for content generation");
        return res.status(500).json({ 
          message: "OpenAI API key is not configured. Content generation is not available." 
        });
      }
      
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
      
      // Validate template has sections
      if (!template.sections || template.sections.length === 0) {
        console.error("Template has no sections", template);
        return res.status(400).json({ message: "Template has no content sections to generate" });
      }
      
      console.log("Starting content generation for project:", id);
      console.log("Template sections count:", template.sections.length);
      
      // Generate content for each template section
      const generatedContent: GeneratedContent[] = [];
      
      // Generate content for each section in the template
      for (let index = 0; index < template.sections.length; index++) {
        const section = template.sections[index];
        
        try {
          // Check for required section properties
          if (!section.title) {
            console.warn(`Section missing title, skipping: ${JSON.stringify(section)}`);
            continue;
          }
          
          // Use index+1 as fallback for slideNumber
          const slideNumber = section.slideNumber || index + 1;
          
          // Determine explicitly if this slide needs content
          // Make it a simple boolean - true if it needs content, false if not
          const needsCustomContent = section.needsContent !== false;
          
          // Log the full section structure for debugging
          console.log(`Generating content for section: ${section.title}, format: ${section.format || 'unknown'}, slide #: ${slideNumber}, needsContent: ${needsCustomContent}`);
          
          // Generate content regardless, but will flag it correctly in the result
          const content = await generateContent({
            section: {
              ...section,
              // Force needsContent to true to ensure we get real content from the AI
              needsContent: true
            },
            company,
            strategy: project.strategy || ""
          });
          
          // Add to the result with correct original needsContent value
          generatedContent.push({
            slideNumber: slideNumber,
            slideTitle: section.title,
            content,
            format: section.format || "Text",
            needsContent: needsCustomContent
          });
          
          console.log(`Generated content for section ${section.title}`);
        } catch (sectionError) {
          console.error(`Error generating content for section ${section.title || index}:`, sectionError);
          // Continue with other sections
        }
      }
      
      // Validate we have content
      if (generatedContent.length === 0) {
        return res.status(500).json({ 
          message: "Failed to generate any content for the template sections" 
        });
      }
      
      console.log(`Successfully generated content for ${generatedContent.length} sections`);
      
      // Update project with generated content
      const updatedProject = await storage.updateProjectContent(id, generatedContent);
      
      // Return both the updated project and the original template sections for reference
      res.json({
        ...updatedProject,
        generatedContent: generatedContent,  // Ensure this is explicitly returned 
        templateSections: template.sections
      });
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

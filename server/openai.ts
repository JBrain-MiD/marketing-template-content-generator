import OpenAI from "openai";
import { Company, TemplateSection } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-" });

type ContentGenerationInput = {
  section: TemplateSection;
  company: Company;
  strategy: string;
};

export async function generateContent(input: ContentGenerationInput): Promise<string> {
  try {
    const { section, company, strategy } = input;
    
    // Build company context from available data
    let companyContext = `Company Name: ${company.name}\n`;
    
    if (company.website) {
      companyContext += `Website: ${company.website}\n`;
    }
    
    if (company.linkedin) {
      companyContext += `LinkedIn: ${company.linkedin}\n`;
    }
    
    if (company.industry) {
      companyContext += `Industry: ${company.industry}\n`;
    }
    
    if (company.additionalNotes) {
      companyContext += `Additional Information: ${company.additionalNotes}\n`;
    }
    
    // Add document content if available
    if (company.documents && company.documents.length > 0) {
      companyContext += "\nCompany Documents Content:\n";
      
      for (const doc of company.documents) {
        // Limit document content length to avoid token limits
        const truncatedContent = doc.content.slice(0, 2000);
        companyContext += `--- Document: ${doc.name} ---\n${truncatedContent}\n\n`;
      }
    }
    
    // Build prompt for content generation
    const prompt = `
You are a professional marketing content writer helping to generate content for a marketing template.

TEMPLATE SECTION INFORMATION:
Title: ${section.title}
Format Requirements: ${section.format}
Expected Length: ${section.expectedLength}

COMPANY INFORMATION:
${companyContext}

MARKETING STRATEGY:
${strategy || "No specific strategy provided."}

TASK:
Generate high-quality marketing content for the "${section.title}" section that:
1. Matches the required format: ${section.format}
2. Is approximately the expected length: ${section.expectedLength} 
3. Integrates the company information provided
4. Aligns with the marketing strategy
5. Uses professional, engaging language appropriate for marketing materials
6. Is factual and based only on the information provided

Please provide ONLY the content without explanations, introductions, or annotations.
`;

    // Generate content using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Error: No content generated";
  } catch (error: any) {
    console.error("OpenAI content generation error:", error);
    
    // Return a meaningful error message that can be shown to the user
    if (error.response) {
      // OpenAI API error
      return `Error generating content: ${error.response.status} - ${error.response.data.error.message}`;
    } else {
      // Other errors
      return `Error generating content: ${error.message}`;
    }
  }
}

export async function analyzeMarketingStrategy(strategy: string): Promise<string> {
  try {
    const prompt = `
Analyze the following marketing strategy and provide a brief assessment of its key strengths and potential areas for improvement:

MARKETING STRATEGY:
${strategy}

TASK:
1. Identify 2-3 key strengths of this marketing strategy
2. Suggest 1-2 potential areas for improvement or considerations
3. Provide your analysis in a concise, professional manner

Please format your response as a brief professional assessment.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Error: No analysis generated";
  } catch (error: any) {
    console.error("OpenAI strategy analysis error:", error);
    return `Error analyzing strategy: ${error.message}`;
  }
}

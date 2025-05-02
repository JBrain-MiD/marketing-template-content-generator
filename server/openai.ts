import OpenAI from "openai";
import { Company, TemplateSection } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

// Make sure we have a valid API key
if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

type ContentGenerationInput = {
  section: TemplateSection;
  company: Company;
  strategy: string;
};

export async function generateContent(input: ContentGenerationInput): Promise<string> {
  try {
    const { section, company, strategy } = input;
    
    // Check if this slide needs custom content
    if (!section.needsContent) {
      return "This slide doesn't require custom content. It appears to be a title slide, table of contents, or other structural element that should remain as-is in the template.";
    }
    
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

SLIDE INFORMATION:
Slide Number: ${section.slideNumber}
Slide Title: ${section.title}
Basic Format: ${section.format}
Detailed Format Requirements: ${section.formatDetails}
Expected Length: ${section.expectedLength}
Purpose of this Slide: ${section.purpose}
${section.examples ? `Examples or Placeholders: ${section.examples}` : ''}
${section.originalText ? `Original Text on Slide: ${section.originalText}` : ''}

COMPANY INFORMATION:
${companyContext}

MARKETING STRATEGY:
${strategy || "No specific strategy provided."}

TASK:
Generate high-quality marketing content for slide ${section.slideNumber} titled "${section.title}" that:
1. STRICTLY adheres to the specified format requirements: "${section.formatDetails}"
   (This is critical - the output must match the exact format required by the template)
2. Is approximately the expected length: ${section.expectedLength}
3. Fulfills the purpose of this slide: ${section.purpose}
4. Integrates the company information provided
5. Aligns with the marketing strategy
6. Uses professional, engaging language appropriate for marketing presentations
7. Is factual and based only on the information provided
8. Preserves the style and structure of the original template

IMPORTANT FORMATTING NOTES:
- If the format requires bullet points, use proper bullet point formatting with • symbols
- If the format requires numbered lists, use proper numbered list formatting (1., 2., etc.)
- If the format includes labeled sections or subheadings, make sure to include exactly those labels
- If the format is tabular, structure the content to fit into a table format
- Maintain any specified structural elements exactly as required

Please provide ONLY the content without explanations, introductions, or annotations.
DO NOT include the slide title or number in your response.
`;

    // Add a system message for better control
    const systemPrompt = `
You are an expert marketing content generator that creates precise, formatted content following EXACT format requirements for presentation slides.
- You will strictly adhere to any format requirements specified
- You will maintain bullet points, numbered lists, and other structural elements exactly as required
- You will generate content that fits the expected length for a presentation slide
- You will use professional marketing language appropriate for business presentations
- You will never explain your answers or include notes/annotations - just the requested content
- You will NOT include the slide title or slide number in your response
`;

    // Generate content using OpenAI with reduced temperature for more consistent formatting
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.5, // Reduced temperature for more consistent formatting
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

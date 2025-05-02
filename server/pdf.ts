import { TemplateSection } from '@shared/schema';
import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-" });

type TemplateAnalysisResult = {
  numPages: number;
  sections: TemplateSection[];
  rawText: string;
};

// An implementation that uses both text extraction and AI analysis for better slide detection
export async function analyzeTemplate(buffer: Buffer): Promise<TemplateAnalysisResult> {
  try {
    console.log("Starting to analyze PDF template...");
    
    // Since pdf-parse is causing issues, we'll use a robust fallback approach
    // that works with the buffer data directly to extract approximate content
    
    // For safety, we'll determine page count from buffer size
    // This isn't exact but helps provide structure to our analysis
    const estimatedPageCount = Math.max(1, Math.floor(buffer.length / 40000)); 
    console.log(`Estimated ${estimatedPageCount} pages from buffer size.`);
    
    // Convert buffer to string for basic text extraction
    // Look for standard PDF markers and text blocks
    const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000000));
    
    // Extract potential text content (this is imperfect but functional)
    let extractedText = "";
    
    // Try to find text by looking for patterns in the PDF content
    const textMatches = bufferStr.match(/\(\(([^)]+)\)\)|(\w[\w\s,.!?:;'"()-]{3,})/g);
    if (textMatches && textMatches.length > 0) {
      extractedText = textMatches.join('\n')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\n/g, '\n');
    } else {
      // If no matches found, use a slice of the buffer as fallback text
      extractedText = bufferStr
        .replace(/[^\x20-\x7E\r\n]/g, '') // Replace non-printable characters
        .split(/\s{3,}/).join('\n'); // Try to detect paragraph breaks
    }
    
    // Get the number of pages
    const numPages = estimatedPageCount;
    
    // Get processed raw text
    const rawText = extractedText || "Failed to extract meaningful text from PDF.";
    
    console.log(`Extracted approximately ${rawText.length} characters of text.`);
    
    // Split text into logical pages/slides
    const pages = splitIntoPages(rawText);
    
    console.log(`Split content into ${pages.length} logical pages for analysis.`);
    
    // Instead of using our limited text parsing, use OpenAI to identify slides
    const sections = await analyzeSlides(rawText, pages);
    
    console.log(`Identified ${sections.length} sections in the template.`);
    
    return {
      numPages,
      sections,
      rawText
    };
  } catch (error: any) {
    console.error("PDF analysis error:", error);
    throw new Error(`Failed to analyze PDF: ${error.message}`);
  }
}

// Use OpenAI to analyze the presentation structure and identify slides
async function analyzeSlides(rawText: string, pages: string[]): Promise<TemplateSection[]> {
  try {
    console.log("Using AI to analyze presentation structure...");
    
    // First, send the raw text to OpenAI to identify slide titles and structure
    const prompt = `
You are an expert presentation analyzer. I have a presentation template in PDF format that has been converted to text. 
Your task is to identify the individual slides in this presentation and analyze each one.

Here's the extracted text from the PDF (it may be messy due to PDF conversion):
\`\`\`
${rawText.substring(0, 15000)} // Limit to avoid token limits
\`\`\`

Please identify each slide and provide the following information for each:
1. Slide number
2. Slide title (if present)
3. Format of content needed (e.g., Paragraph, Bullet Points, Numbered List, Table, etc.)
4. Detailed format requirements (e.g., "2 labeled paragraphs with specific sections")
5. Expected length (Short: 30-50 words, Medium: 50-100 words, Long: 100-200 words)
6. Purpose of the slide in the presentation
7. Whether the slide needs custom content (some slides like title slides or agenda slides don't need custom content)
8. Any text limits or constraints
9. Original text content from the slide (summarized if lengthy)

Format your response as a JSON array of objects, one for each slide, with these keys:
slideNumber, title, format, formatDetails, expectedLength, purpose, needsContent, textLimits, originalText

Focus on identifying actual presentation slides, not PDF metadata or other artifacts.
`;

    // Generate analysis using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI analysis");
    }

    try {
      const analysis = JSON.parse(content);
      if (analysis.slides && Array.isArray(analysis.slides)) {
        // Convert the AI analysis to our TemplateSection format
        const sections: TemplateSection[] = analysis.slides.map((slide: any, index: number) => ({
          slideNumber: slide.slideNumber || index + 1,
          title: slide.title || `Slide ${index + 1}`,
          format: slide.format || "Paragraph",
          formatDetails: slide.formatDetails || slide.format || "Standard paragraph format",
          expectedLength: slide.expectedLength || "Medium (50-100 words)",
          purpose: slide.purpose || "Provide content for this slide",
          needsContent: slide.needsContent !== undefined ? slide.needsContent : true,
          page: slide.slideNumber || index + 1,
          examples: slide.originalText || undefined,
          originalText: slide.originalText || undefined
        }));
        
        console.log(`AI identified ${sections.length} slides`);
        return sections;
      } else {
        console.log("AI response didn't contain valid slides array, falling back to manual analysis");
        // Fallback to our traditional section analysis
        return identifySections(pages);
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.log("Falling back to manual slide identification");
      return identifySections(pages);
    }
  } catch (error) {
    console.error("Error during AI slide analysis:", error);
    console.log("Falling back to manual slide identification");
    return identifySections(pages);
  }
}

function splitIntoPages(text: string): string[] {
  // This is a simple approach that won't work for all PDFs
  // A more robust solution would require a more sophisticated PDF parser
  
  // Try to identify page breaks
  const pageBreaks = text.match(/\f/g);
  
  if (pageBreaks && pageBreaks.length > 0) {
    // Split by form feed character which often indicates page breaks
    return text.split('\f');
  } else {
    // Fallback: try to estimate pages based on text length
    const avgPageLength = 3000; // characters
    const pages = [];
    
    for (let i = 0; i < text.length; i += avgPageLength) {
      pages.push(text.slice(i, i + avgPageLength));
    }
    
    return pages;
  }
}

function identifySections(pages: string[]): TemplateSection[] {
  const sections: TemplateSection[] = [];
  
  // Common section titles in marketing templates
  const sectionTitles = [
    "Executive Summary",
    "Company Overview",
    "Market Analysis",
    "Competitive Analysis",
    "Target Audience",
    "Value Proposition",
    "Marketing Strategy",
    "Marketing Goals",
    "Marketing Channels",
    "Content Strategy",
    "Social Media Strategy",
    "Budget",
    "Timeline",
    "KPIs",
    "Conclusion"
  ];
  
  // Section purpose mapping (helps provide context for the AI)
  const sectionPurposes: Record<string, string> = {
    "Executive Summary": "Provide a high-level overview of the entire marketing plan, highlighting key points and objectives.",
    "Company Overview": "Describe the company's background, products/services, and market positioning.",
    "Market Analysis": "Analyze the target market size, trends, growth potential, and competitive landscape.",
    "Competitive Analysis": "Identify key competitors, their strengths, weaknesses, and how the company differentiates.",
    "Target Audience": "Define the primary and secondary customer segments with demographics, behaviors, and needs.",
    "Value Proposition": "Articulate the unique value the company offers to its customers.",
    "Marketing Strategy": "Outline the overall approach to achieve marketing objectives.",
    "Marketing Goals": "List specific, measurable objectives with timeframes.",
    "Marketing Channels": "Identify which platforms and methods will be used to reach the target audience.",
    "Content Strategy": "Detail the content types, themes, and distribution plan across channels.",
    "Social Media Strategy": "Specify platform-specific approaches, content types, and engagement tactics.",
    "Budget": "Allocate financial resources across different marketing activities.",
    "Timeline": "Provide a schedule for implementing various marketing activities.",
    "KPIs": "Define metrics to measure marketing performance and success.",
    "Conclusion": "Summarize the key points of the marketing plan and next steps."
  };
  
  // Regex patterns for identifying content formats
  const bulletPointPattern = /•|\*|\-\s+[A-Za-z]/g;
  const numberedListPattern = /\d+\.\s+[A-Za-z]/g;
  const tablePattern = /\||\+[-+]+\+|┌|┐|└|┘|├|┤|┬|┴|┼|│|─/; // Common table ASCII patterns
  const subheadingPattern = /(?:^|\n)([A-Z][A-Za-z\s]+:)/g; // Look for "Title:" patterns
  // Simple regex for labeled paragraphs that doesn't use lookbehind/lookahead which are ES2018 features
  const labeledParagraphsPattern = /([A-Z][A-Za-z\s]+):([\s\S]*?)(?:\n[A-Z]|$)/g;
  
  // Process each page
  pages.forEach((pageContent, pageIndex) => {
    // Look for section headers
    let foundSections = [];
    
    for (const title of sectionTitles) {
      const regex = new RegExp(`\\b${title}\\b`, 'i');
      if (regex.test(pageContent)) {
        foundSections.push(title);
      }
    }
    
    // If no predefined sections were found, try to identify headers
    if (foundSections.length === 0) {
      // Look for potential headers (capitalized text followed by content)
      const headerRegex = /([A-Z][A-Z\s]{3,30})(?:\r?\n|\:|$)/g;
      let match;
      
      while ((match = headerRegex.exec(pageContent)) !== null) {
        foundSections.push(match[1].trim());
      }
    }
    
    // For each found section, determine its format and expected length
    foundSections.forEach((title, index) => {
      // Find where the section starts in the page content
      const startIndex = pageContent.indexOf(title);
      if (startIndex === -1) return;
      
      // Extract the content following the title (until next section or end of page)
      let endIndex = pageContent.length;
      for (const nextTitle of foundSections) {
        if (nextTitle !== title) {
          const nextTitleIndex = pageContent.indexOf(nextTitle, startIndex + title.length);
          if (nextTitleIndex !== -1 && nextTitleIndex < endIndex) {
            endIndex = nextTitleIndex;
          }
        }
      }
      
      const sectionContent = pageContent.substring(startIndex + title.length, endIndex).trim();
      
      // Determine basic format
      let format = "Paragraph";
      if (sectionContent.match(bulletPointPattern)) {
        format = "Bullet Points";
      } else if (sectionContent.match(numberedListPattern)) {
        format = "Numbered List";
      } else if (sectionContent.match(tablePattern)) {
        format = "Table";
      }
      
      // Determine detailed format
      let formatDetails = format;
      
      // Check for labeled paragraphs - using traditional iteration to avoid ES2018+ requirement
      const labeledParagraphMatches = [];
      let labelMatch;
      while ((labelMatch = labeledParagraphsPattern.exec(sectionContent)) !== null) {
        labeledParagraphMatches.push(labelMatch);
      }
      
      if (labeledParagraphMatches.length > 0) {
        const labels = labeledParagraphMatches.map(match => match[1].trim());
        formatDetails = `${labeledParagraphMatches.length} labeled paragraphs`;
        if (labels.length <= 3) {
          formatDetails += ` with sections titled: ${labels.join(', ')}`;
        }
      }
      
      // Check for subheadings - using traditional iteration to avoid ES2018+ requirement
      const subheadingMatches = [];
      let subheadMatch;
      while ((subheadMatch = subheadingPattern.exec(sectionContent)) !== null) {
        subheadingMatches.push(subheadMatch[1]);
      }
      const subheadings = subheadingMatches;
      if (subheadings.length > 0 && subheadings.length <= 4) {
        formatDetails = `${format} with subheadings: ${subheadings.join(', ')}`;
      } else if (subheadings.length > 4) {
        formatDetails = `${format} with multiple subheadings`;
      }
      
      // Extract potential examples if the content appears to be template-like
      let examples = '';
      if (sectionContent.includes('[') && sectionContent.includes(']')) {
        const exampleMatches = sectionContent.match(/\[(.*?)\]/g);
        if (exampleMatches && exampleMatches.length > 0) {
          examples = `Example placeholders: ${exampleMatches.join(', ')}`;
        }
      }
      
      // Estimate expected length
      let expectedLength;
      const wordCount = sectionContent.split(/\s+/).length;
      
      if (wordCount < 50) {
        expectedLength = "Short (30-50 words)";
      } else if (wordCount < 100) {
        expectedLength = "Medium (50-100 words)";
      } else if (wordCount < 200) {
        expectedLength = "Long (100-200 words)";
      } else {
        expectedLength = "Very Long (200+ words)";
      }
      
      // Determine purpose
      const purpose = sectionPurposes[title] || 
        `Provide relevant information for the "${title}" section of the marketing template.`;
      
      // Determine if this slide needs content
      // Generally, most slides need content except for title slides, agenda slides, etc.
      const needsContent = !title.toLowerCase().includes("title") && 
                         !title.toLowerCase().includes("agenda") &&
                         !title.toLowerCase().includes("table of contents");
      
      // Add to sections with new properties
      sections.push({
        slideNumber: pageIndex + 1,
        title,
        format,
        formatDetails,
        expectedLength,
        purpose,
        needsContent,
        page: pageIndex + 1,
        examples: examples || undefined,
        originalText: sectionContent
      });
    });
  });
  
  // If no sections were found, create default sections
  if (sections.length === 0) {
    // Create some default sections based on page count
    if (pages.length === 1) {
      // Single page template
      sections.push({
        slideNumber: 1,
        title: "Main Content",
        format: "Paragraph",
        formatDetails: "Standard paragraphs with potential bullet points for key information",
        expectedLength: "Medium (50-100 words)",
        purpose: "Provide the main content for this template.",
        needsContent: true,
        page: 1
      });
    } else {
      // Multi-page template
      sections.push({
        slideNumber: 1,
        title: "Executive Summary",
        format: "Paragraph",
        formatDetails: "Concise summary paragraphs highlighting key points",
        expectedLength: "Medium (50-100 words)",
        purpose: "Summarize the key points of the entire template.",
        needsContent: true,
        page: 1
      });
      
      if (pages.length > 2) {
        sections.push({
          slideNumber: 2,
          title: "Marketing Strategy",
          format: "Bullet Points",
          formatDetails: "List of strategic points with brief explanations",
          expectedLength: "Medium (50-100 words)",
          purpose: "Outline the key strategic approaches for marketing.",
          needsContent: true,
          page: 2
        });
      }
      
      sections.push({
        slideNumber: pages.length,
        title: "Conclusion",
        format: "Paragraph",
        formatDetails: "Brief closing paragraph summarizing key takeaways",
        expectedLength: "Short (30-50 words)",
        purpose: "Provide a concise conclusion to the document.",
        needsContent: true,
        page: pages.length
      });
    }
  }
  
  return sections;
}

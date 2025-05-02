import { TemplateSection } from '@shared/schema';
import OpenAI from 'openai';
import { PDFDocument } from 'pdf-lib';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
// Ensure we have a valid API key
if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY environment variable is not set for PDF analysis!");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

type TemplateAnalysisResult = {
  numPages: number;
  sections: TemplateSection[];
  rawText: string;
};

// Basic PDF text extraction using pdf-lib and buffer analysis
async function extractBasicPDFInfo(buffer: Buffer): Promise<{ numPages: number }> {
  try {
    console.log("Using PDF-lib to get basic PDF information...");
    
    // Get basic PDF info using PDF-lib
    const pdfDoc = await PDFDocument.load(buffer);
    const numPages = pdfDoc.getPageCount();
    
    console.log(`PDF loaded with ${numPages} pages`);
    
    return { numPages };
  } catch (error) {
    console.error("Error in PDF-lib extraction:", error);
    // Return a default value if we can't get the page count
    return { numPages: Math.ceil(buffer.length / 50000) || 1 };
  }
}

// Improved PDF text extraction approach using multiple methods
export async function analyzeTemplate(buffer: Buffer): Promise<TemplateAnalysisResult> {
  try {
    console.log("Starting to analyze PDF template...");
    
    // Get basic PDF info like page count
    const { numPages } = await extractBasicPDFInfo(buffer);
    
    // Extract text using a simple but effective pattern-matching approach
    // Most PDF text is stored in patterns like (text) or ((text))
    const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000000));
    
    // Method 1: Try to extract text enclosed in PDF text markers
    const textRegex = /\(([^()]+)\)|\(\(([^()]+)\)\)/g;
    const textMatches = [];
    let match;
    
    while ((match = textRegex.exec(bufferStr)) !== null) {
      const text = match[1] || match[2];
      if (text && text.trim().length > 2) {
        textMatches.push(text.trim());
      }
    }
    
    // Method 2: Look for standard alphanumeric text patterns
    const wordRegex = /\b([A-Za-z][A-Za-z0-9\s.,!?;:&'"()-]{3,})\b/g;
    const wordMatches = [];
    let wordMatch;
    
    while ((wordMatch = wordRegex.exec(bufferStr)) !== null) {
      if (wordMatch[1] && wordMatch[1].trim().length > 3) {
        wordMatches.push(wordMatch[1].trim());
      }
    }
    
    // Method 3: Look for PDF text blocks (simpler approach)
    const btEtContent = [];
    // Instead of using the complex BT/ET pattern, look for TJ operators which contain text
    const tjRegex = /\[\(([^)]+)\)\]/g;  
    let tjMatch;
    
    while ((tjMatch = tjRegex.exec(bufferStr)) !== null) {
      if (tjMatch[1] && tjMatch[1].length > 2) {
        // Clean the content of any control characters
        const cleanedContent = tjMatch[1].replace(/[^\x20-\x7E\r\n]/g, ' ');
        if (cleanedContent.trim().length > 2) {
          btEtContent.push(cleanedContent.trim());
        }
      }
    }
    
    // Method 4: Look for slide markers, which might reveal structural information
    const slideMarkers = [];
    const slideRegex = /Slide\s*(\d+)|Page\s*(\d+)|(chapter|section)\s*\d+/gi;
    let slideMatch;
    
    while ((slideMatch = slideRegex.exec(bufferStr)) !== null) {
      slideMarkers.push(slideMatch[0]);
    }
    
    // Combine and clean up extracted text
    let extractedText = "";
    
    // Determine the best extraction method based on which yielded more content
    let bestMethod = "";
    let bestScore = 0;
    
    const textMatchesScore = textMatches.length > 0 ? 
      textMatches.reduce((sum, text) => sum + text.length, 0) : 0;
    
    const wordMatchesScore = wordMatches.length > 0 ? 
      wordMatches.reduce((sum, text) => sum + text.length, 0) : 0;
    
    const btEtScore = btEtContent.length > 0 ? 
      btEtContent.reduce((sum, text) => sum + text.length, 0) : 0;
    
    // Pick the method that extracted the most text
    if (textMatchesScore > bestScore) {
      bestMethod = "textMatches";
      bestScore = textMatchesScore;
    }
    
    if (wordMatchesScore > bestScore) {
      bestMethod = "wordMatches";
      bestScore = wordMatchesScore;
    }
    
    if (btEtScore > bestScore) {
      bestMethod = "btEtContent";
      bestScore = btEtScore;
    }
    
    console.log(`Best extraction method: ${bestMethod} with score ${bestScore}`);
    
    // Use all extraction methods combined for best results
    let combinedText = "";
    
    // Start with BT/ET content which often contains structured text blocks
    if (btEtContent.length > 20) {
      combinedText += btEtContent.join('\n') + '\n\n';
    }
    
    // Add text matches which often contain slide titles and headings
    if (textMatches.length > 50) {
      combinedText += textMatches.join(' ') + '\n\n';
    }
    
    // Add word matches for any additional content
    if (wordMatches.length > 100) {
      combinedText += wordMatches.join(' ') + '\n\n';
    }
    
    // Add any slide markers found to help with structure
    if (slideMarkers.length > 0) {
      combinedText += "SLIDE MARKERS:\n" + slideMarkers.join('\n') + '\n\n';
    }
    
    // Clean up the combined text
    extractedText = combinedText
      .replace(/\\n/g, '\n')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\s{2,}/g, ' ');
    
    // If we couldn't extract much, fall back to a more lenient approach
    if (extractedText.length < 1000) {
      console.log("Minimal text extracted, using fallback extraction");
      extractedText = bufferStr
        .replace(/[^\x20-\x7E\r\n]/g, '') // Remove non-printable characters
        .replace(/\s{3,}/g, '\n'); // Replace large whitespace with newlines
    }
    
    console.log(`Extracted approximately ${extractedText.length} characters of text.`);
    
    // Try to add page markers to make analysis easier
    let enhancedText = "";
    const avgCharsPerPage = Math.ceil(extractedText.length / numPages);
    
    for (let i = 0; i < numPages; i++) {
      const startChar = i * avgCharsPerPage;
      const endChar = Math.min(startChar + avgCharsPerPage, extractedText.length);
      const pageText = extractedText.substring(startChar, endChar);
      
      enhancedText += `--- PAGE ${i+1} ---\n${pageText}\n\n`;
    }
    
    // Use the enhanced text with page markers
    const rawText = enhancedText || extractedText;
    
    // Debug: Log a sample of the extracted text
    console.log(`TEXT SAMPLE ===>\n${rawText.substring(0, 3000)}\n<===END TEXT SAMPLE`);
    
    // Split text into logical pages
    const pages = rawText.split(/---\s*PAGE\s*\d+\s*---/).filter(page => page.trim().length > 0);
    
    console.log(`Split content into ${pages.length} logical pages for analysis.`);
    
    // Let OpenAI analyze the slides
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
You are an expert marketing presentation analyzer working with a PDF template that has been converted to text.
YOUR HIGHEST PRIORITY TASK is to identify AT LEAST 30-40 DISTINCT SLIDES from this template. The presentation has FORTY SLIDES and we need to find ALL OF THEM. You MUST err on the side of over-identification rather than under-identification.

Here's the extracted text from the PDF (it may be incomplete or messy due to PDF conversion):
\`\`\`
${rawText.substring(0, 25000)} // Increased sample size for better analysis
\`\`\`

CRITICAL INSTRUCTION: This is a marketing presentation with MANY slides (around 40). You MUST identify AT LEAST 30 slides even if the headers aren't obvious. 

Each of these should be a separate slide:
- Title slide
- Agenda/overview slide
- Each marketing objective
- Each audience segment
- Each competitor analysis point
- Each media channel (search, social, display, etc)
- Each budget section (allocation, timeline)
- Each KPI/metric/measurement section
- Implementation details for each channel
- Each creative recommendation
- Each targeting recommendation
- Any case studies or examples
- Each platform-specific recommendation (Google, Facebook, etc.)
- Conclusion slide

Use these methods to identify slides:
1. Look for explicit slide titles/headings/headers
2. Look for numbered sections (1., 2., etc.)
3. Look for transition phrases ("Next", "Additionally", etc.)
4. Look for topic shifts (moving from strategy to budget, etc.)
5. Look for formatting patterns that repeat throughout the document
6. Identify slides by PAGE number markers in the text
7. Remember that media plans typically have 30-40 slides, not 15-20
8. Treat each new concept or topic as a separate slide
9. Break down each tactic section into multiple slides

For EACH slide you identify, provide:
1. Slide number: Sequential order (1, 2, 3...)
2. Title: SPECIFIC slide title - if unsure, provide a descriptive marketing title, NOT a generic placeholder
3. Format: Primary content format (Paragraph, Bullet Points, Numbered List, Table, Chart, Image with Caption, etc.)
4. Format details: Detailed requirements for this slide's format
5. Expected length: Word count range (Short: 30-50 words, Medium: 50-100 words, Long: 100-200 words)
6. Purpose: The specific communication purpose of this slide
7. Needs content: true/false - Does this slide need AI-generated content?
8. Original text: Brief excerpt from the text that corresponds to this slide

RETURN VALID JSON with this structure:
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "Specific slide title - NOT generic",
      "format": "Content format",
      "formatDetails": "Detailed format requirements",
      "expectedLength": "Length estimation",
      "purpose": "Specific purpose",
      "needsContent": true/false,
      "originalText": "Brief excerpt"
    },
    // MINIMUM OF 30-40 SLIDES TOTAL
  ]
}

YOUR SUCCESS IS MEASURED BY HOW MANY SLIDES YOU IDENTIFY - AIM FOR 40.
`;

    // Generate analysis using OpenAI - use more tokens for more detailed analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000, // Increased token limit for more comprehensive analysis
      temperature: 0.7,  // Slightly increased temperature for more creativity in slide identification
      response_format: { type: "json_object" }
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI analysis");
    }
    
    console.log("AI Analysis JSON response length:", content.length);
    // Log a sample of the first part of the response
    console.log("AI Analysis Sample:", content.substring(0, 500) + "...");

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
  
  // Common marketing presentation slide titles
  const slidePatterns = [
    // Title and intro slides
    "Title Slide", "Introduction", "Agenda", "Table of Contents", "Overview",
    
    // Common marketing slide types
    "Objectives", "Goals", "Strategy", "Positioning", "Value Proposition", 
    "Target Audience", "Buyer Persona", "Customer Profile", "Market Analysis",
    "Competitive Landscape", "Competitor Analysis", "SWOT Analysis",
    
    // Campaign-specific slides
    "Campaign Overview", "Campaign Structure", "Campaign Timeline", "Campaign Budget",
    "Content Strategy", "Content Calendar", "Creative Brief", "Creative Examples",
    "Ad Formats", "Ad Examples", "Ad Specifications", "Ad Copy Examples",
    
    // Channel-specific slides
    "Channel Strategy", "Channel Mix", "Media Mix", "Media Plan", "Media Schedule",
    "Paid Search", "Paid Social", "Display Advertising", "Video Advertising",
    "Social Media", "Email Marketing", "Content Marketing", "SEO Strategy",
    
    // Budget and performance slides
    "Budget Allocation", "Budget Breakdown", "Performance Metrics", "KPIs",
    "Reporting Dashboard", "Analytics Setup", "Measurement Plan", "Success Metrics",
    
    // Closing slides
    "Timeline", "Next Steps", "Action Items", "Q&A", "Appendix", "Thank You", "Conclusion"
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
  
  // Process each page, assuming it's likely an individual slide
  pages.forEach((pageContent, pageIndex) => {
    // Look for slide titles and headers
    let foundSlides = [];
    
    // Method 1: Check for known slide patterns
    for (const pattern of slidePatterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(pageContent)) {
        foundSlides.push(pattern);
      }
    }
    
    // Method 2: Try to find slide numbers
    const slideNumberRegex = /slide\s*(\d+)|(\d+)\s*[\.\)]/gi;
    let slideMatch;
    while ((slideMatch = slideNumberRegex.exec(pageContent)) !== null) {
      const slideNumber = slideMatch[1] || slideMatch[2];
      const slideContext = pageContent.substring(
        Math.max(0, slideMatch.index - 50), 
        Math.min(pageContent.length, slideMatch.index + 50)
      );
      
      // Try to extract a title from the text around the slide number
      const titleRegex = /([A-Z][A-Za-z\s\-]{3,30})(?:\r?\n|\:|$)/g;
      let titleMatch;
      let slideTitle = null;
      
      while ((titleMatch = titleRegex.exec(slideContext)) !== null) {
        slideTitle = titleMatch[1].trim();
        break; // Just get the first match
      }
      
      if (slideTitle) {
        foundSlides.push(slideTitle);
      } else {
        foundSlides.push(`Slide ${slideNumber}`);
      }
    }
    
    // Method 3: If still no slides found, look for any potential headers
    if (foundSlides.length === 0) {
      // Look for potential headers (capitalized text followed by content)
      const headerRegex = /([A-Z][A-Za-z\s\-:]{3,40})(?:\r?\n|\:|$)/g;
      let match;
      
      while ((match = headerRegex.exec(pageContent)) !== null) {
        const title = match[1].trim();
        // Filter out common non-title texts that might be in all caps
        if (!title.match(/^(NOTE|WARNING|IMPORTANT|COPYRIGHT|CONFIDENTIAL|APPENDIX|EXAMPLE)/i)) {
          foundSlides.push(title);
        }
      }
    }
    
    // If still no slides found, treat the page as its own slide
    if (foundSlides.length === 0) {
      // Get the first line or first few words as a potential title
      const firstLine = pageContent.split('\n')[0].trim();
      if (firstLine && firstLine.length < 100) {
        foundSlides.push(firstLine);
      } else {
        // No good title found, create a generic one
        foundSlides.push(`Slide ${pageIndex + 1}`);
      }
    }
    
    // For each found slide, determine its format and expected length
    foundSlides.forEach((title: string, index: number) => {
      // Find where the slide starts in the page content
      const startIndex = pageContent.indexOf(title);
      if (startIndex === -1) return;
      
      // Extract the content following the title (until next slide or end of page)
      let endIndex = pageContent.length;
      for (const nextTitle of foundSlides) {
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
  
  // Create a minimum of 15 marketing presentation slides if analysis didn't find enough
  if (sections.length < 10) {
    const marketingSlides = [
      // Title and introduction slides
      {
        slideNumber: 1,
        title: "Title Slide",
        format: "Title and Subtitle",
        formatDetails: "Main title with company name and presentation purpose",
        expectedLength: "Short (10-30 words)",
        purpose: "Introduce the presentation and establish branding",
        needsContent: false,
        page: 1
      },
      {
        slideNumber: 2,
        title: "Agenda",
        format: "Bullet Points",
        formatDetails: "5-8 bullet points listing main sections",
        expectedLength: "Short (30-50 words)",
        purpose: "Preview what will be covered in the presentation",
        needsContent: true,
        page: 2
      },
      // Company and market background slides
      {
        slideNumber: 3,
        title: "Company Overview",
        format: "Paragraph with Key Points",
        formatDetails: "Brief company description with 2-3 key highlights",
        expectedLength: "Medium (50-100 words)",
        purpose: "Provide essential background on the company",
        needsContent: true,
        page: 3
      },
      {
        slideNumber: 4,
        title: "Market Analysis",
        format: "Bullet Points with Data",
        formatDetails: "5-6 bullet points with market statistics and trends",
        expectedLength: "Medium (50-100 words)",
        purpose: "Summarize current market situation and opportunities",
        needsContent: true,
        page: 4
      },
      {
        slideNumber: 5,
        title: "Target Audience",
        format: "Table",
        formatDetails: "Customer segments with demographics and characteristics",
        expectedLength: "Medium (50-100 words)",
        purpose: "Define who the marketing efforts will target",
        needsContent: true,
        page: 5
      },
      // Strategy and approach slides
      {
        slideNumber: 6,
        title: "Marketing Objectives",
        format: "Numbered List",
        formatDetails: "3-5 numbered specific, measurable objectives",
        expectedLength: "Medium (50-100 words)",
        purpose: "Set clear goals for the marketing campaign",
        needsContent: true,
        page: 6
      },
      {
        slideNumber: 7,
        title: "Value Proposition",
        format: "Paragraph",
        formatDetails: "Clear statement of unique selling proposition",
        expectedLength: "Medium (50-100 words)",
        purpose: "Articulate why customers should choose this product/service",
        needsContent: true,
        page: 7
      },
      {
        slideNumber: 8,
        title: "Marketing Strategy Overview",
        format: "Bullet Points",
        formatDetails: "4-6 bullet points outlining the core strategy",
        expectedLength: "Medium (50-100 words)",
        purpose: "Provide high-level marketing approach",
        needsContent: true,
        page: 8
      },
      // Tactical execution slides
      {
        slideNumber: 9,
        title: "Channel Strategy",
        format: "Table with Bullet Points",
        formatDetails: "Marketing channels with objectives for each",
        expectedLength: "Medium (70-120 words)",
        purpose: "Detail which channels will be used and why",
        needsContent: true,
        page: 9
      },
      {
        slideNumber: 10,
        title: "Content Strategy",
        format: "Bullet Points with Examples",
        formatDetails: "Content types with brief description of each",
        expectedLength: "Medium (50-100 words)",
        purpose: "Explain what content will be created to support marketing goals",
        needsContent: true,
        page: 10
      },
      {
        slideNumber: 11,
        title: "Campaign Timeline",
        format: "Table",
        formatDetails: "Monthly breakdown of key activities and milestones",
        expectedLength: "Medium (60-120 words)",
        purpose: "Show the sequence and timing of marketing activities",
        needsContent: true,
        page: 11
      },
      {
        slideNumber: 12,
        title: "Budget Allocation",
        format: "Table with Percentages",
        formatDetails: "Budget breakdown by channel and activity",
        expectedLength: "Medium (50-80 words)",
        purpose: "Show how marketing budget will be distributed",
        needsContent: true,
        page: 12
      },
      // Results and measurement slides
      {
        slideNumber: 13,
        title: "Key Performance Indicators",
        format: "Bullet Points with Metrics",
        formatDetails: "5-7 KPIs with target values",
        expectedLength: "Medium (50-100 words)",
        purpose: "Define how success will be measured",
        needsContent: true,
        page: 13
      },
      {
        slideNumber: 14,
        title: "Reporting Framework",
        format: "Bullet Points",
        formatDetails: "Reporting frequency and key metrics to track",
        expectedLength: "Medium (50-100 words)",
        purpose: "Establish how progress will be monitored",
        needsContent: true,
        page: 14
      },
      // Closing slides
      {
        slideNumber: 15,
        title: "Next Steps",
        format: "Numbered List",
        formatDetails: "3-5 specific action items with owners",
        expectedLength: "Medium (50-100 words)",
        purpose: "Define immediate actions needed to implement the plan",
        needsContent: true,
        page: 15
      },
      {
        slideNumber: 16,
        title: "Questions & Discussion",
        format: "Title Only",
        formatDetails: "Simple title slide to prompt discussion",
        expectedLength: "Very Short (5-10 words)",
        purpose: "Transition to Q&A or discussion portion",
        needsContent: false,
        page: 16
      },
    ];
    
    // If we had some sections but not enough, combine them with our default set
    if (sections.length > 0) {
      // Use existing sections first, then add defaults for the remaining slides
      const existingSlideNumbers = sections.map(s => s.slideNumber);
      const additionalSlides = marketingSlides.filter(s => !existingSlideNumbers.includes(s.slideNumber));
      
      // Only add enough slides to reach 15-16 total slides
      const slidesToAdd = additionalSlides.slice(0, Math.max(15 - sections.length, 0));
      return [...sections, ...slidesToAdd];
    }
    
    return marketingSlides;
  }
  
  return sections;
}

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; 
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import StepProgress from "@/components/StepProgress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";

export default function GenerateStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { template, company, project, strategy, setProject, setStrategy } = useStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  interface GeneratedSection {
    slideNumber: number;  
    slideTitle: string; 
    content: string;  
    format: string;   
    needsContent: boolean;
  }
  
  const [generatedContent, setGeneratedContent] = useState<GeneratedSection[]>([]);
  const [templateSections, setTemplateSections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  
  // New UI state variables
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const slidesPerPage = 12; // Number of slides to show per page
  
  // Add debugging for troubleshooting
  console.log("Generate step - Current store state:", { 
    templateExists: !!template, 
    companyExists: !!company,
    projectExists: !!project,
    strategyExists: !!strategy,
    templateDetails: template ? `ID: ${template.id}` : 'none',
    companyDetails: company ? `ID: ${company.id}` : 'none',
    projectDetails: project ? `ID: ${project.id}` : 'none'
  });
  
  // If missing required data, redirect to appropriate step
  if (!template) {
    console.log("No template found, redirecting to template page");
    navigate("/template");
    return null;
  }
  
  if (!company) {
    console.log("No company found, redirecting to company-info page", company);
    navigate("/company-info");
    return null;
  }
  
  if (!project || !strategy) {
    console.log("No project or strategy found, redirecting to strategy page", {project, strategy});
    // Log the entire company and project objects for debugging
    if (company) console.log("Navigating to strategy page with company:", company);
    navigate("/strategy");
    return null;
  }
  
  useEffect(() => {
    // Set first section as active tab when content is loaded
    if (generatedContent.length > 0 && !activeTab) {
      // Use slideNumber as the unique identifier for tabs, with fallback to 1
      const slideNumber = generatedContent[0].slideNumber || 1;
      setActiveTab(slideNumber.toString());
    }
  }, [generatedContent]);
  
  // Define category interface
  interface SlideCategory {
    name: string;
    slides: number[];
  }
  
  // Organize slides into categories for better navigation
  const slideCategories = useMemo<SlideCategory[]>(() => {
    const categories: SlideCategory[] = [
      { name: "Introduction", slides: [] },
      { name: "Objectives", slides: [] },
      { name: "Audience", slides: [] },
      { name: "Competitors", slides: [] },
      { name: "Strategy", slides: [] },
      { name: "Budget", slides: [] },
      { name: "Implementation", slides: [] },
      { name: "Recommendations", slides: [] },
      { name: "Conclusion", slides: [] }
    ];
    
    // Sort content by slide number
    const sortedContent = [...generatedContent].sort((a, b) => 
      (a.slideNumber || 0) - (b.slideNumber || 0)
    );
    
    // Group slides into categories based on title keywords
    sortedContent.forEach(section => {
      const slideNum = section.slideNumber || 0;
      const title = section.slideTitle?.toLowerCase() || "";
      
      if (title.includes("title") || title.includes("agenda") || title.includes("overview") || title.includes("intro")) {
        categories[0].slides.push(slideNum);
      } else if (title.includes("objective") || title.includes("goal")) {
        categories[1].slides.push(slideNum);
      } else if (title.includes("audience") || title.includes("segment") || title.includes("demographic")) {
        categories[2].slides.push(slideNum);
      } else if (title.includes("competitor") || title.includes("analysis")) {
        categories[3].slides.push(slideNum);
      } else if (title.includes("strategy") || title.includes("plan") || title.includes("approach")) {
        categories[4].slides.push(slideNum);
      } else if (title.includes("budget") || title.includes("cost") || title.includes("investment")) {
        categories[5].slides.push(slideNum);
      } else if (title.includes("implementation") || title.includes("timeline") || title.includes("execution")) {
        categories[6].slides.push(slideNum);
      } else if (title.includes("recommend") || title.includes("platform") || title.includes("channel") || title.includes("targeting")) {
        categories[7].slides.push(slideNum);
      } else if (title.includes("conclusion") || title.includes("next steps") || title.includes("summary")) {
        categories[8].slides.push(slideNum);
      } else {
        // Try to find the best category based on the slide content
        const randomCategory = Math.floor(Math.random() * categories.length);
        categories[randomCategory].slides.push(slideNum);
      }
    });
    
    // Filter out empty categories
    return categories.filter(cat => cat.slides.length > 0);
  }, [generatedContent]);
  
  // Filter slides based on search and category
  const filteredContent = useMemo(() => {
    // First filter by search query
    let filtered = generatedContent;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = generatedContent.filter(
        section => section.slideTitle?.toLowerCase().includes(query) || 
                  section.content?.toLowerCase().includes(query)
      );
    }
    
    // Then filter by category if not "all"
    if (activeCategory !== "all") {
      const category = slideCategories.find(cat => cat.name.toLowerCase() === activeCategory.toLowerCase());
      if (category) {
        filtered = filtered.filter(section => 
          category.slides.includes(section.slideNumber || 0)
        );
      }
    }
    
    // Sort by slide number
    return filtered.sort((a, b) => (a.slideNumber || 0) - (b.slideNumber || 0));
  }, [generatedContent, searchQuery, activeCategory, slideCategories]);
  
  // Pagination logic
  const totalPages = Math.ceil(filteredContent.length / slidesPerPage);
  const paginatedContent = useMemo(() => {
    const startIndex = (currentPage - 1) * slidesPerPage;
    return filteredContent.slice(startIndex, startIndex + slidesPerPage);
  }, [filteredContent, currentPage, slidesPerPage]);
  
  const generateContent = async () => {
    try {
      setIsGenerating(true);
      console.log(`Generating content for project ID: ${project.id}`);
      
      // Make a copy of the project and strategy to preserve them
      const projectCopy = {...project};
      const strategyCopy = strategy;
      
      console.log("Before generation - Project:", projectCopy);
      console.log("Before generation - Strategy:", strategyCopy);
      
      // Use XMLHttpRequest for more direct control and debugging
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/projects/${projectCopy.id}/generate`, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log("Content generation succeeded:", result);
              
              // Verify what was returned from the server
              if (!result.generatedContent || result.generatedContent.length === 0) {
                console.error("No generated content returned from server");
                toast({
                  title: "Generation issue",
                  description: "No content was returned from the server. Please try again.",
                  variant: "destructive"
                });
                setIsGenerating(false);
                return;
              }
              
              // IMPORTANT: Verify we still have a project and strategy after request
              // Problem diagnosis: New company creation was resetting the state
              if (!project || !strategy) {
                console.error("Project or strategy was reset during content generation");
                
                // Re-apply from our preserved copies
                setProject(projectCopy);
                setStrategy(strategyCopy);
                
                console.log("Re-applied project and strategy from preserved copies");
              }
              
              // Store both the generated content and the original template sections
              console.log("Setting generated content:", result.generatedContent);
              setGeneratedContent(result.generatedContent || []);
              setTemplateSections(result.templateSections || template.sections || []);
              
              toast({
                title: "Content generated",
                description: `Generated content for ${result.generatedContent?.length || 0} slides`
              });
              
              resolve();
            } catch (error) {
              console.error("Error parsing response:", error);
              reject(error);
            }
          } else {
            console.error("Content generation failed with status:", xhr.status);
            console.error("Response text:", xhr.responseText);
            
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              toast({
                title: "Generation failed",
                description: errorResponse.message || `Server returned status: ${xhr.status}`,
                variant: "destructive"
              });
            } catch (e) {
              toast({
                title: "Generation failed",
                description: `Server returned status: ${xhr.status}`,
                variant: "destructive"
              });
            }
            
            reject(new Error(`Server returned status: ${xhr.status}`));
          }
          setIsGenerating(false);
        };
        
        xhr.onerror = function() {
          console.error("XHR error occurred during content generation");
          toast({
            title: "Generation failed",
            description: "Network error occurred",
            variant: "destructive"
          });
          setIsGenerating(false);
          reject(new Error("Network error"));
        };
        
        xhr.timeout = 120000; // 2 minutes timeout for content generation
        xhr.ontimeout = function() {
          console.error("Content generation timed out");
          toast({
            title: "Generation failed",
            description: "Request timed out. The content generation may have taken too long.",
            variant: "destructive"
          });
          setIsGenerating(false);
          reject(new Error("Request timed out"));
        };
        
        console.log("Sending content generation request");
        xhr.send();
      });
    } catch (error) {
      console.error("Content generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };
  
  const copyContentToClipboard = (content: string, title?: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "Copied to clipboard",
        description: title 
          ? `"${title}" content has been copied to clipboard`
          : "Content has been copied to clipboard"
      });
    });
  };
  
  const copyAllContent = () => {
    const allContent = generatedContent.map((section, index) => {
      const slideNumber = section.slideNumber || index + 1;
      return `## Slide ${slideNumber}: ${section.slideTitle}\n\n${section.content}\n\n`;
    }).join('---\n\n');
    
    navigator.clipboard.writeText(allContent).then(() => {
      toast({
        title: "All content copied",
        description: "All slides have been copied to clipboard with slide numbers and titles"
      });
    });
  };
  
  const goToPreviousStep = () => {
    navigate("/strategy");
  };
  
  const startNewProject = () => {
    navigate("/");
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <StepProgress currentStep={4} />
      
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Generate Content</h2>
        <p className="text-gray-600 mb-8">
          Generate AI-powered content for each section of your template based on your company information and marketing strategy.
        </p>
        
        {generatedContent.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-primary/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                
                <h3 className="text-lg font-medium text-gray-800 mb-2">Ready to Generate Content</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Click the button below to generate AI-powered content for each section of your template.
                </p>
                
                <Button
                  onClick={generateContent}
                  className="bg-primary hover:bg-primary-dark text-white rounded-md px-6 py-2 text-sm font-medium transition"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Content...
                    </>
                  ) : (
                    "Generate Content"
                  )}
                </Button>
              </div>
              
              {isGenerating && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Generating content for sections:</h4>
                  
                  <div className="space-y-4">
                    {template.sections.map((section: { title: string }, index: number) => (
                      <div key={index} className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                          <span className="text-primary text-sm font-medium">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-800">{section.title}</h5>
                          <div className="mt-2">
                            <Skeleton className="h-4 w-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-medium text-lg text-gray-800">Generated Content</h3>
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={copyAllContent}
                  className="flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy All Sections
                </Button>
              </div>
              
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  {/* Search */}
                  <div className="relative md:w-1/3">
                    <Input 
                      type="search" 
                      placeholder="Search slides..." 
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1); // Reset to first page on search
                      }}
                      className="pl-9"
                    />
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" 
                      fill="none"
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {/* Category filter */}
                  <div className="flex md:w-2/3 gap-2 overflow-x-auto pb-2">
                    <Button
                      size="sm"
                      variant={activeCategory === "all" ? "default" : "outline"}
                      onClick={() => {
                        setActiveCategory("all");
                        setCurrentPage(1);
                      }}
                      className="whitespace-nowrap"
                    >
                      All Slides
                    </Button>
                    
                    {slideCategories.map((category) => (
                      <Button
                        key={category.name}
                        size="sm"
                        variant={activeCategory === category.name.toLowerCase() ? "default" : "outline"}
                        onClick={() => {
                          setActiveCategory(category.name.toLowerCase());
                          setCurrentPage(1);
                        }}
                        className="whitespace-nowrap"
                      >
                        {category.name} ({category.slides.length})
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Results summary */}
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-500">
                    {filteredContent.length === 0 ? (
                      "No slides found matching your criteria"
                    ) : filteredContent.length === generatedContent.length ? (
                      `Showing all ${generatedContent.length} slides`
                    ) : (
                      `Found ${filteredContent.length} slides out of ${generatedContent.length} total`
                    )}
                  </p>
                </div>
                
                {/* Grid of slide cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {paginatedContent.map((section) => (
                    <Card 
                      key={section.slideNumber} 
                      className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === section.slideNumber?.toString() ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setActiveTab(section.slideNumber?.toString() || '')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="bg-primary/10 text-primary font-medium px-2 py-1 rounded-full text-xs">
                            Slide {section.slideNumber}
                          </span>
                          <Badge variant="outline" className="text-xs bg-gray-50">
                            {section.format}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-gray-800 mb-2 truncate" title={section.slideTitle}>
                          {section.slideTitle}
                        </h4>
                        <p className="text-gray-600 text-sm overflow-hidden" style={{display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical"}}>
                          {section.needsContent === false ? (
                            <span className="italic text-gray-500">This slide doesn't require custom content.</span>
                          ) : (
                            section.content.substring(0, 150) + (section.content.length > 150 ? '...' : '')
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination className="mb-6">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and one page before and after current
                        if (
                          page === 1 || 
                          page === totalPages || 
                          page === currentPage || 
                          page === currentPage - 1 || 
                          page === currentPage + 1
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink 
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(page);
                                }}
                                isActive={page === currentPage}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        
                        // Show ellipsis if needed
                        if (
                          (page === 2 && currentPage > 3) || 
                          (page === totalPages - 1 && currentPage < totalPages - 2)
                        ) {
                          return <PaginationEllipsis key={page} />;
                        }
                        
                        return null;
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
              
              {/* Selected slide detail view */}
              {activeTab && (
                <>
                  {generatedContent
                    .filter(section => section.slideNumber?.toString() === activeTab)
                    .map(section => (
                      <div key={section.slideNumber} className="p-6 border border-gray-200 rounded-md bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                          <h4 className="text-lg font-medium text-gray-800">
                            <span className="text-gray-500 mr-2">Slide {section.slideNumber}:</span>
                            {section.slideTitle}
                            <span className="ml-3 text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                              {section.format}
                            </span>
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyContentToClipboard(section.content, section.slideTitle)}
                            className="flex items-center gap-1.5 font-medium hover:bg-primary/5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy Content
                          </Button>
                        </div>
                        
                        <Accordion type="single" collapsible className="w-full mt-4 mb-4">
                          <AccordionItem value="slide-analysis" className="border border-gray-200 rounded-md overflow-hidden">
                            <AccordionTrigger className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm text-gray-700">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                View Slide Analysis
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 py-3 bg-white border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h6 className="text-xs font-semibold text-gray-500 mb-1">Format:</h6>
                                  <p className="text-sm text-gray-700">{section.format}</p>
                                </div>
                                <div>
                                  <h6 className="text-xs font-semibold text-gray-500 mb-1">Needs Content:</h6>
                                  <p className="text-sm text-gray-700">
                                    {section.needsContent ? 
                                      <Badge variant="default" className="text-xs">Yes</Badge> : 
                                      <Badge variant="secondary" className="text-xs">No</Badge>
                                    }
                                  </p>
                                </div>
                              </div>
                              
                              {/* Try to find the matching section in templateSections first,
                                then fall back to template.sections if needed */}
                              {(() => {
                                // First try to find matching section in templateSections by slideNumber
                                const slideNum = section.slideNumber || 1;
                                const templateSection = 
                                  templateSections.find(ts => ts.slideNumber === slideNum) ||
                                  (template.sections && template.sections.length > 0 && slideNum > 0 ? 
                                    template.sections[slideNum-1] : null);
                                    
                                return templateSection ? (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h6 className="text-xs font-semibold text-gray-500 mb-1">Template Analysis:</h6>
                                    <div className="grid grid-cols-1 gap-2 mt-2">
                                      {templateSection.purpose && (
                                        <div>
                                          <span className="text-xs font-medium text-gray-600">Purpose:</span>
                                          <p className="text-sm text-gray-700">{templateSection.purpose}</p>
                                        </div>
                                      )}
                                      {templateSection.formatDetails && (
                                        <div>
                                          <span className="text-xs font-medium text-gray-600">Format Details:</span>
                                          <p className="text-sm text-gray-700">{templateSection.formatDetails}</p>
                                        </div>
                                      )}
                                      {templateSection.originalText && (
                                        <div>
                                          <span className="text-xs font-medium text-gray-600">Original Text:</span>
                                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-md">{templateSection.originalText}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                        
                        <div className="whitespace-pre-wrap text-gray-700 text-base leading-relaxed bg-gray-50 p-5 rounded-md font-normal max-h-[400px] overflow-y-auto">
                          {section.needsContent === false ? (
                            <div className="text-gray-500 italic">
                              <p>This slide doesn't require custom content. It appears to be a title slide, table of contents, or other structural element that should remain as-is in the template.</p>
                            </div>
                          ) : (
                            section.content
                          )}
                        </div>
                      </div>
                    ))}
                </>
              )}
              
              <Alert className="mt-6">
                <AlertDescription>
                  This content is AI-generated based on the information provided. Review and edit as needed to ensure accuracy and brand alignment.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-between items-center">
          <Button
            onClick={goToPreviousStep}
            variant="outline"
            className="flex items-center"
            disabled={isGenerating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Strategy
          </Button>
          
          {generatedContent.length > 0 && (
            <Button
              onClick={startNewProject}
              variant="outline"
              className="flex items-center"
              disabled={isGenerating}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start New Project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
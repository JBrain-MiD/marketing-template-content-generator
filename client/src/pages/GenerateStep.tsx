import { useState, useEffect } from "react";
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
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b border-gray-200 mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Template Slides:</h4>
                  <TabsList className="mb-4 h-auto flex-wrap gap-1 bg-transparent p-0">
                    {generatedContent.map((section, index) => (
                      <TabsTrigger 
                        key={section.slideNumber || index + 1} 
                        value={(section.slideNumber || index + 1).toString()} 
                        className="px-4 py-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-white shadow-none mr-2 mb-2 text-sm"
                      >
                        <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mr-2 text-xs">
                          {section.slideNumber || index + 1}
                        </span>
                        {section.slideTitle}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                {generatedContent.map((section, idx) => (
                  <TabsContent key={section.slideNumber || idx + 1} value={(section.slideNumber || idx + 1).toString()}>
                    <div className="p-6 border border-gray-200 rounded-md bg-white shadow-sm">
                      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                        <h4 className="text-lg font-medium text-gray-800">
                          <span className="text-gray-500 mr-2">Slide {section.slideNumber || idx + 1}:</span>
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
                              
                              if (templateSection) {
                                return (
                                  <>
                                    <div className="border-t border-gray-100 mt-3 pt-3">
                                      <h6 className="text-xs font-semibold text-gray-500 mb-1">Purpose:</h6>
                                      <p className="text-sm text-gray-700">{templateSection.purpose || "Not specified"}</p>
                                    </div>
                                    
                                    {templateSection.formatDetails && (
                                      <div className="mt-3">
                                        <h6 className="text-xs font-semibold text-gray-500 mb-1">Format Details:</h6>
                                        <p className="text-sm text-gray-700">{templateSection.formatDetails}</p>
                                      </div>
                                    )}
                                    
                                    {templateSection.expectedLength && (
                                      <div className="mt-3">
                                        <h6 className="text-xs font-semibold text-gray-500 mb-1">Expected Length:</h6>
                                        <p className="text-sm text-gray-700">{templateSection.expectedLength}</p>
                                      </div>
                                    )}
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      <div className="whitespace-pre-wrap text-gray-700 text-base leading-relaxed bg-gray-50 p-5 rounded-md font-normal max-h-[400px] overflow-y-auto">
                        {section.content}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              
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
              className="bg-primary hover:bg-primary-dark text-white rounded-md px-6 py-2 text-sm font-medium transition"
            >
              Start New Project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

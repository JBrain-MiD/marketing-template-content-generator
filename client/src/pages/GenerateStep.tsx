import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import StepProgress from "@/components/StepProgress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";

export default function GenerateStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { template, company, project, strategy } = useStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  
  // If missing required data, redirect to appropriate step
  if (!template) {
    navigate("/template");
    return null;
  }
  
  if (!company) {
    navigate("/company-info");
    return null;
  }
  
  if (!project || !strategy) {
    navigate("/strategy");
    return null;
  }
  
  useEffect(() => {
    // Set first section as active tab when content is loaded
    if (generatedContent.length > 0 && !activeTab) {
      setActiveTab(generatedContent[0].sectionId);
    }
  }, [generatedContent]);
  
  const generateContent = async () => {
    try {
      setIsGenerating(true);
      
      const response = await apiRequest("POST", `/api/projects/${project.id}/generate`);
      const result = await response.json();
      
      setGeneratedContent(result.generatedContent || []);
      
      toast({
        title: "Content generated",
        description: `Generated content for ${result.generatedContent?.length || 0} sections`
      });
    } catch (error) {
      console.error("Content generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const copyContentToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to clipboard"
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
                    {template.sections.map((section, index) => (
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
              <h3 className="font-medium text-lg mb-4 text-gray-800">Generated Content</h3>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 flex flex-wrap">
                  {generatedContent.map((section) => (
                    <TabsTrigger key={section.sectionId} value={section.sectionId} className="mr-2 mb-2">
                      {section.sectionTitle}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {generatedContent.map((section) => (
                  <TabsContent key={section.sectionId} value={section.sectionId}>
                    <div className="p-4 border border-gray-200 rounded-md bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-medium text-gray-800">{section.sectionTitle}</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyContentToClipboard(section.content)}
                          className="flex items-center text-xs"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy
                        </Button>
                      </div>
                      
                      <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
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

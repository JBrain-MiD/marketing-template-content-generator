import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import StepProgress from "@/components/StepProgress";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";

export default function GenerateStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { template, company, project, strategy, setProject, setStrategy } = useStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("1");
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  
  // Add debugging for troubleshooting
  console.log("Generate step - Current store state:", { 
    templateExists: !!template, 
    companyExists: !!company,
    projectExists: !!project,
    strategyExists: !!strategy
  });
  
  // If missing required data, redirect to appropriate step
  if (!template) {
    console.log("No template found, redirecting to template page");
    navigate("/template");
    return null;
  }
  
  if (!company) {
    console.log("No company found, redirecting to company-info page");
    navigate("/company-info");
    return null;
  }
  
  if (!project || !strategy) {
    console.log("No project or strategy found, redirecting to strategy page");
    navigate("/strategy");
    return null;
  }
  
  const generateContent = async () => {
    try {
      setIsGenerating(true);
      
      // Simulate content generation
      setTimeout(() => {
        const dummyContent = [
          {
            slideNumber: 1,
            slideTitle: "Introduction",
            content: "This is a sample introduction content", 
            format: "Text",
            needsContent: true
          },
          {
            slideNumber: 2,
            slideTitle: "Objectives",
            content: "These are sample objectives", 
            format: "Bullet Points",
            needsContent: true
          }
        ];
        
        setGeneratedContent(dummyContent);
        setIsGenerating(false);
        
        toast({
          title: "Content generated",
          description: "Sample content has been generated"
        });
      }, 1500);
    } catch (error) {
      setIsGenerating(false);
      toast({
        title: "Generation failed",
        description: "An error occurred during content generation",
        variant: "destructive"
      });
    }
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
                <h3 className="text-lg font-medium text-gray-800 mb-2">Ready to Generate Content</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Click the button below to generate AI-powered content for each section of your template.
                </p>
                
                <Button
                  onClick={generateContent}
                  className="bg-primary hover:bg-primary-dark text-white rounded-md px-6 py-2 text-sm font-medium transition"
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating Content..." : "Generate Content"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Generated Content</h3>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  {generatedContent.map((section) => (
                    <TabsTrigger key={section.slideNumber} value={section.slideNumber.toString()}>
                      Slide {section.slideNumber}: {section.slideTitle}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {generatedContent.map((section) => (
                  <TabsContent key={section.slideNumber} value={section.slideNumber.toString()}>
                    <div className="p-4 border rounded-md">
                      <h4 className="font-medium mb-2">
                        {section.slideTitle}
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {section.format}
                        </span>
                      </h4>
                      <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                        {section.content}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              
              <Alert className="mt-6">
                <AlertDescription>
                  This content is AI-generated based on the information provided. Review and edit as needed to ensure accuracy.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-between">
          <Button
            onClick={goToPreviousStep}
            variant="outline"
            disabled={isGenerating}
          >
            Back to Strategy
          </Button>
          
          {generatedContent.length > 0 && (
            <Button
              onClick={startNewProject}
              variant="outline"
              disabled={isGenerating}
            >
              Start New Project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
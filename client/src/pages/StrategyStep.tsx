import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { strategyStepSchema } from "@shared/schema";
import StepProgress from "@/components/StepProgress";
import FileUpload from "@/components/FileUpload";
import UploadedFiles from "@/components/UploadedFiles";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";

export default function StrategyStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { template, company, setProject, setStrategy } = useStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [strategyDocuments, setStrategyDocuments] = useState<File[]>([]);
  
  // Add debugging for troubleshooting
  console.log("Current store state:", { 
    templateExists: !!template, 
    companyExists: !!company,
    templateDetails: template ? `ID: ${template.id}` : 'none',
    companyDetails: company ? `ID: ${company.id}` : 'none'
  });
  
  // If no template or company, redirect to appropriate step
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
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(strategyStepSchema),
    defaultValues: {
      strategy: "",
      strategyDocuments: []
    }
  });
  
  const handleStrategyDocumentsUpload = (files: File[]) => {
    setStrategyDocuments(prev => [...prev, ...files]);
  };
  
  const removeStrategyDocument = (index: number) => {
    setStrategyDocuments(prev => prev.filter((_, i) => i !== index));
  };
  
  const goToPreviousStep = () => {
    navigate("/company-info");
  };
  
  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      // Create project
      const projectData = {
        templateId: template.id,
        companyId: company.id,
        strategy: data.strategy
      };
      
      const response = await apiRequest("POST", "/api/projects", projectData);
      const result = await response.json();
      
      // Save project and strategy to store
      setProject(result);
      setStrategy(data.strategy);
      
      toast({
        title: "Strategy saved",
        description: "Your marketing strategy has been saved successfully"
      });
      
      // Navigate to generate step
      navigate("/generate");
    } catch (error) {
      console.error("Strategy submission error:", error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to save strategy",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <StepProgress currentStep={3} />
      
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Marketing Strategy</h2>
        <p className="text-gray-600 mb-8">
          Define your marketing strategy to guide the content generation process and ensure alignment with your goals.
        </p>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="font-medium text-lg mb-4 text-gray-800">Strategy Description</h3>
              
              <div>
                <Label htmlFor="strategy">Marketing Strategy <span className="text-red-500">*</span></Label>
                <Textarea
                  id="strategy"
                  className="mt-1"
                  rows={8}
                  placeholder="Describe your marketing strategy, objectives, target audience, key messages, and any specific requirements..."
                  {...register("strategy")}
                />
                {errors.strategy && (
                  <p className="text-sm text-red-500 mt-1">{errors.strategy.message}</p>
                )}
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Strategy Document (Optional)</h4>
                
                <FileUpload
                  onFilesSelected={handleStrategyDocumentsUpload}
                  accept=".pdf,.docx,.txt"
                  helpText="Upload strategy documents (PDF, DOCX, TXT up to 10MB each)"
                />
                
                {strategyDocuments.length > 0 && (
                  <div className="mt-6">
                    <UploadedFiles
                      files={strategyDocuments}
                      onRemove={removeStrategyDocument}
                    />
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-100">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Strategy Tips</h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  <li>Include your target audience demographics and behaviors</li>
                  <li>Describe your unique value proposition and key messages</li>
                  <li>Mention specific marketing channels you plan to use</li>
                  <li>Include any brand voice guidelines or tone preferences</li>
                  <li>Add specific industry terms or keywords you want to include</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center">
            <Button
              type="button"
              onClick={goToPreviousStep}
              variant="outline"
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Company Info
            </Button>
            
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white rounded-md px-6 py-2 text-sm font-medium transition flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Next: Generate Content"}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

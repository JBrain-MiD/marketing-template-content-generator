import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companyInfoStepSchema } from "@shared/schema";
import StepProgress from "@/components/StepProgress";
import FileUpload from "@/components/FileUpload";
import UploadedFiles from "@/components/UploadedFiles";
import TemplatePreview from "@/components/TemplatePreview";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";

export default function CompanyInfoStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { template, setCompany } = useStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyDocuments, setCompanyDocuments] = useState<File[]>([]);
  
  // If no template is set, redirect to template step
  if (!template) {
    navigate("/template");
    return null;
  }
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(companyInfoStepSchema),
    defaultValues: {
      name: "",
      website: "",
      linkedin: "",
      industry: "",
      additionalNotes: "",
    }
  });
  
  const handleCompanyDocumentsUpload = (files: File[]) => {
    setCompanyDocuments(prev => [...prev, ...files]);
  };
  
  const removeCompanyDocument = (index: number) => {
    setCompanyDocuments(prev => prev.filter((_, i) => i !== index));
  };
  
  const goToPreviousStep = () => {
    navigate("/template");
  };
  
  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      
      // Append company info as JSON
      formData.append("data", JSON.stringify(data));
      
      // Append company documents
      companyDocuments.forEach(doc => {
        formData.append("documents", doc);
      });
      
      const response = await apiRequest("POST", "/api/companies", null, {
        body: formData,
        headers: {}, // Remove Content-Type header for FormData
      });
      
      const result = await response.json();
      
      // Save company info to store
      setCompany(result);
      
      toast({
        title: "Company information saved",
        description: "Your company profile has been created successfully"
      });
      
      // Navigate to strategy step
      navigate("/strategy");
    } catch (error) {
      console.error("Company info submission error:", error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to save company information",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <StepProgress currentStep={2} />
      
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Company Information</h2>
        <p className="text-gray-600 mb-8">
          Upload company documents and provide additional details to build a comprehensive profile for content generation.
        </p>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="font-medium text-lg mb-4 text-gray-800">Company Documents</h3>
              
              <FileUpload
                onFilesSelected={handleCompanyDocumentsUpload}
                accept=".pdf,.docx,.txt"
                helpText="Upload company documents to help generate better content (PDF, DOCX, TXT up to 10MB each)"
              />
              
              {companyDocuments.length > 0 && (
                <div className="mt-6">
                  <UploadedFiles
                    files={companyDocuments}
                    onRemove={removeCompanyDocument}
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="font-medium text-lg mb-4 text-gray-800">Additional Information</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Company Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    className="mt-1"
                    placeholder="Enter company name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    className="mt-1"
                    placeholder="https://www.example.com"
                    {...register("website")}
                  />
                  {errors.website && (
                    <p className="text-sm text-red-500 mt-1">{errors.website.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    className="mt-1"
                    placeholder="https://www.linkedin.com/company/example"
                    {...register("linkedin")}
                  />
                  {errors.linkedin && (
                    <p className="text-sm text-red-500 mt-1">{errors.linkedin.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select onValueChange={(value) => setValue("industry", value)}>
                    <SelectTrigger id="industry" className="mt-1">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="ecommerce">E-Commerce</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="additionalNotes">Additional Notes</Label>
                  <Textarea
                    id="additionalNotes"
                    className="mt-1"
                    rows={4}
                    placeholder="Enter any additional information that might be helpful..."
                    {...register("additionalNotes")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <TemplatePreview template={template} />
          
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
              Back to Template
            </Button>
            
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white rounded-md px-6 py-2 text-sm font-medium transition flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Next: Strategy"}
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

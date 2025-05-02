import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface TemplatePreviewProps {
  template: any;
}

export default function TemplatePreview({ template }: TemplatePreviewProps) {
  if (!template) return null;
  
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg text-gray-800">Template Analysis</h3>
          <Link href="/template" className="text-primary text-sm font-medium hover:text-primary-dark flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Change Template
          </Link>
        </div>
        
        <div className="border border-gray-200 rounded-md">
          <div className="p-4 border-b border-gray-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <div className="text-sm font-medium text-gray-800">{template.name}</div>
              <div className="text-xs text-gray-500">
                {template.numPages} pages • {template.sections.length} content sections detected
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            {template.sections.slice(0, 3).map((section: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-md p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-1">{section.title}</h4>
                <p className="text-xs text-gray-500">Format: {section.format}</p>
                <p className="text-xs text-gray-500">Length: {section.expectedLength}</p>
              </div>
            ))}
            
            {template.sections.length > 3 && (
              <div className="bg-gray-50 rounded-md p-3 flex items-center justify-center">
                <span className="text-sm text-gray-600">+{template.sections.length - 3} more sections</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

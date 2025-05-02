interface StepProgressProps {
  currentStep: number;
}

export default function StepProgress({ currentStep }: StepProgressProps) {
  const steps = [
    { number: 1, title: "Template", icon: "description" },
    { number: 2, title: "Company Info", icon: "business" },
    { number: 3, title: "Strategy", icon: "lightbulb" },
    { number: 4, title: "Generate", icon: "auto_awesome" },
  ];
  
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, index) => (
          <div key={index}>
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step.number <= currentStep 
                  ? "bg-primary text-white" 
                  : "bg-gray-300 text-gray-500"
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {step.icon === "description" && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  )}
                  {step.icon === "business" && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  )}
                  {step.icon === "lightbulb" && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  )}
                  {step.icon === "auto_awesome" && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  )}
                </svg>
              </div>
              <div className={`text-sm font-medium mt-2 ${
                step.number <= currentStep ? "text-primary-800" : "text-gray-500"
              }`}>
                {step.title}
              </div>
            </div>
            
            {/* Connector (except for last item) */}
            {index < steps.length - 1 && (
              <div className={`step-connector flex-1 mx-2 ${
                step.number < currentStep ? "active" : ""
              }`}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

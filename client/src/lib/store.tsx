import React, { createContext, useContext, useState, ReactNode } from "react";

interface StoreContextType {
  template: any | null;
  company: any | null;
  project: any | null;
  strategy: string | null;
  setTemplate: (template: any | null) => void;
  setCompany: (company: any | null) => void;
  setProject: (project: any | null) => void;
  setStrategy: (strategy: string | null) => void;
  resetState: () => void;
}

const initialState: StoreContextType = {
  template: null,
  company: null,
  project: null,
  strategy: null,
  setTemplate: () => {},
  setCompany: () => {},
  setProject: () => {},
  setStrategy: () => {},
  resetState: () => {},
};

const StoreContext = createContext<StoreContextType>(initialState);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [template, setTemplate] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [project, setProject] = useState<any | null>(null);
  const [strategy, setStrategy] = useState<string | null>(null);
  
  const resetState = () => {
    setTemplate(null);
    setCompany(null);
    setProject(null);
    setStrategy(null);
  };
  
  return (
    <StoreContext.Provider
      value={{
        template,
        company,
        project,
        strategy,
        setTemplate,
        setCompany,
        setProject,
        setStrategy,
        resetState,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
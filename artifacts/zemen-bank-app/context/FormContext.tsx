import React, { createContext, useContext, useState, useCallback } from "react";

export type FormSectionName = 
  | "GENERAL_INFO" 
  | "PERSONAL_INFO" 
  | "BUSINESS_ACTIVITIES" 
  | "FINANCIAL_INFORMATION" 
  | "PROPRIETY_TEST";

export interface FormSection {
  id?: string;
  sectionName: FormSectionName;
  answers: Record<string, any>;
  status: "INCOMPLETE" | "PENDING" | "APPROVED" | "REJECTED";
  comments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    approver?: { name: string };
  }>;
}

export interface FormSubmission {
  id: string;
  version: number;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED" | "COMPLETED";
  submittedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  sections: FormSection[];
}

interface FormContextType {
  submission: FormSubmission | null;
  setSubmission: (submission: FormSubmission | null) => void;
  updateSection: (sectionName: FormSectionName, answers: Record<string, any>) => void;
  getSection: (sectionName: FormSectionName) => FormSection | undefined;
  isSectionComplete: (sectionName: FormSectionName) => boolean;
  completionPercentage: number;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export function FormProvider({ children }: { children: React.ReactNode }) {
  const [submission, setSubmission] = useState<FormSubmission | null>(null);

  const updateSection = useCallback((sectionName: FormSectionName, answers: Record<string, any>) => {
    setSubmission((prev) => {
      if (!prev) return prev;
      
      const existingSectionIndex = prev.sections.findIndex(s => s.sectionName === sectionName);
      const newSection: FormSection = {
        id: existingSectionIndex >= 0 ? prev.sections[existingSectionIndex].id : undefined,
        sectionName,
        answers,
        status: "INCOMPLETE",
      };

      const newSections = existingSectionIndex >= 0
        ? prev.sections.map((s, i) => i === existingSectionIndex ? newSection : s)
        : [...prev.sections, newSection];

      return { ...prev, sections: newSections };
    });
  }, []);

  const getSection = useCallback((sectionName: FormSectionName) => {
    return submission?.sections.find(s => s.sectionName === sectionName);
  }, [submission]);

  const isSectionComplete = useCallback((sectionName: FormSectionName) => {
    const section = getSection(sectionName);
    if (!section) return false;
    
    const requiredFields: Record<FormSectionName, string[]> = {
      GENERAL_INFO: ["fullName", "nationality", "dateOfBirth"],
      PERSONAL_INFO: ["sourceOfFunds"],
      BUSINESS_ACTIVITIES: ["businessDescription"],
      FINANCIAL_INFORMATION: ["totalAssets"],
      PROPRIETY_TEST: ["q1", "q2", "q3"],
    };
    
    const required = requiredFields[sectionName] || [];
    return required.every(field => {
      const value = section.answers[field];
      return value !== undefined && value !== null && value !== "";
    });
  }, [getSection]);

  const completionPercentage = submission 
    ? Math.round((submission.sections.filter(s => s.status !== "INCOMPLETE").length / 5) * 100)
    : 0;

  return (
    <FormContext.Provider
      value={{
        submission,
        setSubmission,
        updateSection,
        getSection,
        isSectionComplete,
        completionPercentage,
      }}
    >
      {children}
    </FormContext.Provider>
  );
}

export function useForm() {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error("useForm must be used within FormProvider");
  return ctx;
}

import { createContext, useContext, useState, ReactNode } from "react";

export interface ITRDraft {
  // Salary
  grossSalary: number;
  allowances: number;
  professionalTax: number;
  standardDeduction: number;
  netSalary: number;
  tdsDeducted: number;
  employer: string;

  // Other sources
  savingsInterest: number;
  fdInterest: number;
  dividendIncome: number;
  otherIncome: number;

  // Deductions (Old regime)
  section80C: number;
  section80D: number;
  section80G: number;
  section80TTA: number;
  homeLoanInterest: number;

  // House property
  hasHouseProperty: boolean;
  rentalIncome: number;
  municipalTax: number;

  // Meta
  regime: "old" | "new";
  assessmentYear: string;
}

const defaultDraft: ITRDraft = {
  grossSalary: 0,
  allowances: 0,
  professionalTax: 0,
  standardDeduction: 50000,
  netSalary: 0,
  tdsDeducted: 0,
  employer: "",
  savingsInterest: 0,
  fdInterest: 0,
  dividendIncome: 0,
  otherIncome: 0,
  section80C: 0,
  section80D: 0,
  section80G: 0,
  section80TTA: 0,
  homeLoanInterest: 0,
  hasHouseProperty: false,
  rentalIncome: 0,
  municipalTax: 0,
  regime: "new",
  assessmentYear: "2025-26",
};

interface DraftContextType {
  draft: ITRDraft;
  updateDraft: (partial: Partial<ITRDraft>) => void;
  resetDraft: () => void;
  autoFilled: boolean;
  setAutoFilled: (v: boolean) => void;
}

const DraftContext = createContext<DraftContextType>({
  draft: defaultDraft,
  updateDraft: () => {},
  resetDraft: () => {},
  autoFilled: false,
  setAutoFilled: () => {},
});

export const useDraft = () => useContext(DraftContext);

export const DraftProvider = ({ children }: { children: ReactNode }) => {
  const [draft, setDraft] = useState<ITRDraft>(() => {
    const stored = localStorage.getItem("zenith_itr_draft");
    return stored ? { ...defaultDraft, ...JSON.parse(stored) } : defaultDraft;
  });
  const [autoFilled, setAutoFilled] = useState(false);

  const updateDraft = (partial: Partial<ITRDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("zenith_itr_draft", JSON.stringify(next));
      return next;
    });
  };

  const resetDraft = () => {
    setDraft(defaultDraft);
    localStorage.removeItem("zenith_itr_draft");
  };

  return (
    <DraftContext.Provider value={{ draft, updateDraft, resetDraft, autoFilled, setAutoFilled }}>
      {children}
    </DraftContext.Provider>
  );
};

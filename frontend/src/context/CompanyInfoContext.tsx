import { createContext, useContext, type ReactNode } from "react";
import { getPublicCompanyInfo } from "../api/company";
import { useApiQuery, type QueryState } from "../hooks/useApiQuery";
import type { PublicCompanyInfo } from "../types/api";

type CompanyInfoState = QueryState<PublicCompanyInfo> & { reload: () => void };

const CompanyInfoContext = createContext<CompanyInfoState | null>(null);

// Loads the public company details once for the whole public site.
export function CompanyInfoProvider({ children }: { children: ReactNode }) {
  const state = useApiQuery((signal) => getPublicCompanyInfo(signal), []);

  return <CompanyInfoContext.Provider value={state}>{children}</CompanyInfoContext.Provider>;
}

export function useCompanyInfo() {
  const state = useContext(CompanyInfoContext);

  if (!state) {
    throw new Error("useCompanyInfo must be used inside CompanyInfoProvider");
  }

  return state;
}

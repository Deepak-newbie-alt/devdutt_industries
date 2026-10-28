import { apiRequest } from "./client";
import type { PublicCompanyInfo } from "../types/api";

export function getPublicCompanyInfo(signal?: AbortSignal) {
  return apiRequest<PublicCompanyInfo>("/company-settings/public", { signal });
}

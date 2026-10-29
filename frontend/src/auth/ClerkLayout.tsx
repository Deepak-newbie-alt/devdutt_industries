import { ClerkProvider } from "@clerk/react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Clerk for the sign-in page and the employee workspace. AppRoot loads it on demand, so the public
// site and the customer quotation page never load Clerk unless staff pages are opened in the tab.
export function StaffClerkProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  if (!publishableKey) {
    throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not set. Add it to frontend/.env.local.");
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signInFallbackRedirectUrl="/app"
      afterSignOutUrl="/sign-in"
    >
      {children}
    </ClerkProvider>
  );
}

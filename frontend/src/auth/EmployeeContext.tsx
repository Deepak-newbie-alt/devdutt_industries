import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { Navigate, useLocation } from "react-router";
import { ApiError, apiFileRequest, apiRequest, type DownloadedFile, type RequestOptions } from "../api/client";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useApiQuery } from "../hooks/useApiQuery";
import type { Employee } from "../types/api";

// An API call made as the signed-in employee (Clerk session token attached).
export type AuthedRequest = <T>(path: string, options?: Omit<RequestOptions, "token">) => Promise<T>;
// The same, for endpoints that return a file.
export type AuthedFileRequest = (path: string, options?: Omit<RequestOptions, "token">) => Promise<DownloadedFile>;

type EmployeeContextValue = {
  employee: Employee;
  request: AuthedRequest;
  requestFile: AuthedFileRequest;
  signOut: () => void;
};

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

type SessionProblem = "expired" | "inactive" | null;

function AccountMessage({ title, children, onSignOut }: { title: string; children: ReactNode; onSignOut: () => void }) {
  return (
    <div className="container page-section narrow">
      <title>{`${title} | Devdutt Industries`}</title>
      <h1>{title}</h1>
      {children}
      <button type="button" className="button button--primary" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}

// Signed-in employees only. Loads the local account (role and status come from our
// database, not from Clerk) and gives pages an authenticated request function.
// The backend still checks every request; this only decides what to show.
export function EmployeeProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth();
  const location = useLocation();
  const [problem, setProblem] = useState<SessionProblem>(null);

  // Attaches the session token and notices when the session or account stops being valid.
  const withSession = useCallback(
    async <T,>(send: (token: string) => Promise<T>): Promise<T> => {
      const token = await getToken();

      if (!token) {
        setProblem("expired");
        throw new ApiError("Your session has expired. Please sign in again.", 401);
      }

      try {
        return await send(token);
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 401) setProblem("expired");
          if (error.status === 403 && error.message === "User is inactive") setProblem("inactive");
        }
        throw error;
      }
    },
    [getToken],
  );

  const request = useCallback<AuthedRequest>(
    (path, options) => withSession((token) => apiRequest(path, { ...options, token })),
    [withSession],
  );

  const requestFile = useCallback<AuthedFileRequest>(
    (path, options) => withSession((token) => apiFileRequest(path, { ...options, token })),
    [withSession],
  );

  const me = useApiQuery(
    (signal) => (isSignedIn ? request<Employee>("/users/me", { signal }) : Promise.reject(null)),
    [isSignedIn, userId],
  );

  const handleSignOut = useCallback(() => {
    void signOut({ redirectUrl: "/sign-in" });
  }, [signOut]);

  if (!isLoaded) {
    return (
      <div className="container page-section">
        <LoadingState label="Checking your sign-in" />
      </div>
    );
  }

  if (!isSignedIn) {
    const back = `${window.location.origin}${location.pathname}${location.search}`;
    return <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(back)}`} replace />;
  }

  if (problem === "expired") {
    return (
      <AccountMessage title="Your session has expired" onSignOut={handleSignOut}>
        <p>For your security you've been signed out. Sign in again to continue.</p>
      </AccountMessage>
    );
  }

  if (me.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading your account" />
      </div>
    );
  }

  if (me.status === "error") {
    if (me.error.status === 404) {
      return (
        <AccountMessage title="Your account isn't set up yet" onSignOut={handleSignOut}>
          <p>
            You're signed in, but there's no Devdutt Industries staff account linked to this login. Ask an administrator
            to add you.
          </p>
        </AccountMessage>
      );
    }

    return (
      <div className="container page-section narrow">
        <StatusMessage
          tone="error"
          title="Your account couldn't be loaded"
          action={
            <button type="button" className="button button--secondary" onClick={me.reload}>
              Try again
            </button>
          }
        >
          <p>{me.error.message}</p>
        </StatusMessage>
      </div>
    );
  }

  if (problem === "inactive" || me.data.status !== "ACTIVE") {
    return (
      <AccountMessage title="Your account is inactive" onSignOut={handleSignOut}>
        <p>Your staff account has been deactivated. Contact an administrator if you think this is a mistake.</p>
      </AccountMessage>
    );
  }

  return (
    <EmployeeContext.Provider value={{ employee: me.data, request, requestFile, signOut: handleSignOut }}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const value = useContext(EmployeeContext);

  if (!value) {
    throw new Error("useEmployee must be used inside EmployeeProvider");
  }

  return value;
}

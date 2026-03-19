import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserSession {
  userId: string;
  name: string;
  email: string;
  pan: string; // masked
}

interface SessionContextType {
  session: UserSession | null;
  setSession: (s: UserSession | null) => void;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  setSession: () => {},
  isLoading: true,
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("zenith_itr_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem("zenith_itr_session");
      }
    }
    setIsLoading(false);
  }, []);

  const handleSetSession = (s: UserSession | null) => {
    setSession(s);
    if (s) {
      sessionStorage.setItem("zenith_itr_session", JSON.stringify(s));
    } else {
      sessionStorage.removeItem("zenith_itr_session");
    }
  };

  return (
    <SessionContext.Provider value={{ session, setSession: handleSetSession, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

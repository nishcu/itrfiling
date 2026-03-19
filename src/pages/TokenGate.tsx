import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { motion } from "framer-motion";
import { Shield, AlertTriangle } from "lucide-react";
import { verifySessionToken } from "@/lib/api";

const TokenGate = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, setSession, isLoading } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Already has session
    if (session) {
      navigate("/dashboard", { replace: true });
      return;
    }

    const token = searchParams.get("token");

    if (!token) {
      // Dev/demo mode: auto-create a demo session so the app is previewable
      const demoSession = {
        userId: "demo_user_001",
        name: "Rahul Sharma",
        email: "rahul@example.com",
        pan: "ABCDE****F",
      };
      setSession(demoSession);
      navigate("/dashboard", { replace: true });
      return;
    }

    // Verify token server-side (or client-side fallback when verify URL not set)
    setVerifying(true);
    verifySessionToken(token)
      .then((userSession) => {
        setSession(userSession);
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Invalid or expired session.";
        setError(
          message.includes("expired")
            ? "Session expired. Please return to ZenithBooks and try again."
            : "Invalid or expired session. Please return to ZenithBooks and try again."
        );
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [isLoading, session, searchParams, navigate, setSession]);

  if (isLoading || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Verifying your session...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-2xl p-8 max-w-md w-full text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground mb-2">
              Session Expired
            </h1>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
          <a
            href="https://zenithbooks.in"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-primary"
          >
            <Shield className="w-4 h-4" />
            Return to ZenithBooks
          </a>
        </motion.div>
      </div>
    );
  }

  // Loading state while redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default TokenGate;

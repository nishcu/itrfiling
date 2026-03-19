import { ReactNode, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { Navigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Shield, LogOut, Sun, Moon } from "lucide-react";
import FaqDrawer from "@/components/FaqDrawer";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { session, setSession } = useSession();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [faqOpen, setFaqOpen] = useState(false);

  if (!session && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {session && (
        <header className="sticky top-0 z-50 glass-strong border-b border-border/40">
          <div className="container flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-lg text-gradient">Zenith ITR</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label="Toggle theme"
              >
                {(theme ?? "dark") === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {session.name} · <span className="font-mono text-xs">{session.pan}</span>
              </span>
              <button
                onClick={() => {
                  setSession(null);
                  window.location.href = "/";
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/50"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="container py-6 pb-20"
      >
        {children}
      </motion.main>

      {/* Help FAB */}
      {session && (
        <>
          <motion.button
            type="button"
            onClick={() => setFaqOpen(true)}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-lg font-bold glow-primary z-50 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Need Help?"
            aria-label="Need Help? Open FAQ"
          >
            ?
          </motion.button>
          <FaqDrawer open={faqOpen} onOpenChange={setFaqOpen} />
        </>
      )}
    </div>
  );
};

export default AppLayout;

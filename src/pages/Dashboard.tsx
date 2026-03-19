import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Clock, Download, CheckCircle } from "lucide-react";
import { getFilings, formatFilingDate, type FilingRecord } from "@/lib/firestore";
import { ShimmerRow } from "@/components/ShimmerCard";

const PORTAL_URL = "https://www.incometax.gov.in/iec/foportal";

const Dashboard = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [filings, setFilings] = useState<(FilingRecord & { id: string })[]>([]);
  const [loadingFilings, setLoadingFilings] = useState(true);

  useEffect(() => {
    if (!session?.userId) {
      setLoadingFilings(false);
      return;
    }
    getFilings(session.userId)
      .then(setFilings)
      .finally(() => setLoadingFilings(false));
  }, [session?.userId]);

  if (!session) return null;

  const firstName = session.name.split(" ")[0];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-3 pt-4"
      >
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
          Hi {firstName}, let's file your{" "}
          <span className="text-gradient">ITR-1 Sahaj</span> effortlessly
        </h1>
        <p className="text-muted-foreground">
          Most users finish in under 5 minutes with AI-powered auto-fill
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="glass-strong rounded-2xl p-8 text-center space-y-6 glow-primary"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            AY 2025-26 Filing
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload Form 16 & AIS → AI auto-fills → Review → File
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/upload")}
          className="inline-flex items-center gap-2 py-3 px-8 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity glow-primary"
        >
          Start Filing <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="space-y-3"
      >
        <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Previous Filings
        </h3>

        {loadingFilings ? (
          <div className="space-y-3">
            <ShimmerRow />
            <ShimmerRow />
            <ShimmerRow />
          </div>
        ) : filings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No filings yet. Start your first filing above.</p>
        ) : (
          <div className="space-y-3">
            {filings.map((f) => (
              <div
                key={f.id}
                className="glass rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <p className="font-mono text-sm font-medium text-foreground truncate">{f.arn}</p>
                  <p className="text-xs text-muted-foreground">
                    AY {f.assessmentYear} · Filed {formatFilingDate(f.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-success/10 text-success font-medium">
                    <CheckCircle className="w-3 h-3" />
                    {f.status}
                  </span>
                  {f.itrVUrl ? (
                    <a
                      href={f.itrVUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors p-1"
                      title="Download ITR-V"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  ) : (
                    <a
                      href={PORTAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors p-1"
                      title="Download ITR-V (Portal)"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;

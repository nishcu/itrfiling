import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ProgressBar from "@/components/ProgressBar";
import { useDraft } from "@/context/DraftContext";
import { CheckCircle, Download, ExternalLink, PartyPopper, Copy, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { FilingResult } from "@/lib/api";

const PORTAL_URL = "https://www.incometax.gov.in/iec/foportal";
const REFUND_TRACKER_URL = "https://www.incometax.gov.in/iec/foportal/refund-tracker";

const confettiColors = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];

function downloadJson(contents: string, filename: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { draft } = useDraft();
  const result = location.state as FilingResult | null;

  const arn = result?.arn ?? `ARNB${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999999)).padStart(8, "0")}`;
  const itrVUrl = result?.itrVUrl;
  const itrJson = result?.itrJson;
  const needsManualUpload = result?.needsManualUpload ?? false;

  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const handleDownloadItrJson = () => {
    if (!itrJson) return;
    const str = typeof itrJson === "string" ? itrJson : JSON.stringify(itrJson);
    downloadJson(str, `ITR-1-AY-${draft.assessmentYear.replace("-", "-")}.json`);
    toast.success("ITR JSON downloaded");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 relative">
      <ProgressBar currentStep={3} />

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: confettiColors[i % confettiColors.length],
                left: `${Math.random() * 100}%`,
                top: -10,
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{
                y: typeof window !== "undefined" ? window.innerHeight + 20 : 800,
                opacity: 0,
                rotate: Math.random() * 720,
                x: (Math.random() - 0.5) * 200,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="glass-strong rounded-2xl p-8 text-center space-y-5 glow-accent"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        >
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
        </motion.div>

        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center justify-center gap-2">
            ITR-1 Filed Successfully! <PartyPopper className="w-6 h-6 text-accent" />
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your return has been submitted for AY {draft.assessmentYear}
          </p>
        </div>

        <div className="glass rounded-lg p-4 inline-block">
          <p className="text-xs text-muted-foreground mb-1">Acknowledgement Number (ARN)</p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <p className="font-mono text-lg font-bold text-foreground">{arn}</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(arn);
                toast.success("ARN copied!");
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Copy ARN"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {needsManualUpload && itrJson && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-lg p-4 space-y-3 border border-accent/30"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Complete e-filing on the portal</p>
              <p className="text-sm text-muted-foreground mt-1">
                Download the ITR JSON below and upload it on the Income Tax portal to complete your filing and e-verify.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadItrJson}
              className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <FileText className="w-4 h-4" /> Download ITR JSON
            </button>
            <a
              href={PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80"
            >
              <ExternalLink className="w-4 h-4" /> Open Income Tax Portal
            </a>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <h2 className="text-lg font-display font-semibold text-foreground">Next Steps</h2>

        <div className="glass rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">E-Verify your return</p>
              <p className="text-xs text-muted-foreground">
                Use Aadhaar OTP, Net Banking, or DSC within 30 days
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Download ITR-V</p>
              <p className="text-xs text-muted-foreground">
                Keep for your records
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {itrVUrl ? (
          <a
            href={itrVUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-secondary/30 transition-colors"
          >
            <Download className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Download ITR-V</span>
          </a>
        ) : (
          <a
            href={PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="glass rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-secondary/30 transition-colors"
          >
            <Download className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Download ITR-V (Portal)</span>
          </a>
        )}
        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="glass rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-secondary/30 transition-colors"
        >
          <ExternalLink className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">E-Verify on Portal</span>
        </a>
        <a
          href={REFUND_TRACKER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="glass rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-secondary/30 transition-colors sm:col-span-2"
        >
          <ExternalLink className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Track Refund Status</span>
          <span className="text-xs text-muted-foreground">Check on Income Tax portal</span>
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center pt-4 flex flex-col sm:flex-row items-center justify-center gap-2"
      >
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          ← Dashboard
        </button>
        <span className="text-muted-foreground hidden sm:inline">·</span>
        <a
          href="https://zenithbooks.in"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Return to ZenithBooks
        </a>
      </motion.div>
    </div>
  );
};

export default SuccessPage;

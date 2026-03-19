import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDraft } from "@/context/DraftContext";
import { useSession } from "@/context/SessionContext";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ProgressBar from "@/components/ProgressBar";
import TaxComparison from "@/components/TaxComparison";
import { runFilingFlow, type FilingResult } from "@/lib/api";
import { addFiling } from "@/lib/firestore";
import { ArrowLeft, FileCheck, IndianRupee, TrendingUp, Briefcase, Landmark, PiggyBank } from "lucide-react";

const QUICKO_ENABLED = !!import.meta.env.VITE_FIREBASE_QUICKO_FUNCTION_URL;

const PreviewPage = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const { draft } = useDraft();
  const [isFiling, setIsFiling] = useState(false);
  const [filingError, setFilingError] = useState<string | null>(null);

  const grossIncome =
    draft.grossSalary +
    draft.savingsInterest +
    draft.fdInterest +
    draft.dividendIncome +
    draft.otherIncome;

  const totalDeductions =
    draft.regime === "old"
      ? draft.standardDeduction + draft.professionalTax + draft.section80C + draft.section80D + draft.section80G + Math.min(draft.section80TTA, 10000) + Math.min(draft.homeLoanInterest, 200000)
      : 75000;

  const taxableIncome = Math.max(0, grossIncome - totalDeductions);
  const estimatedTax = draft.regime === "new" ? (taxableIncome <= 1200000 ? 0 : Math.round(taxableIncome * 0.15)) : Math.round(taxableIncome * 0.12);
  const refundOrPayable = draft.tdsDeducted - estimatedTax;
  const isRefund = refundOrPayable >= 0;

  const summaryCards = [
    { label: "Gross Income", value: grossIncome, icon: Briefcase, color: "text-primary" },
    { label: "Total Deductions", value: totalDeductions, icon: PiggyBank, color: "text-accent" },
    { label: "Taxable Income", value: taxableIncome, icon: Landmark, color: "text-foreground" },
  ];

  const handleFileNow = async () => {
    setIsFiling(true);
    setFilingError(null);

    try {
      let result: FilingResult;

      if (QUICKO_ENABLED) {
        result = await runFilingFlow(draft);
      } else {
        await new Promise((r) => setTimeout(r, 2500));
        result = {
          arn: `ARNB${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999999)).padStart(8, "0")}`,
          status: "Submitted",
        };
      }

      if (session?.userId) {
        await addFiling(session.userId, {
          arn: result.arn,
          status: result.status ?? "Submitted",
          assessmentYear: draft.assessmentYear,
          itrVUrl: result.itrVUrl,
        });
      }

      navigate("/file", { state: result, replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Filing failed. Please try again.";
      setFilingError(message);
      toast.error("Filing failed", { description: message });
    } finally {
      setIsFiling(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProgressBar currentStep={2} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Tax Summary</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review your final numbers before filing
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className={`glass-strong rounded-2xl p-8 text-center ${isRefund ? "glow-accent" : ""}`}
      >
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {isRefund ? "Estimated Refund" : "Tax Payable"}
        </p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2"
        >
          <IndianRupee className={`w-8 h-8 ${isRefund ? "text-success" : "text-destructive"}`} />
          <span className={`text-5xl font-display font-bold ${isRefund ? "text-success" : "text-destructive"}`}>
            {Math.abs(refundOrPayable).toLocaleString("en-IN")}
          </span>
        </motion.div>
        <div className="flex items-center justify-center gap-1 mt-2">
          <TrendingUp className={`w-4 h-4 ${isRefund ? "text-success" : "text-destructive"}`} />
          <span className="text-xs text-muted-foreground">
            {draft.regime === "new" ? "New" : "Old"} Tax Regime · AY {draft.assessmentYear}
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="glass rounded-lg p-4 text-center"
          >
            <card.icon className={`w-5 h-5 mx-auto mb-2 ${card.color}`} />
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className="text-sm font-bold text-foreground">₹{card.value.toLocaleString("en-IN")}</p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-display font-semibold text-foreground">Regime Comparison</h2>
        <TaxComparison />
      </div>

      {filingError && (
        <div className="rounded-lg p-3 bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {filingError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate("/review")}
          disabled={isFiling}
          className="flex items-center gap-2 py-2.5 px-5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Edit
        </button>
        <button
          type="button"
          onClick={handleFileNow}
          disabled={isFiling}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-gradient-to-r from-success to-success/80 text-success-foreground font-bold text-base hover:opacity-90 transition-opacity shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isFiling ? (
            <>
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Filing...
            </>
          ) : (
            <>
              <FileCheck className="w-5 h-5" /> File ITR-1 Now
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PreviewPage;

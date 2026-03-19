import { useNavigate } from "react-router-dom";
import { useDraft } from "@/context/DraftContext";
import { motion } from "framer-motion";
import ProgressBar from "@/components/ProgressBar";
import CollapsibleSection from "@/components/CollapsibleSection";
import TaxComparison from "@/components/TaxComparison";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getMismatches } from "@/lib/mismatches";
import { ArrowRight, ArrowLeft, Save, Briefcase, Landmark, PiggyBank, Home, AlertCircle } from "lucide-react";

const ReviewPage = () => {
  const navigate = useNavigate();
  const { draft, updateDraft } = useDraft();
  const mismatches = getMismatches(draft);

  const Field = ({
    label,
    value,
    field,
    prefix = "₹",
    mismatch = null,
  }: {
    label: string;
    value: number;
    field: string;
    prefix?: string;
    mismatch?: string | null;
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0 gap-2">
      <label className="text-sm text-muted-foreground shrink-0">{label}</label>
      <div className="flex items-center gap-1.5 min-w-0">
        {mismatch ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 text-amber-500 dark:text-amber-400" aria-label="Mismatch or limit note">
                <AlertCircle className="w-4 h-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs">
              {mismatch}
            </TooltipContent>
          </Tooltip>
        ) : null}
        <span className="text-xs text-muted-foreground shrink-0">{prefix}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => updateDraft({ [field]: Number(e.target.value) })}
          className="w-28 text-right bg-transparent text-sm font-medium text-foreground border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-2 py-1"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProgressBar currentStep={1} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Review & Edit
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          All values are editable. Verify against your documents.
        </p>
      </motion.div>

      <div className="space-y-3">
        <CollapsibleSection
          title="Salary Details"
          icon={<Briefcase className="w-4 h-4" />}
          defaultOpen
          badge={draft.employer || "Auto-filled"}
        >
          <div className="space-y-0">
            <Field label="Gross Salary" value={draft.grossSalary} field="grossSalary" />
            <Field label="Allowances" value={draft.allowances} field="allowances" />
            <Field label="Professional Tax" value={draft.professionalTax} field="professionalTax" />
            <Field label="Standard Deduction" value={draft.standardDeduction} field="standardDeduction" />
            <Field label="TDS Deducted" value={draft.tdsDeducted} field="tdsDeducted" mismatch={mismatches.tdsDeducted} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Other Sources"
          icon={<Landmark className="w-4 h-4" />}
          badge="From AIS"
        >
          <div className="space-y-0">
            <Field label="Savings Interest" value={draft.savingsInterest} field="savingsInterest" />
            <Field label="FD Interest" value={draft.fdInterest} field="fdInterest" />
            <Field label="Dividend Income" value={draft.dividendIncome} field="dividendIncome" />
            <Field label="Other Income" value={draft.otherIncome} field="otherIncome" />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Deductions (Old Regime)"
          icon={<PiggyBank className="w-4 h-4" />}
        >
          <div className="space-y-0">
            <Field label="Section 80C" value={draft.section80C} field="section80C" mismatch={mismatches.section80C} />
            <Field label="Section 80D (Medical)" value={draft.section80D} field="section80D" />
            <Field label="Section 80G (Donations)" value={draft.section80G} field="section80G" />
            <Field label="Section 80TTA" value={draft.section80TTA} field="section80TTA" mismatch={mismatches.section80TTA} />
            <Field label="Home Loan Interest" value={draft.homeLoanInterest} field="homeLoanInterest" mismatch={mismatches.homeLoanInterest} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="House Property"
          icon={<Home className="w-4 h-4" />}
        >
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => updateDraft({ hasHouseProperty: !draft.hasHouseProperty })}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  draft.hasHouseProperty ? "bg-primary" : "bg-secondary"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-primary-foreground transition-transform ${
                    draft.hasHouseProperty ? "left-5" : "left-1"
                  }`}
                />
              </div>
              <span className="text-sm text-foreground">I have house property income</span>
            </label>
            {draft.hasHouseProperty && (
              <div className="space-y-0">
                <Field label="Rental Income" value={draft.rentalIncome} field="rentalIncome" />
                <Field label="Municipal Tax Paid" value={draft.municipalTax} field="municipalTax" />
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Regime comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-foreground">
            Tax Regime Comparison
          </h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${draft.regime === "old" ? "text-primary" : "text-muted-foreground"}`}>
              Old
            </span>
            <div
              onClick={() => updateDraft({ regime: draft.regime === "old" ? "new" : "old" })}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                draft.regime === "new" ? "bg-accent" : "bg-primary"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${
                  draft.regime === "new" ? "left-5 bg-accent-foreground" : "left-1 bg-primary-foreground"
                }`}
              />
            </div>
            <span className={`text-xs font-medium ${draft.regime === "new" ? "text-accent" : "text-muted-foreground"}`}>
              New
            </span>
          </div>
        </div>
        <TaxComparison />
      </motion.div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => navigate("/upload")}
          className="flex items-center gap-2 py-2.5 px-5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button className="flex items-center gap-2 py-2.5 px-4 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors">
          <Save className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate("/preview")}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all glow-primary"
        >
          Preview & Confirm <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ReviewPage;

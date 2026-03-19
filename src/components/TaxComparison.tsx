import { motion } from "framer-motion";
import { useDraft } from "@/context/DraftContext";
import { TrendingUp, TrendingDown } from "lucide-react";

const TaxComparison = () => {
  const { draft } = useDraft();

  const grossIncome =
    draft.grossSalary +
    draft.savingsInterest +
    draft.fdInterest +
    draft.dividendIncome +
    draft.otherIncome +
    (draft.hasHouseProperty ? draft.rentalIncome - draft.municipalTax : 0);

  // Old regime calculation
  const oldDeductions =
    draft.standardDeduction +
    draft.professionalTax +
    draft.section80C +
    draft.section80D +
    draft.section80G +
    Math.min(draft.section80TTA, 10000) +
    Math.min(draft.homeLoanInterest, 200000);

  const oldTaxable = Math.max(0, grossIncome - oldDeductions);
  const oldTax = calculateOldRegimeTax(oldTaxable);

  // New regime calculation
  const newDeductions = 75000; // Standard deduction only in new regime
  const newTaxable = Math.max(0, grossIncome - newDeductions);
  const newTax = calculateNewRegimeTax(newTaxable);

  const oldRefund = draft.tdsDeducted - oldTax;
  const newRefund = draft.tdsDeducted - newTax;

  const rows = [
    { label: "Gross Income", old: grossIncome, new: grossIncome },
    { label: "Deductions", old: oldDeductions, new: newDeductions },
    { label: "Taxable Income", old: oldTaxable, new: newTaxable },
    { label: "Tax Liability", old: oldTax, new: newTax },
    { label: "TDS Deducted", old: draft.tdsDeducted, new: draft.tdsDeducted },
    { label: "Refund / Payable", old: oldRefund, new: newRefund, isResult: true },
  ];

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="grid grid-cols-3 text-sm font-semibold border-b border-border/50">
        <div className="p-3 text-muted-foreground">Component</div>
        <div className="p-3 text-center text-primary">Old Regime</div>
        <div className="p-3 text-center text-accent">New Regime</div>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`grid grid-cols-3 text-sm border-b border-border/30 last:border-0 ${
            row.isResult ? "font-bold bg-secondary/30" : ""
          }`}
        >
          <div className="p-3 text-muted-foreground">{row.label}</div>
          <div className={`p-3 text-center ${row.isResult && row.old >= 0 ? "text-success" : ""}`}>
            {row.isResult && row.old >= 0 ? (
              <span className="flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />₹{Math.abs(row.old).toLocaleString("en-IN")}
              </span>
            ) : row.isResult ? (
              <span className="flex items-center justify-center gap-1 text-destructive">
                <TrendingDown className="w-3 h-3" />₹{Math.abs(row.old).toLocaleString("en-IN")}
              </span>
            ) : (
              `₹${row.old.toLocaleString("en-IN")}`
            )}
          </div>
          <div className={`p-3 text-center ${row.isResult && row.new >= 0 ? "text-success" : ""}`}>
            {row.isResult && row.new >= 0 ? (
              <span className="flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />₹{Math.abs(row.new).toLocaleString("en-IN")}
              </span>
            ) : row.isResult ? (
              <span className="flex items-center justify-center gap-1 text-destructive">
                <TrendingDown className="w-3 h-3" />₹{Math.abs(row.new).toLocaleString("en-IN")}
              </span>
            ) : (
              `₹${row.new.toLocaleString("en-IN")}`
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

function calculateOldRegimeTax(taxable: number): number {
  if (taxable <= 250000) return 0;
  let tax = 0;
  if (taxable > 250000) tax += Math.min(taxable - 250000, 250000) * 0.05;
  if (taxable > 500000) tax += Math.min(taxable - 500000, 500000) * 0.2;
  if (taxable > 1000000) tax += (taxable - 1000000) * 0.3;
  // Rebate 87A
  if (taxable <= 500000) tax = 0;
  tax += tax * 0.04; // cess
  return Math.round(tax);
}

function calculateNewRegimeTax(taxable: number): number {
  if (taxable <= 400000) return 0;
  let tax = 0;
  const slabs = [
    [400000, 800000, 0.05],
    [800000, 1200000, 0.1],
    [1200000, 1600000, 0.15],
    [1600000, 2000000, 0.2],
    [2000000, 2400000, 0.25],
    [2400000, Infinity, 0.3],
  ];
  for (const [lower, upper, rate] of slabs) {
    if (taxable > lower) {
      tax += Math.min(taxable - lower, upper - lower) * rate;
    }
  }
  // Rebate 87A for new regime (up to 12 lakh effective with marginal relief)
  if (taxable <= 1200000) tax = 0;
  tax += tax * 0.04; // cess
  return Math.round(tax);
}

export default TaxComparison;

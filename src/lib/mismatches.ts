import type { ITRDraft } from "@/context/DraftContext";

/** Mismatch explanation for a field. Shown in tooltip on Review page. */
export type MismatchReason = string | null;

/** Compute tax (same logic as TaxComparison) for mismatch checks. */
function getComputedTax(draft: ITRDraft): { oldTax: number; newTax: number } {
  const grossIncome =
    draft.grossSalary +
    draft.savingsInterest +
    draft.fdInterest +
    draft.dividendIncome +
    draft.otherIncome +
    (draft.hasHouseProperty ? Math.max(0, draft.rentalIncome - draft.municipalTax) : 0);

  const oldDeductions =
    draft.standardDeduction +
    draft.professionalTax +
    draft.section80C +
    draft.section80D +
    draft.section80G +
    Math.min(draft.section80TTA, 10000) +
    Math.min(draft.homeLoanInterest, 200000);

  const oldTaxable = Math.max(0, grossIncome - oldDeductions);
  const newDeductions = 75000;
  const newTaxable = Math.max(0, grossIncome - newDeductions);

  let oldTax = 0;
  if (oldTaxable > 250000) {
    oldTax += Math.min(oldTaxable - 250000, 250000) * 0.05;
    if (oldTaxable > 500000) oldTax += Math.min(oldTaxable - 500000, 500000) * 0.2;
    if (oldTaxable > 1000000) oldTax += (oldTaxable - 1000000) * 0.3;
    if (oldTaxable <= 500000) oldTax = 0;
    else oldTax = Math.round(oldTax * 1.04);
  }

  let newTax = 0;
  if (newTaxable > 400000) {
    const slabs: [number, number, number][] = [
      [400000, 800000, 0.05],
      [800000, 1200000, 0.1],
      [1200000, 1600000, 0.15],
      [1600000, 2000000, 0.2],
      [2000000, 2400000, 0.25],
      [2400000, Infinity, 0.3],
    ];
    for (const [lower, upper, rate] of slabs) {
      if (newTaxable > lower) newTax += Math.min(newTaxable - lower, upper - lower) * rate;
    }
    if (newTaxable <= 1200000) newTax = 0;
    else newTax = Math.round(newTax * 1.04);
  }

  return { oldTax, newTax };
}

export interface FieldMismatches {
  tdsDeducted: MismatchReason;
  section80TTA: MismatchReason;
  section80C: MismatchReason;
  homeLoanInterest: MismatchReason;
}

/** Get mismatch reasons for Review page fields. */
export function getMismatches(draft: ITRDraft): FieldMismatches {
  const { oldTax, newTax } = getComputedTax(draft);
  const effectiveTax = draft.regime === "new" ? newTax : oldTax;
  const diff = Math.abs(draft.tdsDeducted - effectiveTax);

  const tdsDeducted: MismatchReason =
    diff > 100
      ? `TDS deducted (₹${draft.tdsDeducted.toLocaleString("en-IN")}) differs from computed tax (₹${effectiveTax.toLocaleString("en-IN")}) for the selected regime. This can happen if your employer deducted tax under a different regime or if there are other income sources. Verify with Form 16.`
      : null;

  const section80TTA: MismatchReason =
    draft.section80TTA > 10000
      ? "Section 80TTA deduction is capped at ₹10,000 for savings interest. Only the first ₹10,000 will be considered."
      : null;

  const section80C: MismatchReason =
    draft.section80C > 150000
      ? "Section 80C deduction is capped at ₹1,50,000 per year. Excess amount will not reduce your taxable income."
      : null;

  const homeLoanInterest: MismatchReason =
    draft.homeLoanInterest > 200000
      ? "Deduction on home loan interest (Section 24) is capped at ₹2,00,000 for self-occupied property."
      : null;

  return { tdsDeducted, section80TTA, section80C, homeLoanInterest };
}

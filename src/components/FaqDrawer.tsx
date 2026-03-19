import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "What is ITR-1 (Sahaj)?",
    a: "ITR-1 Sahaj is the simplified income tax return form for residents with total income up to ₹50 lakh from salary, one house property, other sources (interest, etc.), and agricultural income up to ₹5,000. Most salaried individuals without complex investments use this form.",
  },
  {
    q: "How do I e-verify my return?",
    a: "Within 30 days of filing, e-verify using any of: (1) Aadhaar OTP on the Income Tax e-filing portal, (2) Net banking through your bank’s e-file option, (3) EVC sent to your registered email or mobile, or (4) Digital Signature Certificate (DSC). Without e-verification, the return is not considered valid.",
  },
  {
    q: "Where is my refund?",
    a: "After e-verification, refunds are typically processed in a few weeks. Check status at the Income Tax portal under 'Refund Status' or use the refund tracker. Ensure your bank account is pre-validated and your PAN is linked to Aadhaar.",
  },
  {
    q: "What is the difference between Old and New tax regime?",
    a: "The Old regime allows deductions (80C, 80D, HRA, interest, etc.) and has different slabs. The New regime (default from FY 2023-24) has lower rates but fewer deductions (e.g. standard deduction of ₹75,000 only). Use the comparison table on the Review page to choose.",
  },
  {
    q: "I have Form 16 but no AIS. Can I still file?",
    a: "Yes. Form 16 is required for salary details. AIS (Annual Information Statement) is recommended to capture interest, dividends, and other income reported to the tax department—filing without it may lead to a mismatch notice. You can file with Form 16 and add other income manually.",
  },
];

interface FaqDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FaqDrawer = ({ open, onOpenChange }: FaqDrawerProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="text-left">Need Help?</SheetTitle>
      </SheetHeader>
      <div className="mt-6">
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-medium">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        For support, contact{" "}
        <a href="https://zenithbooks.in" className="text-primary hover:underline">
          ZenithBooks
        </a>
        .
      </p>
    </SheetContent>
  </Sheet>
);

export default FaqDrawer;

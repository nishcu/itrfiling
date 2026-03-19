import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDraft } from "@/context/DraftContext";
import { useSession } from "@/context/SessionContext";
import { motion } from "framer-motion";
import { toast } from "sonner";
import FileUploadZone from "@/components/FileUploadZone";
import ProgressBar from "@/components/ProgressBar";
import {
  callQuickoApi,
  fileToBase64,
  mapForm16ResponseToDraft,
  mapAisResponseToDraft,
  getConfidenceFromResponse,
} from "@/lib/api";
import { loadDraftFromCloud, saveDraftToCloud } from "@/lib/firestore";
import { ArrowRight, Save, Sparkles } from "lucide-react";

const QUICKO_ENABLED = !!import.meta.env.VITE_FIREBASE_QUICKO_FUNCTION_URL;

/** Demo data when Quicko is not configured (dev/preview). */
const MOCK_FORM16 = {
  grossSalary: 1250000,
  allowances: 150000,
  professionalTax: 2400,
  standardDeduction: 50000,
  netSalary: 1047600,
  tdsDeducted: 125000,
  employer: "TechCorp Solutions Pvt Ltd",
  section80C: 150000,
};

const MOCK_AIS = {
  savingsInterest: 18500,
  fdInterest: 45000,
  dividendIncome: 12000,
  section80TTA: 10000,
};

const UploadPage = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const { draft, updateDraft, setAutoFilled } = useDraft();
  const [form16, setForm16] = useState<string | undefined>();
  const [ais, setAis] = useState<string | undefined>();
  const [processing16, setProcessing16] = useState(false);
  const [processingAis, setProcessingAis] = useState(false);
  const cloudLoadAttempted = useRef(false);

  useEffect(() => {
    if (!session?.userId || cloudLoadAttempted.current) return;
    const isEmpty = draft.grossSalary === 0 && draft.employer === "" && draft.savingsInterest === 0;
    if (!isEmpty) return;
    cloudLoadAttempted.current = true;
    loadDraftFromCloud(session.userId).then((cloud) => {
      if (cloud && typeof cloud === "object") {
        updateDraft(cloud as Partial<typeof draft>);
        toast.success("Draft restored", { description: "Loaded from your saved draft." });
      }
    });
  }, [session?.userId, draft.grossSalary, draft.employer, draft.savingsInterest]);

  const handleForm16 = async (file: File) => {
    setProcessing16(true);
    setForm16(file.name);

    try {
      if (QUICKO_ENABLED) {
        const base64 = await fileToBase64(file);
        const data = await callQuickoApi<Record<string, unknown>>("parse_form16", {
          file: base64,
          filename: file.name,
        });
        const mapped = mapForm16ResponseToDraft(data as Record<string, unknown>);
        updateDraft(mapped);
        toast.success("Form 16 processed successfully!", {
          description: "Salary details auto-filled from your Form 16",
          icon: <Sparkles className="w-4 h-4" />,
        });
      } else {
        await new Promise((r) => setTimeout(r, 1500));
        updateDraft(MOCK_FORM16);
        toast.success("Form 16 processed (demo)", {
          description: "Salary details auto-filled. Set Quicko URL for real parsing.",
          icon: <Sparkles className="w-4 h-4" />,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Form 16 processing failed";
      toast.error("Processing failed", { description: message });
      setForm16(undefined);
    } finally {
      setProcessing16(false);
    }
  };

  const handleAis = async (file: File) => {
    setProcessingAis(true);
    setAis(file.name);

    try {
      if (QUICKO_ENABLED) {
        const base64 = await fileToBase64(file);
        const data = await callQuickoApi<Record<string, unknown>>("parse_ais", {
          file: base64,
          filename: file.name,
        });
        const mapped = mapAisResponseToDraft(data as Record<string, unknown>);
        updateDraft(mapped);
        setAutoFilled(true);
        const confidence = getConfidenceFromResponse(data as Record<string, unknown>);
        const desc = confidence != null
          ? `Auto-filled ~90% of your return with ${confidence}% confidence`
          : "Auto-filled ~90% of your return!";
        toast.success("AIS data merged!", {
          description: desc,
          icon: <Sparkles className="w-4 h-4" />,
        });
      } else {
        await new Promise((r) => setTimeout(r, 1500));
        updateDraft(MOCK_AIS);
        setAutoFilled(true);
        toast.success("AIS data merged (demo)", {
          description: "Auto-filled ~90% of your return with 95% confidence",
          icon: <Sparkles className="w-4 h-4" />,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "AIS processing failed";
      toast.error("Processing failed", { description: message });
      setAis(undefined);
    } finally {
      setProcessingAis(false);
    }
  };

  const handleSaveDraft = async () => {
    if (session?.userId) {
      await saveDraftToCloud(session.userId, draft as unknown as Record<string, unknown>);
      toast.success("Draft saved", {
        description: "Saved to this device and cloud. You can continue on another device.",
      });
    } else {
      toast.success("Draft saved", {
        description: "Saved to this device. You can continue later.",
      });
    }
  };

  const canProceed = !!form16 && !processing16 && !processingAis;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProgressBar currentStep={0} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-2xl font-display font-bold text-foreground">
          Upload Your Documents
        </h1>
        <p className="text-muted-foreground text-sm">
          Our AI will extract and auto-fill your return in seconds
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <FileUploadZone
          label="Form 16"
          description="PDF from your employer (required)"
          required
          accept=".pdf"
          onFileSelect={handleForm16}
          uploadedFileName={form16}
          isProcessing={processing16}
        />

        <FileUploadZone
          label="AIS (Annual Information Statement)"
          description="PDF or JSON from incometax.gov.in (recommended)"
          accept=".pdf,.json"
          onFileSelect={handleAis}
          uploadedFileName={ais}
          isProcessing={processingAis}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3 pt-2"
      >
        <button
          type="button"
          onClick={handleSaveDraft}
          className="flex items-center gap-2 py-2.5 px-5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
        >
          <Save className="w-4 h-4" /> Save Draft
        </button>
        <button
          type="button"
          onClick={() => canProceed && navigate("/review")}
          disabled={!canProceed}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg font-semibold text-sm transition-all ${
            canProceed
              ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          Continue to Review <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
};

export default UploadPage;

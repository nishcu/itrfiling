import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, X } from "lucide-react";

interface FileUploadZoneProps {
  label: string;
  description: string;
  required?: boolean;
  accept?: string;
  onFileSelect: (file: File) => void;
  uploadedFileName?: string;
  isProcessing?: boolean;
}

const FileUploadZone = ({
  label,
  description,
  required,
  accept = ".pdf,.json",
  onFileSelect,
  uploadedFileName,
  isProcessing,
}: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed transition-all duration-300 p-8 text-center cursor-pointer ${
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : uploadedFileName
          ? "border-success/40 bg-success/5"
          : "border-border hover:border-primary/50 hover:bg-card/40"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById(`file-${label}`)?.click()}
    >
      <input
        id={`file-${label}`}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Processing with AI...</p>
          </motion.div>
        ) : uploadedFileName ? (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <CheckCircle className="w-10 h-10 text-success" />
            <p className="text-sm font-medium text-foreground">{uploadedFileName}</p>
            <p className="text-xs text-muted-foreground">Click to replace</p>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {label} {required && <span className="text-destructive">*</span>}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Drag & drop or <span className="text-primary font-medium">browse</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadZone;

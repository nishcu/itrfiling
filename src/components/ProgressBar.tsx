import { motion } from "framer-motion";

const steps = [
  { label: "Upload", path: "/upload" },
  { label: "Review", path: "/review" },
  { label: "Preview", path: "/preview" },
  { label: "File", path: "/file" },
];

interface ProgressBarProps {
  currentStep: number; // 0-3
}

const ProgressBar = ({ currentStep }: ProgressBarProps) => {
  const percentage = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className="w-full px-4 py-3">
      {/* Progress track */}
      <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden mb-3">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      {/* Step indicators */}
      <div className="flex justify-between items-center">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center gap-1">
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-300 ${
                i <= currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
              initial={{ scale: 0.8 }}
              animate={{ scale: i === currentStep ? 1.1 : 1 }}
              transition={{ duration: 0.3 }}
            >
              {i < currentStep ? "✓" : i + 1}
            </motion.div>
            <span
              className={`text-xs font-medium ${
                i <= currentStep ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <div className="text-right mt-1">
        <span className="text-xs text-muted-foreground font-medium">{percentage}% complete</span>
      </div>
    </div>
  );
};

export default ProgressBar;

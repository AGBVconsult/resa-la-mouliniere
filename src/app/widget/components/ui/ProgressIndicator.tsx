"use client";

import { Check } from "lucide-react";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function ProgressIndicator({ currentStep, totalSteps = 5 }: ProgressIndicatorProps) {
  const isComplete = currentStep === totalSteps;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = isComplete || stepNumber < currentStep;
        const isCurrent = !isComplete && stepNumber === currentStep;

        return (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                isCompleted
                  ? "bg-slate-100"
                  : isCurrent
                    ? "border-2 border-white bg-transparent"
                    : "border-[1.5px] border-slate-600 bg-transparent"
              }`}
            >
              {isCompleted && <Check size={12} className="text-slate-900" strokeWidth={3} />}
              {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>

            {stepNumber < totalSteps && (
              <div
                className={`w-3 h-[2px] transition-all duration-300 ${
                  isComplete || stepNumber < currentStep ? "bg-slate-100" : "bg-slate-600"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
              className={`w-[2.5vh] h-[2.5vh] min-w-[16px] min-h-[16px] rounded-full flex items-center justify-center transition-all duration-300 ${
                isCompleted
                  ? "bg-slate-100"
                  : isCurrent
                    ? "border-2 border-white bg-transparent"
                    : "border-[1.5px] border-slate-600 bg-transparent"
              }`}
            >
              {isCompleted && <Check size={10} className="text-slate-900" strokeWidth={3} />}
              {isCurrent && <div className="w-[1vh] h-[1vh] rounded-full bg-white" />}
            </div>

            {stepNumber < totalSteps && (
              <div
                className={`w-[1.5vh] h-[0.3vh] transition-all duration-300 ${
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

"use client";

import { Check } from "lucide-react";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function ProgressIndicator({ currentStep, totalSteps = 5 }: ProgressIndicatorProps) {
  const isComplete = currentStep === totalSteps;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = isComplete || stepNumber < currentStep;
        const isCurrent = !isComplete && stepNumber === currentStep;

        return (
          <div key={stepNumber} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: '2.5vh',
                height: '2.5vh',
                minWidth: '16px',
                minHeight: '16px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCompleted ? '#f1f5f9' : 'transparent',
                border: isCompleted ? 'none' : isCurrent ? '2px solid white' : '1.5px solid #475569',
              }}
            >
              {isCompleted && <Check size={10} style={{ color: '#0f172a' }} strokeWidth={3} />}
              {isCurrent && <div style={{ width: '1vh', height: '1vh', borderRadius: '9999px', backgroundColor: 'white' }} />}
            </div>

            {stepNumber < totalSteps && (
              <div
                style={{
                  width: '1.5vh',
                  height: '0.3vh',
                  backgroundColor: isComplete || stepNumber < currentStep ? '#f1f5f9' : '#475569',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

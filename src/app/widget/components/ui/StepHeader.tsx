"use client";

interface StepHeaderProps {
  title: string;
  subtitle: string;
  className?: string;
}

export function StepHeader({ title, subtitle, className = "" }: StepHeaderProps) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="text-xl font-bold text-slate-900 mb-1">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

"use client";

interface StepHeaderProps {
  title: string;
  subtitle: string;
  className?: string;
}

export function StepHeader({ title, subtitle, className = "" }: StepHeaderProps) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="text-[2.5vh] font-bold text-slate-900 mb-[0.3vh]">{title}</h2>
      <p className="text-[1.6vh] text-slate-500">{subtitle}</p>
    </div>
  );
}

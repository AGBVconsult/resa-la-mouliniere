"use client";

interface StepHeaderProps {
  title: string;
  subtitle: string;
  className?: string;
}

export function StepHeader({ title, subtitle, className = "" }: StepHeaderProps) {
  return (
    <div className={`text-center ${className}`} style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5vh', fontWeight: 700, color: '#0f172a', marginBottom: '0.3vh' }}>{title}</h2>
      <p style={{ fontSize: '1.6vh', color: '#64748b' }}>{subtitle}</p>
    </div>
  );
}

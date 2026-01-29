"use client";

import { useId, type ReactNode } from "react";

interface InputProps {
  label: string;
  type?: "text" | "email" | "tel";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  prefix?: ReactNode;
}

export function Input({
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  required = false,
  error,
  placeholder,
  autoComplete,
  prefix,
}: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = !!error;

  return (
    <div style={{ marginBottom: '1.5vh' }}>
      <label 
        htmlFor={id} 
        style={{ display: 'block', fontSize: '1.4vh', fontWeight: 600, color: '#475569', marginBottom: '0.5vh' }}
      >
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '0.125rem' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.125rem', pointerEvents: 'none' }}>
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          inputMode={type === "tel" ? "tel" : type === "email" ? "email" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`w-full ${prefix ? "pl-10 pr-[3vw]" : "px-[3vw]"} py-[1.2vh] min-h-[5vh] border rounded-lg transition-colors bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${
            hasError
              ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
              : "border-slate-200 focus:ring-slate-900/20 focus:border-slate-900"
          }`}
          style={{
            width: '100%',
            paddingLeft: prefix ? '2.5rem' : '3vw',
            paddingRight: '3vw',
            paddingTop: '1.2vh',
            paddingBottom: '1.2vh',
            minHeight: '5vh',
            border: `1px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            backgroundColor: '#f8fafc',
            fontSize: '1rem',
          }}
        />
      </div>
      {hasError && (
        <p id={errorId} style={{ marginTop: '0.3vh', fontSize: '1.3vh', color: '#ef4444' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

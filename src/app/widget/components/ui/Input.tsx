"use client";

import { useId } from "react";

interface InputProps {
  label: string;
  type?: "text" | "email" | "tel";
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}

export function Input({
  label,
  type = "text",
  value,
  onChange,
  required = false,
  error,
  placeholder,
  autoComplete,
}: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = !!error;

  return (
    <div className="mb-[1.5vh]">
      <label htmlFor={id} className="block text-[1.4vh] font-semibold text-slate-600 mb-[0.5vh]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`w-full px-[3vw] py-[1.2vh] min-h-[5vh] border rounded-lg transition-colors bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${
          hasError
            ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
            : "border-slate-200 focus:ring-slate-900/20 focus:border-slate-900"
        }`}
      />
      {hasError && (
        <p id={errorId} className="mt-[0.3vh] text-[1.3vh] text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

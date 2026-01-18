"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditableCapacityProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function EditableCapacity({
  value,
  min = 1,
  max = 50,
  onChange,
}: EditableCapacityProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const numValue = parseInt(editValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.min(max, Math.max(min, numValue));
      onChange(clampedValue);
      setEditValue(String(clampedValue));
    } else {
      setEditValue(String(value));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(String(value));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={min}
        max={max}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-12 h-7 px-2 text-center text-sm font-medium border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
        data-capacity
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "w-12 h-7 px-2 text-center text-sm font-medium rounded",
        "bg-slate-100 hover:bg-slate-200 transition-colors"
      )}
      data-capacity
    >
      {value}
    </button>
  );
}

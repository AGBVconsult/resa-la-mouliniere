"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Language = 'fr' | 'nl' | 'en' | 'de' | 'it';

interface LanguageSelectorProps {
  value: Language;
  onChange: (value: Language) => void;
}

const languages: { value: Language; label: string }[] = [
  { value: 'fr', label: 'FR' },
  { value: 'nl', label: 'NL' },
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
  { value: 'it', label: 'IT' },
];

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Language)}>
      <SelectTrigger className="w-20">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

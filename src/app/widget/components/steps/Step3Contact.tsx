"use client";

import { useState } from "react";
import { StepHeader } from "../ui/StepHeader";
import { Input } from "../ui/Input";
import { NavigationFooter } from "../ui/NavigationFooter";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language, BookingState } from "@/components/booking/types";

interface Step3ContactProps {
  lang: Language;
  data: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export function Step3Contact({ lang, data, onUpdate, onNext, onBack }: Step3ContactProps) {
  const { t } = useTranslation(lang);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const partySize = data.adults + data.childrenCount + data.babyCount;

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Accept various formats: +32..., 0032..., 04..., etc.
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    return /^(\+|00)?[0-9]{9,15}$/.test(cleaned);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!data.firstName || data.firstName.length < 2) {
      newErrors.firstName = t.error_min_chars;
    }
    if (!data.lastName || data.lastName.length < 2) {
      newErrors.lastName = t.error_min_chars;
    }
    if (!data.email) {
      newErrors.email = t.error_required;
    } else if (!validateEmail(data.email)) {
      newErrors.email = t.error_email;
    }
    if (!data.phone) {
      newErrors.phone = t.error_required;
    } else if (!validatePhone(data.phone)) {
      newErrors.phone = t.error_phone;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    setTouched({ firstName: true, lastName: true, email: true, phone: true });
    if (validate()) {
      onNext();
    }
  };

  const handleFieldChange = (field: keyof BookingState, value: string) => {
    onUpdate({ [field]: value });
    if (touched[field]) {
      // Re-validate on change if already touched
      setTimeout(() => validate(), 0);
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <StepHeader title={t.step3_title} subtitle={t.step3_subtitle} className="mb-6" />

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.first_name}
              value={data.firstName}
              onChange={(v) => handleFieldChange("firstName", v)}
              required
              error={touched.firstName ? errors.firstName : undefined}
              autoComplete="given-name"
            />
            <Input
              label={t.last_name}
              value={data.lastName}
              onChange={(v) => handleFieldChange("lastName", v)}
              required
              error={touched.lastName ? errors.lastName : undefined}
              autoComplete="family-name"
            />
          </div>

          <Input
            label={t.email}
            type="email"
            value={data.email}
            onChange={(v) => handleFieldChange("email", v)}
            required
            error={touched.email ? errors.email : undefined}
            autoComplete="email"
          />

          <Input
            label={t.phone}
            type="tel"
            value={data.phone}
            onChange={(v) => handleFieldChange("phone", v)}
            required
            error={touched.phone ? errors.phone : undefined}
            placeholder="+32 4XX XX XX XX"
            autoComplete="tel"
          />

          <div className="mb-0">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {t.message}
            </label>
            <textarea
              value={data.message}
              onChange={(e) => onUpdate({ message: e.target.value })}
              placeholder={t.message_placeholder}
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <NavigationFooter
        backLabel={t.back}
        onBack={onBack}
        primaryLabel={t.continue}
        onPrimary={handleNext}
      />
    </div>
  );
}

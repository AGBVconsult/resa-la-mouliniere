"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StepHeader } from "../ui/StepHeader";
import { Input } from "../ui/Input";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language, BookingState } from "@/components/booking/types";
import {
  formatPhoneAsYouType,
  formatToE164,
  isValidPhone,
  getPhoneCountry,
  getCountryFlag,
} from "@/lib/phone";
import { trackContactFormError } from "@/lib/analytics";

interface Step3ContactProps {
  lang: Language;
  data: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onNext: () => void;
  requestPrimaryToken: number;
  onCanContinueChange: (canContinue: boolean) => void;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export function Step3Contact({
  lang,
  data,
  onUpdate,
  onNext,
  requestPrimaryToken,
  onCanContinueChange,
}: Step3ContactProps) {
  const { t } = useTranslation(lang);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const lastRequestTokenRef = useRef(requestPrimaryToken);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    return isValidPhone(phone);
  };

  const validate = useCallback((): boolean => {
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

    // Track validation errors
    Object.entries(newErrors).forEach(([field, errorMsg]) => {
      if (errorMsg) {
        const errorType = errorMsg === t.error_required ? 'required' :
                          errorMsg === t.error_min_chars ? 'min_chars' :
                          errorMsg === t.error_email ? 'invalid_email' :
                          errorMsg === t.error_phone ? 'invalid_phone' : 'unknown';
        trackContactFormError(field, errorType, lang);
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data.email, data.firstName, data.lastName, data.phone, t.error_email, t.error_min_chars, t.error_phone, t.error_required]);

  const handleNext = useCallback(() => {
    setTouched({ firstName: true, lastName: true, email: true, phone: true });
    if (validate()) {
      onNext();
    }
  }, [onNext, validate]);

  const canContinue = useMemo(() => {
    if (!data.firstName || data.firstName.length < 2) return false;
    if (!data.lastName || data.lastName.length < 2) return false;
    if (!data.email || !validateEmail(data.email)) return false;
    if (!data.phone || !validatePhone(data.phone)) return false;
    return true;
  }, [data.email, data.firstName, data.lastName, data.phone]);

  useEffect(() => {
    onCanContinueChange(canContinue);
  }, [canContinue, onCanContinueChange]);

  useEffect(() => {
    if (requestPrimaryToken === lastRequestTokenRef.current) return;
    lastRequestTokenRef.current = requestPrimaryToken;
    handleNext();
  }, [handleNext, requestPrimaryToken]);

  const handleFieldChange = (field: keyof BookingState, value: string) => {
    // Formatage spécial pour le téléphone
    if (field === "phone") {
      const formatted = formatPhoneAsYouType(value);
      onUpdate({ phone: formatted });
    } else {
      onUpdate({ [field]: value });
    }

    if (touched[field]) {
      setTimeout(() => validate(), 0);
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Normaliser le téléphone en E.164 au blur
    if (field === "phone" && data.phone) {
      const e164 = formatToE164(data.phone);
      if (e164) {
        onUpdate({ phone: e164 });
      }
    }

    validate();
  };

  // Déterminer le drapeau à afficher
  const phoneCountry = data.phone ? getPhoneCountry(data.phone) : null;
  const phoneFlag = phoneCountry ? getCountryFlag(phoneCountry) : null;

  return (
    <div 
      className="flex flex-col h-full bg-slate-50"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}
    >
      {/* Contenu scrollable */}
      <div style={{ flex: '1 1 0%', overflow: 'hidden', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2vh', paddingBottom: '2vh' }}>
        <StepHeader title={t.step3_title} subtitle={t.step3_subtitle} className="mb-[2vh]" />

        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2vh', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '2vw' }}>
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
            onBlur={() => handleBlur("phone")}
            required
            error={touched.phone ? errors.phone : undefined}
            placeholder="+32 4XX XX XX XX"
            autoComplete="tel"
            prefix={phoneFlag}
          />

          <div style={{ marginBottom: 0 }}>
            <label htmlFor="message-field" style={{ display: 'block', fontSize: '1.4vh', fontWeight: 600, color: '#475569', marginBottom: '0.5vh' }}>
              {t.message}
            </label>
            <textarea
              id="message-field"
              value={data.message}
              onChange={(e) => onUpdate({ message: e.target.value })}
              placeholder={t.message_placeholder}
              rows={2}
              style={{ width: '100%', paddingLeft: '3vw', paddingRight: '3vw', paddingTop: '1.2vh', paddingBottom: '1.2vh', minHeight: '8vh', border: '1px solid #e2e8f0', borderRadius: '0.5rem', backgroundColor: '#f8fafc', resize: 'none', fontSize: '1rem' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

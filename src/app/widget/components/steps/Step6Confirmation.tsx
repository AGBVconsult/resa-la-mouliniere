"use client";

import { CheckCircle, Clock, Calendar, Share2, User, Phone, Mail, MessageSquare, Users, Baby, Accessibility, PawPrint } from "lucide-react";
import { useTranslation } from "@/components/booking/i18n/translations";
import { formatDateDisplay } from "@/lib/utils";
import type { Language, BookingState, ReservationResult } from "@/components/booking/types";

interface Step6ConfirmationProps {
  lang: Language;
  data: BookingState;
  partySize: number;
  result: ReservationResult;
}

export function Step6Confirmation({ lang, data, partySize, result }: Step6ConfirmationProps) {
  const { t } = useTranslation(lang);

  const isConfirmed = result.kind === "reservation" && result.status === "confirmed";
  const isPending = result.kind === "reservation" && result.status === "pending";
  const isGroupRequest = result.kind === "groupRequest";

  const serviceLabel = data.service === "lunch" ? t.lunch : t.dinner;

  const formatPhoneInternational = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
    if (cleaned.startsWith("0")) return "+32" + cleaned.slice(1);
    return cleaned;
  };

  const guestDetails = (): string => {
    const parts: string[] = [];
    parts.push(`${partySize} ${partySize > 1 ? t.convives : t.convive}`);
    const details: string[] = [];
    if (data.childrenCount > 0) {
      details.push(`${data.childrenCount} ${t.children.toLowerCase()}`);
    }
    if (data.babyCount > 0) {
      details.push(`${data.babyCount} ${t.babies.toLowerCase()}`);
    }
    if (details.length > 0) {
      parts.push(`(${details.join(", ")})`);
    }
    return parts.join(" ");
  };

  const selectedOptions = (): { icon: typeof Baby; label: string }[] => {
    const opts: { icon: typeof Baby; label: string }[] = [];
    if (data.requiresStroller) opts.push({ icon: Baby, label: t.stroller });
    if (data.requiresHighChair) opts.push({ icon: Baby, label: t.high_chair });
    if (data.requiresWheelchair) opts.push({ icon: Accessibility, label: t.wheelchair });
    if (data.requiresDogAccess) opts.push({ icon: PawPrint, label: t.dog });
    return opts;
  };

  const handleAddToCalendar = () => {
    if (!data.dateKey || !data.timeKey) return;

    const [year, month, day] = data.dateKey.split("-").map(Number);
    const [hours, minutes] = data.timeKey.split(":").map(Number);

    const startDate = new Date(year, month - 1, day, hours, minutes);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Réservation La Moulinière
DESCRIPTION:${partySize} ${partySize > 1 ? t.persons : t.person} - ${serviceLabel}
LOCATION:Visserskaai 17, Oostende
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reservation-la-mouliniere.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({
        title: "Réservation La Moulinière",
        text: `Réservation pour ${partySize} ${partySize > 1 ? t.persons : t.person} le ${data.dateKey && formatDateDisplay(data.dateKey, lang)} à ${data.timeKey}`,
      });
    } catch {
      // User cancelled or share failed
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-slate-50"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}
    >
      {/* Contenu */}
      <div style={{ flex: '1 1 0%', overflow: 'hidden', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2vh', paddingBottom: '2vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ marginBottom: '2vh' }}>
          {isConfirmed ? (
            <div style={{ width: '10vh', height: '10vh', borderRadius: '9999px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={32} style={{ color: '#16a34a' }} />
            </div>
          ) : (
            <div style={{ width: '10vh', height: '10vh', borderRadius: '9999px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={32} style={{ color: '#d97706' }} />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '2.8vh', fontWeight: 700, color: '#0f172a', marginBottom: '0.5vh' }}>
          {isConfirmed ? t.confirmed_title : t.pending_title}
        </h2>
        <p style={{ fontSize: '1.6vh', color: '#64748b', marginBottom: '2vh' }}>
          {isConfirmed ? t.confirmed_subtitle : t.pending_subtitle}
        </p>

        {/* Card Récapitulatif */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5vh', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '90%', marginBottom: '1.5vh' }}>
          <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.8vh', fontSize: '1.6vh' }}>{t.summary}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6vh', fontSize: '1.5vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{guestDetails()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{data.dateKey && formatDateDisplay(data.dateKey, lang)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{serviceLabel} • {data.timeKey}</span>
            </div>
            {selectedOptions().length > 0 && (
              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedOptions().map((opt, idx) => (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', borderRadius: '9999px' }}>
                      <opt.icon size={12} />
                      {opt.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Infos client */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5vh', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '90%', marginBottom: '1.5vh' }}>
          <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.8vh', fontSize: '1.6vh' }}>{t.client_info}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6vh', fontSize: '1.5vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <User size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{data.lastName} {data.firstName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Phone size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{formatPhoneInternational(data.phone)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{data.email}</span>
            </div>
          </div>
        </div>

        {/* Card Message (si renseigné) */}
        {data.message && data.message.trim() && (
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5vh', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '90%', marginBottom: '1.5vh' }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.8vh', fontSize: '1.6vh' }}>{t.message}</h3>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <MessageSquare size={16} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '0.125rem' }} />
              <p style={{ color: '#334155', fontSize: '0.875rem' }}>{data.message}</p>
            </div>
          </div>
        )}

        {/* Email confirmation */}
        <p style={{ fontSize: '1.4vh', color: '#64748b', marginBottom: '1.5vh' }}>
          {t.email_sent} <span style={{ fontWeight: 500, color: '#334155' }}>{data.email}</span>
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '2vw', width: '100%', maxWidth: '90%' }}>
          <button
            type="button"
            onClick={handleAddToCalendar}
            style={{ flex: '1 1 0%', paddingTop: '1.2vh', paddingBottom: '1.2vh', minHeight: '44px', borderRadius: '0.75rem', fontWeight: 600, border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <Calendar size={18} />
            {t.add_calendar}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={handleShare}
              style={{ flex: '1 1 0%', paddingTop: '1.2vh', paddingBottom: '1.2vh', minHeight: '44px', borderRadius: '0.75rem', fontWeight: 600, border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <Share2 size={18} />
              {t.share}
            </button>
          )}
        </div>

        {/* Lien retour site */}
        <a
          href="https://www.lamouliniere.be"
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginTop: '2vh', fontSize: '1.3vh', color: '#94a3b8', textDecoration: 'underline' }}
        >
          {t.back_to_website || "Retour au site"}
        </a>
      </div>
    </div>
  );
}

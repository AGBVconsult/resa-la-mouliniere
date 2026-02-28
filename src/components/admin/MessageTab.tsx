"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Send, MessageCircle, Check, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MessageTabProps {
  clientId: Id<"clients">;
  clientName: string;
}

export function MessageTab({ clientId, clientName }: MessageTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = useQuery(api.clientMessages.list, { clientId }) ?? [];
  const sendMessage = useAction(api.clientMessages.send);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [newMessage]);

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      await sendMessage({ clientId, body: trimmed });
      setNewMessage("");
    } catch (err) {
      setSendError("Erreur lors de l'envoi");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages: { dateLabel: string; messages: typeof messages }[] = [];
  let currentDateLabel = "";

  for (const msg of messages) {
    const dateLabel = format(new Date(msg.createdAt), "EEEE d MMMM", { locale: fr });
    if (dateLabel !== currentDateLabel) {
      currentDateLabel = dateLabel;
      groupedMessages.push({ dateLabel, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Messages area — iMessage style */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "#f2f2f7" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageCircle size={48} strokeWidth={1.2} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">Aucun message</p>
            <p className="text-xs mt-1">Envoyez un message pour contacter {clientName}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group, gi) => (
              <div key={gi}>
                {/* Date separator */}
                <div className="flex justify-center mb-3">
                  <span className="px-3 py-1 rounded-full text-[11px] font-medium text-slate-500 bg-white/80 backdrop-blur-sm shadow-sm">
                    {group.dateLabel}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-1">
                  {group.messages.map((msg, mi) => {
                    const isOutbound = msg.direction === "outbound";
                    const isLastInGroup = mi === group.messages.length - 1 || 
                      group.messages[mi + 1]?.direction !== msg.direction;
                    const time = format(new Date(msg.createdAt), "HH:mm");

                    return (
                      <div
                        key={msg._id}
                        className={cn(
                          "flex",
                          isOutbound ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "relative max-w-[75%] px-3.5 py-2 text-[15px] leading-[1.35]",
                            isOutbound
                              ? "bg-[#007AFF] text-white"
                              : "bg-white text-slate-900",
                            // Bubble shape
                            isLastInGroup && isOutbound && "rounded-[18px] rounded-br-[4px]",
                            isLastInGroup && !isOutbound && "rounded-[18px] rounded-bl-[4px]",
                            !isLastInGroup && "rounded-[18px]"
                          )}
                          style={{
                            boxShadow: isOutbound 
                              ? "none" 
                              : "0 0.5px 1px rgba(0,0,0,0.08)",
                          }}
                        >
                          {/* Message text */}
                          <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {msg.body}
                          </span>

                          {/* Time + status */}
                          <span
                            className={cn(
                              "flex items-center gap-1 mt-0.5 text-[10px] select-none",
                              isOutbound ? "text-white/60 justify-end" : "text-slate-400 justify-start"
                            )}
                          >
                            {time}
                            {isOutbound && msg.emailStatus === "sent" && (
                              <Check size={10} strokeWidth={2.5} />
                            )}
                            {isOutbound && msg.emailStatus === "delivered" && (
                              <div className="flex -space-x-1">
                                <Check size={10} strokeWidth={2.5} />
                                <Check size={10} strokeWidth={2.5} />
                              </div>
                            )}
                            {isOutbound && msg.emailStatus === "failed" && (
                              <AlertCircle size={10} strokeWidth={2.5} className="text-red-300" />
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {sendError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertCircle size={12} />
            {sendError}
          </p>
        </div>
      )}

      {/* Input area — iMessage style */}
      <div className="px-3 py-2 bg-[#f2f2f7] border-t border-slate-200/60">
        <div className="flex items-end gap-2 bg-white rounded-[22px] border border-slate-200/80 pl-4 pr-1.5 py-1">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            rows={1}
            className="flex-1 resize-none border-none outline-none text-[15px] py-1.5 bg-transparent text-slate-900 placeholder:text-slate-400 leading-[1.35]"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0 mb-0.5",
              newMessage.trim() && !isSending
                ? "bg-[#007AFF] text-white hover:bg-[#0066d6] active:scale-95"
                : "bg-transparent text-slate-300"
            )}
          >
            {isSending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} strokeWidth={2} className="ml-0.5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-1.5 mb-0.5">
          Le message sera envoyé par email au client
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Waiting for response..." : "Type your message... (Enter to send, Shift+Enter for new line)"}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-frankly-dark",
            "focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green",
            "disabled:bg-frankly-gray-light disabled:text-frankly-gray/60",
            "placeholder:text-frankly-gray/50"
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-frankly-green p-2.5 text-white hover:bg-frankly-green-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

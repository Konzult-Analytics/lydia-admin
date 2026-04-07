"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-surface-elevated shadow-2xl border-l border-border",
          className
        )}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between border-b border-border px-6 py-4">
            <div className="min-w-0 flex-1">
              {title && (
                <div className="text-xl font-bold text-frankly-dark">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="mt-1 text-sm text-frankly-gray">{subtitle}</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 rounded-lg p-1 text-frankly-gray hover:bg-frankly-gray-light hover:text-frankly-dark transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-border bg-surface-elevated px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

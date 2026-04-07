"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  size = "md",
  children,
  className,
}: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "relative w-full rounded-xl bg-surface-elevated p-6 shadow-xl border border-border",
          sizeStyles[size],
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-frankly-gray hover:text-frankly-dark transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

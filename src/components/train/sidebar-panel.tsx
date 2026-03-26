"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidebarPanelProps {
  title: string;
  count?: number;
  badgeVariant?: "pending" | "approved" | "processing";
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SidebarPanel({
  title,
  count,
  badgeVariant = "processing",
  defaultOpen = false,
  children,
  className,
}: SidebarPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white overflow-hidden", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-frankly-gray-light/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-frankly-gray" />
          ) : (
            <ChevronRight className="h-4 w-4 text-frankly-gray" />
          )}
          <span className="text-sm font-medium text-frankly-dark">{title}</span>
        </div>
        {count !== undefined && (
          <Badge variant={badgeVariant}>{count}</Badge>
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-3">{children}</div>
      )}
    </div>
  );
}

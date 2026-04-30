"use client";

import {
  Database as DatabaseIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Package,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatabaseStats {
  total_benefits: number;
  approved: number;
  pending: number;
  rejected: number;
  insurers_with_data: number;
  total_insurers: number;
  products_with_data: number;
  total_products: number;
  completion_percent: number;
  last_approved_at: string | null;
}

interface StatsCardsProps {
  stats: DatabaseStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card
        icon={<DatabaseIcon className="h-5 w-5 text-frankly-green" />}
        label="Total Benefits"
        value={stats.total_benefits}
        bg="bg-frankly-green-light"
        sub={
          <div className="flex items-center gap-2 text-[11px] text-frankly-gray">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-frankly-green" />
              {stats.approved} approved
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              {stats.pending} pending
            </span>
            <span className="inline-flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              {stats.rejected}
            </span>
          </div>
        }
      />
      <Card
        icon={<Building2 className="h-5 w-5 text-blue-500" />}
        label="Insurers Covered"
        value={`${stats.insurers_with_data} / ${stats.total_insurers}`}
        bg="bg-blue-50 dark:bg-blue-900/20"
        sub={
          <div className="text-[11px] text-frankly-gray">
            {stats.total_insurers > 0
              ? `${Math.round((stats.insurers_with_data / stats.total_insurers) * 100)}% of insurers`
              : "Add insurers to begin"}
          </div>
        }
      />
      <Card
        icon={<Package className="h-5 w-5 text-violet-500" />}
        label="Products Covered"
        value={`${stats.products_with_data} / ${stats.total_products}`}
        bg="bg-violet-50 dark:bg-violet-900/20"
        sub={
          <div className="text-[11px] text-frankly-gray">
            {stats.total_products > 0
              ? `${Math.round((stats.products_with_data / stats.total_products) * 100)}% of products`
              : "—"}
          </div>
        }
      />
      <Card
        icon={<ProgressRing percent={stats.completion_percent} />}
        label="Completion"
        value={`${stats.completion_percent}%`}
        bg="bg-amber-50 dark:bg-amber-900/20"
        sub={
          <div className="flex items-center gap-1 text-[11px] text-frankly-gray">
            <Calendar className="h-3 w-3" />
            {stats.last_approved_at
              ? `Last update ${formatRelative(stats.last_approved_at)}`
              : "No approvals yet"}
          </div>
        }
      />
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  sub,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: React.ReactNode;
  bg: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border px-4 py-3", bg)}>
      <div className="flex items-start gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-frankly-gray uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-frankly-dark mt-0.5">{value}</p>
          {sub && <div className="mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="var(--border-color)"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="var(--frankly-green)"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-ZA");
}

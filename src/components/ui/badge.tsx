import { cn } from "@/lib/utils";

type BadgeVariant = "pending" | "approved" | "rejected" | "processing" | "uploaded" | "failed";

const variantStyles: Record<BadgeVariant, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  approved: "bg-frankly-green-light text-frankly-green border-frankly-green/20",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  processing: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  uploaded: "bg-gray-100 text-frankly-gray border-gray-200 dark:bg-gray-800 dark:border-gray-700",
  failed: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

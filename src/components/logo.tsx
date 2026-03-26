import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: { dot: "h-2.5 w-2.5", text: "text-lg", subtitle: "text-xs" },
  md: { dot: "h-3 w-3", text: "text-xl", subtitle: "text-sm" },
  lg: { dot: "h-4 w-4", text: "text-3xl", subtitle: "text-base" },
};

export function Logo({ size = "md", showSubtitle = false, className }: LogoProps) {
  const s = sizeStyles[size];

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full bg-frankly-green shrink-0", s.dot)} />
        <span className={cn("font-bold text-frankly-dark tracking-tight", s.text)}>
          Frankly.
        </span>
      </div>
      {showSubtitle && (
        <span className={cn("text-frankly-gray ml-[calc(0.5rem+theme(spacing.3))]", s.subtitle)}>
          Lydia Admin
        </span>
      )}
    </div>
  );
}

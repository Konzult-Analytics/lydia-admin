import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-frankly-green text-white shadow-sm hover:bg-frankly-green-hover focus:ring-frankly-green",
  secondary:
    "bg-frankly-dark text-white shadow-sm hover:bg-frankly-dark/90 focus:ring-frankly-dark",
  outline:
    "border border-border bg-surface text-frankly-dark hover:bg-frankly-gray-light focus:ring-frankly-green",
  danger:
    "bg-red-500 text-white shadow-sm hover:bg-red-600 focus:ring-red-500",
  ghost:
    "bg-transparent text-frankly-dark hover:bg-frankly-gray-light focus:ring-frankly-green",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-1",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

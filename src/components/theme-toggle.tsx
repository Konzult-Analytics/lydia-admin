"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme, mounted } = useTheme();

  // Render a placeholder with the same dimensions until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-frankly-gray transition-colors hover:bg-surface-secondary"
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

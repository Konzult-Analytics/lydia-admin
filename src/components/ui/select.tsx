import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className,
}: SelectProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-frankly-dark mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-frankly-dark",
          "focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green",
          "disabled:bg-frankly-gray-light disabled:text-frankly-gray/60 disabled:cursor-not-allowed"
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

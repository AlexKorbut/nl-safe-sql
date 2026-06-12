import { InputHTMLAttributes, ReactNode } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  icon?: ReactNode;
  error?: boolean;
}

export function TextField({
  label,
  helperText,
  icon,
  error = false,
  className = "",
  ...props
}: TextFieldProps) {
  return (
    <div className="w-full">
      <div
        className={`
          relative px-4 py-3 rounded-2xl
          bg-[var(--surface-variant)] text-[var(--on-surface)]
          border-2 transition-colors
          ${error ? "border-[var(--error)]" : "border-transparent focus-within:border-[var(--primary)]"}
        `}
      >
        {label && (
          <label className="absolute top-1 left-4 text-xs font-medium text-[var(--on-surface-variant)]">
            {label}
          </label>
        )}
        <div className="flex items-center gap-2">
          {icon && <span className="text-[var(--on-surface-variant)]">{icon}</span>}
          <input
            {...props}
            className={`
              flex-1 bg-transparent outline-none text-body-medium
              ${label ? "pt-4" : ""}
              ${className}
            `}
          />
        </div>
      </div>
      {helperText && (
        <p className={`text-xs mt-1 ${error ? "text-[var(--error)]" : "text-[var(--on-surface-variant)]"}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}

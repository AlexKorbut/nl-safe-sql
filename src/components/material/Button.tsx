import { ReactNode } from "react";

type Variant = "filled" | "tonal" | "outlined" | "text";
type Size = "small" | "medium" | "large";

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  filled: "bg-[var(--primary)] text-[var(--on-primary)] hover:shadow-md",
  tonal: "bg-[var(--primary-container)] text-[var(--on-primary-container)] hover:shadow-sm",
  outlined: "border border-[var(--outline)] text-[var(--primary)] hover:bg-[var(--primary)]/8",
  text: "text-[var(--primary)] hover:bg-[var(--primary)]/8",
};

const sizeStyles: Record<Size, string> = {
  small: "px-3 py-2 text-label-large",
  medium: "px-6 py-2.5 text-label-large",
  large: "px-8 py-3 text-label-large",
};

export function Button({
  children,
  variant = "filled",
  size = "medium",
  disabled = false,
  onClick,
  className = "",
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-full font-medium transition-all cursor-pointer
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabled ? "opacity-38 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

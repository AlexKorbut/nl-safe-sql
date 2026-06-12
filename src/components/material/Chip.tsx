interface ChipProps {
  label: string;
  variant?: "assist" | "filter" | "input";
  onDelete?: () => void;
  className?: string;
}

const variantStyles = {
  assist: "bg-[var(--surface-variant)] text-[var(--on-surface-variant)]",
  filter: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
  input: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
};

export function Chip({ label, variant = "assist", onDelete, className = "" }: ChipProps) {
  return (
    <div
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full
        text-label-large border border-[var(--outline-variant)]
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <span>{label}</span>
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-current hover:opacity-75 transition"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </div>
  );
}

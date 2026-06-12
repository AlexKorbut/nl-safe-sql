import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  outlined?: boolean;
}

export function Card({ children, className = "", elevated = false, outlined = false }: CardProps) {
  return (
    <div
      className={`
        rounded-3xl p-6 bg-[var(--surface)] text-[var(--on-surface)]
        transition-shadow duration-200
        ${elevated ? "shadow-md hover:shadow-lg" : ""}
        ${outlined ? "border border-[var(--outline-variant)]" : "shadow-sm"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

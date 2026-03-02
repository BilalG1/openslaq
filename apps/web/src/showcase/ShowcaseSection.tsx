import type { ReactNode } from "react";

export function VariantGrid({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-secondary mb-3">{title}</h3>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}

export function VariantItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-[11px] font-mono text-tertiary">{label}</span>
      {children}
    </div>
  );
}

import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const loadingStateVariants = cva(
  "flex flex-col items-center justify-center gap-3",
  {
    variants: {
      size: {
        sm: "py-6",
        md: "py-12",
      },
    },
    defaultVariants: { size: "md" },
  },
);

interface LoadingStateProps extends VariantProps<typeof loadingStateVariants> {
  label?: string;
  className?: string;
}

function LoadingState({ label, size, className }: LoadingStateProps) {
  const rows = size === "sm" ? 2 : 3;
  return (
    <div className={clsx(loadingStateVariants({ size }), className)}>
      <div className="w-64 space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-surface-tertiary animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div
                className="h-3 rounded bg-surface-tertiary animate-pulse"
                style={{ width: `${70 + ((i * 17) % 30)}%` }}
              />
              <div
                className="h-3 rounded bg-surface-tertiary animate-pulse"
                style={{ width: `${40 + ((i * 23) % 40)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {label && <span className="text-faint text-sm mt-1">{label}</span>}
    </div>
  );
}

export { LoadingState };
export type { LoadingStateProps };

import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const errorStateVariants = cva(
  "flex flex-col items-center justify-center text-danger-text",
  {
    variants: {
      size: {
        sm: "py-6 text-sm",
        md: "py-12 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

interface ErrorStateProps extends VariantProps<typeof errorStateVariants> {
  message: string;
  action?: ReactNode;
  className?: string;
}

function ErrorState({ message, action, size, className }: ErrorStateProps) {
  return (
    <div className={clsx(errorStateVariants({ size }), className)}>
      {message}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { ErrorState };
export type { ErrorStateProps };

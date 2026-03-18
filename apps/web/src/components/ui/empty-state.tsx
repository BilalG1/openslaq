import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        sm: "py-6 gap-2",
        md: "py-20 gap-4",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const iconWrapperVariants = cva(
  "bg-slaq-blue/10 rounded-full flex items-center justify-center text-slaq-blue",
  {
    variants: {
      size: {
        sm: "p-2.5",
        md: "p-4",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const iconVariants = cva("", {
  variants: {
    size: {
      sm: "w-8 h-8",
      md: "w-12 h-12",
    },
  },
  defaultVariants: { size: "md" },
});

const titleVariants = cva("font-semibold text-primary", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-lg",
    },
  },
  defaultVariants: { size: "md" },
});

const subtitleVariants = cva("text-muted", {
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
    },
  },
  defaultVariants: { size: "md" },
});

interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
  "data-testid"?: string;
}

function EmptyState({
  icon,
  title,
  subtitle,
  size,
  className,
  "data-testid": testId,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(emptyStateVariants({ size }), className)}
      data-testid={testId}
    >
      {icon && (
        <div className={iconWrapperVariants({ size })}>
          <div className={iconVariants({ size })}>{icon}</div>
        </div>
      )}
      <span className={titleVariants({ size })}>{title}</span>
      {subtitle && <span className={subtitleVariants({ size })}>{subtitle}</span>}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };

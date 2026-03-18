import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const errorStateVariants = cva(
  "flex items-center justify-center text-danger-text",
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
  className?: string;
}

function ErrorState({ message, size, className }: ErrorStateProps) {
  return (
    <div className={clsx(errorStateVariants({ size }), className)}>
      {message}
    </div>
  );
}

export { ErrorState };
export type { ErrorStateProps };

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

const selectTriggerVariants = cva(
  "inline-flex items-center justify-between border border-border-default rounded bg-surface cursor-pointer text-left text-primary",
  {
    variants: {
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-2 py-1 text-xs",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

const SelectTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
    VariantProps<typeof selectTriggerVariants>
>(({ className, size, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={clsx(selectTriggerVariants({ size }), className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon className="ml-1">
      <ChevronDown className="w-3 h-3" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position="popper"
      className={clsx(
        "bg-surface border border-border-default rounded-lg shadow-lg z-[100] overflow-hidden max-h-60",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

const SelectItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={clsx(
      "text-xs px-2 py-1.5 rounded cursor-pointer outline-none text-primary data-[highlighted]:bg-surface-tertiary",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  selectTriggerVariants,
};

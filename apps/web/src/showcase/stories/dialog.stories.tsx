import { useState } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const sizes = ["sm", "md", "lg"] as const;
const positions = ["center", "top"] as const;

function DialogDemo({
  size,
  position,
}: {
  size: (typeof sizes)[number];
  position: (typeof positions)[number];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {size} / {position}
        </Button>
      </DialogTrigger>
      <DialogContent size={size} position={position}>
        <DialogTitle>Dialog Title ({size})</DialogTitle>
        <DialogDescription>
          This is a {size} dialog at {position} position. It demonstrates the
          dialog overlay, content area, and close button.
        </DialogDescription>
        <div className="flex justify-end gap-2 mt-4">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button size="sm" onClick={() => setOpen(false)}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const dialogStory: ComponentStory = {
  id: "dialog",
  name: "Dialog",
  source: "components/ui/dialog.tsx",
  render: () => (
    <>
      <VariantGrid title="Size x Position Matrix">
        {sizes.map((size) =>
          positions.map((pos) => (
            <VariantItem key={`${size}-${pos}`} label={`${size} / ${pos}`}>
              <DialogDemo size={size} position={pos} />
            </VariantItem>
          )),
        )}
      </VariantGrid>
    </>
  ),
};

import { Button } from "../../components/ui";
import { Tooltip } from "../../components/ui";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const sides = ["top", "bottom", "left", "right"] as const;

export const tooltipStory: ComponentStory = {
  id: "tooltip",
  name: "Tooltip",
  source: "components/ui/tooltip.tsx",
  render: () => (
    <>
      <VariantGrid title="Sides">
        {sides.map((side) => (
          <VariantItem key={side} label={side}>
            <Tooltip content={`Tooltip on ${side}`} side={side}>
              <Button variant="outline" size="sm">
                Hover ({side})
              </Button>
            </Tooltip>
          </VariantItem>
        ))}
      </VariantGrid>
    </>
  ),
};

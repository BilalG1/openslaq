import { Badge } from "../../components/ui";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const variants = ["red", "amber", "blue", "gray"] as const;
const sizes = ["sm", "md"] as const;

export const badgeStory: ComponentStory = {
  id: "badge",
  name: "Badge",
  source: "components/ui/badge.tsx",
  render: () => (
    <>
      <VariantGrid title="Variants">
        {variants.map((v) => (
          <VariantItem key={v} label={v}>
            <Badge variant={v}>{v}</Badge>
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="Sizes">
        {sizes.map((s) => (
          <VariantItem key={s} label={s}>
            <Badge size={s}>{s === "sm" ? "3" : "Label"}</Badge>
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="Variant x Size Matrix">
        {variants.map((v) =>
          sizes.map((s) => (
            <VariantItem key={`${v}-${s}`} label={`${v} / ${s}`}>
              <Badge variant={v} size={s}>
                {s === "sm" ? "5" : v}
              </Badge>
            </VariantItem>
          )),
        )}
      </VariantGrid>
    </>
  ),
};

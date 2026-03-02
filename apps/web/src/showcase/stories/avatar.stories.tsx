import { Avatar } from "../../components/ui";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const sizes = ["sm", "md", "lg"] as const;
const shapes = ["rounded", "circle"] as const;

export const avatarStory: ComponentStory = {
  id: "avatar",
  name: "Avatar",
  source: "components/ui/avatar.tsx",
  render: () => (
    <>
      <VariantGrid title="Sizes (fallback)">
        {sizes.map((s) => (
          <VariantItem key={s} label={s}>
            <Avatar size={s} fallback="A" />
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="Shapes">
        {shapes.map((sh) => (
          <VariantItem key={sh} label={sh}>
            <Avatar shape={sh} fallback="B" />
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="Size x Shape Matrix">
        {sizes.map((s) =>
          shapes.map((sh) => (
            <VariantItem key={`${s}-${sh}`} label={`${s} / ${sh}`}>
              <Avatar size={s} shape={sh} fallback="C" />
            </VariantItem>
          )),
        )}
      </VariantGrid>

      <VariantGrid title="With Image">
        <VariantItem label="valid src">
          <Avatar
            src="https://api.dicebear.com/9.x/thumbs/svg?seed=showcase"
            fallback="D"
          />
        </VariantItem>
        <VariantItem label="broken src">
          <Avatar src="https://invalid.example/404.png" fallback="E" />
        </VariantItem>
        <VariantItem label="no src">
          <Avatar fallback="F" />
        </VariantItem>
      </VariantGrid>
    </>
  ),
};

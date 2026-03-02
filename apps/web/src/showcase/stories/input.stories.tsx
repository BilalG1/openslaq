import { Input } from "../../components/ui";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const variants = ["default", "compact", "flush"] as const;

export const inputStory: ComponentStory = {
  id: "input",
  name: "Input",
  source: "components/ui/input.tsx",
  render: () => (
    <>
      <VariantGrid title="Variants">
        {variants.map((v) => (
          <VariantItem key={v} label={v}>
            <Input variant={v} placeholder={`${v} input`} />
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="States">
        <VariantItem label="placeholder">
          <Input placeholder="Placeholder text" />
        </VariantItem>
        <VariantItem label="with value">
          <Input defaultValue="Hello world" />
        </VariantItem>
        <VariantItem label="disabled">
          <Input disabled defaultValue="Disabled" />
        </VariantItem>
        <VariantItem label="read-only">
          <Input readOnly defaultValue="Read only" />
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Types">
        <VariantItem label="text">
          <Input type="text" placeholder="Text" />
        </VariantItem>
        <VariantItem label="password">
          <Input type="password" defaultValue="secret" />
        </VariantItem>
        <VariantItem label="search">
          <Input type="search" placeholder="Search..." />
        </VariantItem>
      </VariantGrid>
    </>
  ),
};

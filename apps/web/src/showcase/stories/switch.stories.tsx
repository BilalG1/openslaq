import { useState } from "react";
import { Switch } from "../../components/ui";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

function ControlledSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return <Switch checked={checked} onCheckedChange={setChecked} />;
}

export const switchStory: ComponentStory = {
  id: "switch",
  name: "Switch",
  source: "components/ui/switch.tsx",
  render: () => (
    <>
      <VariantGrid title="States">
        <VariantItem label="off">
          <ControlledSwitch />
        </VariantItem>
        <VariantItem label="on">
          <ControlledSwitch defaultChecked />
        </VariantItem>
        <VariantItem label="disabled off">
          <Switch disabled checked={false} />
        </VariantItem>
        <VariantItem label="disabled on">
          <Switch disabled checked />
        </VariantItem>
      </VariantGrid>
    </>
  ),
};

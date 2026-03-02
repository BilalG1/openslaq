import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const sizes = ["sm", "md"] as const;

export const selectStory: ComponentStory = {
  id: "select",
  name: "Select",
  source: "components/ui/select.tsx",
  render: () => (
    <>
      <VariantGrid title="Sizes">
        {sizes.map((s) => (
          <VariantItem key={s} label={s}>
            <Select defaultValue="opt1">
              <SelectTrigger size={s}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opt1">Option 1</SelectItem>
                <SelectItem value="opt2">Option 2</SelectItem>
                <SelectItem value="opt3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="States">
        <VariantItem label="placeholder">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Alpha</SelectItem>
              <SelectItem value="b">Beta</SelectItem>
            </SelectContent>
          </Select>
        </VariantItem>
        <VariantItem label="disabled">
          <Select disabled defaultValue="a">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};

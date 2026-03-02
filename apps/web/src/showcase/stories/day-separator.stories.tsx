import { DaySeparator } from "../../components/message/DaySeparator";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const today = new Date();
const yesterday = new Date(today.getTime() - 86_400_000);
const lastWeek = new Date(today.getTime() - 86_400_000 * 5);

export const daySeparatorStory: ComponentStory = {
  id: "day-separator",
  name: "DaySeparator",
  source: "components/message/DaySeparator.tsx",
  render: () => (
    <>
      <VariantGrid title="Date Variants">
        <VariantItem label="today">
          <div className="w-[400px]">
            <DaySeparator date={today} />
          </div>
        </VariantItem>
        <VariantItem label="yesterday">
          <div className="w-[400px]">
            <DaySeparator date={yesterday} />
          </div>
        </VariantItem>
        <VariantItem label="older date">
          <div className="w-[400px]">
            <DaySeparator date={lastWeek} />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};

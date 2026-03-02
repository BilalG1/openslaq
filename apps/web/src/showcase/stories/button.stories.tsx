import { Hash, Send, Settings, Smile, X } from "lucide-react";
import { Button } from "../../components/ui";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const variants = ["primary", "secondary", "danger", "ghost", "outline"] as const;
const sizes = ["sm", "md", "lg", "icon"] as const;

export const buttonStory: ComponentStory = {
  id: "button",
  name: "Button",
  source: "components/ui/button.tsx",
  render: () => (
    <>
      <VariantGrid title="Variants">
        {variants.map((v) => (
          <VariantItem key={v} label={v}>
            <Button variant={v}>{v}</Button>
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="Sizes">
        {sizes.map((s) => (
          <VariantItem key={s} label={s}>
            <Button size={s}>{s === "icon" ? <Settings className="h-4 w-4" /> : s}</Button>
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="Variant x Size Matrix">
        {variants.map((v) =>
          sizes.map((s) => (
            <VariantItem key={`${v}-${s}`} label={`${v} / ${s}`}>
              <Button variant={v} size={s}>
                {s === "icon" ? <Settings className="h-4 w-4" /> : `${v}`}
              </Button>
            </VariantItem>
          )),
        )}
      </VariantGrid>

      <VariantGrid title="Disabled">
        {variants.map((v) => (
          <VariantItem key={v} label={v}>
            <Button variant={v} disabled>
              {v}
            </Button>
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="With Icons">
        <VariantItem label="leading icon">
          <Button>
            <Hash className="h-4 w-4 mr-1.5" />
            Channel
          </Button>
        </VariantItem>
        <VariantItem label="trailing icon">
          <Button>
            Send
            <Send className="h-4 w-4 ml-1.5" />
          </Button>
        </VariantItem>
        <VariantItem label="icon + ghost">
          <Button variant="ghost" size="icon">
            <Smile className="h-4 w-4" />
          </Button>
        </VariantItem>
        <VariantItem label="icon + outline">
          <Button variant="outline" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};

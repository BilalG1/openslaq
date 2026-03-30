import { forwardRef } from "react";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { MessageInput } from "./MessageInput";
import type { MessageInputProps, MessageInputRef } from "./MessageInput";
import { MessageInputVariantA } from "./MessageInputVariantA";

export const MessageInputSwitcher = forwardRef<MessageInputRef, MessageInputProps>(
  function MessageInputSwitcher(props, ref) {
    const flags = useFeatureFlags();
    if (flags.mobileMessageInput === "variant-a") {
      return <MessageInputVariantA ref={ref} {...props} />;
    }
    return <MessageInput ref={ref} {...props} />;
  },
);

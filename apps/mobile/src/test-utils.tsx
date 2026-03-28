import React, { StrictMode } from "react";
import { render, renderHook } from "@testing-library/react-native";
import type { RenderOptions, RenderHookOptions } from "@testing-library/react-native";

function StrictModeWrapper({ children }: { children: React.ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: StrictModeWrapper, ...options });
}

function customRenderHook<Result, Props>(
  callback: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, "wrapper">,
) {
  return renderHook(callback, { wrapper: StrictModeWrapper, ...options });
}

export * from "@testing-library/react-native";
export { customRender as render, customRenderHook as renderHook };

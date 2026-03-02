import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { WorkspaceDrawerProvider, useWorkspaceDrawer } from "../WorkspaceDrawerContext";

function Probe() {
  const { isOpen, open, close, toggle } = useWorkspaceDrawer();
  return (
    <>
      <Text testID="isOpen">{String(isOpen)}</Text>
      <TouchableOpacity testID="open" onPress={open} />
      <TouchableOpacity testID="close" onPress={close} />
      <TouchableOpacity testID="toggle" onPress={toggle} />
    </>
  );
}

describe("WorkspaceDrawerContext", () => {
  it("isOpen starts as false", () => {
    render(
      <WorkspaceDrawerProvider>
        <Probe />
      </WorkspaceDrawerProvider>,
    );

    expect(screen.getByTestId("isOpen").children.join("")).toBe("false");
  });

  it("open() sets isOpen to true", () => {
    render(
      <WorkspaceDrawerProvider>
        <Probe />
      </WorkspaceDrawerProvider>,
    );

    fireEvent.press(screen.getByTestId("open"));

    expect(screen.getByTestId("isOpen").children.join("")).toBe("true");
  });

  it("close() sets isOpen to false", () => {
    render(
      <WorkspaceDrawerProvider>
        <Probe />
      </WorkspaceDrawerProvider>,
    );

    fireEvent.press(screen.getByTestId("open"));
    expect(screen.getByTestId("isOpen").children.join("")).toBe("true");

    fireEvent.press(screen.getByTestId("close"));
    expect(screen.getByTestId("isOpen").children.join("")).toBe("false");
  });

  it("toggle() flips isOpen", () => {
    render(
      <WorkspaceDrawerProvider>
        <Probe />
      </WorkspaceDrawerProvider>,
    );

    fireEvent.press(screen.getByTestId("toggle"));
    expect(screen.getByTestId("isOpen").children.join("")).toBe("true");

    fireEvent.press(screen.getByTestId("toggle"));
    expect(screen.getByTestId("isOpen").children.join("")).toBe("false");
  });

  it("useWorkspaceDrawer throws outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<Probe />);
    }).toThrow("useWorkspaceDrawer must be used within WorkspaceDrawerProvider");

    spy.mockRestore();
  });
});

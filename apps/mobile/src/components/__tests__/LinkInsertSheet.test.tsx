import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { LinkInsertSheet } from "../LinkInsertSheet";

describe("LinkInsertSheet", () => {
  it("pre-fills display text from initialText", () => {
    render(
      <LinkInsertSheet
        visible={true}
        initialText="hello"
        onInsert={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const textInput = screen.getByTestId("link-text-input");
    expect(textInput.props.value).toBe("hello");
  });

  it("insert button is disabled when URL is empty", () => {
    render(
      <LinkInsertSheet
        visible={true}
        initialText=""
        onInsert={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const insertBtn = screen.getByTestId("link-insert-button");
    expect(insertBtn.props.accessibilityState?.disabled ?? insertBtn.props.disabled).toBeTruthy();
  });

  it("calls onInsert with text and url on submit", () => {
    const onInsert = jest.fn();
    render(
      <LinkInsertSheet
        visible={true}
        initialText="click here"
        onInsert={onInsert}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId("link-url-input"), "https://example.com");
    fireEvent.press(screen.getByTestId("link-insert-button"));

    expect(onInsert).toHaveBeenCalledWith("click here", "https://example.com");
  });

  it("calls onClose when backdrop is pressed", () => {
    const onClose = jest.fn();
    render(
      <LinkInsertSheet
        visible={true}
        initialText=""
        onInsert={jest.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId("link-sheet-content-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("rejects javascript: URLs", () => {
    const onInsert = jest.fn();
    render(
      <LinkInsertSheet
        visible={true}
        initialText="click"
        onInsert={onInsert}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId("link-url-input"), "javascript:alert(1)");

    const insertBtn = screen.getByTestId("link-insert-button");
    expect(insertBtn.props.accessibilityState?.disabled ?? insertBtn.props.disabled).toBeTruthy();
    expect(onInsert).not.toHaveBeenCalled();
  });

  it("rejects tel: URLs", () => {
    const onInsert = jest.fn();
    render(
      <LinkInsertSheet
        visible={true}
        initialText="call"
        onInsert={onInsert}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId("link-url-input"), "tel:+1234567890");

    const insertBtn = screen.getByTestId("link-insert-button");
    expect(insertBtn.props.accessibilityState?.disabled ?? insertBtn.props.disabled).toBeTruthy();
    expect(onInsert).not.toHaveBeenCalled();
  });

  it("backdrop Pressable should stretch to full width so dialog is not shrink-wrapped", () => {
    render(
      <LinkInsertSheet
        visible={true}
        initialText=""
        onInsert={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    // The KeyboardAvoidingView uses styles.backdrop which has alignItems: "center".
    // This causes its child (backdrop Pressable) to shrink-wrap horizontally to its
    // content width instead of filling the screen. Since the dialog Pressable uses
    // width: "100%", it resolves to the parent's (shrink-wrapped) content width —
    // making the dialog only as wide as the placeholder text, not the screen.
    //
    // The backdrop Pressable must stretch to fill the available width so that the
    // dialog's width: "100%" resolves correctly. It needs alignSelf: "stretch" or
    // the parent must not use alignItems: "center".
    const backdrop = screen.getByTestId("link-sheet-content-backdrop");
    const flatStyle = Array.isArray(backdrop.props.style)
      ? Object.assign({}, ...backdrop.props.style)
      : backdrop.props.style;

    // With alignItems: "center" on the parent KAV, the backdrop must explicitly
    // opt out via alignSelf: "stretch" (or width: "100%") to get a definite width.
    const stretches =
      flatStyle.alignSelf === "stretch" ||
      flatStyle.width === "100%";
    expect(stretches).toBe(true);
  });

  it("uses URL as display text when text field is empty", () => {
    const onInsert = jest.fn();
    render(
      <LinkInsertSheet
        visible={true}
        initialText=""
        onInsert={onInsert}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId("link-url-input"), "https://example.com");
    fireEvent.press(screen.getByTestId("link-insert-button"));

    expect(onInsert).toHaveBeenCalledWith("https://example.com", "https://example.com");
  });
});

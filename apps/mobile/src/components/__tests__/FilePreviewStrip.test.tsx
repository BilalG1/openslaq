import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FilePreviewStrip } from "../FilePreviewStrip";
import type { PendingFile } from "@/hooks/useFileUpload";

function makeFile(overrides: Partial<PendingFile> = {}): PendingFile {
  return {
    id: "file-1",
    uri: "file:///photo.jpg",
    name: "photo.jpg",
    mimeType: "image/jpeg",
    isImage: true,
    ...overrides,
  };
}

describe("FilePreviewStrip", () => {
  it("returns null when files array is empty", () => {
    const { toJSON } = render(
      <FilePreviewStrip files={[]} onRemove={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders image thumbnails", () => {
    const files = [makeFile({ id: "f1" })];
    render(<FilePreviewStrip files={files} onRemove={jest.fn()} />);

    expect(screen.getByTestId("file-preview-f1")).toBeTruthy();
    expect(screen.getByTestId("file-preview-strip")).toBeTruthy();
  });

  it("renders extension badge for non-image files", () => {
    const files = [
      makeFile({ id: "f1", name: "doc.pdf", mimeType: "application/pdf", isImage: false }),
    ];
    render(<FilePreviewStrip files={files} onRemove={jest.fn()} />);

    expect(screen.getByText("PDF")).toBeTruthy();
  });

  it("calls onRemove with correct file id", () => {
    const onRemove = jest.fn();
    const files = [makeFile({ id: "f1" }), makeFile({ id: "f2", name: "other.jpg" })];
    render(<FilePreviewStrip files={files} onRemove={onRemove} />);

    fireEvent.press(screen.getByTestId("file-remove-f1"));

    expect(onRemove).toHaveBeenCalledWith("f1");
  });

  it("renders multiple files", () => {
    const files = [
      makeFile({ id: "f1" }),
      makeFile({ id: "f2", name: "doc.pdf", isImage: false }),
    ];
    render(<FilePreviewStrip files={files} onRemove={jest.fn()} />);

    expect(screen.getByTestId("file-preview-f1")).toBeTruthy();
    expect(screen.getByTestId("file-preview-f2")).toBeTruthy();
  });

  it("shows FILE for extensionless files", () => {
    const files = [
      makeFile({ id: "f1", name: "Makefile", isImage: false }),
    ];
    render(<FilePreviewStrip files={files} onRemove={jest.fn()} />);
    expect(screen.getByText("FILE")).toBeTruthy();
  });

  it("shows FILE for files with trailing dot", () => {
    // BUG: getExtension("data.") used ?? which doesn't catch empty string
    const files = [
      makeFile({ id: "f1", name: "data.", isImage: false }),
    ];
    render(<FilePreviewStrip files={files} onRemove={jest.fn()} />);
    expect(screen.getByText("FILE")).toBeTruthy();
  });

  it("falls back to extension badge when image fails to load", () => {
    const files = [makeFile({ id: "f1", name: "broken.png", uri: "file:///gone.png" })];
    render(<FilePreviewStrip files={files} onRemove={jest.fn()} />);

    const image = screen.getByTestId("file-preview-f1");
    fireEvent(image, "error");

    // After error, should show the file extension fallback instead of a blank image
    expect(screen.getByText("PNG")).toBeTruthy();
  });

  it("shows FILE for dot-only filename", () => {
    // BUG: getExtension(".") returns "" instead of "FILE"
    const files = [
      makeFile({ id: "f1", name: ".", isImage: false }),
    ];
    render(<FilePreviewStrip files={files} onRemove={jest.fn()} />);
    expect(screen.getByText("FILE")).toBeTruthy();
  });
});

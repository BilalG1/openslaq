import { render, screen, fireEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import type { LinkPreview } from "@openslaq/shared";
import { LinkPreviewCard } from "../LinkPreviewCard";

jest.spyOn(Linking, "openURL").mockResolvedValue(true);

const fullPreview: LinkPreview = {
  url: "https://example.com/article",
  title: "Example Article",
  description: "A great article about testing",
  imageUrl: "https://example.com/image.jpg",
  siteName: "Example",
  faviconUrl: "https://example.com/favicon.ico",
};

afterEach(() => {
  jest.clearAllMocks();
});

it("renders title, description, and site name", () => {
  render(<LinkPreviewCard preview={fullPreview} />);

  expect(screen.getByText("Example Article")).toBeTruthy();
  expect(screen.getByText("A great article about testing")).toBeTruthy();
  expect(screen.getByText("Example")).toBeTruthy();
});

it("renders image when imageUrl is present", () => {
  render(<LinkPreviewCard preview={fullPreview} />);

  expect(screen.getByTestId("link-preview-image")).toBeTruthy();
});

it("hides image when imageUrl is null", () => {
  render(<LinkPreviewCard preview={{ ...fullPreview, imageUrl: null }} />);

  expect(screen.queryByTestId("link-preview-image")).toBeNull();
});

it("hides favicon when faviconUrl is null", () => {
  render(<LinkPreviewCard preview={{ ...fullPreview, faviconUrl: null }} />);

  expect(screen.queryByTestId("link-preview-favicon")).toBeNull();
});

it("opens URL on press", () => {
  render(<LinkPreviewCard preview={fullPreview} />);

  fireEvent.press(screen.getByTestId("link-preview"));

  expect(Linking.openURL).toHaveBeenCalledWith("https://example.com/article");
});

it("handles image load error gracefully", () => {
  render(<LinkPreviewCard preview={fullPreview} />);

  const image = screen.getByTestId("link-preview-image");
  fireEvent(image, "error");

  expect(screen.queryByTestId("link-preview-image")).toBeNull();
});

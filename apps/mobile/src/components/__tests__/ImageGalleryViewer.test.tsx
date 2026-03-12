import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { File as ExpoFile } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";

// Override the string mock from jest.setup.js with a functional one.
// Must use createElement (not JSX) to avoid nativewind babel injecting
// _ReactNativeCSSInterop which breaks jest.mock() scope rules.
jest.mock("react-native-image-viewing", () => {
  const RN = require("react-native");
  const R = require("react");
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (mockProps: any) => {
      if (!mockProps.visible) return null;
      const mockIdx = mockProps.imageIndex ?? 0;
      return R.createElement(
        RN.View,
        { testID: "image-viewing" },
        mockProps.HeaderComponent?.({ imageIndex: mockIdx }),
        mockProps.FooterComponent?.({ imageIndex: mockIdx }),
      );
    },
  };
});

import { ImageGalleryViewer } from "../ImageGalleryViewer";

jest.mock("@/lib/env", () => ({
  env: { EXPO_PUBLIC_API_URL: "http://api.test" },
}));

const images = [
  { uri: "http://api.test/uploads/1/download", filename: "photo1.jpg" },
  { uri: "http://api.test/uploads/2/download", filename: "photo2.png" },
  { uri: "http://api.test/uploads/3/download", filename: "photo3.jpg" },
];

describe("ImageGalleryViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when visible is false", () => {
    render(
      <ImageGalleryViewer
        images={images}
        visible={false}
        initialIndex={0}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("image-viewing")).toBeNull();
  });

  it("renders when visible is true", () => {
    render(
      <ImageGalleryViewer
        images={images}
        visible={true}
        initialIndex={0}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId("image-viewing")).toBeTruthy();
  });

  it("shows filename and image count in header", () => {
    render(
      <ImageGalleryViewer
        images={images}
        visible={true}
        initialIndex={0}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("photo1.jpg")).toBeTruthy();
    expect(screen.getByText("1 of 3")).toBeTruthy();
  });

  it("calls onClose when close button pressed", () => {
    const onClose = jest.fn();
    render(
      <ImageGalleryViewer
        images={images}
        visible={true}
        initialIndex={0}
        onClose={onClose}
      />,
    );
    fireEvent.press(screen.getByTestId("gallery-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("share action downloads then shares", async () => {
    render(
      <ImageGalleryViewer
        images={images}
        visible={true}
        initialIndex={0}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId("gallery-share"));

    await waitFor(() => {
      expect(ExpoFile.downloadFileAsync).toHaveBeenCalledWith(
        "http://api.test/uploads/1/download",
        expect.objectContaining({ uri: "file:///cache/photo1.jpg" }),
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/photo1.jpg");
    });
  });

  it("save action requests permission then saves", async () => {
    render(
      <ImageGalleryViewer
        images={images}
        visible={true}
        initialIndex={0}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId("gallery-save"));

    await waitFor(() => {
      expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
      expect(ExpoFile.downloadFileAsync).toHaveBeenCalledWith(
        "http://api.test/uploads/1/download",
        expect.objectContaining({ uri: "file:///cache/photo1.jpg" }),
      );
      expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith("file:///cache/photo1.jpg");
    });
  });

  it("shows alert when save permission denied", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "denied",
    });
    const alertSpy = jest.spyOn(Alert, "alert");

    render(
      <ImageGalleryViewer
        images={images}
        visible={true}
        initialIndex={0}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId("gallery-save"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Permission required",
        "Please allow photo library access to save images.",
      );
    });
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("does not show count for single image", () => {
    render(
      <ImageGalleryViewer
        images={[images[0]]}
        visible={true}
        initialIndex={0}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("gallery-count")).toBeNull();
  });
});

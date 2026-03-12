import { describe, test, expect, afterEach, jest } from "bun:test";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";

// Mock navigator.mediaDevices.enumerateDevices
const mockEnumerateDevices = jest.fn<() => Promise<MediaDeviceInfo[]>>();
Object.defineProperty(navigator, "mediaDevices", {
  value: { enumerateDevices: mockEnumerateDevices },
  configurable: true,
});

import { DeviceSelector } from "./DeviceSelector";

function makeDevice(kind: MediaDeviceInfo["kind"], deviceId: string, label?: string): MediaDeviceInfo {
  return { kind, deviceId, groupId: "", label: label ?? "", toJSON: () => ({}) };
}

describe("DeviceSelector", () => {
  afterEach(() => {
    cleanup();
    mockEnumerateDevices.mockReset();
  });

  test("renders null when ≤1 audio AND ≤1 video device", async () => {
    mockEnumerateDevices.mockResolvedValue([
      makeDevice("audioinput", "mic-1", "Mic 1"),
    ]);

    const { container } = render(
      <DeviceSelector onSelectDevice={jest.fn()} />,
    );
    await act(() => Promise.resolve());

    expect(container.innerHTML).toBe("");
  });

  test("renders audio device list when multiple audio inputs exist", async () => {
    mockEnumerateDevices.mockResolvedValue([
      makeDevice("audioinput", "mic-1", "Mic 1"),
      makeDevice("audioinput", "mic-2", "Mic 2"),
    ]);

    render(<DeviceSelector onSelectDevice={jest.fn()} />);
    await act(() => Promise.resolve());

    // Toggle open
    fireEvent.click(screen.getByTestId("device-selector-toggle"));

    expect(screen.getByText("Mic 1")).toBeTruthy();
    expect(screen.getByText("Mic 2")).toBeTruthy();
    expect(screen.getByText("Microphone")).toBeTruthy();
  });

  test("renders video device list when multiple video inputs AND onSelectVideoDevice provided", async () => {
    mockEnumerateDevices.mockResolvedValue([
      makeDevice("audioinput", "mic-1", "Mic 1"),
      makeDevice("audioinput", "mic-2", "Mic 2"),
      makeDevice("videoinput", "cam-1", "Cam 1"),
      makeDevice("videoinput", "cam-2", "Cam 2"),
    ]);

    render(
      <DeviceSelector onSelectDevice={jest.fn()} onSelectVideoDevice={jest.fn()} />,
    );
    await act(() => Promise.resolve());

    fireEvent.click(screen.getByTestId("device-selector-toggle"));

    expect(screen.getByText("Camera")).toBeTruthy();
    expect(screen.getByText("Cam 1")).toBeTruthy();
    expect(screen.getByText("Cam 2")).toBeTruthy();
  });

  test("clicking an audio device calls onSelectDevice and closes dropdown", async () => {
    mockEnumerateDevices.mockResolvedValue([
      makeDevice("audioinput", "mic-1", "Mic 1"),
      makeDevice("audioinput", "mic-2", "Mic 2"),
    ]);

    const onSelect = jest.fn();
    render(<DeviceSelector onSelectDevice={onSelect} />);
    await act(() => Promise.resolve());

    fireEvent.click(screen.getByTestId("device-selector-toggle"));
    fireEvent.click(screen.getByText("Mic 2"));

    expect(onSelect).toHaveBeenCalledWith("mic-2");
    // Dropdown should close
    expect(screen.queryByText("Mic 1")).toBeNull();
  });

  test("clicking a video device calls onSelectVideoDevice and closes dropdown", async () => {
    mockEnumerateDevices.mockResolvedValue([
      makeDevice("audioinput", "mic-1", "Mic 1"),
      makeDevice("audioinput", "mic-2", "Mic 2"),
      makeDevice("videoinput", "cam-1", "Cam 1"),
      makeDevice("videoinput", "cam-2", "Cam 2"),
    ]);

    const onSelectVideo = jest.fn();
    render(
      <DeviceSelector onSelectDevice={jest.fn()} onSelectVideoDevice={onSelectVideo} />,
    );
    await act(() => Promise.resolve());

    fireEvent.click(screen.getByTestId("device-selector-toggle"));
    fireEvent.click(screen.getByText("Cam 2"));

    expect(onSelectVideo).toHaveBeenCalledWith("cam-2");
    expect(screen.queryByText("Cam 1")).toBeNull();
  });

  test("click-outside closes the dropdown", async () => {
    mockEnumerateDevices.mockResolvedValue([
      makeDevice("audioinput", "mic-1", "Mic 1"),
      makeDevice("audioinput", "mic-2", "Mic 2"),
    ]);

    render(<DeviceSelector onSelectDevice={jest.fn()} />);
    await act(() => Promise.resolve());

    fireEvent.click(screen.getByTestId("device-selector-toggle"));
    expect(screen.getByText("Mic 1")).toBeTruthy();

    // Click outside
    fireEvent.mouseDown(document.body);

    expect(screen.queryByText("Mic 1")).toBeNull();
  });

  test("toggle open/close on button click", async () => {
    mockEnumerateDevices.mockResolvedValue([
      makeDevice("audioinput", "mic-1", "Mic 1"),
      makeDevice("audioinput", "mic-2", "Mic 2"),
    ]);

    render(<DeviceSelector onSelectDevice={jest.fn()} />);
    await act(() => Promise.resolve());

    const toggle = screen.getByTestId("device-selector-toggle");

    // Open
    fireEvent.click(toggle);
    expect(screen.getByText("Mic 1")).toBeTruthy();

    // Close
    fireEvent.click(toggle);
    expect(screen.queryByText("Mic 1")).toBeNull();
  });

  test("shows fallback label when device has no label", async () => {
    mockEnumerateDevices.mockResolvedValue([
      makeDevice("audioinput", "abcdef01-1234", ""),
      makeDevice("audioinput", "xyz98765-5678", ""),
    ]);

    render(<DeviceSelector onSelectDevice={jest.fn()} />);
    await act(() => Promise.resolve());

    fireEvent.click(screen.getByTestId("device-selector-toggle"));

    expect(screen.getByText("Microphone abcdef01")).toBeTruthy();
    expect(screen.getByText("Microphone xyz98765")).toBeTruthy();
  });
});

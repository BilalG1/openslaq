import { renderHook, act } from "@testing-library/react-native";
import { useFileUpload } from "../useFileUpload";

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///photo.jpg",
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
      },
    ],
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///camera.jpg",
        fileName: "camera.jpg",
        mimeType: "image/jpeg",
      },
    ],
  }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///doc.pdf",
        name: "doc.pdf",
        mimeType: "application/pdf",
      },
    ],
  }),
}));

// apiUrl comes from useServer() mock (jest.setup.js) → http://localhost:3001

describe("useFileUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn();
  });

  it("starts with empty state", () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.pendingFiles).toHaveLength(0);
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasFiles).toBe(false);
  });

  it("adds files from image picker", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0]!.name).toBe("photo.jpg");
    expect(result.current.pendingFiles[0]!.isImage).toBe(true);
    expect(result.current.hasFiles).toBe(true);
  });

  it("adds files from camera", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromCamera();
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0]!.name).toBe("camera.jpg");
  });

  it("adds files from document picker", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromDocumentPicker();
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0]!.name).toBe("doc.pdf");
    expect(result.current.pendingFiles[0]!.isImage).toBe(false);
  });

  it("removes a file by id", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    const fileId = result.current.pendingFiles[0]!.id;

    act(() => {
      result.current.removeFile(fileId);
    });

    expect(result.current.pendingFiles).toHaveLength(0);
    expect(result.current.hasFiles).toBe(false);
  });

  it("uploads all files and returns attachment ids", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        attachments: [{ id: "att-1" }, { id: "att-2" }],
      }),
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.uploadAll(() => Promise.resolve("test-token"));
    });

    expect(ids).toEqual(["att-1", "att-2"]);
    expect(global.fetch as unknown as jest.Mock).toHaveBeenCalledWith(
      "http://localhost:3001/api/uploads",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
      }),
    );
  });

  it("handles upload failure", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "File too large" }),
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    let error: Error | undefined;
    await act(async () => {
      try {
        await result.current.uploadAll(() => Promise.resolve("test-token"));
      } catch (e) {
        error = e as Error;
      }
    });

    expect(error?.message).toBe("File too large");
    expect(result.current.error).toBe("File too large");
    expect(result.current.uploading).toBe(false);
  });

  it("returns empty array when no files to upload", async () => {
    const { result } = renderHook(() => useFileUpload());

    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.uploadAll(() => Promise.resolve("test-token"));
    });

    expect(ids).toEqual([]);
    expect(global.fetch as unknown as jest.Mock).not.toHaveBeenCalled();
  });

  it("reset clears all state", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    expect(result.current.hasFiles).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.pendingFiles).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(result.current.hasFiles).toBe(false);
  });

  it("handles image picker cancellation", async () => {
    const ImagePicker = require("expo-image-picker");
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    expect(result.current.pendingFiles).toHaveLength(0);
    expect(result.current.hasFiles).toBe(false);
  });

  it("handles document picker cancellation", async () => {
    const DocPicker = require("expo-document-picker");
    DocPicker.getDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromDocumentPicker();
    });

    expect(result.current.pendingFiles).toHaveLength(0);
  });

  it("prevents concurrent uploads (second call returns empty)", async () => {
    // Mock a slow upload
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(new Response(
        JSON.stringify({ attachments: [{ id: "att-1" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )), 100)),
    );

    const { result } = renderHook(() => useFileUpload());

    // Add a file
    act(() => {
      result.current.addFile({
        id: "f1",
        uri: "file:///f1.jpg",
        name: "f1.jpg",
        mimeType: "image/jpeg",
        isImage: true,
      });
    });

    const getToken = jest.fn().mockResolvedValue("test-token");

    // Start two uploads concurrently
    let result1: string[] = [];
    let result2: string[] = [];

    await act(async () => {
      const p1 = result.current.uploadAll(getToken).then((r) => { result1 = r; });
      const p2 = result.current.uploadAll(getToken).then((r) => { result2 = r; });
      jest.advanceTimersByTime(200);
      await p1;
      await p2;
    });

    // Second call should have been blocked and returned empty
    expect(result2).toEqual([]);
    // Token should only be fetched once (first upload)
    expect(getToken).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it("can add multiple files sequentially", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });
    await act(async () => {
      await result.current.addFromDocumentPicker();
    });

    expect(result.current.pendingFiles).toHaveLength(2);
    expect(result.current.pendingFiles[0]!.name).toBe("photo.jpg");
    expect(result.current.pendingFiles[1]!.name).toBe("doc.pdf");
  });
});

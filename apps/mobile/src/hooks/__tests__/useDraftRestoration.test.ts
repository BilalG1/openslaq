import { renderHook, act } from "@testing-library/react-native";
import { useDraftRestoration } from "../useDraftRestoration";

const mockSaveDraft = jest.fn();
const mockClearDraft = jest.fn();
let mockDraftState = { draft: "", saveDraft: mockSaveDraft, clearDraft: mockClearDraft, isLoaded: false };

jest.mock("@/hooks/useDraftMessage", () => ({
  useDraftMessage: () => mockDraftState,
}));

function makeEditorRef() {
  const editor = {
    setContent: jest.fn(),
    focus: jest.fn(),
  };
  return { current: editor };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDraftState = { draft: "", saveDraft: mockSaveDraft, clearDraft: mockClearDraft, isLoaded: false };
});

describe("useDraftRestoration", () => {
  it("returns saveDraft and clearDraft from useDraftMessage", () => {
    const editorRef = makeEditorRef();
    const { result } = renderHook(() =>
      useDraftRestoration({ editingMessage: null, draftKey: "test-key", editorRef }),
    );
    expect(result.current.saveDraft).toBe(mockSaveDraft);
    expect(result.current.clearDraft).toBe(mockClearDraft);
  });

  it("handleEditorReady restores draft when loaded", () => {
    const editorRef = makeEditorRef();
    mockDraftState = { ...mockDraftState, draft: "saved draft", isLoaded: true };

    const { result } = renderHook(() =>
      useDraftRestoration({ editingMessage: null, draftKey: "key", editorRef }),
    );
    act(() => {
      result.current.handleEditorReady();
    });
    expect(editorRef.current.setContent).toHaveBeenCalledWith("saved draft");
  });

  it("handleEditorReady restores editing message instead of draft", () => {
    const editorRef = makeEditorRef();
    mockDraftState = { ...mockDraftState, draft: "saved draft", isLoaded: true };

    const { result } = renderHook(() =>
      useDraftRestoration({
        editingMessage: { id: "msg-1", content: "editing content" },
        draftKey: "key",
        editorRef,
      }),
    );
    act(() => {
      result.current.handleEditorReady();
    });
    expect(editorRef.current.setContent).toHaveBeenCalledWith("editing content");
    expect(editorRef.current.focus).toHaveBeenCalledWith("end");
  });

  it("does not restore draft when not loaded", () => {
    const editorRef = makeEditorRef();
    mockDraftState = { ...mockDraftState, draft: "", isLoaded: false };

    const { result } = renderHook(() =>
      useDraftRestoration({ editingMessage: null, draftKey: "key", editorRef }),
    );
    act(() => {
      result.current.handleEditorReady();
    });
    expect(editorRef.current.setContent).not.toHaveBeenCalled();
  });

  it("restores new draft after draftKey changes (channel switch without remount)", () => {
    const editorRef = makeEditorRef();
    mockDraftState = { ...mockDraftState, draft: "draft-A", isLoaded: true };

    const { result, rerender } = renderHook(
      ({ draftKey }: { draftKey: string }) =>
        useDraftRestoration({ editingMessage: null, draftKey, editorRef }),
      { initialProps: { draftKey: "channel-A" } },
    );

    // Restore draft for channel A
    act(() => {
      result.current.handleEditorReady();
    });
    expect(editorRef.current.setContent).toHaveBeenCalledWith("draft-A");
    editorRef.current.setContent.mockClear();

    // Switch to channel B with a different draft
    mockDraftState = { ...mockDraftState, draft: "draft-B", isLoaded: true };
    rerender({ draftKey: "channel-B" });

    // The useEffect should restore draft-B since draftRestoredRef was reset
    expect(editorRef.current.setContent).toHaveBeenCalledWith("draft-B");
  });

  it("does not restore stale draft after draftKey changes to channel with no draft", () => {
    const editorRef = makeEditorRef();
    mockDraftState = { ...mockDraftState, draft: "draft-A", isLoaded: true };

    const { result, rerender } = renderHook(
      ({ draftKey }: { draftKey: string }) =>
        useDraftRestoration({ editingMessage: null, draftKey, editorRef }),
      { initialProps: { draftKey: "channel-A" } },
    );

    act(() => {
      result.current.handleEditorReady();
    });
    expect(editorRef.current.setContent).toHaveBeenCalledWith("draft-A");
    editorRef.current.setContent.mockClear();

    // Switch to channel B with no draft
    mockDraftState = { ...mockDraftState, draft: "", isLoaded: true };
    rerender({ draftKey: "channel-B" });

    // Should not call setContent since draft is empty
    expect(editorRef.current.setContent).not.toHaveBeenCalled();
  });

  it("does not restore draft twice", () => {
    const editorRef = makeEditorRef();
    mockDraftState = { ...mockDraftState, draft: "draft", isLoaded: true };

    const { result } = renderHook(() =>
      useDraftRestoration({ editingMessage: null, draftKey: "key", editorRef }),
    );
    act(() => {
      result.current.handleEditorReady();
    });
    act(() => {
      result.current.handleEditorReady();
    });
    expect(editorRef.current.setContent).toHaveBeenCalledTimes(1);
  });
});

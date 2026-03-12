import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllDraftKeys, getAllDrafts, removeDraft, clearAllDrafts } from "../draft-storage";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("draft-storage", () => {
  describe("getAllDraftKeys", () => {
    it("returns draft keys without prefix", async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        "openslaq-draft-ch-1",
        "openslaq-draft-thread-msg-1",
        "other-key",
      ]);

      const keys = await getAllDraftKeys();

      expect(keys).toEqual(["ch-1", "thread-msg-1"]);
    });

    it("returns empty array when no drafts exist", async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce(["some-other-key"]);

      const keys = await getAllDraftKeys();

      expect(keys).toEqual([]);
    });
  });

  describe("getAllDrafts", () => {
    it("returns all drafts with keys and text", async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        "openslaq-draft-ch-1",
        "openslaq-draft-ch-2",
        "unrelated-key",
      ]);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        ["openslaq-draft-ch-1", "hello world"],
        ["openslaq-draft-ch-2", "draft two"],
      ]);

      const drafts = await getAllDrafts();

      expect(drafts).toEqual([
        { draftKey: "ch-1", text: "hello world" },
        { draftKey: "ch-2", text: "draft two" },
      ]);
    });

    it("returns empty array when no drafts", async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([]);

      const drafts = await getAllDrafts();

      expect(drafts).toEqual([]);
      expect(AsyncStorage.multiGet).not.toHaveBeenCalled();
    });

    it("filters out null values", async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        "openslaq-draft-ch-1",
        "openslaq-draft-ch-2",
      ]);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        ["openslaq-draft-ch-1", "hello"],
        ["openslaq-draft-ch-2", null],
      ]);

      const drafts = await getAllDrafts();

      expect(drafts).toEqual([{ draftKey: "ch-1", text: "hello" }]);
    });
  });

  describe("removeDraft", () => {
    it("removes a single draft by key", async () => {
      await removeDraft("ch-1");

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("openslaq-draft-ch-1");
    });
  });

  describe("clearAllDrafts", () => {
    it("removes all draft keys", async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        "openslaq-draft-ch-1",
        "openslaq-draft-ch-2",
        "other-key",
      ]);

      await clearAllDrafts();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        "openslaq-draft-ch-1",
        "openslaq-draft-ch-2",
      ]);
    });

    it("does nothing when no draft keys exist", async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce(["other-key"]);

      await clearAllDrafts();

      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });
  });
});

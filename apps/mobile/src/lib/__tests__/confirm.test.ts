import { Alert } from "react-native";
import { confirmDelete } from "../confirm";

jest.spyOn(Alert, "alert");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("confirmDelete", () => {
  it("calls Alert.alert with the given title and default message", () => {
    const onDelete = jest.fn();
    confirmDelete("Delete Draft", onDelete);

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith("Delete Draft", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: expect.any(Function) },
    ]);
  });

  it("calls Alert.alert with a custom message when provided", () => {
    const onDelete = jest.fn();
    confirmDelete("Remove Item", onDelete, "This cannot be undone.");

    expect(Alert.alert).toHaveBeenCalledWith(
      "Remove Item",
      "This cannot be undone.",
      expect.any(Array),
    );
  });

  it("invokes onDelete when the Delete button is pressed", () => {
    const onDelete = jest.fn();
    confirmDelete("Delete Draft", onDelete);

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const deleteButton = buttons.find(
      (b: { text: string }) => b.text === "Delete",
    );
    deleteButton.onPress();

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onDelete when Cancel is pressed", () => {
    const onDelete = jest.fn();
    confirmDelete("Delete Draft", onDelete);

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const cancelButton = buttons.find(
      (b: { text: string }) => b.text === "Cancel",
    );
    // Cancel button has no onPress handler
    expect(cancelButton.onPress).toBeUndefined();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("handles async onDelete callbacks", async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    confirmDelete("Delete Draft", onDelete);

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const deleteButton = buttons.find(
      (b: { text: string }) => b.text === "Delete",
    );
    await deleteButton.onPress();

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

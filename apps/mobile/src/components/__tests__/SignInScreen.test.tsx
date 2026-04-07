import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import SignInScreen from "../../../app/(auth)/sign-in";

const mockSendOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockSignInWithApple = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockDevQuickSignIn = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    sendOtp: mockSendOtp,
    verifyOtp: mockVerifyOtp,
    signInWithApple: mockSignInWithApple,
    signInWithOAuth: mockSignInWithOAuth,
    devQuickSignIn: mockDevQuickSignIn,
  }),
}));

const mockEnv = jest.requireMock("@/lib/env") as { env: Record<string, string | undefined> };
jest.mock("@/lib/env", () => ({
  env: {
    EXPO_PUBLIC_API_URL: "http://localhost:3001",
    EXPO_PUBLIC_E2E_TEST_SECRET: undefined,
  },
}));

describe("SignInScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders email input, submit button, and OAuth options", () => {
    render(<SignInScreen />);

    expect(screen.getByTestId("email-input")).toBeTruthy();
    expect(screen.getByTestId("submit-button")).toBeTruthy();
    expect(screen.getByTestId("apple-sign-in")).toBeTruthy();
    expect(screen.getByText("Continue with Google")).toBeTruthy();
    expect(screen.getByText("Continue with GitHub")).toBeTruthy();
    // OTP elements should not be visible
    expect(screen.queryByTestId("otp-input")).toBeNull();
    expect(screen.queryByTestId("verify-button")).toBeNull();
  });

  it("does not advance past email step when email is empty", () => {
    render(<SignInScreen />);

    fireEvent.press(screen.getByTestId("submit-button"));

    // Should still be on email step — sendOtp never called
    expect(screen.getByTestId("email-input")).toBeTruthy();
    expect(screen.queryByTestId("otp-input")).toBeNull();
    expect(mockSendOtp).not.toHaveBeenCalled();
  });

  it("accepts email input and shows continue button", () => {
    render(<SignInScreen />);

    fireEvent.changeText(screen.getByTestId("email-input"), "test@example.com");

    expect(screen.getByTestId("submit-button")).toBeTruthy();
    expect(screen.getByText("Continue")).toBeTruthy();
  });

  it("does not show dev sign-in button when secret is not set", () => {
    mockEnv.env.EXPO_PUBLIC_E2E_TEST_SECRET = undefined;
    render(<SignInScreen />);

    expect(screen.queryByTestId("dev-quick-sign-in")).toBeNull();
  });

  it("shows dev sign-in button when secret is set in __DEV__", () => {
    mockEnv.env.EXPO_PUBLIC_E2E_TEST_SECRET = "test-secret";
    render(<SignInScreen />);

    expect(screen.getByTestId("dev-quick-sign-in")).toBeTruthy();
    expect(screen.getByText("Dev Quick Sign In")).toBeTruthy();
  });

  it("calls devQuickSignIn when dev button is pressed", async () => {
    mockEnv.env.EXPO_PUBLIC_E2E_TEST_SECRET = "test-secret";
    mockDevQuickSignIn.mockResolvedValue(undefined);
    render(<SignInScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId("dev-quick-sign-in"));
    });

    expect(mockDevQuickSignIn).toHaveBeenCalled();
  });

  it("transitions to OTP step for demo email (same UI flow)", async () => {
    mockSendOtp.mockResolvedValue("__demo__");
    render(<SignInScreen />);

    fireEvent.changeText(screen.getByTestId("email-input"), "demo@openslaq.com");

    await act(async () => {
      fireEvent.press(screen.getByTestId("submit-button"));
    });

    // Should transition to OTP step with verify button
    expect(screen.getByTestId("otp-input")).toBeTruthy();
    expect(screen.getByTestId("verify-button")).toBeTruthy();
    expect(mockSendOtp).toHaveBeenCalledWith("demo@openslaq.com");
  });
});

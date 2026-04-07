import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "../test-utils";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { InstallPage } from "./Install";

afterEach(cleanup);

function renderInstallPage() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <InstallPage />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("InstallPage", () => {
  test("renders all three install sections", () => {
    renderInstallPage();
    expect(screen.getByTestId("install-desktop")).toBeDefined();
    expect(screen.getByTestId("install-mobile")).toBeDefined();
    expect(screen.getByTestId("install-cli")).toBeDefined();
  });

  test("renders nav links for docs and install", () => {
    renderInstallPage();
    expect(screen.getByTestId("nav-docs")).toBeDefined();
    expect(screen.getByTestId("nav-install")).toBeDefined();
  });

  test("shows curl install command for CLI", () => {
    renderInstallPage();
    expect(screen.getByText("curl -fsSL https://openslaq.com/install.sh | sh")).toBeDefined();
  });

  test("mobile section links to TestFlight", () => {
    renderInstallPage();
    const link = screen.getByRole("link", { name: /TestFlight/i });
    expect(link.getAttribute("href")).toBe("https://testflight.apple.com/join/BUHUUBzA");
  });
});

import { describe, test, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "../test-utils";
import { MemoryRouter } from "react-router-dom";
import { InstallPage } from "./Install";

afterEach(cleanup);

describe("InstallPage", () => {
  test("renders all three install sections", () => {
    render(
      <MemoryRouter>
        <InstallPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("install-desktop")).toBeDefined();
    expect(screen.getByTestId("install-mobile")).toBeDefined();
    expect(screen.getByTestId("install-cli")).toBeDefined();
  });

  test("renders nav links for docs and install", () => {
    render(
      <MemoryRouter>
        <InstallPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("nav-docs")).toBeDefined();
    expect(screen.getByTestId("nav-install")).toBeDefined();
  });

  test("shows curl install command for CLI", () => {
    render(
      <MemoryRouter>
        <InstallPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("curl -fsSL https://openslaq.com/install.sh | sh")).toBeDefined();
  });
});

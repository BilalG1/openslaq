import { describe, expect, test } from "vitest";
import { formatFileSize } from "../../components/files/file-icons";

describe("formatFileSize", () => {
  test("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  test("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  test("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(5242880)).toBe("5.0 MB");
  });

  test("formats gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1.0 GB");
  });
});

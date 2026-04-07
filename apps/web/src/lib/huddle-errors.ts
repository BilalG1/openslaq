export interface PermissionAlert {
  title: string;
  description: string;
}

type DeviceKind = "microphone" | "camera" | "screen";

export function classifyMediaError(err: unknown, device: DeviceKind): PermissionAlert | null {
  if (!(err instanceof DOMException)) {
    return {
      title: "Could not switch device",
      description: "The selected device is unavailable. Try a different one.",
    };
  }

  // User cancelled the screen share picker — not an error
  if (device === "screen" && err.name === "NotAllowedError") {
    return null;
  }

  const deviceLabel = device === "screen" ? "Screen sharing" : device === "camera" ? "Camera" : "Microphone";

  switch (err.name) {
    case "NotAllowedError":
      return {
        title: `${deviceLabel} blocked`,
        description: `Allow ${device} access in your browser settings, then try again.`,
      };
    case "NotFoundError":
      return {
        title: `No ${device} found`,
        description: `Connect a ${device} and try again.`,
      };
    case "NotReadableError":
      return {
        title: `${deviceLabel} unavailable`,
        description: `Your ${device} may be in use by another app. Close other apps and try again.`,
      };
    default:
      return {
        title: `${deviceLabel} blocked`,
        description: "Your browser or system settings don't allow this. Check your settings and try again.",
      };
  }
}

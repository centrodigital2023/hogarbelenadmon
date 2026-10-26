import { describe, expect, it } from "vitest";
import { detectInstallPlatform, installSteps, isMobilePlatform } from "./install-platform";

const UA = {
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  samsung:
    "Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  whatsappAndroid:
    "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 WhatsApp/2.24",
  instagramIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

describe("detectInstallPlatform", () => {
  it("recognises Android browsers", () => {
    expect(detectInstallPlatform(UA.androidChrome)).toBe("android");
    expect(detectInstallPlatform(UA.samsung)).toBe("samsung");
  });

  it("separates Safari from other iPhone browsers", () => {
    expect(detectInstallPlatform(UA.iphoneSafari)).toBe("ios-safari");
    expect(detectInstallPlatform(UA.iphoneChrome)).toBe("ios-other");
  });

  it("treats a touch Mac user agent as an iPad, and a plain Mac as a computer", () => {
    expect(detectInstallPlatform(UA.ipad, 5)).toBe("ios-safari");
    expect(detectInstallPlatform(UA.ipad, 0)).toBe("desktop");
  });

  it("flags in-app browsers that cannot install", () => {
    expect(detectInstallPlatform(UA.whatsappAndroid)).toBe("in-app");
    expect(detectInstallPlatform(UA.instagramIOS)).toBe("in-app");
  });

  it("falls back to desktop", () => {
    expect(detectInstallPlatform(UA.windowsChrome)).toBe("desktop");
    expect(isMobilePlatform("desktop")).toBe(false);
    expect(isMobilePlatform("in-app")).toBe(true);
  });
});

describe("installSteps", () => {
  it("gives three steps for every platform", () => {
    for (const p of ["android", "samsung", "ios-safari", "ios-other", "in-app", "desktop"] as const) {
      expect(installSteps(p)).toHaveLength(3);
    }
  });

  it("tells iPhone users to use Agregar a pantalla de inicio", () => {
    expect(installSteps("ios-safari").map((s) => s.text).join(" ")).toMatch(/Agregar a pantalla de inicio/);
  });
});

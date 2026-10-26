import { describe, it, expect } from "vitest";
import {
  parseRecoveryParams,
  isPasswordRecoveryLocation,
  hasExpiredRecoveryLink,
  mapPasswordResetError,
} from "../src/lib/passwordRecovery.ts";

describe("parseRecoveryParams", () => {
  it("detects implicit recovery in the hash", () => {
    const p = parseRecoveryParams("https://app.example/reset-password#access_token=abc&type=recovery");
    expect(p.isRecovery).toBe(true);
    expect(p.type).toBe("recovery");
    expect(p.tokenHash).toBeNull();
  });

  it("detects PKCE code on /reset-password", () => {
    const p = parseRecoveryParams("https://app.example/reset-password?code=pkce-code");
    expect(p.isRecovery).toBe(true);
    expect(p.code).toBe("pkce-code");
  });

  it("detects token_hash query used by verifyOtp", () => {
    const p = parseRecoveryParams("https://app.example/reset-password?token_hash=th&type=recovery");
    expect(p.isRecovery).toBe(true);
    expect(p.tokenHash).toBe("th");
    expect(p.type).toBe("recovery");
  });

  it("does not treat an unrelated URL as recovery", () => {
    const p = parseRecoveryParams("https://app.example/login");
    expect(p.isRecovery).toBe(false);
    expect(p.code).toBeNull();
    expect(p.tokenHash).toBeNull();
  });

  it("does not treat a code on another path as recovery", () => {
    const p = parseRecoveryParams("https://app.example/?code=signup-code");
    expect(p.isRecovery).toBe(false);
  });
});

describe("isPasswordRecoveryLocation", () => {
  it("is true for /reset-password even without tokens", () => {
    expect(isPasswordRecoveryLocation("https://app.example/reset-password")).toBe(true);
  });

  it("is true for type=recovery on another path", () => {
    expect(isPasswordRecoveryLocation("https://app.example/#type=recovery&access_token=x")).toBe(true);
  });

  it("is false for login", () => {
    expect(isPasswordRecoveryLocation("https://app.example/login")).toBe(false);
  });
});

describe("hasExpiredRecoveryLink", () => {
  it("detects otp_expired in the hash", () => {
    expect(hasExpiredRecoveryLink("https://app.example/reset-password#error_code=otp_expired")).toBe(true);
  });

  it("detects otp_expired in the query string", () => {
    expect(hasExpiredRecoveryLink("https://app.example/reset-password?error=access_denied&error_code=otp_expired")).toBe(true);
  });

  it("is false for a valid recovery URL", () => {
    expect(hasExpiredRecoveryLink("https://app.example/reset-password?code=abc")).toBe(false);
  });
});

describe("mapPasswordResetError", () => {
  it("maps Auth session missing to a Spanish explanation", () => {
    const msg = mapPasswordResetError("Auth session missing!");
    expect(msg).toMatch(/mismo navegador/i);
    expect(msg).not.toMatch(/auth session missing/i);
  });

  it("maps expired OTP errors", () => {
    expect(mapPasswordResetError("otp_expired")).toMatch(/expir/i);
  });

  it("maps same-password errors", () => {
    expect(mapPasswordResetError("New password should be different from the old password.")).toMatch(/distinta/i);
  });

  it("keeps unknown messages", () => {
    expect(mapPasswordResetError("Network error")).toBe("Network error");
  });
});

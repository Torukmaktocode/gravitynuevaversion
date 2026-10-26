import { describe, it, expect } from "vitest";
import {
  audioBlobLooksEmpty,
  createHoldState,
  isPrimaryPointer,
  micGateAction,
  onHoldEnd,
  onHoldStart,
  onHoldStartFailed,
  onRecordingReady,
  onRecordingStopped,
  pickAudioMimeType,
  queryMicPermission,
} from "../src/lib/trainerHold.ts";

describe("trainerHold pointer guards", () => {
  it("accepts primary mouse left-click and touch/pen", () => {
    expect(isPrimaryPointer({ isPrimary: true, pointerType: "mouse", button: 0 })).toBe(true);
    expect(isPrimaryPointer({ isPrimary: true, pointerType: "touch", button: 0 })).toBe(true);
    expect(isPrimaryPointer({ pointerType: "pen" })).toBe(true);
  });

  it("rejects non-primary and mouse right-click", () => {
    expect(isPrimaryPointer({ isPrimary: false, pointerType: "touch", button: 0 })).toBe(false);
    expect(isPrimaryPointer({ isPrimary: true, pointerType: "mouse", button: 2 })).toBe(false);
  });
});

describe("trainerHold state machine", () => {
  it("starts a hold and ignores a second pointer", () => {
    const state = createHoldState();
    expect(onHoldStart(state, 1)).toBe("start");
    expect(onHoldStart(state, 2)).toBe("ignore");
  });

  it("marks pending stop if released before MediaRecorder is ready", () => {
    const state = createHoldState();
    expect(onHoldStart(state, 1)).toBe("start");
    expect(onHoldEnd(state, 1)).toBe("mark-pending");
    expect(onRecordingReady(state)).toBe("stop-now");
  });

  it("stops an active recording on matching pointerup", () => {
    const state = createHoldState();
    expect(onHoldStart(state, 7)).toBe("start");
    expect(onRecordingReady(state)).toBe("continue");
    expect(onHoldEnd(state, 7)).toBe("stop");
  });

  it("ignores pointerup from a different pointer", () => {
    const state = createHoldState();
    onHoldStart(state, 1);
    onRecordingReady(state);
    expect(onHoldEnd(state, 99)).toBe("ignore");
    expect(onHoldEnd(state, 1)).toBe("stop");
  });

  it("does not stop twice after pointerup + lostpointercapture", () => {
    const state = createHoldState();
    onHoldStart(state, 3);
    onRecordingReady(state);
    expect(onHoldEnd(state, 3)).toBe("stop");
    expect(onHoldEnd(state, 3)).toBe("ignore");
  });

  it("resets after a failed getUserMedia so a new press can start", () => {
    const state = createHoldState();
    expect(onHoldStart(state, 1)).toBe("start");
    onHoldStartFailed(state);
    expect(onHoldStart(state, 2)).toBe("start");
  });

  it("resets after recording stopped", () => {
    const state = createHoldState();
    onHoldStart(state, 1);
    onRecordingReady(state);
    onRecordingStopped(state);
    expect(onHoldStart(state, 2)).toBe("start");
  });
});

describe("trainerHold mic permission gate", () => {
  it("does not record or count time until permission is granted", () => {
    expect(micGateAction("prompt", false)).toBe("prime");
    expect(micGateAction("granted", false)).toBe("record");
    expect(micGateAction("prompt", true)).toBe("record");
  });

  it("blocks training when the user denied the microphone", () => {
    expect(micGateAction("denied", false)).toBe("deny");
  });

  it("queryMicPermission maps Permissions API states", async () => {
    expect(await queryMicPermission(async () => ({ state: "granted" }))).toBe("granted");
    expect(await queryMicPermission(async () => ({ state: "denied" }))).toBe("denied");
    expect(await queryMicPermission(async () => ({ state: "prompt" }))).toBe("prompt");
  });

  it("queryMicPermission falls back to prompt when the API is missing or throws", async () => {
    expect(await queryMicPermission(async () => { throw new Error("not allowed"); })).toBe("prompt");
  });
});

describe("trainerHold audio helpers", () => {
  it("picks the first supported mime type", () => {
    const supported = (m) => m === "audio/webm";
    expect(pickAudioMimeType(supported)).toBe("audio/webm");
  });

  it("returns empty string when nothing is supported", () => {
    expect(pickAudioMimeType(() => false)).toBe("");
  });

  it("treats tiny blobs as empty (Chrome/Windows flush bug)", () => {
    expect(audioBlobLooksEmpty({ size: 0 })).toBe(true);
    expect(audioBlobLooksEmpty({ size: 100 })).toBe(true);
    expect(audioBlobLooksEmpty({ size: 2048 })).toBe(false);
  });
});

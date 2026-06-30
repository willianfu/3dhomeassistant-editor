import { describe, expect, test } from "vitest";
import { getKeyboardNudgeDelta } from "./keyboard-nudge";

describe("getKeyboardNudgeDelta", () => {
  test("maps arrow keys to 1cm horizontal plane movement", () => {
    expect(getKeyboardNudgeDelta({ key: "ArrowLeft", ctrlKey: false })).toEqual({
      x: -0.01,
      y: 0,
      z: 0,
    });
    expect(getKeyboardNudgeDelta({ key: "ArrowRight", ctrlKey: false })).toEqual({
      x: 0.01,
      y: 0,
      z: 0,
    });
    expect(getKeyboardNudgeDelta({ key: "ArrowUp", ctrlKey: false })).toEqual({
      x: 0,
      y: 0,
      z: -0.01,
    });
    expect(getKeyboardNudgeDelta({ key: "ArrowDown", ctrlKey: false })).toEqual({
      x: 0,
      y: 0,
      z: 0.01,
    });
  });

  test("uses ctrl up and down for height movement", () => {
    expect(getKeyboardNudgeDelta({ key: "ArrowUp", ctrlKey: true })).toEqual({
      x: 0,
      y: 0.01,
      z: 0,
    });
    expect(getKeyboardNudgeDelta({ key: "ArrowDown", ctrlKey: true })).toEqual({
      x: 0,
      y: -0.01,
      z: 0,
    });
  });

  test("ignores unsupported ctrl arrow combinations", () => {
    expect(getKeyboardNudgeDelta({ key: "ArrowLeft", ctrlKey: true })).toBeNull();
    expect(getKeyboardNudgeDelta({ key: "ArrowRight", ctrlKey: true })).toBeNull();
  });
});

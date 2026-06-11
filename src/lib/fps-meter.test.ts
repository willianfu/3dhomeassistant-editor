import { describe, expect, it } from "vitest";
import { FpsMeter } from "./fps-meter";

describe("FpsMeter", () => {
  it("reports a rounded fps value every half second", () => {
    const meter = new FpsMeter();

    expect(meter.sample(0)).toBeNull();
    for (let frame = 1; frame < 30; frame += 1) {
      expect(meter.sample(frame * 16.67)).toBeNull();
    }

    expect(meter.sample(500)).toBe(62);
    expect(meter.sample(516.67)).toBeNull();
  });
});

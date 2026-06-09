import { describe, expect, it } from "vitest";
import { addHaBinding, removeHaBinding } from "./ha-bindings";
import type { HaBinding } from "../types/ha";

describe("ha-bindings", () => {
  it("adds bindings without duplicating entity ids", () => {
    const bindings: HaBinding[] = [{ type: "entity", entityId: "light.kitchen" }];

    expect(
      addHaBinding(bindings, { type: "entity", entityId: "light.kitchen" }),
    ).toEqual(bindings);
    expect(addHaBinding(bindings, { type: "entity", entityId: "switch.fan" })).toEqual([
      { type: "entity", entityId: "light.kitchen" },
      { type: "entity", entityId: "switch.fan" },
    ]);
  });

  it("removes entity bindings", () => {
    expect(
      removeHaBinding(
        [
          { type: "entity", entityId: "light.kitchen" },
          { type: "entity", entityId: "switch.fan" },
        ],
        "light.kitchen",
      ),
    ).toEqual([{ type: "entity", entityId: "switch.fan" }]);
  });
});

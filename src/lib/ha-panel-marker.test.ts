import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { resolveHaPanelMarkerPosition } from "./ha-panel-marker";

describe("HA panel marker", () => {
  it("places the marker above the combined object bounds", () => {
    const first = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2));
    first.position.set(-2, 2, 0);
    const second = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    second.position.set(2, 1, 0);
    first.updateMatrixWorld(true);
    second.updateMatrixWorld(true);

    const position = resolveHaPanelMarkerPosition([first, second]);

    expect(position).not.toBeNull();
    expect(position?.x).toBeCloseTo(0);
    expect(position?.y).toBeGreaterThan(4);
    expect(position?.z).toBeCloseTo(0);
  });
});

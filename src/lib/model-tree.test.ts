import { describe, expect, it } from "vitest";
import type { ModelTreeNode } from "../types/editor";
import { flattenVisibleModelTree } from "./model-tree";

function node(
  id: string,
  depth: number,
  children: ModelTreeNode[] = [],
): ModelTreeNode {
  return {
    id,
    objectId: null,
    name: id,
    type: "Object3D",
    depth,
    childCount: children.length,
    children,
  };
}

describe("flattenVisibleModelTree", () => {
  const tree = node("root", 0, [
    node("first", 1, [node("first-child", 2)]),
    node("second", 1, [node("second-child", 2)]),
  ]);

  it("shows only the root node while the tree is collapsed", () => {
    expect(flattenVisibleModelTree(tree, new Set()).map((item) => item.id)).toEqual([
      "root",
    ]);
  });

  it("lazy-flattens children only for expanded nodes", () => {
    expect(
      flattenVisibleModelTree(tree, new Set(["root", "first"])).map(
        (item) => item.id,
      ),
    ).toEqual(["root", "first", "first-child", "second"]);
  });
});

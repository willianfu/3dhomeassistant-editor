import { describe, expect, it } from "vitest";
import { EditorHistory } from "./editor-history";

describe("EditorHistory", () => {
  it("undoes and redoes commands in order", () => {
    const values: string[] = [];
    const history = new EditorHistory();

    history.push({
      label: "first",
      undo: () => values.push("undo-first"),
      redo: () => values.push("redo-first"),
    });
    history.push({
      label: "second",
      undo: () => values.push("undo-second"),
      redo: () => values.push("redo-second"),
    });

    expect(history.getState()).toEqual({
      canUndo: true,
      canRedo: false,
      isDirty: true,
    });
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(true);
    expect(history.redo()).toBe(true);

    expect(values).toEqual(["undo-second", "undo-first", "redo-first"]);
    expect(history.getState()).toEqual({
      canUndo: true,
      canRedo: true,
      isDirty: true,
    });
  });

  it("clears redo commands when a new command is pushed", () => {
    const history = new EditorHistory();

    history.push({ label: "first", undo: () => undefined, redo: () => undefined });
    history.undo();
    history.push({ label: "second", undo: () => undefined, redo: () => undefined });

    expect(history.getState()).toEqual({
      canUndo: true,
      canRedo: false,
      isDirty: true,
    });
    expect(history.redo()).toBe(false);
  });

  it("tracks whether the current history position differs from the saved point", () => {
    const history = new EditorHistory();

    history.markSaved();
    expect(history.getState().isDirty).toBe(false);

    history.push({ label: "move", undo: () => undefined, redo: () => undefined });
    expect(history.getState().isDirty).toBe(true);

    history.markSaved();
    expect(history.getState().isDirty).toBe(false);

    history.undo();
    expect(history.getState().isDirty).toBe(true);

    history.redo();
    expect(history.getState().isDirty).toBe(false);
  });
});

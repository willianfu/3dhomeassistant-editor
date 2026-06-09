export type EditorHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
};

export type EditorHistoryCommand = {
  label: string;
  undo: () => void;
  redo: () => void;
};

export class EditorHistory {
  private undoStack: EditorHistoryCommand[] = [];
  private redoStack: EditorHistoryCommand[] = [];
  private revision = 0;
  private savedRevision = 0;

  push(command: EditorHistoryCommand) {
    this.undoStack.push(command);
    this.redoStack = [];
    this.revision += 1;
  }

  undo() {
    const command = this.undoStack.pop();
    if (!command) {
      return false;
    }
    command.undo();
    this.redoStack.push(command);
    this.revision -= 1;
    return true;
  }

  redo() {
    const command = this.redoStack.pop();
    if (!command) {
      return false;
    }
    command.redo();
    this.undoStack.push(command);
    this.revision += 1;
    return true;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.revision = 0;
    this.savedRevision = 0;
  }

  markSaved() {
    this.savedRevision = this.revision;
  }

  getState(): EditorHistoryState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      isDirty: this.revision !== this.savedRevision,
    };
  }
}

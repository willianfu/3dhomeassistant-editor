# Model Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tabbed model library to the left sidebar, support drag/drop of online models into the scene, and support local `glb/gltf/obj` uploads as additive models.

**Architecture:** Keep the existing part tree intact and add a second tab for the model library inside the same left sidebar surface. Store model-library metadata in a dedicated module so the UI can be data-driven and later swapped for an API. Extend `ThreeEditor` with additive model-loading methods that merge new assets into the current scene instead of replacing the root model.

**Tech Stack:** React 18, TypeScript, Vite, Three.js, Radix Tabs, shadcn/ui, Vitest

---

### Task 1: Add model-library data and local file format helpers

**Files:**
- Create: `src/lib/model-library.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { modelLibraryItems, isSupportedModelFile } from "./model-library";

describe("model-library", () => {
  it("exposes mock library items with url and thumbnail metadata", () => {
    expect(modelLibraryItems.length).toBeGreaterThan(0);
    expect(modelLibraryItems[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      category: expect.any(String),
      format: expect.any(String),
      url: expect.any(String),
      thumbnailUrl: expect.any(String),
    });
  });

  it("accepts glb, gltf, and obj files", () => {
    expect(isSupportedModelFile(new File([""], "chair.glb"))).toBe(true);
    expect(isSupportedModelFile(new File([""], "chair.gltf"))).toBe(true);
    expect(isSupportedModelFile(new File([""], "chair.obj"))).toBe(true);
    expect(isSupportedModelFile(new File([""], "chair.fbx"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/model-library.test.ts`
Expected: fail because the module and helper do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type ModelLibraryItem = {
  id: string;
  name: string;
  category: string;
  format: "glb" | "gltf" | "obj";
  url: string;
  thumbnailUrl: string;
};

export const modelLibraryItems: ModelLibraryItem[] = [
  {
    id: "chair-modern",
    name: "Modern Chair",
    category: "Furniture",
    format: "glb",
    url: "/sample/test.glb",
    thumbnailUrl: "/images/logo.png",
  },
];

export function isSupportedModelFile(file: File) {
  return /\.(glb|gltf|obj)$/i.test(file.name);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/model-library.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/model-library.ts src/lib/model-library.test.ts src/App.tsx
git commit -m "feat: add model library data helpers"
```

### Task 2: Extend ThreeEditor with additive model-loading APIs

**Files:**
- Modify: `src/lib/three-editor.ts`
- Modify: `src/lib/three-editor.test.ts` (create if needed)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ThreeEditor } from "./three-editor";

describe("ThreeEditor additive model loading", () => {
  it("adds a loaded model without clearing the existing scene root", async () => {
    // create editor, mock loader path, call addModelFromUrl, assert root count grows
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/three-editor.test.ts`
Expected: fail because `addModelFromUrl` and `addModelFromFile` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

async addModelFromUrl(url: string, name = "model") {
  // load GLTF or OBJ by extension, create root group if needed,
  // add the new object under the persistent model root, update maps,
  // select the new object, refresh weather and history state.
}

async addModelFromFile(file: File) {
  // detect glb/gltf/obj, load via object URL, then delegate to the same
  // additive insertion path used by addModelFromUrl.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/three-editor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/three-editor.ts src/lib/three-editor.test.ts
git commit -m "feat: support additive model imports"
```

### Task 3: Rebuild the left sidebar as a tabbed parts/model surface

**Files:**
- Modify: `src/components/editor/PartsTree.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ui/tabs.tsx` if styling needs a small tweak

- [ ] **Step 1: Write the failing test**

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartsTree } from "./PartsTree";

describe("PartsTree", () => {
  it("renders parts and model library tabs", () => {
    render(
      <PartsTree
        tree={null}
        selectedIds={[]}
        onSelect={() => undefined}
        onUploadClick={() => undefined}
        onLoadSample={() => undefined}
        modelLibraryItems={[]}
        onAddLibraryModel={() => undefined}
      />,
    );

    expect(screen.getByRole("tab", { name: "零件树" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "模型库" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/editor/PartsTree.test.tsx`
Expected: fail because the tabbed model library UI and props do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
type PartsTreeProps = {
  tree: ModelTreeNode | null;
  selectedIds: string[];
  onSelect: (uuid: string) => void;
  onUploadClick: () => void;
  onLoadSample: () => void;
  modelLibraryItems: ModelLibraryItem[];
  onAddLibraryModel: (item: ModelLibraryItem) => void;
};
```

Implement a `Tabs`-based header with:

- `零件树` tab: existing virtual tree unchanged.
- `模型库` tab: grid/list of mock items with image, format badge, add button, drag start handler, and local upload button.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/editor/PartsTree.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/PartsTree.tsx src/components/editor/PartsTree.test.tsx src/App.tsx
git commit -m "feat: add tabbed model library sidebar"
```

### Task 4: Wire drag/drop and local upload flow through App and Viewport

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/editor/Viewport.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

describe("model drag payload", () => {
  it("serializes a model library item for drag and drop", () => {
    // verify the payload shape used by App/PartsTree
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: fail because the drag payload and drop handlers do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add an internal drag payload helper in `App.tsx` or a small utility module. In `Viewport.tsx`, attach `dragover` and `drop` handlers to the viewport host so the editor can accept model-library items, call `setIsLoading(true)`, then `editor.addModelFromUrl(...)` or `editor.addModelFromFile(...)`, and surface load errors through the existing `error` state.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/editor/Viewport.tsx src/components/editor/PartsTree.tsx
git commit -m "feat: wire model library drag and upload flow"
```

### Task 5: Verify build and runtime behavior

**Files:**
- No code changes expected

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Smoke test in the app**

Run the dev server and verify:

- Sidebar switches between `零件树` and `模型库`.
- Dragging a mock online model into the viewport shows loading state and inserts a new model.
- Clicking `添加本地模型` accepts `glb`, `gltf`, and `obj`.
- Existing root replacement upload flow still works.

- [ ] **Step 4: Commit any final fixes**

```bash
git add .
git commit -m "feat: finish model library workflow"
```

## Spec Coverage Check

- Left sidebar tab switcher: Task 3.
- Mock model library config interface: Task 1.
- Drag online model into design area: Task 3 and Task 4.
- Loading indicator during import: Task 4.
- Additive scene insertion instead of replacement: Task 2.
- Local `glb/gltf/obj` upload: Task 1 and Task 2.
- Verification via tests and build: Task 5.

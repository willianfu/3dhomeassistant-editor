# 3D Smart Home Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable version of a modern web-based 3D smart home model editor.

**Architecture:** Scaffold a Vite React TypeScript app. Keep React responsible for editor UI state and delegate Three.js scene, loaders, selection, transforms, deletion, environment controls, and export to a focused `ThreeEditor` class. Keep pure tree and metadata logic in testable utility modules.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, shadcn-style local components, Three.js, Vitest, Testing Library, lucide-react.

---

## File Structure

- Create `package.json`: scripts and dependencies.
- Create `index.html`, `vite.config.ts`, `tsconfig*.json`: Vite/TypeScript setup.
- Create `tailwind.config.ts`, `postcss.config.js`, `src/index.css`: Tailwind and shadcn-style theme tokens.
- Create `src/main.tsx`: React entrypoint.
- Create `src/App.tsx`: editor layout, top toolbar, side panels, app state wiring.
- Create `src/components/ui/*`: local shadcn-style Button, Input, Tabs, ScrollArea, Separator, Tooltip, Label.
- Create `src/components/editor/TopToolbar.tsx`: upload, preview, export, collapse controls.
- Create `src/components/editor/PartsTree.tsx`: recursive model part tree.
- Create `src/components/editor/RightInspector.tsx`: environment and model info tabs.
- Create `src/components/editor/Viewport.tsx`: Three.js canvas host.
- Create `src/lib/utils.ts`: class name helper.
- Create `src/lib/model-tree.ts`: tree conversion, metadata, transform helpers, delete key guard.
- Create `src/lib/three-editor.ts`: Three.js editor class.
- Create `src/lib/three-dispose.ts`: resource disposal helpers.
- Create `src/types/editor.ts`: shared app/editor types.
- Create `src/lib/model-tree.test.ts`: pure logic tests.
- Create `src/lib/three-dispose.test.ts`: disposal helper tests.

## Task 1: Scaffold Vite React Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Create project configuration**

Create `package.json` with scripts:

```json
{
  "name": "3dhome-editor",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.5.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.5",
    "three": "^0.182.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.10.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/three": "^0.176.0",
    "@vitejs/plugin-react": "^4.5.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Create minimal React entrypoint**

`src/main.tsx` should render `<App />`. `src/App.tsx` should initially render a full-screen placeholder editor shell.

- [ ] **Step 4: Verify scaffold builds**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

## Task 2: Add Tailwind And shadcn-Style UI Foundation

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/index.css`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/scroll-area.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Add Tailwind configuration**

Configure content for `index.html` and `src/**/*.{ts,tsx}`. Use CSS variables for shadcn-compatible colors and set radius to `0.5rem`.

- [ ] **Step 2: Add theme CSS**

`src/index.css` should include Tailwind layers and a modern dark editor theme. Body should be full-screen, no default margin, with a neutral dark background.

- [ ] **Step 3: Add `cn` helper**

`src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Add local UI primitives**

Implement small shadcn-style wrappers for Button, Input, Label, Tabs, ScrollArea, Separator, Tooltip. Keep APIs minimal and only cover what editor components need.

- [ ] **Step 5: Verify styling compiles**

Run: `npm run build`

Expected: Tailwind classes compile and no TypeScript errors.

## Task 3: Define Model Tree And Metadata Logic With Tests

**Files:**
- Create: `src/types/editor.ts`
- Create: `src/lib/model-tree.ts`
- Create: `src/lib/model-tree.test.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Configure Vitest**

Add `test: { environment: "jsdom", globals: true }` to `vite.config.ts`.

- [ ] **Step 2: Write failing tree conversion test**

`src/lib/model-tree.test.ts` should create nested `THREE.Group` and `THREE.Mesh` objects and assert:

- root object becomes a tree node.
- child hierarchy is preserved.
- unnamed objects get a readable fallback label.
- uuid is retained.

Run: `npm test -- src/lib/model-tree.test.ts`

Expected: FAIL because `buildModelTree` does not exist yet.

- [ ] **Step 3: Implement tree conversion**

`src/lib/model-tree.ts` should export:

```ts
export function buildModelTree(root: THREE.Object3D): ModelTreeNode;
export function flattenModelTree(root: ModelTreeNode): ModelTreeNode[];
```

Use `object.name || object.type || "Object"` for labels.

- [ ] **Step 4: Verify tree conversion passes**

Run: `npm test -- src/lib/model-tree.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing metadata test**

Add tests for:

- `getObjectMetadata(object)` returns name, uuid, type, parentName, childCount, meshCount, position, rotation, scale.
- mesh count includes nested meshes.

Expected: FAIL because metadata function does not exist.

- [ ] **Step 6: Implement metadata**

Add:

```ts
export function getObjectMetadata(object: THREE.Object3D): ObjectMetadata;
```

Use fixed numeric precision for displayed transform values, but keep helper return values as numbers.

- [ ] **Step 7: Write failing delete guard test**

Add tests for:

- `shouldHandleDeleteKey` returns false for input, textarea, select, and contenteditable targets.
- returns true for ordinary elements when key is `Delete`.

Expected: FAIL because helper does not exist.

- [ ] **Step 8: Implement delete guard**

Add:

```ts
export function shouldHandleDeleteKey(event: KeyboardEvent): boolean;
```

- [ ] **Step 9: Verify all pure logic tests**

Run: `npm test`

Expected: PASS.

## Task 4: Implement Three.js Editor Core

**Files:**
- Create: `src/lib/three-dispose.ts`
- Create: `src/lib/three-dispose.test.ts`
- Create: `src/lib/three-editor.ts`
- Modify: `src/types/editor.ts`

- [ ] **Step 1: Write failing disposal tests**

Test that `disposeObjectTree(object)` calls dispose on geometries and materials in a subtree. Use real `THREE.BufferGeometry` and `THREE.MeshBasicMaterial`, spy on their dispose methods.

Run: `npm test -- src/lib/three-dispose.test.ts`

Expected: FAIL because helper does not exist.

- [ ] **Step 2: Implement disposal helper**

Export:

```ts
export function disposeMaterial(material: THREE.Material | THREE.Material[]): void;
export function disposeObjectTree(object: THREE.Object3D): void;
```

Dispose textures found on material properties when they are instances of `THREE.Texture`.

- [ ] **Step 3: Implement `ThreeEditor` skeleton**

Create a class with:

```ts
type ThreeEditorOptions = {
  onSelectionChange?: (uuid: string | null) => void;
  onModelChange?: () => void;
  onLoadProgress?: (progress: number) => void;
};

export class ThreeEditor {
  constructor(container: HTMLElement, options?: ThreeEditorOptions);
  init(): void;
  dispose(): void;
  loadModel(file: File): Promise<THREE.Object3D>;
  selectObject(uuid: string | null): void;
  getObject(uuid: string): THREE.Object3D | null;
  deleteSelected(): boolean;
  updatePosition(uuid: string, position: { x: number; y: number; z: number }): void;
  setEnvironment(config: EnvironmentConfig): void;
  setPreviewMode(enabled: boolean): void;
  exportGlb(): Promise<Blob>;
}
```

- [ ] **Step 4: Add renderer setup**

In `init()`, configure renderer based on the reference project:

- `antialias: true`, `alpha: true`.
- `setPixelRatio(Math.min(window.devicePixelRatio, 2))`.
- `shadowMap.enabled = true`.
- `shadowMap.type = THREE.PCFSoftShadowMap`.
- `toneMapping = THREE.ACESFilmicToneMapping`.
- `outputColorSpace = THREE.SRGBColorSpace`.

- [ ] **Step 5: Add scene, camera, controls, lights, grid**

Use `PerspectiveCamera`, `OrbitControls`, ambient light, directional light, and `GridHelper`. Keep the grid visible by default.

- [ ] **Step 6: Add animation loop and resize**

Use `requestAnimationFrame`. Resize from container dimensions and update camera aspect only when size changes.

- [ ] **Step 7: Add GLB/GLTF loader and export**

Use `GLTFLoader`, `DRACOLoader`, and `GLTFExporter` from `three/addons`. Load from `URL.createObjectURL(file)` and revoke URLs after load or failure. Configure Draco decoder path to `/draco/`.

- [ ] **Step 8: Add selection and raycasting**

Use one `pointerdown` listener on the canvas. Raycast against meshes in the loaded model. Resolve selected object to a meaningful parent with a name when possible.

- [ ] **Step 9: Add reversible highlight**

Use `BoxHelper` or a lightweight selection outline group so original materials are not mutated. Update it whenever selection changes.

- [ ] **Step 10: Verify TypeScript build**

Run: `npm run build`

Expected: PASS.

## Task 5: Build Editor Layout And Modern UI

**Files:**
- Create: `src/components/editor/TopToolbar.tsx`
- Create: `src/components/editor/PartsTree.tsx`
- Create: `src/components/editor/RightInspector.tsx`
- Create: `src/components/editor/Viewport.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build top toolbar**

Include app name, upload button, preview toggle, export button, and icon buttons for collapsing left and right panels. Use lucide icons such as `Upload`, `Download`, `Eye`, `PanelLeftClose`, `PanelRightClose`.

- [ ] **Step 2: Build viewport host**

`Viewport` owns a `ref` div, creates `ThreeEditor`, and passes editor instance to `App` through `onReady`.

- [ ] **Step 3: Build parts tree**

Render recursive tree rows with indentation, object type, selected state, and empty upload prompt when no model is loaded.

- [ ] **Step 4: Build inspector tabs**

Environment tab: ambient intensity, directional intensity, exposure, grid toggle. Model Info tab: object metadata, position inputs, delete button.

- [ ] **Step 5: Wire app state**

`App` should hold:

```ts
const [tree, setTree] = useState<ModelTreeNode | null>(null);
const [selectedId, setSelectedId] = useState<string | null>(null);
const [leftCollapsed, setLeftCollapsed] = useState(false);
const [rightCollapsed, setRightCollapsed] = useState(false);
const [previewMode, setPreviewMode] = useState(false);
const [environment, setEnvironment] = useState<EnvironmentConfig>(defaultEnvironment);
```

- [ ] **Step 6: Implement upload flow**

Validate extension, call `editor.loadModel(file)`, build tree from returned root, and select root or first meaningful child.

- [ ] **Step 7: Implement export flow**

Call `editor.exportGlb()`, create an object URL, trigger download, then revoke the URL.

- [ ] **Step 8: Implement delete key flow**

Register a document `keydown` listener. Use `shouldHandleDeleteKey(event)` before calling `editor.deleteSelected()`.

- [ ] **Step 9: Verify build**

Run: `npm run build`

Expected: PASS.

## Task 6: Polish Interaction, Loading, And Error States

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/editor/TopToolbar.tsx`
- Modify: `src/components/editor/PartsTree.tsx`
- Modify: `src/components/editor/RightInspector.tsx`
- Modify: `src/components/editor/Viewport.tsx`

- [ ] **Step 1: Add loading state**

Show a subtle loading overlay in the viewport while model loading is in progress. Disable upload/export buttons appropriately.

- [ ] **Step 2: Add error state**

Show a compact inline error message or toast-like banner for unsupported file type and load failures.

- [ ] **Step 3: Refine preview mode**

Preview should hide side panels and tree selection styling while preserving the top toolbar with an obvious return-to-edit control.

- [ ] **Step 4: Improve responsive behavior**

Ensure the app works at desktop widths and does not let toolbar text overlap. Use fixed panel widths with collapsed states and allow center viewport to fill remaining space.

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: PASS.

## Task 7: Browser Verification With Sample Model

**Files:**
- No source changes unless verification reveals bugs.

- [ ] **Step 1: Start dev server**

Run: `npm run dev -- --host 127.0.0.1 --port 5173`

Expected: Vite serves the app at `http://127.0.0.1:5173/`.

- [ ] **Step 2: Open app in Browser**

Use the in-app Browser to navigate to `http://127.0.0.1:5173/`.

- [ ] **Step 3: Verify initial UI**

Expected:

- top toolbar is visible.
- left tree is empty.
- right inspector is visible.
- 3D viewport grid is visible and nonblank.

- [ ] **Step 4: Verify upload**

Upload a local GLB such as `E:\project\homeassistant\3dhomexy\public\models\test.glb` if available. Expected: model appears and tree is populated.

- [ ] **Step 5: Verify selection**

Click tree node and 3D model. Expected: selection syncs, highlight appears, Model Info updates.

- [ ] **Step 6: Verify position edit**

Change selected position x by a small value. Expected: object moves and metadata updates.

- [ ] **Step 7: Verify delete**

Press `Delete` with focus outside inputs. Expected: selected part is removed and tree updates. Press `Delete` inside a position input. Expected: text editing behavior is preserved.

- [ ] **Step 8: Verify preview and export**

Toggle preview, return to edit, export GLB. Expected: download is triggered and no console errors appear.

- [ ] **Step 9: Stop dev server**

Ensure no long-running dev server is left unmanaged unless the user wants the URL kept open.

## Self-Review

- Spec coverage: upload, tree, 3D viewport, selection, right panel tabs, delete, transform editing, preview, export, modern UI, and rendering optimization are all covered by Tasks 1-7.
- Placeholder scan: no intentional placeholders remain; each task includes concrete files and expected verification.
- Type consistency: shared types are centralized in `src/types/editor.ts`; `ThreeEditor`, `ModelTreeNode`, `ObjectMetadata`, and `EnvironmentConfig` are used consistently across tasks.


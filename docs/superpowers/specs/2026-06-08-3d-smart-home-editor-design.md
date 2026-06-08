# 3D Smart Home Editor Design

## Goal

Build a web-based 3D interactive smart home model editor. The first version focuses on a complete editing loop: upload a GLB/GLTF model, inspect its part hierarchy, select parts from the tree or 3D viewport, edit transforms, delete parts, preview the result, and export a modified GLB.

## Confirmed Scope

- Frontend stack: Vite, React, TypeScript.
- UI library: shadcn/ui with Tailwind CSS.
- 3D engine: Three.js used directly, not React Three Fiber.
- Supported model formats for the first version: `.glb` and `.gltf`.
- Rendering implementation may reference `E:\project\homeassistant\3dhomexy` and `E:\project\homeassistant\3dhomexy\TECHNICAL_IMPLEMENTATION.md`.
- The repository is currently empty, so this will be scaffolded as a new application.

## Product Layout

The app opens directly into edit mode. It should feel like a professional control/editor surface: modern, dense enough for repeated work, low visual noise, and clearly separated tool zones.

- Top toolbar: app title, upload action, preview toggle, export action, left/right panel collapse controls.
- Left panel: model part library shown as a tree. It is empty before a model is uploaded.
- Center canvas: full-height Three.js viewport with grid helper, orbit controls, model rendering, and pointer selection.
- Right panel: configuration tabs. The first version includes Environment and Model Info.
- Collapsible side panels: both left and right panels can be collapsed to maximize viewport space.

## Visual Direction

Use a modern editor aesthetic rather than a landing-page aesthetic.

- Neutral dark workspace around the canvas with clean panel surfaces.
- shadcn/ui components for buttons, tabs, inputs, separators, scroll areas, and tooltips.
- Icon buttons for toolbar actions where icons are recognizable, with concise labels where helpful.
- Avoid decorative hero sections, floating marketing cards, gradient orb backgrounds, and oversized headings.
- Keep panels compact and scannable. Use consistent 8px or smaller radii unless shadcn defaults require otherwise.
- The 3D viewport should be the dominant first-screen signal.

## Core User Flows

### Upload Model

1. User clicks Upload in the toolbar or empty left panel.
2. The app accepts `.glb` or `.gltf`.
3. The viewer loads the model into the scene.
4. The app traverses the loaded scene and builds a part tree from `Object3D` hierarchy.
5. The model is framed in the viewport.

### Select Part

Selection can start from either UI or 3D.

- Clicking a tree node selects the corresponding Three.js object.
- Clicking a 3D object uses Raycaster to find the nearest selectable object, then selects it.
- The selected object is highlighted in the viewport.
- The right panel switches or updates the Model Info tab with object details.

### Edit Part Transform

- Model Info shows object name, type, uuid, child count, mesh count, position, rotation, and scale.
- Position can be edited through numeric inputs in the first version.
- Changes update the Three.js object immediately.

### Delete Part

- Pressing `Delete` removes the selected object from its parent.
- Deleting updates the tree and clears or moves selection.
- Geometry, materials, and textures owned by the removed subtree are disposed where safe.

### Preview

- Preview hides editing helpers such as grid emphasis, selection highlight, and dense editor chrome as appropriate.
- Preview preserves orbit controls so the user can inspect the model.
- Returning to edit mode restores panels and selection affordances.

### Export

- Export serializes the current model scene using `GLTFExporter`.
- The output is downloaded as a `.glb` file.
- Deleted and transformed parts are reflected in the exported asset.

## 3D Architecture

The 3D code should be isolated from React UI components.

- `ThreeEditor`: owns renderer, scene, camera, controls, loaders, raycaster, highlight state, export, and disposal.
- `ModelTreeService`: converts Three.js object hierarchy into UI-friendly tree nodes and computes object metadata.
- React state keeps the selected object id, model tree, panel visibility, preview mode, loading state, and environment config.
- React communicates with `ThreeEditor` through a small imperative API.

## Rendering Strategy

Use the local reference project's rendering techniques, adjusted for an editor.

- Use `WebGLRenderer({ antialias: true, alpha: true })`.
- Limit DPR with `Math.min(window.devicePixelRatio, 2)` for smoother high-DPR performance.
- Use `ACESFilmicToneMapping`, `toneMappingExposure`, and `SRGBColorSpace`.
- Add grid helper and neutral scene background suitable for model inspection.
- Provide ambient and directional lights as baseline environment controls.
- Keep shadow defaults conservative: enable shadows only where needed, default shadow map around `2048`, and avoid forcing every mesh to cast shadows.
- Configure `DRACOLoader` for compressed GLB assets.
- Optionally prepare Meshopt support if the project assets need it later.
- Traverse loaded meshes once for editor metadata, material sanity checks, and shadow defaults.
- Do not mutate imported materials for highlight; selection highlight should be reversible.
- On deletion or model replacement, dispose unused geometry, material, and texture resources.

## Interaction Strategy

- Use one pointer listener on the renderer canvas.
- Convert pointer position to normalized device coordinates and raycast against selectable meshes.
- When a mesh is hit, resolve selection to the nearest meaningful part node. Prefer named parent groups where available; otherwise select the hit mesh.
- Maintain a map of `uuid -> Object3D` for fast tree and panel interactions.
- Listen for `Delete` at the app level and ignore it while focus is inside text or number inputs.

## Environment Panel

The Environment tab includes first-version controls for:

- Ambient light intensity.
- Directional light intensity.
- Directional light position.
- Background/grid visibility toggle.
- Tone mapping exposure.

These controls update the viewer immediately and remain simple enough for the first version.

## Model Info Panel

The Model Info tab shows:

- Empty state when no part is selected.
- Name, object type, uuid, parent name, child count, mesh count.
- Position numeric inputs for x, y, z.
- Read-only rotation and scale fields may be shown in the first version if full editing is not yet implemented.
- Delete selected action as a secondary destructive command.

## Error Handling

- Reject unsupported file types with a clear toast.
- Show loading progress while parsing model files.
- Show a readable error if model loading fails.
- Disable export until a model is loaded.
- Disable model-specific controls when no selection exists.

## Testing And Verification

Automated coverage should focus on pure logic where possible:

- Model tree creation from nested object data.
- Metadata computation for selected objects.
- Transform state conversion and update helpers.
- Delete key guard logic for focused inputs.

Manual/browser verification should cover:

- App loads with empty tree and visible 3D grid.
- Uploading a GLB populates tree and renders model.
- Tree selection highlights viewport object.
- Viewport click updates tree selection and model info.
- Position inputs move the selected part.
- Delete removes the selected part.
- Preview toggles editor chrome.
- Export downloads a GLB.

## Out Of Scope For First Version

- User accounts, cloud storage, and collaboration.
- Full undo/redo command history.
- Material editor.
- Animation authoring.
- Device control simulation beyond model editing.
- Multi-model scene management.
- Physics or collision editing.


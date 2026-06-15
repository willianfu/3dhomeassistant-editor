export type ModelLibraryFormat = "glb" | "gltf" | "obj";

export type ModelLibraryItem = {
  id: string;
  name: string;
  category: string;
  format: ModelLibraryFormat;
  url: string;
  thumbnailUrl: string;
};

export const MODEL_LIBRARY_DRAG_TYPE = "application/x-3dhome-model-library-item";

export const modelLibraryItems: ModelLibraryItem[] = [
  {
    id: "chair-modern",
    name: "Modern Chair",
    category: "Furniture",
    format: "glb",
    url: "/sample/test.glb",
    thumbnailUrl: "/images/logo.png",
  },
  {
    id: "table-compact",
    name: "Compact Table",
    category: "Furniture",
    format: "glb",
    url: "/sample/test.glb",
    thumbnailUrl: "/images/logo.png",
  },
  {
    id: "lamp-round",
    name: "Round Lamp",
    category: "Lighting",
    format: "glb",
    url: "/sample/test.glb",
    thumbnailUrl: "/images/logo.png",
  },
  {
    id: "sensor-mini",
    name: "Mini Sensor",
    category: "Sensors",
    format: "glb",
    url: "/sample/test.glb",
    thumbnailUrl: "/images/logo.png",
  },
  {
    id: "switch-wall",
    name: "Wall Switch",
    category: "Switches",
    format: "glb",
    url: "/sample/test.glb",
    thumbnailUrl: "/images/logo.png",
  },
  {
    id: "socket-smart",
    name: "Smart Socket",
    category: "Switches",
    format: "glb",
    url: "/sample/test.glb",
    thumbnailUrl: "/images/logo.png",
  },
];

export function isSupportedModelFile(file: File) {
  return /\.(glb|gltf|obj)$/i.test(file.name);
}

export function serializeModelLibraryDragItem(item: ModelLibraryItem) {
  return JSON.stringify(item);
}

export function parseModelLibraryDragItem(value: string): ModelLibraryItem | null {
  try {
    const parsed = JSON.parse(value) as Partial<ModelLibraryItem>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.category !== "string" ||
      typeof parsed.url !== "string" ||
      typeof parsed.thumbnailUrl !== "string" ||
      !["glb", "gltf", "obj"].includes(String(parsed.format))
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      category: parsed.category,
      format: parsed.format as ModelLibraryFormat,
      url: parsed.url,
      thumbnailUrl: parsed.thumbnailUrl,
    };
  } catch {
    return null;
  }
}

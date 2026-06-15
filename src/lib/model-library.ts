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
    id: "smart-home-sample",
    name: "智能家居样板",
    category: "整屋",
    format: "glb",
    url: "/sample/smart-home.glb",
    thumbnailUrl: "/images/logo.png",
  },
  {
    id: "device-sample",
    name: "设备模型样板",
    category: "设备",
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

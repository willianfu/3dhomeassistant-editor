export type EnvironmentMapKind = "hdr" | "exr";

export function getEnvironmentMapKind(fileName: string): EnvironmentMapKind | null {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".hdr")) {
    return "hdr";
  }
  if (lowerName.endsWith(".exr")) {
    return "exr";
  }
  return null;
}

export function isSupportedEnvironmentMapFile(file: File) {
  return getEnvironmentMapKind(file.name) !== null;
}

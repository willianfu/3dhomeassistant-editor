declare module "draco3dgltf" {
  const draco3d: {
    createEncoderModule: (options?: {
      locateFile?: (path: string) => string;
    }) => Promise<unknown>;
  };
  export default draco3d;
}

declare module "draco3dgltf/draco_encoder.wasm?url" {
  const url: string;
  export default url;
}

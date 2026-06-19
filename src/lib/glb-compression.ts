import { WebIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { draco } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import dracoEncoderWasmUrl from "draco3dgltf/draco_encoder.wasm?url";

export async function compressGlbWithDraco(glb: ArrayBuffer) {
  const io = new WebIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      "draco3d.encoder": await draco3d.createEncoderModule({
        locateFile: (path) =>
          path.endsWith(".wasm") ? dracoEncoderWasmUrl : path,
      }),
    });
  const document = await io.readBinary(new Uint8Array(glb));
  await document.transform(
    draco({
      method: "edgebreaker",
      encodeSpeed: 5,
      decodeSpeed: 5,
    }),
  );
  return await io.writeBinary(document);
}

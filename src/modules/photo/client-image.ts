export async function prepareImage(file: File, options?: { maxDimension?:number; quality?:number; rotation?:number }) {
  const maxDimension = options?.maxDimension ?? 1600; const quality = options?.quality ?? 0.84; const rotation = ((options?.rotation ?? 0) % 360 + 360) % 360;
  const image = await createImageBitmap(file); const scale = Math.min(1, maxDimension / Math.max(image.width, image.height)); const sourceWidth = Math.round(image.width * scale); const sourceHeight = Math.round(image.height * scale); const swap = rotation === 90 || rotation === 270;
  const canvas = document.createElement("canvas"); canvas.width = swap ? sourceHeight : sourceWidth; canvas.height = swap ? sourceWidth : sourceHeight; const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas tidak tersedia");
  context.translate(canvas.width/2, canvas.height/2); context.rotate((rotation*Math.PI)/180); context.drawImage(image, -sourceWidth/2, -sourceHeight/2, sourceWidth, sourceHeight); image.close();
  const blob = await new Promise<Blob>((resolve,reject)=>{ canvas.toBlob((result)=>result?resolve(result):reject(new Error("Gagal menyiapkan foto")), "image/jpeg", quality); });
  return { blob, width:canvas.width, height:canvas.height, mimeType:"image/jpeg" as const };
}

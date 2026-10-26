export type PortadaCatalogo = { imagen: string; ajuste: "contain" | "cover" };
export function validarPortada(value: unknown): PortadaCatalogo | null {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Portada inválida");
  const p = value as Record<string, unknown>;
  if (p.ajuste !== "contain" && p.ajuste !== "cover") throw new Error("Ajuste de portada inválido");
  if (typeof p.imagen !== "string" || p.imagen.length > 1_200_023 ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.imagen)) throw new Error("La portada debe ser una imagen JPEG optimizada de hasta 900 KB");
  const bytes = Buffer.from(p.imagen.slice(23), "base64");
  if (bytes.length > 900_000 || bytes.length < 10 || bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) throw new Error("Imagen de portada inválida");
  let found = false;
  for (let i = 2; i + 4 < bytes.length;) {
    if (bytes[i] !== 0xff) break;
    while (bytes[i] === 0xff) i++;
    const marker = bytes[i++];
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes.readUInt16BE(i);
    if (length < 2 || i + length > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) {
      const h = bytes.readUInt16BE(i + 3), w = bytes.readUInt16BE(i + 5);
      if (!w || !h || w > 2400 || h > 2400) throw new Error("La portada debe medir como máximo 2400 píxeles por lado");
      found = true; break;
    }
    i += length;
  }
  if (!found) throw new Error("Imagen de portada inválida");
  return { imagen: p.imagen, ajuste: p.ajuste };
}


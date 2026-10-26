/**
 * Mejora de fotos de documentos ("modo escáner"): pasa a escala de grises y estira
 * el contraste para que el papel quede blanco y el texto negro, como un escáner.
 * Trabaja sobre los píxeles RGBA de un canvas, sin dependencias.
 */

export type ScanMode = "documento" | "color";

/** Luminancia percibida (0–255) de un píxel RGB. */
const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Percentil de un histograma de 256 valores. */
function percentile(hist: Uint32Array, total: number, p: number) {
  const target = total * p;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return 255;
}

/**
 * Modifica `pixels` en el lugar. En modo "documento" deja blanco y negro de alto contraste;
 * en modo "color" solo estira niveles conservando los colores (sellos, firmas).
 */
export function enhanceScan(pixels: Uint8ClampedArray, mode: ScanMode = "documento") {
  const total = pixels.length / 4;
  if (total === 0) return pixels;
  const hist = new Uint32Array(256);
  for (let i = 0; i < pixels.length; i += 4) hist[Math.round(luminance(pixels[i], pixels[i + 1], pixels[i + 2]))]++;

  // El 2% más oscuro es tinta y el papel está por encima del percentil 90
  const black = percentile(hist, total, 0.02);
  const white = Math.max(black + 1, percentile(hist, total, mode === "documento" ? 0.9 : 0.98));
  const scale = 255 / (white - black);
  const stretch = (v: number) => Math.min(255, Math.max(0, (v - black) * scale));

  for (let i = 0; i < pixels.length; i += 4) {
    if (mode === "documento") {
      let v = stretch(luminance(pixels[i], pixels[i + 1], pixels[i + 2]));
      // Curva en S suave: aclara el fondo y oscurece el texto
      v = v < 128 ? v * 0.75 : Math.min(255, 128 + (v - 128) * 1.35);
      pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
    } else {
      pixels[i] = stretch(pixels[i]);
      pixels[i + 1] = stretch(pixels[i + 1]);
      pixels[i + 2] = stretch(pixels[i + 2]);
    }
  }
  return pixels;
}

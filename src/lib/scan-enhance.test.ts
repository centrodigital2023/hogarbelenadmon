import { describe, expect, it } from "vitest";
import { enhanceScan } from "./scan-enhance";

/** Imagen de prueba: 90% "papel" gris (180) y 10% "tinta" gris oscuro (90). */
const photo = () => {
  const px = new Uint8ClampedArray(100 * 4);
  for (let i = 0; i < 100; i++) {
    const v = i < 10 ? 90 : 180;
    px.set([v, v + 5, v - 5, 255], i * 4);
  }
  return px;
};

describe("modo escáner", () => {
  it("deja el papel blanco y la tinta negra", () => {
    const px = enhanceScan(photo());
    expect(px[0]).toBeLessThan(10); // tinta
    expect(px[50 * 4]).toBe(255); // papel
    expect(px[50 * 4]).toBe(px[50 * 4 + 1]); // escala de grises
    expect(px[3]).toBe(255); // conserva transparencia
  });

  it("en modo color conserva los tonos", () => {
    const px = enhanceScan(photo(), "color");
    expect(px[50 * 4 + 1]).toBeGreaterThan(px[50 * 4 + 2]);
  });

  it("no falla con imágenes vacías o planas", () => {
    expect(enhanceScan(new Uint8ClampedArray(0))).toHaveLength(0);
    const flat = new Uint8ClampedArray([200, 200, 200, 255, 200, 200, 200, 255]);
    expect(() => enhanceScan(flat)).not.toThrow();
  });
});

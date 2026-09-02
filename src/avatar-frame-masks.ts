/** Derive a portrait opening from a frame alpha raster using its largest enclosed transparent component. */
export interface AvatarFrameAlphaRaster { width: number; height: number; alpha: Uint8Array; }
export interface DerivedAvatarFrameMask { width: number; height: number; mask: Uint8Array; openingPixels: number; }

export function deriveAvatarFrameMask(raster: AvatarFrameAlphaRaster, threshold = 16, erosion = 1): DerivedAvatarFrameMask {
  const { width, height, alpha } = raster;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || alpha.length !== width * height) throw new Error("AVATAR_FRAME_ALPHA_RASTER_INVALID");
  const transparent = new Uint8Array(alpha.length);
  for (let index = 0; index < alpha.length; index++) transparent[index] = alpha[index] < threshold ? 1 : 0;
  const outside = boundaryComponent(transparent, width, height);
  const enclosed = new Uint8Array(alpha.length);
  for (let index = 0; index < alpha.length; index++) enclosed[index] = transparent[index] && !outside[index] ? 1 : 0;
  const opening = largestComponent(enclosed, width, height);
  return { width, height, mask: erode(opening, width, height, Math.max(0, Math.floor(erosion))), openingPixels: count(opening) };
}

function count(values: Uint8Array): number { let total = 0; for (const value of values) total += value; return total; }
function boundaryComponent(binary: Uint8Array, width: number, height: number): Uint8Array {
  const starts: number[] = [];
  for (let x = 0; x < width; x++) starts.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y++) starts.push(y * width, y * width + width - 1);
  return visit(binary, new Uint8Array(binary.length), starts, width, height);
}
function largestComponent(binary: Uint8Array, width: number, height: number): Uint8Array {
  const visited = new Uint8Array(binary.length); let best = new Uint8Array(binary.length); let bestSize = 0;
  for (let start = 0; start < binary.length; start++) {
    if (!binary[start] || visited[start]) continue;
    const component = visit(binary, visited, [start], width, height); const size = count(component);
    if (size > bestSize) { best.set(component); bestSize = size; }
  }
  return best;
}
function visit(binary: Uint8Array, visited: Uint8Array, starts: number[], width: number, height: number): Uint8Array {
  const component = new Uint8Array(binary.length); const queue = starts.slice();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor]; if (!binary[index] || visited[index]) continue;
    visited[index] = 1; component[index] = 1; const x = index % width; const y = Math.floor(index / width);
    if (x > 0) queue.push(index - 1); if (x < width - 1) queue.push(index + 1);
    if (y > 0) queue.push(index - width); if (y < height - 1) queue.push(index + width);
  }
  return component;
}
function erode(component: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const mask = new Uint8Array(component.length);
  for (let index = 0; index < component.length; index++) {
    if (!component[index]) continue;
    const x = index % width; const y = Math.floor(index / width); let keep = true;
    for (let dy = -radius; dy <= radius && keep; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height || !component[ny * width + nx]) { keep = false; break; }
    }
    if (keep) mask[index] = 255;
  }
  return mask;
}

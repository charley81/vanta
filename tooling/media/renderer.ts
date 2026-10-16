import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import sharp from "sharp";

import {
  materialColor,
  readAccessor,
  scenePrimitives,
  transformDirection,
  transformPoint,
  type ParsedGlb,
  type Vec3,
} from "./glb";

export type CameraSpecification = {
  position: Vec3;
  target: Vec3;
  verticalFovDegrees: number;
};

export type LightSpecification = {
  background: [number, number, number];
  ambient: number;
  key: { position: Vec3; intensity: number };
  fill: { position: Vec3; intensity: number };
};

type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
  world: Vec3;
};

type TextureData = {
  width: number;
  height: number;
  pixels: Buffer;
};

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return length === 0
    ? [0, 0, 0]
    : [vector[0] / length, vector[1] / length, vector[2] / length];
}

function edge(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): number {
  return (px - ax) * (by - ay) - (py - ay) * (bx - ax);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

async function loadTextures(glb: ParsedGlb): Promise<Array<TextureData | undefined>> {
  const images: Array<TextureData | undefined> = [];
  for (const image of glb.json.images ?? []) {
    if (image.bufferView === undefined) {
      images.push(undefined);
      continue;
    }
    const view = glb.json.bufferViews[image.bufferView];
    const start = view.byteOffset ?? 0;
    const encoded = glb.binary.subarray(start, start + view.byteLength);
    const { data, info } = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    images.push({ width: info.width, height: info.height, pixels: data });
  }
  return (glb.json.textures ?? []).map((texture) =>
    texture.source === undefined ? undefined : images[texture.source],
  );
}

function sampleTexture(texture: TextureData | undefined, uv: number[]): [number, number, number, number] {
  if (!texture) return [1, 1, 1, 1];
  const wrappedU = ((uv[0] % 1) + 1) % 1;
  const wrappedV = ((uv[1] % 1) + 1) % 1;
  const x = wrappedU * (texture.width - 1);
  const y = wrappedV * (texture.height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(texture.width - 1, x0 + 1);
  const y1 = Math.min(texture.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const sample = (sx: number, sy: number, channel: number) =>
    texture.pixels[(sy * texture.width + sx) * 4 + channel] / 255;
  return [0, 1, 2, 3].map((channel) => {
    const top = sample(x0, y0, channel) * (1 - tx) + sample(x1, y0, channel) * tx;
    const bottom = sample(x0, y1, channel) * (1 - tx) + sample(x1, y1, channel) * tx;
    return top * (1 - ty) + bottom * ty;
  }) as [number, number, number, number];
}

function shadePixel({
  world,
  normal: rawNormal,
  camera,
  light,
  base,
  metallic,
  roughness,
  emissive,
}: {
  world: Vec3;
  normal: Vec3;
  camera: CameraSpecification;
  light: LightSpecification;
  base: Vec3;
  metallic: number;
  roughness: number;
  emissive: Vec3;
}): [number, number, number] {
  let normal = normalize(rawNormal);
  const view = normalize(subtract(camera.position, world));
  if (dot(normal, view) < 0) normal = [-normal[0], -normal[1], -normal[2]];
  const keyDirection = normalize(subtract(light.key.position, world));
  const fillDirection = normalize(subtract(light.fill.position, world));
  const key = Math.max(0, dot(normal, keyDirection));
  const fill = Math.max(0, dot(normal, fillDirection));
  const halfVector = normalize([
    keyDirection[0] + view[0],
    keyDirection[1] + view[1],
    keyDirection[2] + view[2],
  ]);
  const exponent = 4 + Math.pow(1 - roughness, 2) * 120;
  const highlight = Math.pow(Math.max(0, dot(normal, halfVector)), exponent) * light.key.intensity;
  const rim = Math.pow(1 - Math.max(0, dot(normal, view)), 3);
  const diffuseLight = light.ambient + key * light.key.intensity + fill * light.fill.intensity;

  return [0, 1, 2].map((channel) => {
    const diffuse = base[channel] * diffuseLight * (1 - metallic * 0.72);
    const specularColor = 0.04 * (1 - metallic) + base[channel] * metallic;
    const linear = diffuse + specularColor * highlight * 2.4 + rim * specularColor * 0.35 + emissive[channel] * 2;
    const toneMapped = linear / (1 + linear);
    return clampByte(Math.pow(Math.max(0, toneMapped), 1 / 2.2) * 255);
  }) as [number, number, number];
}

export async function renderGlbToPng({
  glb,
  camera,
  light,
  width,
  height,
  outputPath,
}: {
  glb: ParsedGlb;
  camera: CameraSpecification;
  light: LightSpecification;
  width: number;
  height: number;
  outputPath: string;
}): Promise<void> {
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = light.background[0];
    pixels[index * 4 + 1] = light.background[1];
    pixels[index * 4 + 2] = light.background[2];
    pixels[index * 4 + 3] = 255;
  }
  const depths = new Float32Array(width * height);
  depths.fill(Number.POSITIVE_INFINITY);
  const textures = await loadTextures(glb);

  const forward = normalize(subtract(camera.target, camera.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = normalize(cross(right, forward));
  const focal = 1 / Math.tan((camera.verticalFovDegrees * Math.PI) / 360);
  const aspect = width / height;
  const accessorCache = new Map<number, number[][]>();
  const accessor = (index: number) => {
    const cached = accessorCache.get(index);
    if (cached) return cached;
    const values = readAccessor(glb, index);
    accessorCache.set(index, values);
    return values;
  };

  const project = (world: Vec3): ProjectedPoint => {
    const relative = subtract(world, camera.position);
    const depth = dot(relative, forward);
    return {
      x: (dot(relative, right) * focal / aspect / depth * 0.5 + 0.5) * width,
      y: (0.5 - dot(relative, up) * focal / depth * 0.5) * height,
      depth,
      world,
    };
  };

  for (const { primitive, worldMatrix } of scenePrimitives(glb)) {
    if ((primitive.mode ?? 4) !== 4) continue;
    const positions = accessor(primitive.attributes.POSITION);
    const normals = primitive.attributes.NORMAL === undefined
      ? undefined
      : accessor(primitive.attributes.NORMAL);
    const textureCoordinates = primitive.attributes.TEXCOORD_0 === undefined
      ? undefined
      : accessor(primitive.attributes.TEXCOORD_0);
    const indices = primitive.indices === undefined
      ? positions.map((_, index) => [index])
      : accessor(primitive.indices);
    const material = materialColor(glb.json.materials?.[primitive.material ?? 0]);
    if (material.alpha < 0.5) continue;

    const worldPositions = positions.map((position) => transformPoint(worldMatrix, position as Vec3));
    const worldNormals = normals?.map((normal) => normalize(transformDirection(worldMatrix, normal as Vec3)));
    const projected = worldPositions.map(project);
    for (let triangle = 0; triangle + 2 < indices.length; triangle += 3) {
      const indexA = indices[triangle][0];
      const indexB = indices[triangle + 1][0];
      const indexC = indices[triangle + 2][0];
      const a = projected[indexA];
      const b = projected[indexB];
      const c = projected[indexC];
      if (!a || !b || !c || a.depth <= 0.01 || b.depth <= 0.01 || c.depth <= 0.01) continue;
      if (![a.x, a.y, b.x, b.y, c.x, c.y].every(Number.isFinite)) continue;

      const area = edge(a.x, a.y, b.x, b.y, c.x, c.y);
      if (Math.abs(area) < 0.01) continue;
      const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
      const maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
      const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
      const maxY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
      if (minX > maxX || minY > maxY) continue;

      const faceNormal = normalize(cross(subtract(b.world, a.world), subtract(c.world, a.world)));
      const normalA = worldNormals?.[indexA] ?? faceNormal;
      const normalB = worldNormals?.[indexB] ?? faceNormal;
      const normalC = worldNormals?.[indexC] ?? faceNormal;
      const uvA = textureCoordinates?.[indexA] ?? [0, 0];
      const uvB = textureCoordinates?.[indexB] ?? [0, 0];
      const uvC = textureCoordinates?.[indexC] ?? [0, 0];

      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const sampleX = x + 0.5;
          const sampleY = y + 0.5;
          const w0 = edge(b.x, b.y, c.x, c.y, sampleX, sampleY) / area;
          const w1 = edge(c.x, c.y, a.x, a.y, sampleX, sampleY) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < -0.00001 || w1 < -0.00001 || w2 < -0.00001) continue;
          const depth = w0 * a.depth + w1 * b.depth + w2 * c.depth;
          const pixelIndex = y * width + x;
          if (depth >= depths[pixelIndex]) continue;

          const uv = [
            w0 * uvA[0] + w1 * uvB[0] + w2 * uvC[0],
            w0 * uvA[1] + w1 * uvB[1] + w2 * uvC[1],
          ];
          const baseSample = sampleTexture(textures[material.baseTexture ?? -1], uv);
          if (material.alpha * baseSample[3] < 0.5) continue;
          const roughnessSample = sampleTexture(textures[material.metallicRoughnessTexture ?? -1], uv);
          const emissiveSample = sampleTexture(textures[material.emissiveTexture ?? -1], uv);
          const color = shadePixel({
            world: [
              w0 * a.world[0] + w1 * b.world[0] + w2 * c.world[0],
              w0 * a.world[1] + w1 * b.world[1] + w2 * c.world[1],
              w0 * a.world[2] + w1 * b.world[2] + w2 * c.world[2],
            ],
            normal: [
              w0 * normalA[0] + w1 * normalB[0] + w2 * normalC[0],
              w0 * normalA[1] + w1 * normalB[1] + w2 * normalC[1],
              w0 * normalA[2] + w1 * normalB[2] + w2 * normalC[2],
            ],
            camera,
            light,
            base: [
              material.base[0] * Math.pow(baseSample[0], 2.2),
              material.base[1] * Math.pow(baseSample[1], 2.2),
              material.base[2] * Math.pow(baseSample[2], 2.2),
            ],
            metallic: material.metallic * roughnessSample[2],
            roughness: material.roughness * roughnessSample[1],
            emissive: [
              material.emissive[0] * Math.pow(emissiveSample[0], 2.2),
              material.emissive[1] * Math.pow(emissiveSample[1], 2.2),
              material.emissive[2] * Math.pow(emissiveSample[2], 2.2),
            ],
          });
          depths[pixelIndex] = depth;
          const offset = pixelIndex * 4;
          pixels[offset] = color[0];
          pixels[offset + 1] = color[1];
          pixels[offset + 2] = color[2];
        }
      }
    }
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  await sharp(pixels, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toFile(outputPath);
}

export async function encodeResponsiveVariant({
  sourcePath,
  outputPath,
  width,
  format,
  quality,
}: {
  sourcePath: string;
  outputPath: string;
  width: number;
  format: "avif" | "webp";
  quality: number;
}): Promise<void> {
  mkdirSync(dirname(outputPath), { recursive: true });
  const image = sharp(sourcePath).resize({ width, withoutEnlargement: true });
  if (format === "avif") {
    await image.avif({ quality, effort: 6, chromaSubsampling: "4:4:4" }).toFile(outputPath);
  } else {
    await image.webp({ quality, effort: 6, smartSubsample: true }).toFile(outputPath);
  }
}

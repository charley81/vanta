import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export type Vec3 = [number, number, number];
export type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

type GltfAccessor = {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  normalized?: boolean;
  type: string;
};

type GltfBufferView = {
  buffer: number;
  byteLength: number;
  byteOffset?: number;
  byteStride?: number;
};

type GltfNode = {
  name?: string;
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: Vec3;
  rotation?: [number, number, number, number];
  scale?: Vec3;
};

type GltfPrimitive = {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
  mode?: number;
};

type GltfMaterial = {
  name?: string;
  pbrMetallicRoughness?: {
    baseColorFactor?: [number, number, number, number];
    baseColorTexture?: { index: number };
    metallicRoughnessTexture?: { index: number };
    metallicFactor?: number;
    roughnessFactor?: number;
  };
  emissiveFactor?: Vec3;
  emissiveTexture?: { index: number };
  alphaMode?: string;
};

export type GltfJson = {
  accessors: GltfAccessor[];
  asset: { version: string; generator?: string };
  bufferViews: GltfBufferView[];
  images?: Array<{
    bufferView?: number;
    mimeType?: string;
    name?: string;
    uri?: string;
  }>;
  materials?: GltfMaterial[];
  meshes: Array<{ name?: string; primitives: GltfPrimitive[] }>;
  nodes: GltfNode[];
  scene?: number;
  scenes: Array<{ nodes?: number[]; name?: string }>;
  textures?: Array<{ source?: number }>;
  extensionsUsed?: string[];
  extensionsRequired?: string[];
};

export type ParsedGlb = {
  bytes: Buffer;
  json: GltfJson;
  binary: Buffer;
  binaryOffset: number;
};

export type ScenePrimitive = {
  nodeIndex: number;
  nodeName: string;
  worldMatrix: Mat4;
  primitive: GltfPrimitive;
};

export type SceneStats = {
  namedNodes: number;
  triangles: number;
  drawCalls: number;
  materials: number;
  images: number;
  textures: number;
  bounds: { min: Vec3; max: Vec3 };
  geometryBytes: number;
};

const identity: Mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

const componentSizes: Record<number, number> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};

const typeSizes: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseGlb(path: string): ParsedGlb {
  const bytes = readFileSync(path);
  if (bytes.length < 20 || bytes.toString("ascii", 0, 4) !== "glTF") {
    throw new Error(`${path} is not a GLB file`);
  }
  if (bytes.readUInt32LE(4) !== 2) {
    throw new Error(`${path} must use GLB version 2`);
  }
  if (bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`${path} declares an invalid byte length`);
  }

  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.toString("ascii", 16, 20) !== "JSON") {
    throw new Error(`${path} has no leading JSON chunk`);
  }
  const json = JSON.parse(
    bytes.toString("utf8", 20, 20 + jsonLength).replace(/\u0000|\s+$/g, ""),
  ) as GltfJson;
  const binaryHeader = 20 + jsonLength;
  const binaryLength = bytes.readUInt32LE(binaryHeader);
  if (bytes.toString("ascii", binaryHeader + 4, binaryHeader + 8) !== "BIN\0") {
    throw new Error(`${path} has no binary chunk`);
  }
  const binaryOffset = binaryHeader + 8;
  return {
    bytes,
    json,
    binary: bytes.subarray(binaryOffset, binaryOffset + binaryLength),
    binaryOffset,
  };
}

export function multiplyMatrices(a: Mat4, b: Mat4): Mat4 {
  const output = new Array<number>(16).fill(0) as Mat4;
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) {
        output[column * 4 + row] +=
          a[index * 4 + row] * b[column * 4 + index];
      }
    }
  }
  return output;
}

function nodeMatrix(node: GltfNode): Mat4 {
  if (node.matrix) return [...node.matrix] as Mat4;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];

  return [
    (1 - 2 * (y * y + z * z)) * sx,
    (2 * (x * y + z * w)) * sx,
    (2 * (x * z - y * w)) * sx,
    0,
    (2 * (x * y - z * w)) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    (2 * (y * z + x * w)) * sy,
    0,
    (2 * (x * z + y * w)) * sz,
    (2 * (y * z - x * w)) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

export function transformPoint(matrix: Mat4, point: Vec3): Vec3 {
  return [
    matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
    matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
    matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14],
  ];
}

export function transformDirection(matrix: Mat4, direction: Vec3): Vec3 {
  return [
    matrix[0] * direction[0] + matrix[4] * direction[1] + matrix[8] * direction[2],
    matrix[1] * direction[0] + matrix[5] * direction[1] + matrix[9] * direction[2],
    matrix[2] * direction[0] + matrix[6] * direction[1] + matrix[10] * direction[2],
  ];
}

export function scenePrimitives(glb: ParsedGlb): ScenePrimitive[] {
  const output: ScenePrimitive[] = [];
  const scene = glb.json.scenes[glb.json.scene ?? 0];
  if (!scene) throw new Error("GLB has no default scene");

  function visit(nodeIndex: number, parentMatrix: Mat4): void {
    const node = glb.json.nodes[nodeIndex];
    if (!node) throw new Error(`GLB references missing node ${nodeIndex}`);
    const worldMatrix = multiplyMatrices(parentMatrix, nodeMatrix(node));
    if (node.mesh !== undefined) {
      const mesh = glb.json.meshes[node.mesh];
      if (!mesh) throw new Error(`Node ${nodeIndex} references missing mesh`);
      mesh.primitives.forEach((primitive) => {
        output.push({
          nodeIndex,
          nodeName: node.name ?? `node-${nodeIndex}`,
          primitive,
          worldMatrix,
        });
      });
    }
    node.children?.forEach((child) => visit(child, worldMatrix));
  }

  scene.nodes?.forEach((nodeIndex) => visit(nodeIndex, identity));
  return output;
}

function readComponent(
  buffer: Buffer,
  offset: number,
  componentType: number,
  normalized: boolean,
): number {
  switch (componentType) {
    case 5120: {
      const value = buffer.readInt8(offset);
      return normalized ? Math.max(value / 127, -1) : value;
    }
    case 5121: {
      const value = buffer.readUInt8(offset);
      return normalized ? value / 255 : value;
    }
    case 5122: {
      const value = buffer.readInt16LE(offset);
      return normalized ? Math.max(value / 32767, -1) : value;
    }
    case 5123: {
      const value = buffer.readUInt16LE(offset);
      return normalized ? value / 65535 : value;
    }
    case 5125:
      return buffer.readUInt32LE(offset);
    case 5126:
      return buffer.readFloatLE(offset);
    default:
      throw new Error(`Unsupported accessor component type ${componentType}`);
  }
}

export function readAccessor(glb: ParsedGlb, accessorIndex: number): number[][] {
  const accessor = glb.json.accessors[accessorIndex];
  if (!accessor || accessor.bufferView === undefined) {
    throw new Error(`Accessor ${accessorIndex} has no supported buffer view`);
  }
  const view = glb.json.bufferViews[accessor.bufferView];
  if (!view || view.buffer !== 0) {
    throw new Error(`Accessor ${accessorIndex} has no supported GLB buffer`);
  }
  const componentSize = componentSizes[accessor.componentType];
  const components = typeSizes[accessor.type];
  if (!componentSize || !components) {
    throw new Error(`Accessor ${accessorIndex} uses an unsupported type`);
  }
  const elementSize = componentSize * components;
  const stride = view.byteStride ?? elementSize;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const output: number[][] = [];
  for (let item = 0; item < accessor.count; item += 1) {
    const values: number[] = [];
    for (let component = 0; component < components; component += 1) {
      values.push(
        readComponent(
          glb.binary,
          start + item * stride + component * componentSize,
          accessor.componentType,
          accessor.normalized ?? false,
        ),
      );
    }
    output.push(values);
  }
  return output;
}

export function parentMap(json: GltfJson): Map<number, number> {
  const parents = new Map<number, number>();
  json.nodes.forEach((node, parent) => {
    node.children?.forEach((child) => parents.set(child, parent));
  });
  return parents;
}

export function hasNamedAncestor(
  json: GltfJson,
  nodeName: string,
  ancestorName: string,
): boolean {
  const nodeIndex = json.nodes.findIndex((node) => node.name === nodeName);
  if (nodeIndex === -1) return false;
  const parents = parentMap(json);
  let current = parents.get(nodeIndex);
  while (current !== undefined) {
    if (json.nodes[current]?.name === ancestorName) return true;
    current = parents.get(current);
  }
  return false;
}

export function calculateSceneStats(glb: ParsedGlb): SceneStats {
  const primitives = scenePrimitives(glb);
  const bounds = {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY] as Vec3,
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY] as Vec3,
  };
  let triangles = 0;
  const geometryViews = new Set<number>();

  primitives.forEach(({ primitive, worldMatrix }) => {
    if ((primitive.mode ?? 4) !== 4) return;
    const positions = readAccessor(glb, primitive.attributes.POSITION);
    const indices = primitive.indices === undefined
      ? positions.map((_, index) => [index])
      : readAccessor(glb, primitive.indices);
    triangles += Math.floor(indices.length / 3);
    positions.forEach((position) => {
      const point = transformPoint(worldMatrix, position as Vec3);
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
      }
    });
    Object.values(primitive.attributes).forEach((accessorIndex) => {
      const view = glb.json.accessors[accessorIndex]?.bufferView;
      if (view !== undefined) geometryViews.add(view);
    });
    if (primitive.indices !== undefined) {
      const view = glb.json.accessors[primitive.indices]?.bufferView;
      if (view !== undefined) geometryViews.add(view);
    }
  });

  return {
    namedNodes: glb.json.nodes.filter((node) => Boolean(node.name)).length,
    triangles,
    drawCalls: primitives.length,
    materials: glb.json.materials?.length ?? 0,
    images: glb.json.images?.length ?? 0,
    textures: glb.json.textures?.length ?? 0,
    bounds,
    geometryBytes: [...geometryViews].reduce(
      (total, viewIndex) => total + (glb.json.bufferViews[viewIndex]?.byteLength ?? 0),
      0,
    ),
  };
}

export function materialColor(
  material: GltfMaterial | undefined,
): {
  base: Vec3;
  baseTexture?: number;
  metallicRoughnessTexture?: number;
  metallic: number;
  roughness: number;
  emissive: Vec3;
  emissiveTexture?: number;
  alpha: number;
} {
  const factor = material?.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1];
  return {
    base: [factor[0], factor[1], factor[2]],
    baseTexture: material?.pbrMetallicRoughness?.baseColorTexture?.index,
    metallicRoughnessTexture: material?.pbrMetallicRoughness?.metallicRoughnessTexture?.index,
    metallic: material?.pbrMetallicRoughness?.metallicFactor ?? 1,
    roughness: material?.pbrMetallicRoughness?.roughnessFactor ?? 1,
    emissive: material?.emissiveFactor ?? [0, 0, 0],
    emissiveTexture: material?.emissiveTexture?.index,
    alpha: factor[3],
  };
}

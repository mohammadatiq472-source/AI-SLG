import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

type NavalMovingBody = {
  slotId?: string;
  assetStatus?: string;
  directionCount?: number;
  framesPerDirection?: number;
  requiredFrameCount?: number;
  directions?: string[];
  targetRoot?: string;
  frameNamingPattern?: string;
  spriteSheetTargetPath?: string;
  frameSizePx?: { width?: number; height?: number };
  sourceMode?: string;
  sourceSheetPath?: string;
};

type NavalManifest = {
  schemaVersion?: string;
  status?: string;
  movingBodyFramePolicy?: {
    directionCount?: number;
    framesPerDirection?: number;
    requiredFrameCountPerBody?: number;
    directions?: string[];
    targetNamespace?: string;
    connectionStatus?: string;
  };
  requiredMovingBodies?: NavalMovingBody[];
};

const repoRoot = process.cwd();
const godotRoot = path.join(repoRoot, 'godot-client');
const manifestPath = path.join(godotRoot, 'data/ui/sea_overseas_naval_unit_frames_manifest_v1.json');

const readJson = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;

const resPathToFilePath = (resPath: string): string => {
  assert.ok(resPath.startsWith('res://'), `expected Godot res:// path, got ${resPath}`);
  return path.join(godotRoot, resPath.slice('res://'.length));
};

type DecodedPng = { width: number; height: number; pixels: Uint8Array };

const decodePng = (filePath: string): DecodedPng => {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${filePath} must be a PNG file`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  assert.equal(bitDepth, 8, `${filePath} must use 8-bit PNG channels`);
  assert.ok(colorType === 6 || colorType === 2, `${filePath} must be RGBA or RGB PNG`);

  const idatChunks: Buffer[] = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    }
    if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const pixels = new Uint8Array(width * height * 4);
  let inputOffset = 0;
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const raw = inflated.subarray(inputOffset, inputOffset + stride);
    inputOffset += stride;
    const row = new Uint8Array(stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x] ?? 0;
      const upLeft = x >= channels ? previous[x - channels] : 0;
      const paethPredictor = (() => {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        if (pa <= pb && pa <= pc) return left;
        if (pb <= pc) return up;
        return upLeft;
      })();
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paethPredictor;
      row[x] = (raw[x] + predictor) & 0xff;
    }
    for (let x = 0; x < width; x += 1) {
      const src = x * channels;
      const dst = (y * width + x) * 4;
      pixels[dst] = row[src];
      pixels[dst + 1] = row[src + 1];
      pixels[dst + 2] = row[src + 2];
      pixels[dst + 3] = colorType === 6 ? row[src + 3] : 255;
    }
    previous = row;
  }
  return { width, height, pixels };
};

const pngDimensions = (filePath: string): { width: number; height: number } => {
  const decoded = decodePng(filePath);
  return { width: decoded.width, height: decoded.height };
};

const pngAlphaStats = (filePath: string): { transparentCorners: number; opaquePixels: number; alphaBBoxArea: number; alphaBBoxWidth: number; alphaBBoxHeight: number } => {
  const decoded = decodePng(filePath);
  const corners = [
    [0, 0],
    [decoded.width - 1, 0],
    [0, decoded.height - 1],
    [decoded.width - 1, decoded.height - 1],
  ] as const;
  const transparentCorners = corners.filter(([x, y]) => decoded.pixels[(y * decoded.width + x) * 4 + 3] < 10).length;
  let opaquePixels = 0;
  let minX = decoded.width;
  let minY = decoded.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < decoded.height; y += 1) {
    for (let x = 0; x < decoded.width; x += 1) {
      const alpha = decoded.pixels[(y * decoded.width + x) * 4 + 3];
      if (alpha > 180) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  for (let index = 3; index < decoded.pixels.length; index += 4) {
    if (decoded.pixels[index] > 180) {
      opaquePixels += 1;
    }
  }
  const alphaBBoxWidth = maxX >= minX ? maxX - minX + 1 : 0;
  const alphaBBoxHeight = maxY >= minY ? maxY - minY + 1 : 0;
  return { transparentCorners, opaquePixels, alphaBBoxArea: alphaBBoxWidth * alphaBBoxHeight, alphaBBoxWidth, alphaBBoxHeight };
};

const expectedSlots = [
  'naval_light_patrol_warship_v1',
  'naval_interceptor_warship_v1',
  'naval_transport_warship_v1',
] as const;

const expectedDirections = ['r', 'rd', 'd', 'ld', 'l', 'lu', 'u', 'ru'];
const readyStatuses = new Set(['ready', 'pending_runtime_adapter']);

const manifest = readJson<NavalManifest>(manifestPath);

assert.equal(manifest.schemaVersion, 'sea_overseas_naval_unit_frames_manifest_v1');
assert.equal(manifest.movingBodyFramePolicy?.directionCount, 8);
assert.equal(manifest.movingBodyFramePolicy?.framesPerDirection, 10);
assert.equal(manifest.movingBodyFramePolicy?.requiredFrameCountPerBody, 80);
assert.deepEqual(
  manifest.movingBodyFramePolicy?.directions,
  expectedDirections,
  'naval moving-body direction order must stay aligned with the W13 8-direction frame batch.',
);
assert.equal(
  manifest.movingBodyFramePolicy?.connectionStatus,
  'brief_only_not_connected_to_runtime_unit_marker',
  'W13 asset production must not connect naval frames to runtime UnitMarker.',
);

const movingBodies = manifest.requiredMovingBodies ?? [];
const bodiesBySlot = new Map(movingBodies.map((body) => [String(body.slotId), body]));
const visualStatsBySlot = new Map<string, { averageBBoxArea: number; averageBBoxMaxExtent: number }>();

for (const slotId of expectedSlots) {
  const body = bodiesBySlot.get(slotId);
  assert.ok(body, `missing naval moving body manifest entry: ${slotId}`);
  assert.ok(readyStatuses.has(String(body.assetStatus)), `${slotId} must be ready only after a real 80-frame batch exists`);
  assert.equal(body.directionCount, 8, `${slotId} directionCount`);
  assert.equal(body.framesPerDirection, 10, `${slotId} framesPerDirection`);
  assert.equal(body.requiredFrameCount, 80, `${slotId} requiredFrameCount`);
  assert.deepEqual(body.directions, expectedDirections, `${slotId} directions`);
  assert.ok(body.targetRoot?.startsWith('res://assets/themes/slgclient/current/units/naval/'), `${slotId} targetRoot`);
  assert.ok(body.spriteSheetTargetPath?.startsWith('res://assets/themes/slgclient/current/units/naval/'), `${slotId} spriteSheetTargetPath`);
  assert.equal(body.sourceMode, 'built_in_imagegen_source_sheet_local_background_removal', `${slotId} sourceMode`);
  assert.ok(body.sourceSheetPath?.startsWith('res://assets/themes/slgclient/current/units/naval/source_sheets/'), `${slotId} sourceSheetPath`);
  assert.ok(fs.existsSync(resPathToFilePath(String(body.sourceSheetPath))), `${slotId} source sheet must exist`);

  const frameRoot = resPathToFilePath(String(body.targetRoot));
  assert.ok(fs.existsSync(frameRoot), `${slotId} frame root must exist: ${frameRoot}`);

  const expectedWidth = Number(body.frameSizePx?.width ?? 0);
  const expectedHeight = Number(body.frameSizePx?.height ?? 0);
  assert.ok(expectedWidth > 0 && expectedHeight > 0, `${slotId} must declare frameSizePx`);

  let frameCount = 0;
  let alphaBBoxAreaTotal = 0;
  let alphaBBoxMaxExtentTotal = 0;
  for (const direction of expectedDirections) {
    const frameHashesForDirection = new Set<string>();
    for (let index = 0; index < 10; index += 1) {
      const expectedName = String(body.frameNamingPattern)
        .replace('{direction}', direction)
        .replace('{frameIndex}', String(index).padStart(2, '0'));
      const framePath = path.join(frameRoot, expectedName);
      assert.ok(fs.existsSync(framePath), `${slotId} missing frame ${direction}.${index}: ${framePath}`);
      assert.ok(fs.existsSync(`${framePath}.import`), `${slotId} missing Godot import metadata for ${direction}.${index}`);
      frameHashesForDirection.add(crypto.createHash('sha256').update(fs.readFileSync(framePath)).digest('hex'));
      const dimensions = pngDimensions(framePath);
      assert.deepEqual(dimensions, { width: expectedWidth, height: expectedHeight }, `${slotId} ${direction}.${index} dimensions`);
      const alphaStats = pngAlphaStats(framePath);
      assert.equal(alphaStats.transparentCorners, 4, `${slotId} ${direction}.${index} must keep transparent padded corners`);
      assert.ok(alphaStats.opaquePixels > 0, `${slotId} ${direction}.${index} must contain a non-empty ship body`);
      alphaBBoxAreaTotal += alphaStats.alphaBBoxArea;
      alphaBBoxMaxExtentTotal += Math.max(alphaStats.alphaBBoxWidth, alphaStats.alphaBBoxHeight);
      frameCount += 1;
    }
    assert.ok(
      frameHashesForDirection.size >= 4,
      `${slotId}.${direction} should have subtle bob/highlight/water-shadow frame variation, not 10 identical frames`,
    );
  }
  assert.equal(frameCount, 80, `${slotId} must have exactly 80 required frames`);
  visualStatsBySlot.set(slotId, {
    averageBBoxArea: alphaBBoxAreaTotal / frameCount,
    averageBBoxMaxExtent: alphaBBoxMaxExtentTotal / frameCount,
  });

  const spriteSheetPath = resPathToFilePath(String(body.spriteSheetTargetPath));
  assert.ok(fs.existsSync(spriteSheetPath), `${slotId} contact/sprite sheet must exist`);
  assert.ok(fs.existsSync(`${spriteSheetPath}.import`), `${slotId} contact/sprite sheet must have Godot import metadata`);
  const spriteSheetDimensions = pngDimensions(spriteSheetPath);
  assert.equal(spriteSheetDimensions.width, expectedWidth * 10, `${slotId} sheet width should be 10 frames`);
  assert.equal(spriteSheetDimensions.height, expectedHeight * 8, `${slotId} sheet height should be 8 directions`);
}

assert.equal(movingBodies.length, expectedSlots.length, 'manifest should only declare the three W13 naval moving bodies');

const lightStats = visualStatsBySlot.get('naval_light_patrol_warship_v1')!;
const interceptorStats = visualStatsBySlot.get('naval_interceptor_warship_v1')!;
const transportStats = visualStatsBySlot.get('naval_transport_warship_v1')!;
assert.ok(
  interceptorStats.averageBBoxArea >= lightStats.averageBBoxArea * 1.1,
  `interceptor visual body area should read larger than light patrol: ${interceptorStats.averageBBoxArea} vs ${lightStats.averageBBoxArea}`,
);
assert.ok(
  transportStats.averageBBoxArea >= interceptorStats.averageBBoxArea * 1.18,
  `transport visual body area should read clearly larger than interceptor: ${transportStats.averageBBoxArea} vs ${interceptorStats.averageBBoxArea}`,
);
assert.ok(
  transportStats.averageBBoxMaxExtent >= lightStats.averageBBoxMaxExtent * 1.25,
  `transport max extent should read much larger than light patrol: ${transportStats.averageBBoxMaxExtent} vs ${lightStats.averageBBoxMaxExtent}`,
);

console.log('[godot_sea_overseas_naval_frame_batch_asset_contract] all checks passed');

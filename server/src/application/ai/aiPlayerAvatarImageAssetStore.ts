import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import type {
  AiPlayerAvatarImageAsset,
  UploadAiPlayerAvatarImageRequest,
} from '../../../../shared/contracts/aiPlayer'

const MAX_AVATAR_IMAGE_BYTES = 2_000_000

const CONTENT_TYPE_EXTENSIONS: Record<UploadAiPlayerAvatarImageRequest['contentType'], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export type StoreAiPlayerAvatarImageAssetResult =
  | { asset: AiPlayerAvatarImageAsset }
  | { error: string; statusCode: number }

export function storeAiPlayerAvatarImageAsset(
  aiPlayerId: string,
  request: UploadAiPlayerAvatarImageRequest,
): StoreAiPlayerAvatarImageAssetResult {
  const normalizedAiPlayerId = aiPlayerId.trim()
  if (!normalizedAiPlayerId) {
    return { error: 'aiPlayerId required.', statusCode: 400 }
  }

  const extension = CONTENT_TYPE_EXTENSIONS[request.contentType]
  if (!extension) {
    return { error: 'unsupported avatar image content type', statusCode: 415 }
  }

  const base64Payload = normalizeBase64Payload(request.imageBase64)
  let imageBytes: Buffer
  try {
    imageBytes = Buffer.from(base64Payload, 'base64')
  } catch {
    return { error: 'invalid avatar image base64', statusCode: 422 }
  }

  if (imageBytes.length <= 0) {
    return { error: 'avatar image payload is empty', statusCode: 422 }
  }
  if (imageBytes.length > MAX_AVATAR_IMAGE_BYTES) {
    return { error: 'avatar image exceeds max size', statusCode: 413 }
  }

  const sha256 = createHash('sha256').update(imageBytes).digest('hex')
  const safeAiPlayerId = sanitizePathSegment(normalizedAiPlayerId)
  const assetId = `ai_avatar_${safeAiPlayerId}_${sha256.slice(0, 16)}`
  const uploadDir = path.resolve(process.cwd(), 'tmp', 'ai_player_avatar_uploads', safeAiPlayerId)
  mkdirSync(uploadDir, { recursive: true })
  const avatarImagePath = path.join(uploadDir, `${assetId}.${extension}`)
  writeFileSync(avatarImagePath, imageBytes)

  return {
    asset: {
      assetId,
      avatarImagePath,
      contentType: request.contentType,
      byteSize: imageBytes.length,
      sha256,
    },
  }
}

function normalizeBase64Payload(rawBase64: string): string {
  const trimmed = rawBase64.trim()
  const commaIndex = trimmed.indexOf(',')
  return commaIndex >= 0 ? trimmed.slice(commaIndex + 1).trim() : trimmed
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}

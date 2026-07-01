import { createHash } from 'node:crypto'

export type AiPlayerVoiceAudioAsset = {
  audioAssetId: string
  provider: string
  contentType: string
  bytes: Buffer
  createdAt: string
}

const voiceAudioAssets = new Map<string, AiPlayerVoiceAudioAsset>()

function hashAudioAsset(input: Buffer) {
  return createHash('sha256').update(input).digest('hex').slice(0, 18)
}

export function saveAiPlayerVoiceAudioAsset(input: {
  provider: string
  contentType: string
  bytes: Buffer
  audioAssetId?: string
}) {
  const audioAssetId = input.audioAssetId?.trim()
    || `voice-audio-${hashAudioAsset(input.bytes)}`
  const asset: AiPlayerVoiceAudioAsset = {
    audioAssetId,
    provider: input.provider,
    contentType: input.contentType,
    bytes: Buffer.from(input.bytes),
    createdAt: new Date().toISOString(),
  }
  voiceAudioAssets.set(audioAssetId, asset)
  return {
    audioAssetId,
    byteLength: asset.bytes.byteLength,
  }
}

export function readAiPlayerVoiceAudioAsset(audioAssetId: string) {
  const asset = voiceAudioAssets.get(audioAssetId.trim())
  if (!asset) {
    return null
  }
  return {
    ...asset,
    bytes: Buffer.from(asset.bytes),
  }
}

export function clearAiPlayerVoiceAudioAssetsForTest() {
  voiceAudioAssets.clear()
}

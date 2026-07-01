import { z } from 'zod'
import type {
  AiPlayerAsrRequest,
  AiPlayerAsrResult,
  AiPlayerAsrSummary,
  AiPlayerSpeechContract,
  AiPlayerTtsRequest,
  AiPlayerTtsResult,
  AiPlayerVoiceProfileCatalogResponse,
  AiPlayerVoiceCommandRequest,
  AiPlayerVoiceProfile,
  AiPlayerVoiceProfileSelectionResponse,
  AiPlayerVoiceAvailability,
  AiPlayerVoiceProviderAdapter,
  AiPlayerVoiceUsage,
  AiPlayerVoiceUsageBreakdown,
  UpdateAiPlayerVoiceProfileSelectionRequest,
} from '../contracts/aiPlayerVoice'

export const aiPlayerVoiceProviderKindSchema = z.enum(['tts', 'asr'])

export const aiPlayerVoiceProviderModeSchema = z.enum(['mock', 'adapter'])

export const aiPlayerVoiceUsageTypeSchema = z.enum(['model', 'tts', 'asr'])

export const aiPlayerVoiceGenderSchema = z.enum(['female', 'male', 'neutral'])

export const aiPlayerVoiceProfileSourceSchema = z.enum(['preset', 'voice_design', 'voice_clone'])

export const aiPlayerVoiceStylePresetSchema = z.enum([
  'female_soft',
  'female_clear',
  'male_strategist',
  'male_grit',
  'neutral_low_ai',
  'voice_clone',
])

export const aiPlayerAutoSpeechModeSchema = z.enum(['off', 'auto', 'always'])

export const aiPlayerVoiceAvailabilityStatusSchema = z.enum(['available', 'unconfigured', 'muted'])

export const aiPlayerVoiceFallbackModeSchema = z.enum(['configured_voice', 'mock_audio', 'silent'])

export const aiPlayerVoiceUsageSchema = z.object({
  characters: z.number().int().nonnegative().optional(),
  audioSeconds: z.number().finite().nonnegative().optional(),
  requestCount: z.number().int().nonnegative().optional(),
  estimatedCostUsd: z.number().finite().nonnegative().optional(),
  estimatedCostSource: z.enum(['mock', 'provider_reported', 'pricing_policy']).optional(),
}).strict()

export const aiPlayerVoiceUsageBreakdownSchema = z.object({
  model: aiPlayerVoiceUsageSchema.optional(),
  tts: aiPlayerVoiceUsageSchema.optional(),
  asr: aiPlayerVoiceUsageSchema.optional(),
}).strict()

export const aiPlayerSpeechContractSchema = z.object({
  contractVersion: z.literal('ai_player_speech_contract_v1'),
  provider: z.string().trim().min(1).max(120),
  providerKind: aiPlayerVoiceProviderKindSchema,
  providerMode: aiPlayerVoiceProviderModeSchema,
  status: z.enum(['succeeded', 'failed', 'skipped']),
  audioAssetId: z.string().trim().min(1).max(160).optional(),
  contentType: z.string().trim().min(1).max(80).optional(),
  durationMs: z.number().int().nonnegative().optional(),
  voiceProfileId: z.string().trim().min(1).max(120).optional(),
  transcriptText: z.string().trim().min(1).max(500).optional(),
  usage: aiPlayerVoiceUsageSchema.optional(),
  errorCode: z.string().trim().min(1).max(120).optional(),
}).strict()

export const aiPlayerAsrSummarySchema = z.object({
  contractVersion: z.literal('ai_player_asr_summary_v1'),
  provider: z.string().trim().min(1).max(120),
  providerKind: z.literal('asr'),
  providerMode: aiPlayerVoiceProviderModeSchema,
  audioAssetId: z.string().trim().min(1).max(160).optional(),
  transcriptText: z.string().trim().min(1).max(500),
  usage: aiPlayerVoiceUsageSchema.optional(),
}).strict()

export const aiPlayerVoiceProfileSchema = z.object({
  voiceProfileId: z.string().trim().min(1).max(120),
  displayName: z.string().trim().min(1).max(120),
  provider: z.string().trim().min(1).max(120),
  providerMode: aiPlayerVoiceProviderModeSchema,
  gender: aiPlayerVoiceGenderSchema,
  stylePreset: aiPlayerVoiceStylePresetSchema,
  source: aiPlayerVoiceProfileSourceSchema,
  locale: z.string().trim().min(1).max(40).optional(),
  description: z.string().trim().min(1).max(240).optional(),
  clone: z.object({
    status: z.enum(['unavailable', 'pending', 'ready']),
    consentRequired: z.literal(true),
    sampleAudioAssetId: z.string().trim().min(1).max(160).optional(),
  }).strict().optional(),
  providerMetadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const aiPlayerVoiceProfileSelectionSchema = z.object({
  aiPlayerId: z.string().trim().min(1).max(80),
  voiceProfileId: z.string().trim().min(1).max(120),
  autoSpeechMode: aiPlayerAutoSpeechModeSchema,
  updatedAt: z.string().trim().min(1).max(80),
}).strict()

export const aiPlayerVoiceAvailabilitySchema = z.object({
  status: aiPlayerVoiceAvailabilityStatusSchema,
  label: z.string().trim().min(1).max(40),
  summary: z.string().trim().min(1).max(160),
  canPlayVoice: z.boolean(),
  fallbackMode: aiPlayerVoiceFallbackModeSchema,
}).strict()

export const updateAiPlayerVoiceProfileSelectionRequestSchema = z.object({
  voiceProfileId: z.string().trim().min(1).max(120),
  autoSpeechMode: aiPlayerAutoSpeechModeSchema.optional(),
}).strict()

export const aiPlayerVoiceProfileCatalogResponseSchema = z.object({
  ok: z.literal(true),
  aiPlayerId: z.string().trim().min(1).max(80),
  defaultVoiceProfileId: z.string().trim().min(1).max(120),
  activeSelection: aiPlayerVoiceProfileSelectionSchema,
  voiceAvailability: aiPlayerVoiceAvailabilitySchema,
  profiles: z.array(aiPlayerVoiceProfileSchema).min(1),
}).strict()

export const aiPlayerVoiceProfileSelectionResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    selection: aiPlayerVoiceProfileSelectionSchema,
  }).strict(),
  z.object({
    ok: z.literal(false),
    error: z.string().trim().min(1).max(160),
  }).strict(),
])

export const aiPlayerTtsRequestSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  aiPlayerId: z.string().trim().min(1).max(80),
  voiceProfileId: z.string().trim().min(1).max(120).optional(),
  providerHint: z.string().trim().min(1).max(120).optional(),
  providerVoice: z.string().trim().min(1).max(120).optional(),
  stylePrompt: z.string().trim().min(1).max(500).optional(),
}).strict()

export const aiPlayerTtsResultSchema = z.object({
  speechContract: aiPlayerSpeechContractSchema,
}).strict()

export const aiPlayerAsrRequestSchema = z.object({
  audioAssetId: z.string().trim().min(1).max(160).optional(),
  audioBase64: z.string().trim().min(1).max(2_000_000).optional(),
  contentType: z.string().trim().min(1).max(80).optional(),
  providerHint: z.string().trim().min(1).max(120).optional(),
  transcriptHint: z.string().trim().min(1).max(500).optional(),
}).strict().refine(
  (value) => Boolean(value.audioAssetId || value.audioBase64),
  { message: 'audioAssetId or audioBase64 is required' },
)

export const aiPlayerAsrResultSchema = z.object({
  transcriptText: z.string().trim().min(1).max(500),
  asr: aiPlayerAsrSummarySchema,
}).strict()

export const aiPlayerVoiceCommandRequestSchema = z.object({
  mode: z.enum(['text', 'audio']),
  provider: z.string().trim().min(1).max(120).optional(),
  voiceProfileId: z.string().trim().min(1).max(120).optional(),
  text: z.string().trim().min(1).max(500).optional(),
  audioAssetId: z.string().trim().min(1).max(160).optional(),
  audioBase64: z.string().trim().min(1).max(2_000_000).optional(),
  contentType: z.string().trim().min(1).max(80).optional(),
  transcriptHint: z.string().trim().min(1).max(500).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.mode === 'text' && !value.text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'text is required for voice text mode',
      path: ['text'],
    })
  }
  if (value.mode === 'audio' && !value.audioAssetId && !value.audioBase64) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'audioAssetId or audioBase64 is required for voice audio mode',
      path: ['audioAssetId'],
    })
  }
})

export function parseAiPlayerSpeechContract(input: unknown): AiPlayerSpeechContract {
  return aiPlayerSpeechContractSchema.parse(input) as AiPlayerSpeechContract
}

export function parseAiPlayerAsrSummary(input: unknown): AiPlayerAsrSummary {
  return aiPlayerAsrSummarySchema.parse(input) as AiPlayerAsrSummary
}

export function parseAiPlayerVoiceUsage(input: unknown): AiPlayerVoiceUsage {
  return aiPlayerVoiceUsageSchema.parse(input) as AiPlayerVoiceUsage
}

export function parseAiPlayerVoiceUsageBreakdown(input: unknown): AiPlayerVoiceUsageBreakdown {
  return aiPlayerVoiceUsageBreakdownSchema.parse(input) as AiPlayerVoiceUsageBreakdown
}

export function parseAiPlayerVoiceAvailability(input: unknown): AiPlayerVoiceAvailability {
  return aiPlayerVoiceAvailabilitySchema.parse(input) as AiPlayerVoiceAvailability
}

export function parseAiPlayerVoiceProfile(input: unknown): AiPlayerVoiceProfile {
  return aiPlayerVoiceProfileSchema.parse(input) as AiPlayerVoiceProfile
}

export function parseUpdateAiPlayerVoiceProfileSelectionRequest(
  input: unknown,
): UpdateAiPlayerVoiceProfileSelectionRequest {
  return updateAiPlayerVoiceProfileSelectionRequestSchema.parse(input) as UpdateAiPlayerVoiceProfileSelectionRequest
}

export function parseAiPlayerVoiceProfileCatalogResponse(input: unknown): AiPlayerVoiceProfileCatalogResponse {
  return aiPlayerVoiceProfileCatalogResponseSchema.parse(input) as AiPlayerVoiceProfileCatalogResponse
}

export function parseAiPlayerVoiceProfileSelectionResponse(input: unknown): AiPlayerVoiceProfileSelectionResponse {
  return aiPlayerVoiceProfileSelectionResponseSchema.parse(input) as AiPlayerVoiceProfileSelectionResponse
}

export function parseAiPlayerTtsRequest(input: unknown): AiPlayerTtsRequest {
  return aiPlayerTtsRequestSchema.parse(input) as AiPlayerTtsRequest
}

export function parseAiPlayerTtsResult(input: unknown): AiPlayerTtsResult {
  return aiPlayerTtsResultSchema.parse(input) as AiPlayerTtsResult
}

export function parseAiPlayerAsrRequest(input: unknown): AiPlayerAsrRequest {
  return aiPlayerAsrRequestSchema.parse(input) as AiPlayerAsrRequest
}

export function parseAiPlayerAsrResult(input: unknown): AiPlayerAsrResult {
  return aiPlayerAsrResultSchema.parse(input) as AiPlayerAsrResult
}

export function parseAiPlayerVoiceCommandRequest(input: unknown): AiPlayerVoiceCommandRequest {
  return aiPlayerVoiceCommandRequestSchema.parse(input) as AiPlayerVoiceCommandRequest
}

export type ParsedAiPlayerVoiceProviderAdapter = AiPlayerVoiceProviderAdapter

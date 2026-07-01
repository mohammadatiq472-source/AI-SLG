export const AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS = [
  'OPENAI_API_KEY',
  'LLM_RELAY_API_KEY',
  'LLM_RELAY_API_KEYS',
  'MEM0_API_KEY',
  'DATABASE_URL',
  'POSTGRES_URL',
  'REDIS_URL',
  'SAVE_SLOT_RESTORE_SCOPE_TOKEN',
  'WORLD_SAVE_SLOTS_PATH',
  'WORLD_SAVE_SLOTS_ARCHIVE_DIR',
  'WORLD_PERSIST_ROOT',
  'FACTION_APIKEY_ENCRYPTION_KEY',
  'AI_PLAYER_RUNTIME_MODEL_API_KEY',
  'AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH',
  'providerAccountStorePath',
  'archiveRestoreRouteForOps',
  'privateAiSourceRefs',
  'serverOnlyFixturePath',
  'server-only fixture',
  'RESTORE_TOKEN',
  'AI_PROVIDER_KEY',
  'RAW_PERSISTENCE_PATH',
] as const

export type AiSubjectReleaseBoundaryValidationResult = {
  ok: boolean
  errors: string[]
}

export type AiSubjectReleaseBoundaryEntrypoint = {
  route: 'GET /api/ai/players/:id/subject'
  schemaVersion: 'ai_player_subject_read_model_v1'
  producer: 'buildAiPlayerSubjectReadModel'
  ownerLabels: Array<'server-owned' | 'AI-read'>
  serverProduced: boolean
  readOnly: boolean
  clientMutationAllowed: boolean
  directPrivateSourceRefsAllowed: boolean
  sourceRefsVisibility: 'internal_link_only'
}

export type AiSubjectReleaseBoundaryApprovedSubjectInput = {
  packet: string
  producer: string
  visibility: 'AI-read' | 'server-produced-internal-link-only'
  serverProduced: boolean
  directRead: boolean
  sourceRefsPolicy?: 'none' | 'internal_link_only_visible_false'
}

export type AiSubjectReleaseBoundaryDriftProtection = {
  generatedArtifactPath: string
  releaseArtifactDriftTarget: 'AI subject boundary manifest'
  driftGateCommand: string
  releaseCandidateStep: 'verify release artifact drift is clean'
  generatorIsSourceOfTruth: boolean
  addNewAiInputRequiresManifestUpdate: boolean
  failOnUnlistedSubjectInput: boolean
  privateInputDriftAction: 'reject_manifest'
}

export type AiSubjectReleaseBoundaryManifest = {
  manifestKind: 'ai-subject-release-boundary'
  profileId: string
  aiReadEntrypoints: AiSubjectReleaseBoundaryEntrypoint[]
  approvedSubjectInputs: AiSubjectReleaseBoundaryApprovedSubjectInput[]
  sourceRefsPolicy: {
    directPrivateSourceRefsAllowed: boolean
    allowedWithinSubjectPacket: 'internal_link_only'
    visibleToPlayer: boolean
    visibleToClient: boolean
    rawPersistencePathsAllowed: boolean
    providerKeysAllowed: boolean
    restoreTokensAllowed: boolean
  }
  packetExpiryRules: {
    subjectPacketBuild: 'server_rebuild_per_request'
    clientCacheAuthority: 'none'
    maxClientCacheTtlMs: number
    stalePacketAction: 'discard_and_refetch_subject'
    recoveryAnchorRetentionOwner: 'server'
  }
  driftProtection: AiSubjectReleaseBoundaryDriftProtection
  forbiddenPrivateInputs: string[]
  codeEvidence: Array<{
    path: string
    requiredMarkers: string[]
  }>
  generatedBy: {
    script: 'scripts/generate_ai_subject_release_boundary.ts'
  }
}

export function validateAiSubjectReleaseBoundaryManifest(value: unknown): AiSubjectReleaseBoundaryValidationResult {
  const errors: string[] = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['manifest must be an object'] }
  }

  const record = value as Record<string, unknown>
  if (record.manifestKind !== 'ai-subject-release-boundary') {
    errors.push('manifestKind must be ai-subject-release-boundary')
  }
  if (typeof record.profileId !== 'string' || record.profileId.trim() === '') {
    errors.push('profileId is required')
  }

  validateEntrypoints(record.aiReadEntrypoints, errors)
  validateApprovedSubjectInputs(record.approvedSubjectInputs, errors)
  validateSourceRefsPolicy(record.sourceRefsPolicy, errors)
  validatePacketExpiryRules(record.packetExpiryRules, errors)
  validateDriftProtection(record.driftProtection, record.profileId, errors)
  validateForbiddenPrivateInputs(record.forbiddenPrivateInputs, errors)
  validateCodeEvidence(record.codeEvidence, errors)
  validateGeneratedBy(record.generatedBy, errors)
  validateAiReadableSurface(record, errors)

  return { ok: errors.length === 0, errors }
}

function validateEntrypoints(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('aiReadEntrypoints must be a non-empty array')
    return
  }

  let hasSubjectEntrypoint = false
  for (const entrypoint of value) {
    const entrypointRecord = entrypoint as Record<string, unknown>
    if (entrypointRecord.route === 'GET /api/ai/players/:id/subject') hasSubjectEntrypoint = true
    if (entrypointRecord.schemaVersion !== 'ai_player_subject_read_model_v1') {
      errors.push(`entrypoint ${String(entrypointRecord.route)} must use ai_player_subject_read_model_v1`)
    }
    if (entrypointRecord.producer !== 'buildAiPlayerSubjectReadModel') {
      errors.push(`entrypoint ${String(entrypointRecord.route)} must be produced by buildAiPlayerSubjectReadModel`)
    }
    if (!Array.isArray(entrypointRecord.ownerLabels)) {
      errors.push(`entrypoint ${String(entrypointRecord.route)} ownerLabels must be an array`)
    } else {
      for (const ownerLabel of ['server-owned', 'AI-read']) {
        if (!entrypointRecord.ownerLabels.includes(ownerLabel)) {
          errors.push(`entrypoint ${String(entrypointRecord.route)} must include ${ownerLabel}`)
        }
      }
    }
    if (entrypointRecord.serverProduced !== true) {
      errors.push(`entrypoint ${String(entrypointRecord.route)} must be server-produced`)
    }
    if (entrypointRecord.readOnly !== true) {
      errors.push(`entrypoint ${String(entrypointRecord.route)} must be read-only`)
    }
    if (entrypointRecord.clientMutationAllowed !== false) {
      errors.push(`entrypoint ${String(entrypointRecord.route)} clientMutationAllowed must be false`)
    }
    if (entrypointRecord.directPrivateSourceRefsAllowed !== false) {
      errors.push(`entrypoint ${String(entrypointRecord.route)} directPrivateSourceRefsAllowed must be false`)
    }
    if (entrypointRecord.sourceRefsVisibility !== 'internal_link_only') {
      errors.push(`entrypoint ${String(entrypointRecord.route)} sourceRefsVisibility must be internal_link_only`)
    }
  }

  if (!hasSubjectEntrypoint) {
    errors.push('aiReadEntrypoints must include GET /api/ai/players/:id/subject')
  }
}

function validateApprovedSubjectInputs(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('approvedSubjectInputs must be a non-empty array')
    return
  }

  const requiredPackets = [
    'ai_player_subject_read_model_v1',
    'ai_player_subject_recent_body_changes_v1',
    'ai_player_subject_history_anchors_v1',
    'ai_player_subject_recovery_anchors_v1',
  ]
  const packetNames = new Set<string>()
  for (const input of value) {
    const inputRecord = input as Record<string, unknown>
    if (typeof inputRecord.packet !== 'string' || inputRecord.packet.trim() === '') {
      errors.push('approvedSubjectInputs packet is required')
    } else {
      packetNames.add(inputRecord.packet)
    }
    if (typeof inputRecord.producer !== 'string' || inputRecord.producer.trim() === '') {
      errors.push(`approvedSubjectInputs ${String(inputRecord.packet)} producer is required`)
    }
    if (inputRecord.visibility !== 'AI-read' && inputRecord.visibility !== 'server-produced-internal-link-only') {
      errors.push(`approvedSubjectInputs ${String(inputRecord.packet)} has invalid visibility`)
    }
    if (inputRecord.serverProduced !== true) {
      errors.push(`approvedSubjectInputs ${String(inputRecord.packet)} must be server-produced`)
    }
    if (inputRecord.directRead !== false) {
      errors.push(`approvedSubjectInputs ${String(inputRecord.packet)} directRead must be false`)
    }
    if (
      (inputRecord.packet === 'ai_player_subject_history_anchors_v1' ||
        inputRecord.packet === 'ai_player_subject_recovery_anchors_v1') &&
      inputRecord.sourceRefsPolicy !== 'internal_link_only_visible_false'
    ) {
      errors.push(`approvedSubjectInputs ${String(inputRecord.packet)} sourceRefsPolicy must be internal_link_only_visible_false`)
    }
  }

  for (const requiredPacket of requiredPackets) {
    if (!packetNames.has(requiredPacket)) {
      errors.push(`approvedSubjectInputs must include ${requiredPacket}`)
    }
  }
}

function validateSourceRefsPolicy(value: unknown, errors: string[]): void {
  const policy = value as Record<string, unknown> | undefined
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    errors.push('sourceRefsPolicy must be an object')
    return
  }

  const expected: Record<string, unknown> = {
    directPrivateSourceRefsAllowed: false,
    allowedWithinSubjectPacket: 'internal_link_only',
    visibleToPlayer: false,
    visibleToClient: false,
    rawPersistencePathsAllowed: false,
    providerKeysAllowed: false,
    restoreTokensAllowed: false,
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (policy[key] !== expectedValue) {
      errors.push(`sourceRefsPolicy.${key} must be ${String(expectedValue)}`)
    }
  }
}

function validatePacketExpiryRules(value: unknown, errors: string[]): void {
  const rules = value as Record<string, unknown> | undefined
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
    errors.push('packetExpiryRules must be an object')
    return
  }

  const expected: Record<string, unknown> = {
    subjectPacketBuild: 'server_rebuild_per_request',
    clientCacheAuthority: 'none',
    maxClientCacheTtlMs: 0,
    stalePacketAction: 'discard_and_refetch_subject',
    recoveryAnchorRetentionOwner: 'server',
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (rules[key] !== expectedValue) {
      errors.push(`packetExpiryRules.${key} must be ${String(expectedValue)}`)
    }
  }
}

function validateDriftProtection(value: unknown, profileIdValue: unknown, errors: string[]): void {
  const protection = value as Record<string, unknown> | undefined
  if (!protection || typeof protection !== 'object' || Array.isArray(protection)) {
    errors.push('driftProtection must be an object')
    return
  }

  const profileId = typeof profileIdValue === 'string' && profileIdValue.trim() !== '' ? profileIdValue.trim() : 'local-dev'
  const expected: Record<string, unknown> = {
    generatedArtifactPath: `ops/release-artifacts/generated/${profileId}.ai-subject-boundary.json`,
    releaseArtifactDriftTarget: 'AI subject boundary manifest',
    driftGateCommand: `npm.cmd run release:artifact-drift:check -- --profile ${profileId}`,
    releaseCandidateStep: 'verify release artifact drift is clean',
    generatorIsSourceOfTruth: true,
    addNewAiInputRequiresManifestUpdate: true,
    failOnUnlistedSubjectInput: true,
    privateInputDriftAction: 'reject_manifest',
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (protection[key] !== expectedValue) {
      errors.push(`driftProtection.${key} must be ${String(expectedValue)}`)
    }
  }

  const serializedDriftProtection = JSON.stringify(protection)
  for (const forbidden of AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS) {
    if (serializedDriftProtection.includes(forbidden)) {
      errors.push(`driftProtection must not contain forbidden private input ${forbidden}`)
    }
  }
}

function validateForbiddenPrivateInputs(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push('forbiddenPrivateInputs must be an array')
    return
  }

  for (const forbidden of AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS) {
    if (!value.includes(forbidden)) {
      errors.push(`forbiddenPrivateInputs must include ${forbidden}`)
    }
  }
}

function validateCodeEvidence(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('codeEvidence must be a non-empty array')
    return
  }

  const requiredPaths = [
    'server/src/application/ai/aiPlayerSubjectReadModel.ts',
    'server/src/routes/aiPlayerRuntimeRoutes.ts',
    'server/src/application/ai/aiPlayerAutonomousDevelopmentService.ts',
  ]
  const paths = new Set<string>()
  for (const evidence of value) {
    const evidenceRecord = evidence as Record<string, unknown>
    if (typeof evidenceRecord.path !== 'string' || evidenceRecord.path.trim() === '') {
      errors.push('codeEvidence path is required')
    } else {
      paths.add(evidenceRecord.path)
    }
    if (!Array.isArray(evidenceRecord.requiredMarkers) || evidenceRecord.requiredMarkers.length === 0) {
      errors.push(`codeEvidence ${String(evidenceRecord.path)} requiredMarkers must be a non-empty array`)
    }
  }

  for (const requiredPath of requiredPaths) {
    if (!paths.has(requiredPath)) {
      errors.push(`codeEvidence must include ${requiredPath}`)
    }
  }
}

function validateGeneratedBy(value: unknown, errors: string[]): void {
  const generatedBy = value as Record<string, unknown> | undefined
  if (!generatedBy || generatedBy.script !== 'scripts/generate_ai_subject_release_boundary.ts') {
    errors.push('generatedBy.script must be scripts/generate_ai_subject_release_boundary.ts')
  }
}

function validateAiReadableSurface(record: Record<string, unknown>, errors: string[]): void {
  const serializedAiReadableSurface = JSON.stringify({
    aiReadEntrypoints: record.aiReadEntrypoints,
    approvedSubjectInputs: record.approvedSubjectInputs,
    sourceRefsPolicy: record.sourceRefsPolicy,
    packetExpiryRules: record.packetExpiryRules,
  })
  for (const forbidden of AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS) {
    if (serializedAiReadableSurface.includes(forbidden)) {
      errors.push(`AI-readable surface must not contain forbidden private input ${forbidden}`)
    }
  }
}

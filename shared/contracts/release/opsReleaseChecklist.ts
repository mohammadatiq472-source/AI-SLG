export const OPS_RELEASE_CHECKLIST_REQUIRED_SECRET_NAMES = [
  'SAVE_SLOT_RESTORE_SCOPE_TOKEN',
  'DATABASE_URL',
  'REDIS_URL',
  'FACTION_APIKEY_ENCRYPTION_KEY',
  'LLM_RELAY_API_KEY',
  'LLM_RELAY_API_KEYS',
  'OPENAI_API_KEY',
  'AI_PLAYER_RUNTIME_MODEL_API_KEY',
] as const

export const OPS_RELEASE_CHECKLIST_REQUIRED_PRIVATE_STATE_ENVS = [
  'WORLD_PERSIST_ROOT',
  'WORLD_SAVE_SLOTS_PATH',
  'WORLD_SAVE_SLOTS_ARCHIVE_DIR',
  'AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH',
] as const

export type OpsReleaseChecklistValidationResult = {
  ok: boolean
  errors: string[]
}

export type OpsReleaseChecklistSecretInput = {
  name: string
  owner: 'ops'
  inClientPackage: boolean
  inOpsSecretStore: boolean
  injection: 'env'
  requiredFor: string[]
}

export type OpsReleaseChecklistPrivateStateStore = {
  name: string
  env: string
  owner: 'server-owned'
  clientPackaged: boolean
  pathScope: 'server-runtime'
  restoreAuthority: 'server-only'
  evidencePath: string
}

export type OpsReleaseChecklistRecoveryProducer = {
  name: string
  owner: 'server-owned'
  file: string
  functions: string[]
  routes?: string[]
  commands?: string[]
  requiresSecret?: string | null
  clientVisible: boolean
  clientPackaged: boolean
  backupRole: 'catalog' | 'restore-drill' | 'restore-apply' | 'rollback-drill' | 'health'
}

export type OpsReleaseChecklistBackupRollbackCommand = {
  command: string
  script: string
  owner: 'ops'
  clientPackaged: boolean
  purpose: string
  rollbackCapable: boolean
}

export type OpsReleaseChecklistRecoveryDrillEvidence = {
  evidenceId: string
  producerName: string
  entrypoint: string
  evidenceKind: 'static-command-contract' | 'nightly-acceptance-step'
  owner: 'ops'
  resultSemantic: 'restore-drill' | 'restore-apply-stability' | 'rollback-drill'
  requiresSecret: 'SAVE_SLOT_RESTORE_SCOPE_TOKEN' | null
  secretMaterialRecorded: boolean
  privatePathValuesRecorded: boolean
  clientPackaged: boolean
  aiReadable: boolean
  releaseCandidateGate: 'release:ops:check'
}

export type OpsReleaseChecklist = {
  checklistKind: 'ops-secret-restore-recovery-producer-checklist'
  profileId: string
  secretInputs: OpsReleaseChecklistSecretInput[]
  privateStateStores: OpsReleaseChecklistPrivateStateStore[]
  recoveryProducers: OpsReleaseChecklistRecoveryProducer[]
  backupRollbackCommands: OpsReleaseChecklistBackupRollbackCommand[]
  drillEvidence: OpsReleaseChecklistRecoveryDrillEvidence[]
  opsGates: string[]
  codeEvidence: Array<{
    path: string
    requiredMarkers: string[]
  }>
  validatedBy: {
    script: 'scripts/validate_ops_release_checklist.ts'
  }
}

export function validateOpsReleaseChecklist(value: unknown): OpsReleaseChecklistValidationResult {
  const errors: string[] = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['checklist must be an object'] }
  }

  const record = value as Record<string, unknown>
  if (record.checklistKind !== 'ops-secret-restore-recovery-producer-checklist') {
    errors.push('checklistKind must be ops-secret-restore-recovery-producer-checklist')
  }
  if (typeof record.profileId !== 'string' || record.profileId.trim() === '') {
    errors.push('profileId is required')
  }

  validateSecretInputs(record.secretInputs, errors)
  validatePrivateStateStores(record.privateStateStores, errors)
  validateRecoveryProducers(record.recoveryProducers, errors)
  validateBackupRollbackCommands(record.backupRollbackCommands, errors)
  validateDrillEvidence(record.drillEvidence, record.recoveryProducers, errors)
  validateOpsGates(record.opsGates, errors)
  validateCodeEvidence(record.codeEvidence, errors)
  validateValidatedBy(record.validatedBy, errors)
  validateNoClientPaths(record, errors)

  return { ok: errors.length === 0, errors }
}

function validateSecretInputs(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('secretInputs must be a non-empty array')
    return
  }

  const names = new Set<string>()
  for (const secret of value) {
    const secretRecord = secret as Record<string, unknown>
    if (typeof secretRecord.name !== 'string' || secretRecord.name.trim() === '') {
      errors.push('secretInputs name is required')
    } else {
      names.add(secretRecord.name)
    }
    if (secretRecord.owner !== 'ops') {
      errors.push(`secret ${String(secretRecord.name)} owner must be ops`)
    }
    if (secretRecord.inClientPackage !== false) {
      errors.push(`secret ${String(secretRecord.name)} must not be in client package`)
    }
    if (secretRecord.inOpsSecretStore !== true) {
      errors.push(`secret ${String(secretRecord.name)} must be in ops secret store`)
    }
    if (secretRecord.injection !== 'env') {
      errors.push(`secret ${String(secretRecord.name)} injection must be env`)
    }
    if (!Array.isArray(secretRecord.requiredFor) || secretRecord.requiredFor.length === 0) {
      errors.push(`secret ${String(secretRecord.name)} requiredFor must be a non-empty array`)
    }
  }

  for (const requiredSecret of OPS_RELEASE_CHECKLIST_REQUIRED_SECRET_NAMES) {
    if (!names.has(requiredSecret)) {
      errors.push(`secretInputs must include ${requiredSecret}`)
    }
  }
}

function validatePrivateStateStores(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('privateStateStores must be a non-empty array')
    return
  }

  const envs = new Set<string>()
  for (const store of value) {
    const storeRecord = store as Record<string, unknown>
    if (typeof storeRecord.name !== 'string' || storeRecord.name.trim() === '') {
      errors.push('privateStateStores name is required')
    }
    if (typeof storeRecord.env !== 'string' || storeRecord.env.trim() === '') {
      errors.push(`privateStateStore ${String(storeRecord.name)} env is required`)
    } else {
      envs.add(storeRecord.env)
    }
    if (storeRecord.owner !== 'server-owned') {
      errors.push(`privateStateStore ${String(storeRecord.name)} owner must be server-owned`)
    }
    if (storeRecord.clientPackaged !== false) {
      errors.push(`privateStateStore ${String(storeRecord.name)} must not be client packaged`)
    }
    if (storeRecord.pathScope !== 'server-runtime') {
      errors.push(`privateStateStore ${String(storeRecord.name)} pathScope must be server-runtime`)
    }
    if (storeRecord.restoreAuthority !== 'server-only') {
      errors.push(`privateStateStore ${String(storeRecord.name)} restoreAuthority must be server-only`)
    }
    if (typeof storeRecord.evidencePath !== 'string' || storeRecord.evidencePath.trim() === '') {
      errors.push(`privateStateStore ${String(storeRecord.name)} evidencePath is required`)
    }
  }

  for (const requiredEnv of OPS_RELEASE_CHECKLIST_REQUIRED_PRIVATE_STATE_ENVS) {
    if (!envs.has(requiredEnv)) {
      errors.push(`privateStateStores must include ${requiredEnv}`)
    }
  }
}

function validateRecoveryProducers(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('recoveryProducers must be a non-empty array')
    return
  }

  const requiredProducerNames = [
    'save-slots-archive-catalog',
    'save-slots-archive-restore-drill',
    'save-slots-archive-restore-apply',
    'save-slots-archive-restore-rollback-drill',
    'save-slots-persist-health',
  ]
  const names = new Set<string>()
  for (const producer of value) {
    const producerRecord = producer as Record<string, unknown>
    if (typeof producerRecord.name !== 'string' || producerRecord.name.trim() === '') {
      errors.push('recoveryProducers name is required')
    } else {
      names.add(producerRecord.name)
    }
    if (producerRecord.owner !== 'server-owned') {
      errors.push(`recoveryProducer ${String(producerRecord.name)} owner must be server-owned`)
    }
    if (typeof producerRecord.file !== 'string' || producerRecord.file.trim() === '') {
      errors.push(`recoveryProducer ${String(producerRecord.name)} file is required`)
    }
    if (!Array.isArray(producerRecord.functions) || producerRecord.functions.length === 0) {
      errors.push(`recoveryProducer ${String(producerRecord.name)} functions must be a non-empty array`)
    }
    if (producerRecord.clientVisible !== false) {
      errors.push(`recoveryProducer ${String(producerRecord.name)} clientVisible must be false`)
    }
    if (producerRecord.clientPackaged !== false) {
      errors.push(`recoveryProducer ${String(producerRecord.name)} clientPackaged must be false`)
    }
    if (!['catalog', 'restore-drill', 'restore-apply', 'rollback-drill', 'health'].includes(String(producerRecord.backupRole))) {
      errors.push(`recoveryProducer ${String(producerRecord.name)} backupRole is invalid`)
    }
  }

  for (const producerName of requiredProducerNames) {
    if (!names.has(producerName)) {
      errors.push(`recoveryProducers must include ${producerName}`)
    }
  }
}

function validateBackupRollbackCommands(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('backupRollbackCommands must be a non-empty array')
    return
  }

  const requiredCommands = [
    'gate:save-slots:restore-apply:stability',
    'gate:ai:nightly:acceptance',
  ]
  const commands = new Set<string>()
  for (const command of value) {
    const commandRecord = command as Record<string, unknown>
    if (typeof commandRecord.command !== 'string' || commandRecord.command.trim() === '') {
      errors.push('backupRollbackCommands command is required')
    } else {
      commands.add(commandRecord.command)
    }
    if (typeof commandRecord.script !== 'string' || commandRecord.script.trim() === '') {
      errors.push(`backupRollbackCommand ${String(commandRecord.command)} script is required`)
    }
    if (commandRecord.owner !== 'ops') {
      errors.push(`backupRollbackCommand ${String(commandRecord.command)} owner must be ops`)
    }
    if (commandRecord.clientPackaged !== false) {
      errors.push(`backupRollbackCommand ${String(commandRecord.command)} must not be client packaged`)
    }
    if (typeof commandRecord.purpose !== 'string' || commandRecord.purpose.trim() === '') {
      errors.push(`backupRollbackCommand ${String(commandRecord.command)} purpose is required`)
    }
    if (typeof commandRecord.rollbackCapable !== 'boolean') {
      errors.push(`backupRollbackCommand ${String(commandRecord.command)} rollbackCapable must be boolean`)
    }
  }

  for (const requiredCommand of requiredCommands) {
    if (!commands.has(requiredCommand)) {
      errors.push(`backupRollbackCommands must include ${requiredCommand}`)
    }
  }
}

function validateDrillEvidence(value: unknown, recoveryProducers: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('drillEvidence must be a non-empty array')
    return
  }

  const requiredProducerNames = [
    'save-slots-archive-restore-drill',
    'save-slots-archive-restore-apply',
    'save-slots-archive-restore-rollback-drill',
  ]
  const recoveryProducerNames = new Set<string>()
  if (Array.isArray(recoveryProducers)) {
    for (const producer of recoveryProducers) {
      const producerRecord = producer as Record<string, unknown>
      if (typeof producerRecord.name === 'string') recoveryProducerNames.add(producerRecord.name)
    }
  }

  const evidenceProducerNames = new Set<string>()
  for (const evidence of value) {
    const evidenceRecord = evidence as Record<string, unknown>
    const evidenceId = String(evidenceRecord.evidenceId)
    const producerName = String(evidenceRecord.producerName)
    if (typeof evidenceRecord.evidenceId !== 'string' || evidenceRecord.evidenceId.trim() === '') {
      errors.push('drillEvidence evidenceId is required')
    }
    if (typeof evidenceRecord.producerName !== 'string' || evidenceRecord.producerName.trim() === '') {
      errors.push(`drillEvidence ${evidenceId} producerName is required`)
    } else {
      evidenceProducerNames.add(producerName)
      if (!recoveryProducerNames.has(producerName)) {
        errors.push(`drillEvidence ${evidenceId} producerName must match a recovery producer`)
      }
    }
    if (typeof evidenceRecord.entrypoint !== 'string' || evidenceRecord.entrypoint.trim() === '') {
      errors.push(`drillEvidence ${evidenceId} entrypoint is required`)
    }
    if (!['static-command-contract', 'nightly-acceptance-step'].includes(String(evidenceRecord.evidenceKind))) {
      errors.push(`drillEvidence ${evidenceId} evidenceKind is invalid`)
    }
    if (evidenceRecord.owner !== 'ops') {
      errors.push(`drillEvidence ${evidenceId} owner must be ops`)
    }
    if (!['restore-drill', 'restore-apply-stability', 'rollback-drill'].includes(String(evidenceRecord.resultSemantic))) {
      errors.push(`drillEvidence ${evidenceId} resultSemantic is invalid`)
    }
    if (evidenceRecord.requiresSecret !== 'SAVE_SLOT_RESTORE_SCOPE_TOKEN' && evidenceRecord.requiresSecret !== null) {
      errors.push(`drillEvidence ${evidenceId} requiresSecret must be SAVE_SLOT_RESTORE_SCOPE_TOKEN or null`)
    }
    if (evidenceRecord.secretMaterialRecorded !== false) {
      errors.push(`drillEvidence ${evidenceId} secretMaterialRecorded must be false`)
    }
    if (evidenceRecord.privatePathValuesRecorded !== false) {
      errors.push(`drillEvidence ${evidenceId} privatePathValuesRecorded must be false`)
    }
    if (evidenceRecord.clientPackaged !== false) {
      errors.push(`drillEvidence ${evidenceId} clientPackaged must be false`)
    }
    if (evidenceRecord.aiReadable !== false) {
      errors.push(`drillEvidence ${evidenceId} aiReadable must be false`)
    }
    if (evidenceRecord.releaseCandidateGate !== 'release:ops:check') {
      errors.push(`drillEvidence ${evidenceId} releaseCandidateGate must be release:ops:check`)
    }
    if (producerName.includes('client') || producerName.includes('ai-readable')) {
      errors.push(`drillEvidence ${evidenceId} producerName must not describe a client or AI-readable producer`)
    }
  }

  for (const producerName of requiredProducerNames) {
    if (!evidenceProducerNames.has(producerName)) {
      errors.push(`drillEvidence must include ${producerName}`)
    }
  }
}

function validateOpsGates(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('opsGates must be a non-empty array')
    return
  }

  for (const requiredGate of ['backup-restore-drill', 'restore-apply-stability', 'restore-rollback-drill', 'rollback-plan']) {
    if (!value.includes(requiredGate)) {
      errors.push(`opsGates must include ${requiredGate}`)
    }
  }
}

function validateCodeEvidence(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('codeEvidence must be a non-empty array')
    return
  }

  const requiredPaths = [
    'server/src/application/world/WorldService.ts',
    'server/src/app.ts',
    'server/src/evals/runSaveSlotsRestoreApplyGate.ts',
    'server/src/evals/runAiNightlyAcceptanceGate.ts',
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

function validateValidatedBy(value: unknown, errors: string[]): void {
  const validatedBy = value as Record<string, unknown> | undefined
  if (!validatedBy || validatedBy.script !== 'scripts/validate_ops_release_checklist.ts') {
    errors.push('validatedBy.script must be scripts/validate_ops_release_checklist.ts')
  }
}

function validateNoClientPaths(record: Record<string, unknown>, errors: string[]): void {
  const serialized = JSON.stringify(record)
  for (const forbiddenPath of [
    'godot-client/',
    'godot-client\\\\',
    'exports/windows/',
    'tmp/godot_release_export',
  ]) {
    if (serialized.includes(forbiddenPath)) {
      errors.push(`ops checklist must not point to client/export path ${forbiddenPath}`)
    }
  }
}

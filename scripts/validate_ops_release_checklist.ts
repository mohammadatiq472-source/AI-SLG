import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  validateOpsReleaseChecklist,
  type OpsReleaseChecklist,
  type OpsReleaseChecklistValidationResult,
} from '../shared/contracts/release/opsReleaseChecklist'

export const DEFAULT_OPS_RELEASE_CHECKLIST_PROFILE = 'local-dev'
export const OPS_RELEASE_CHECKLIST_SOURCE_DIR = 'ops/release-artifacts'

export type LoadOpsReleaseChecklistResult = {
  profileId: string
  sourcePath: string
  checklist: OpsReleaseChecklist
}

export type ValidateOpsReleaseChecklistFileOptions = {
  profileId: string
}

export type ValidateOpsReleaseChecklistFileResult = LoadOpsReleaseChecklistResult & {
  validation: OpsReleaseChecklistValidationResult
}

export function opsReleaseChecklistPath(profileId: string): string {
  const normalizedProfileId = normalizeProfileId(profileId)
  return `${OPS_RELEASE_CHECKLIST_SOURCE_DIR}/${normalizedProfileId}.ops-release-checklist.json`
}

export function loadOpsReleaseChecklist(profileId: string): LoadOpsReleaseChecklistResult {
  const normalizedProfileId = normalizeProfileId(profileId)
  const sourcePath = opsReleaseChecklistPath(normalizedProfileId)
  if (!existsSync(sourcePath)) {
    throw new Error(`ops release checklist not found: ${sourcePath}`)
  }

  const checklist = JSON.parse(readFileSync(sourcePath, 'utf8')) as OpsReleaseChecklist
  if (checklist.profileId !== normalizedProfileId) {
    throw new Error(`ops release checklist profile mismatch: expected ${normalizedProfileId}, found ${String(checklist.profileId)}`)
  }

  return { profileId: normalizedProfileId, sourcePath, checklist }
}

export function validateOpsReleaseChecklistFile(
  options: ValidateOpsReleaseChecklistFileOptions,
): ValidateOpsReleaseChecklistFileResult {
  const loaded = loadOpsReleaseChecklist(options.profileId)
  const validation = validateOpsReleaseChecklist(loaded.checklist)
  const evidenceErrors = validateCodeEvidenceMarkers(loaded.checklist)
  validation.errors.push(...evidenceErrors)
  return {
    ...loaded,
    validation: {
      ok: validation.errors.length === 0,
      errors: validation.errors,
    },
  }
}

function validateCodeEvidenceMarkers(checklist: OpsReleaseChecklist): string[] {
  const errors: string[] = []
  for (const evidence of checklist.codeEvidence) {
    if (!existsSync(evidence.path)) {
      errors.push(`code evidence file not found: ${evidence.path}`)
      continue
    }
    const source = readFileSync(evidence.path, 'utf8')
    for (const marker of evidence.requiredMarkers) {
      if (!source.includes(marker)) {
        errors.push(`code evidence marker missing in ${evidence.path}: ${marker}`)
      }
    }
  }
  return errors
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_OPS_RELEASE_CHECKLIST_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid ops release checklist profile id: ${profileId}`)
  }
  return normalized
}

function optionArg(argv: string[], name: string, fallback: string): string {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === name) return argv[index + 1] ?? ''
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1)
  }
  return fallback
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = validateOpsReleaseChecklistFile({
      profileId: optionArg(process.argv.slice(2), '--profile', DEFAULT_OPS_RELEASE_CHECKLIST_PROFILE),
    })
    if (!result.validation.ok) {
      throw new Error(`ops release checklist ${result.sourcePath} is invalid: ${result.validation.errors.join('; ')}`)
    }
    console.log(`[ops-release-checklist] ${result.profileId} ok -> ${result.sourcePath}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

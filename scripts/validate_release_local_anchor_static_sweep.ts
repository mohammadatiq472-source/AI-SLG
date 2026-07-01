import { existsSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_PROFILE_ID = 'local-dev'
const CURRENT_ANCHOR_STAGES = [849, 851, 854, 855, 857, 858, 859, 860, 861] as const
const FORBIDDEN_PROFILE_PATTERN = /[^a-z0-9._-]/

type SweepOptions = {
  profileId: string
}

type SweepResult = {
  ok: boolean
  profileId: string
  manifestPath: string
  checkedStages: number[]
  errors: string[]
  nonClaims: string[]
}

type AnchorEntry = {
  stageId: number
  anchorId: string
  anchorClass: string
  status: string
  evidenceDirectory: string
  summaryJsonPath: string
  godotReportJsonPath: string
  screenshotEvidencePath: string
  nonClaims?: string[]
}

type RetentionEntry = {
  stage: number
  path: string
  retentionClass: string
  requiredEvidenceFiles: string[]
}

type ProgressStage = {
  stageId: number
  status: string
  evidence: string[]
}

type ProgressAnchor = {
  stageId: number
  anchorId: string
  smokeEvidence: string
}

const REQUIRED_NON_CLAIMS = [
  'does not claim hosted GitHub Actions run evidence',
  'does not treat Stage 846 local replay as hosted evidence',
  'does not start server:dev or tsx watch',
  'does not run Godot export',
  'does not invent staging/prod endpoints',
] as const

export function parseReleaseLocalAnchorStaticSweepArgs(argv: string[]): SweepOptions {
  let profileId = DEFAULT_PROFILE_ID
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') {
      profileId = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--profile=')) {
      profileId = arg.slice('--profile='.length)
      continue
    }
    throw new Error(`unknown release local anchor static sweep argument: ${arg}`)
  }
  return { profileId: normalizeProfileId(profileId) }
}

export function releaseLocalAnchorStaticSweepManifestPath(profileId: string): string {
  return `ops/release-artifacts/${normalizeProfileId(profileId)}.local-anchor-static-sweep.json`
}

export function validateReleaseLocalAnchorStaticSweep(options: SweepOptions): SweepResult {
  const profileId = normalizeProfileId(options.profileId)
  const manifestPath = releaseLocalAnchorStaticSweepManifestPath(profileId)
  const errors: string[] = []

  const manifest = readJson(manifestPath)
  if (manifest.status !== 'current Stage 856 local anchor static sweep') errors.push('manifest status mismatch')
  if (manifest.profileId !== profileId) errors.push('manifest profileId mismatch')
  if (manifest.nonStarting !== true) errors.push('manifest nonStarting must be true')
  if (manifest.sweepCommand !== `npm.cmd run release:local-anchor-static-sweep:check -- --profile ${profileId}`) {
    errors.push('manifest sweepCommand mismatch')
  }
  if (JSON.stringify(manifest.currentAnchorStages) !== JSON.stringify(CURRENT_ANCHOR_STAGES)) {
    errors.push('manifest currentAnchorStages mismatch')
  }
  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!manifest.nonClaims?.includes(nonClaim)) errors.push(`manifest missing non-claim: ${nonClaim}`)
  }

  const registry = readJson(`ops/release-artifacts/${profileId}.gameplay-anchor-registry.json`)
  const retention = readJson(`ops/release-artifacts/${profileId}.tmp-evidence-retention.json`)
  const progress = readJson(`ops/release-artifacts/${profileId}.boundary-convergence-progress.json`)
  const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

  for (const stageId of CURRENT_ANCHOR_STAGES) {
    const anchor = findAnchor(registry.registeredAnchors, stageId)
    if (!anchor) {
      errors.push(`Stage ${stageId} missing registered anchor`)
      continue
    }
    if (anchor.anchorClass !== 'formal-gameplay-anchor') errors.push(`Stage ${stageId} anchorClass mismatch`)
    if (!anchor.evidenceDirectory?.startsWith(`tmp/stage${stageId}`)) errors.push(`Stage ${stageId} evidence dir must be stage-scoped`)
    for (const evidencePath of [anchor.summaryJsonPath, anchor.godotReportJsonPath, anchor.screenshotEvidencePath]) {
      if (!existsSync(evidencePath)) errors.push(`Stage ${stageId} evidence missing: ${evidencePath}`)
    }
    if (anchor.nonClaims?.includes('not hosted GitHub Actions evidence') !== true) {
      errors.push(`Stage ${stageId} must explicitly avoid hosted GitHub Actions evidence claims`)
    }

    const retained = (retention.retainedEvidence as RetentionEntry[]).find(
      (entry) => entry.stage === stageId && entry.path === anchor.evidenceDirectory,
    )
    if (!retained) errors.push(`Stage ${stageId} missing tmp retention entry`)
    if (retained?.retentionClass !== 'formal-gameplay-anchor-evidence') errors.push(`Stage ${stageId} retention class mismatch`)
    if (JSON.stringify(retained?.requiredEvidenceFiles) !== JSON.stringify(['mainline_visual_smoke_summary.json', 'godot_visual_smoke_report.json'])) {
      errors.push(`Stage ${stageId} retention required files mismatch`)
    }

    const completed = (progress.completedStages as ProgressStage[]).find((entry) => entry.stageId === stageId)
    if (!completed) errors.push(`Stage ${stageId} missing Stage826 completed stage`)
    if (!completed?.evidence?.some((entry) => entry.includes(anchor.evidenceDirectory))) {
      errors.push(`Stage ${stageId} Stage826 evidence must include ${anchor.evidenceDirectory}`)
    }
    const progressAnchor = (progress.gameplayAnchors as ProgressAnchor[]).find(
      (entry) => entry.stageId === stageId && entry.anchorId === anchor.anchorId,
    )
    if (!progressAnchor) errors.push(`Stage ${stageId} missing Stage826 gameplay anchor`)
    if (!currentHandoff.includes(`Stage ${stageId}`) || !currentHandoff.includes(anchor.evidenceDirectory)) {
      errors.push(`Stage ${stageId} missing CURRENT handoff coverage`)
    }
  }

  if (!progress.mandatoryGuards?.includes('local_anchor_static_sweep_guard')) {
    errors.push('Stage826 missing local_anchor_static_sweep_guard')
  }

  return {
    ok: errors.length === 0,
    profileId,
    manifestPath,
    checkedStages: [...CURRENT_ANCHOR_STAGES],
    errors,
    nonClaims: [...REQUIRED_NON_CLAIMS],
  }
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_PROFILE_ID
  if (FORBIDDEN_PROFILE_PATTERN.test(normalized) || normalized.includes('..') || basename(normalized) !== normalized) {
    throw new Error(`invalid release local anchor static sweep profile id: ${profileId}`)
  }
  return normalized
}

function findAnchor(entries: AnchorEntry[], stageId: number): AnchorEntry | undefined {
  return entries.find((entry) => entry.stageId === stageId)
}

function readJson(path: string): any {
  return JSON.parse(readUtf8(path))
}

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = validateReleaseLocalAnchorStaticSweep(parseReleaseLocalAnchorStaticSweepArgs(process.argv.slice(2)))
    console.log(JSON.stringify(result, null, 2))
    if (!result.ok) {
      process.exitCode = 1
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

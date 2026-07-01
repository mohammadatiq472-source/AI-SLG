import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

type Args = {
  profile: string
}

type TmpEvidenceEntry = {
  path: string
  retentionClass: string
  deletionRequiresExplicitUserApproval: boolean
  currentHandoffReference?: string
  supersededBy?: string
  requiredEvidenceFiles?: string[]
}

type TmpEvidenceRetentionManifest = {
  manifestKind: string
  profileId: string
  policy: {
    noAutomaticDeletion: boolean
    retainedEvidenceRequiresCurrentHandoffReference: boolean
    cleanableCandidatesAreNotDeletedByGate: boolean
  }
  retainedEvidence: TmpEvidenceEntry[]
  cleanableCandidates: TmpEvidenceEntry[]
}

const DEFAULT_PROFILE = 'local-dev'
const DEFAULT_MANIFEST_NAME = 'local-dev.tmp-evidence-retention.json'

function parseArgs(argv: string[]): Args {
  const args: Args = { profile: DEFAULT_PROFILE }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') {
      const value = argv[index + 1]?.trim()
      if (!value) {
        throw new Error('--profile requires a value')
      }
      args.profile = value
      index += 1
    }
  }
  return args
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function listLocalStageDirs(repoRoot: string): string[] {
  const tmpRoot = resolve(repoRoot, 'tmp')
  if (!existsSync(tmpRoot)) {
    return []
  }
  return readdirSync(tmpRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^stage8\d+/.test(entry.name))
    .map((entry) => normalizePath(join('tmp', entry.name)))
    .sort()
}

function collectDirMetrics(path: string): { bytes: number; fileCount: number } {
  if (!existsSync(path)) {
    return { bytes: 0, fileCount: 0 }
  }
  let bytes = 0
  let fileCount = 0
  const stack = [path]
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const child of readdirSync(current, { withFileTypes: true })) {
      const childPath = join(current, child.name)
      if (child.isDirectory()) {
        stack.push(childPath)
      } else {
        fileCount += 1
        bytes += statSync(childPath).size
      }
    }
  }
  return { bytes, fileCount }
}

function assertManifestShape(manifest: TmpEvidenceRetentionManifest, profile: string): string[] {
  const errors: string[] = []
  if (manifest.manifestKind !== 'tmp-evidence-retention') {
    errors.push('manifestKind must be tmp-evidence-retention')
  }
  if (manifest.profileId !== profile) {
    errors.push(`profileId must be ${profile}`)
  }
  if (manifest.policy?.noAutomaticDeletion !== true) {
    errors.push('noAutomaticDeletion must be true')
  }
  if (manifest.policy?.retainedEvidenceRequiresCurrentHandoffReference !== true) {
    errors.push('retainedEvidenceRequiresCurrentHandoffReference must be true')
  }
  if (manifest.policy?.cleanableCandidatesAreNotDeletedByGate !== true) {
    errors.push('cleanableCandidatesAreNotDeletedByGate must be true')
  }
  return errors
}

function validateEntries(manifest: TmpEvidenceRetentionManifest): string[] {
  const errors: string[] = []
  const seen = new Map<string, string>()
  for (const [group, entries] of [
    ['retainedEvidence', manifest.retainedEvidence],
    ['cleanableCandidates', manifest.cleanableCandidates],
  ] as const) {
    for (const entry of entries) {
      const path = normalizePath(entry.path)
      const previous = seen.get(path)
      if (previous) {
        errors.push(`${path} appears in both ${previous} and ${group}`)
      }
      seen.set(path, group)
      if (!path.startsWith('tmp/stage')) {
        errors.push(`${path} must be a tmp/stage evidence path`)
      }
      if (entry.deletionRequiresExplicitUserApproval !== true) {
        errors.push(`${path} must require explicit deletion approval`)
      }
      if (group === 'retainedEvidence' && !entry.currentHandoffReference?.includes('Stage')) {
        errors.push(`${path} retained evidence must cite a CURRENT Stage reference`)
      }
      if (group === 'cleanableCandidates' && !entry.supersededBy && !entry.currentHandoffReference) {
        errors.push(`${path} cleanable candidate must cite supersededBy or CURRENT context`)
      }
    }
  }
  return errors
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = resolve(process.cwd())
  const manifestName = args.profile === DEFAULT_PROFILE
    ? DEFAULT_MANIFEST_NAME
    : `${args.profile}.tmp-evidence-retention.json`
  const manifestPath = join(repoRoot, 'ops', 'release-artifacts', manifestName)
  const manifest = readJson<TmpEvidenceRetentionManifest>(manifestPath)
  const shapeErrors = assertManifestShape(manifest, args.profile)
  const entryErrors = validateEntries(manifest)
  const retainedPaths = new Set(manifest.retainedEvidence.map((entry) => normalizePath(entry.path)))
  const cleanablePaths = new Set(manifest.cleanableCandidates.map((entry) => normalizePath(entry.path)))
  const classifiedPaths = new Set([...retainedPaths, ...cleanablePaths])
  const localStageDirs = listLocalStageDirs(repoRoot)
  const unclassifiedStageDirs = localStageDirs.filter((path) => !classifiedPaths.has(path))
  const retainedExisting = localStageDirs.filter((path) => retainedPaths.has(path))
  const cleanableExisting = localStageDirs.filter((path) => cleanablePaths.has(path))
  const retainedMissingRequiredFiles: Array<{ path: string; missingFiles: string[] }> = []

  for (const entry of manifest.retainedEvidence) {
    const requiredFiles = entry.requiredEvidenceFiles ?? []
    if (requiredFiles.length === 0) {
      continue
    }
    const absoluteDir = resolve(repoRoot, entry.path)
    if (!existsSync(absoluteDir)) {
      continue
    }
    const missingFiles = requiredFiles.filter((file) => !existsSync(resolve(absoluteDir, file)))
    if (missingFiles.length > 0) {
      retainedMissingRequiredFiles.push({ path: normalizePath(entry.path), missingFiles })
    }
  }

  const cleanableCandidateBytes = cleanableExisting.reduce((sum, path) => {
    return sum + collectDirMetrics(resolve(repoRoot, path)).bytes
  }, 0)
  const errors = [
    ...shapeErrors,
    ...entryErrors,
    ...unclassifiedStageDirs.map((path) => `${path} is not classified by ${manifestName}`),
    ...retainedMissingRequiredFiles.map((item) => `${item.path} missing files: ${item.missingFiles.join(', ')}`),
  ]
  const result = {
    ok: errors.length === 0,
    profileId: args.profile,
    manifestPath: normalizePath(join('ops', 'release-artifacts', manifestName)),
    noAutomaticDeletion: manifest.policy.noAutomaticDeletion,
    cleanableCandidatesAreNotDeletedByGate: manifest.policy.cleanableCandidatesAreNotDeletedByGate,
    localStageDirCount: localStageDirs.length,
    retainedExisting,
    cleanableExisting,
    cleanableCandidateBytes,
    unclassifiedStageDirs,
    retainedMissingRequiredFiles,
    errors,
  }

  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) {
    process.exitCode = 1
  }
}

main()

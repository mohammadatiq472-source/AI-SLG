import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

type Args = {
  profile: string
  dryRun: boolean
  apply: boolean
  confirmDeleteCleanableCandidates: boolean
}

type TmpEvidenceEntry = {
  path: string
  deletionRequiresExplicitUserApproval: boolean
}

type TmpEvidenceRetentionManifest = {
  manifestKind: string
  profileId: string
  policy: {
    noAutomaticDeletion: boolean
    cleanableCandidatesAreNotDeletedByGate: boolean
  }
  retainedEvidence: TmpEvidenceEntry[]
  cleanableCandidates: TmpEvidenceEntry[]
}

const DEFAULT_PROFILE = 'local-dev'
const CONFIRM_FLAG = '--confirm-delete-cleanable-candidates'

function parseArgs(argv: string[]): Args {
  const args: Args = {
    profile: DEFAULT_PROFILE,
    dryRun: true,
    apply: false,
    confirmDeleteCleanableCandidates: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') {
      const value = argv[index + 1]?.trim()
      if (!value) {
        throw new Error('--profile requires a value')
      }
      args.profile = value
      index += 1
    } else if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--apply') {
      args.apply = true
      args.dryRun = false
    } else if (arg === CONFIRM_FLAG) {
      args.confirmDeleteCleanableCandidates = true
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

function isSafeTmpPath(repoRoot: string, path: string): boolean {
  const tmpRoot = resolve(repoRoot, 'tmp')
  const absolute = resolve(repoRoot, path)
  const rel = relative(tmpRoot, absolute)
  return rel.length > 0 && !rel.startsWith('..') && !resolve(rel).startsWith(resolve(tmpRoot))
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = resolve(process.cwd())
  const manifestName = `${args.profile}.tmp-evidence-retention.json`
  const manifestPath = join(repoRoot, 'ops', 'release-artifacts', manifestName)
  const manifest = readJson<TmpEvidenceRetentionManifest>(manifestPath)
  const retainedPaths = new Set(manifest.retainedEvidence.map((entry) => normalizePath(entry.path)))
  const cleanablePaths = new Set(manifest.cleanableCandidates.map((entry) => normalizePath(entry.path)))
  const classifiedPaths = new Set([...retainedPaths, ...cleanablePaths])
  const localStageDirs = listLocalStageDirs(repoRoot)
  const unclassifiedStageDirs = localStageDirs.filter((path) => !classifiedPaths.has(path))
  const retainedExisting = localStageDirs.filter((path) => retainedPaths.has(path))
  const cleanableExisting = localStageDirs.filter((path) => cleanablePaths.has(path))
  const cleanableWithoutApproval = manifest.cleanableCandidates
    .filter((entry) => entry.deletionRequiresExplicitUserApproval !== true)
    .map((entry) => normalizePath(entry.path))
  const unsafeCleanablePaths = cleanableExisting.filter((path) => !isSafeTmpPath(repoRoot, path))
  const applyRequiresExplicitConfirmation = args.apply && !args.confirmDeleteCleanableCandidates
  const errors = [
    ...(manifest.manifestKind !== 'tmp-evidence-retention' ? ['manifestKind must be tmp-evidence-retention'] : []),
    ...(manifest.profileId !== args.profile ? [`profileId must be ${args.profile}`] : []),
    ...(manifest.policy?.noAutomaticDeletion !== true ? ['noAutomaticDeletion must be true'] : []),
    ...(manifest.policy?.cleanableCandidatesAreNotDeletedByGate !== true
      ? ['cleanableCandidatesAreNotDeletedByGate must be true']
      : []),
    ...unclassifiedStageDirs.map((path) => `${path} is not classified by ${manifestName}`),
    ...cleanableWithoutApproval.map((path) => `${path} lacks deletionRequiresExplicitUserApproval=true`),
    ...unsafeCleanablePaths.map((path) => `${path} is not safe to delete`),
    ...(applyRequiresExplicitConfirmation ? [`--apply requires ${CONFIRM_FLAG}`] : []),
  ]
  const cleanableCandidateBytes = cleanableExisting.reduce((sum, path) => {
    return sum + collectDirMetrics(resolve(repoRoot, path)).bytes
  }, 0)
  const deletedPaths: string[] = []
  const wouldDeletePaths = args.apply ? [] : cleanableExisting

  if (errors.length === 0 && args.apply) {
    for (const path of cleanableExisting) {
      if (retainedPaths.has(path)) {
        throw new Error(`refusing to delete retained evidence: ${path}`)
      }
      rmSync(resolve(repoRoot, path), { recursive: true, force: true })
      deletedPaths.push(path)
    }
  }

  const result = {
    ok: errors.length === 0,
    profileId: args.profile,
    mode: args.apply ? 'apply' : 'dry-run',
    manifestPath: normalizePath(join('ops', 'release-artifacts', manifestName)),
    applyRequiresExplicitConfirmation,
    confirmFlag: CONFIRM_FLAG,
    noOneCommandDeletingNpmEntry: true,
    retainedSkippedPaths: retainedExisting,
    cleanableExisting,
    cleanableCandidateBytes,
    unclassifiedStageDirs,
    wouldDeletePaths,
    deletedPaths,
    errors,
  }

  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) {
    process.exitCode = 1
  }
}

main()

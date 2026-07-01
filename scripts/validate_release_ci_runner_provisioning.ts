import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_CI_RUNNER_PROVISIONING_PROFILE = 'local-dev'
export const RELEASE_CI_RUNNER_PROVISIONING_CHECKLIST =
  'docs/RELEASE_CANDIDATE_CI_RUNNER_PROVISIONING_CHECKLIST_CURRENT_2026_06_16.md'

export type ReleaseCiRunnerProvisioningOptions = {
  profileId: string
}

export type ReleaseCiRunnerProvisioningCheckStatus = 'present' | 'declared' | 'missing' | 'invalid'

export type ReleaseCiRunnerProvisioningCheck = {
  label: string
  ok: boolean
  status: ReleaseCiRunnerProvisioningCheckStatus
  detail?: string
}

export type ReleaseCiRunnerProvisioningResult = {
  profileId: string
  ok: boolean
  checks: ReleaseCiRunnerProvisioningCheck[]
  errors: string[]
}

type ReleaseCiRunnerProvisioningChecklist = {
  status: string
  workflow: string
  ciCommand: string
  runner: {
    os: string
    nodeVersion: string
    timeoutMinutes: number
    diskBudgetGb: number
  }
  godot: {
    version: string
    downloadAsset: string
    exportTemplatesAsset: string
    binaryEnv: string
    fallbackBinaryEnv: string
    templateVersion: string
  }
  exportPreset: {
    name: string
    presetFile: string
    artifactPath: string
  }
  artifactUpload: {
    action: string
    name: string
    retentionDays: number
    ifNoFilesFound: string
    paths: string[]
  }
  logRetention: {
    summary: string
    paths: string[]
  }
}

export function parseReleaseCiRunnerProvisioningArgs(argv: string[]): ReleaseCiRunnerProvisioningOptions {
  let profileId = DEFAULT_RELEASE_CI_RUNNER_PROVISIONING_PROFILE

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
    throw new Error(`unknown release CI runner provisioning argument: ${arg}`)
  }

  return { profileId: normalizeProfileId(profileId) }
}

export function releaseCiRunnerProvisioningChecklistPath(profileId: string): string {
  normalizeProfileId(profileId)
  return RELEASE_CI_RUNNER_PROVISIONING_CHECKLIST
}

export function buildReleaseCiRunnerProvisioningChecks(
  options: ReleaseCiRunnerProvisioningOptions,
): ReleaseCiRunnerProvisioningCheck[] {
  const profileId = normalizeProfileId(options.profileId)
  const checklistPath = releaseCiRunnerProvisioningChecklistPath(profileId)
  const checks: ReleaseCiRunnerProvisioningCheck[] = []

  if (!existsSync(checklistPath)) {
    return [
      {
        label: 'CI runner checklist',
        ok: false,
        status: 'missing',
        detail: `checklist not found: ${checklistPath}`,
      },
    ]
  }

  const checklistDoc = readFileSync(checklistPath, 'utf8')
  const checklist = parseChecklistJson(checklistDoc, checklistPath)
  const workflowPath = checklist.workflow
  const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf8') : ''
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts?: Record<string, string>
  }

  checks.push(checkChecklist(
    'CI runner checklist',
    'present',
    checklist.status === 'current release candidate CI runner provisioning checklist' &&
      checklistPath === RELEASE_CI_RUNNER_PROVISIONING_CHECKLIST,
    `checklist status/path mismatch in ${checklistPath}`,
  ))

  checks.push(checkChecklist(
    'workflow runner budget',
    'declared',
    checklist.workflow === '.github/workflows/release-candidate-boundary-gate.yml' &&
      checklist.runner.os === 'windows-latest' &&
      checklist.runner.nodeVersion === '22' &&
      checklist.runner.timeoutMinutes === 60 &&
      checklist.runner.diskBudgetGb === 20 &&
      workflowIncludes(workflow, [
        'runs-on: windows-latest',
        'timeout-minutes: 60',
        'RELEASE_CANDIDATE_DISK_BUDGET_GB: \'20\'',
        'Check runner disk and time budget',
      ]),
    'runner OS, Node, timeout, or disk budget is not declared consistently',
  ))

  checks.push(checkChecklist(
    'Godot engine provisioning',
    'declared',
    checklist.godot.version === '4.6.2' &&
      checklist.godot.downloadAsset === 'Godot_v4.6.2-stable_win64.exe.zip' &&
      checklist.godot.binaryEnv === 'GODOT_CONSOLE_EXE' &&
      checklist.godot.fallbackBinaryEnv === 'GODOT_EXE' &&
      workflowIncludes(workflow, [
        'GODOT_VERSION: \'4.6.2\'',
        'Godot_v4.6.2-stable_win64.exe.zip',
        'GODOT_CONSOLE_EXE',
        'GODOT_EXE',
        'Provision Godot 4.6.2',
      ]),
    'Godot engine provisioning is missing or does not match the pinned release',
  ))

  checks.push(checkChecklist(
    'Godot export templates provisioning',
    'declared',
    checklist.godot.exportTemplatesAsset === 'Godot_v4.6.2-stable_export_templates.tpz' &&
      checklist.godot.templateVersion === '4.6.2.stable' &&
      workflowIncludes(workflow, [
        'Godot_v4.6.2-stable_export_templates.tpz',
        'export_templates',
        '4.6.2.stable',
      ]),
    'Godot export templates are not provisioned for the pinned release',
  ))

  checks.push(checkChecklist(
    'export preset and artifact path',
    'declared',
    checklist.exportPreset.name === 'Windows Desktop' &&
      checklist.exportPreset.presetFile === 'godot-client/export_presets.cfg' &&
      checklist.exportPreset.artifactPath === 'exports/windows/SLG Commander.exe' &&
      existsSync(checklist.exportPreset.presetFile) &&
      readFileSync(checklist.exportPreset.presetFile, 'utf8').includes('name="Windows Desktop"') &&
      workflowIncludes(workflow, [
        'GODOT_EXPORT_PRESET: Windows Desktop',
        'RELEASE_CANDIDATE_EXPORT_ARTIFACT: exports/windows/SLG Commander.exe',
      ]),
    'Godot export preset or release artifact path is not declared consistently',
  ))

  checks.push(checkChecklist(
    'formal CI release candidate command',
    'declared',
    checklist.ciCommand === 'npm run ci:release-candidate:local-dev' &&
      packageJson.scripts?.['release:ci-runner:provisioning-check'] ===
        'tsx scripts/validate_release_ci_runner_provisioning.ts' &&
      packageJson.scripts?.['ci:release-candidate:local-dev'] === 'npm run release:candidate:local-dev --' &&
      workflowIncludes(workflow, [
        'npm run release:ci-runner:provisioning-check',
        'npm run ci:release-candidate:local-dev',
      ]),
    'CI command or provisioning gate script is not wired to the formal release candidate lane',
  ))

  checks.push(checkChecklist(
    'release artifact upload',
    'declared',
    checklist.artifactUpload.action === 'actions/upload-artifact@v4' &&
      checklist.artifactUpload.name === 'release-candidate-local-dev' &&
      checklist.artifactUpload.retentionDays === 14 &&
      checklist.artifactUpload.ifNoFilesFound === 'warn' &&
      requiredItemsPresent(checklist.artifactUpload.paths, [
        'exports/windows/SLG Commander.exe',
        'ops/release-artifacts/generated/*.json',
        'ops/release-artifacts/local-dev.ops-release-checklist.json',
        'ops/release-artifacts/local-dev.boundary-convergence-progress.json',
        'ops/release-artifacts/local-dev.boundary-change-registration.json',
        'ops/release-artifacts/local-dev.gameplay-anchor-evidence-template.json',
        'ops/release-artifacts/local-dev.gameplay-anchor-registry.json',
        'ops/release-artifacts/local-dev.tmp-evidence-retention.json',
        'tmp/godot_release_export_stdout.log',
        'tmp/godot_release_export_stderr.log',
      ]) &&
      workflowIncludes(workflow, [
        'actions/upload-artifact@v4',
        'name: release-candidate-local-dev',
        'retention-days: 14',
        'if-no-files-found: warn',
      ]),
    'release artifact upload is not declared consistently',
  ))

  checks.push(checkChecklist(
    'log retention and step summary',
    'declared',
    checklist.logRetention.summary === 'GITHUB_STEP_SUMMARY' &&
      requiredItemsPresent(checklist.logRetention.paths, [
        'tmp/godot_release_export_stdout.log',
        'tmp/godot_release_export_stderr.log',
      ]) &&
      workflowIncludes(workflow, [
        'GITHUB_STEP_SUMMARY',
        'tmp/godot_release_export_stdout.log',
        'tmp/godot_release_export_stderr.log',
        'Summarize release candidate artifacts',
      ]),
    'Godot export logs or GitHub step summary are not retained',
  ))

  return checks
}

export function validateReleaseCiRunnerProvisioning(
  options: ReleaseCiRunnerProvisioningOptions,
): ReleaseCiRunnerProvisioningResult {
  const profileId = normalizeProfileId(options.profileId)
  const checks = buildReleaseCiRunnerProvisioningChecks({ profileId })
  const errors = checks
    .filter((check) => !check.ok)
    .map((check) => `${check.label}: ${check.detail ?? check.status}`)

  return {
    profileId,
    ok: errors.length === 0,
    checks,
    errors,
  }
}

function parseChecklistJson(doc: string, sourcePath: string): ReleaseCiRunnerProvisioningChecklist {
  const match = doc.match(/```json\s*\n([\s\S]*?)\n```/)
  if (!match) {
    throw new Error(`CI runner provisioning checklist missing JSON block: ${sourcePath}`)
  }
  return JSON.parse(match[1]) as ReleaseCiRunnerProvisioningChecklist
}

function checkChecklist(
  label: string,
  status: ReleaseCiRunnerProvisioningCheckStatus,
  ok: boolean,
  detail: string,
): ReleaseCiRunnerProvisioningCheck {
  return {
    label,
    ok,
    status: ok ? status : 'invalid',
    detail: ok ? undefined : detail,
  }
}

function workflowIncludes(workflow: string, tokens: string[]): boolean {
  return tokens.every((token) => workflow.includes(token))
}

function requiredItemsPresent(actual: string[], required: string[]): boolean {
  return required.every((item) => actual.includes(item))
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_RELEASE_CI_RUNNER_PROVISIONING_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release CI runner provisioning profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const options = parseReleaseCiRunnerProvisioningArgs(process.argv.slice(2))
    const result = validateReleaseCiRunnerProvisioning(options)
    if (!result.ok) {
      throw new Error(`release CI runner provisioning is invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[release-ci-runner-provisioning] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

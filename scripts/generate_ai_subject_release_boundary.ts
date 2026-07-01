import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS,
  validateAiSubjectReleaseBoundaryManifest,
  type AiSubjectReleaseBoundaryManifest,
} from '../shared/contracts/release/aiSubjectReleaseBoundaryManifest'

export const DEFAULT_AI_SUBJECT_RELEASE_BOUNDARY_PROFILE = 'local-dev'
export const GENERATED_AI_SUBJECT_RELEASE_BOUNDARY_DIR = 'ops/release-artifacts/generated'

export type GenerateAiSubjectReleaseBoundaryOptions = {
  profileId: string
  write?: boolean
}

export type GenerateAiSubjectReleaseBoundaryResult = {
  profileId: string
  outputPath: string
  manifest: AiSubjectReleaseBoundaryManifest
  written: boolean
}

type AiSubjectBoundaryCodeEvidence = AiSubjectReleaseBoundaryManifest['codeEvidence'][number]

const AI_SUBJECT_BOUNDARY_CODE_EVIDENCE: AiSubjectBoundaryCodeEvidence[] = [
  {
    path: 'server/src/application/ai/aiPlayerSubjectReadModel.ts',
    requiredMarkers: [
      "schemaVersion: 'ai_player_subject_read_model_v1'",
      'readOnly: true',
      "aiReadEntrypoint: 'GET /api/ai/players/:id/subject'",
      "sourceRefsVisibility: 'internal_link_only'",
      'clientMutationAllowed: false',
      'supportSurfacesAreAuthority: false',
      "contractId: 'ai_player_subject_history_anchors_v1'",
      "contractId: 'ai_player_subject_recovery_anchors_v1'",
      "contractId: 'ai_player_subject_recent_body_changes_v1'",
    ],
  },
  {
    path: 'server/src/routes/aiPlayerRuntimeRoutes.ts',
    requiredMarkers: [
      'buildAiPlayerSubjectReadModel(runtime',
      "operation === 'subject'",
    ],
  },
  {
    path: 'server/src/application/ai/aiPlayerAutonomousDevelopmentService.ts',
    requiredMarkers: [
      'buildAiPlayerSubjectReadModel(runtime',
      'subjectRecoveryCommands',
    ],
  },
]

export function aiSubjectReleaseBoundaryOutputPath(profileId: string): string {
  const normalizedProfileId = normalizeProfileId(profileId)
  return `${GENERATED_AI_SUBJECT_RELEASE_BOUNDARY_DIR}/${normalizedProfileId}.ai-subject-boundary.json`
}

export function generateAiSubjectReleaseBoundary(
  options: GenerateAiSubjectReleaseBoundaryOptions,
): GenerateAiSubjectReleaseBoundaryResult {
  const profileId = normalizeProfileId(options.profileId)
  const outputPath = aiSubjectReleaseBoundaryOutputPath(profileId)
  const codeEvidence = collectCodeEvidence()
  const manifest: AiSubjectReleaseBoundaryManifest = {
    manifestKind: 'ai-subject-release-boundary',
    profileId,
    aiReadEntrypoints: [
      {
        route: 'GET /api/ai/players/:id/subject',
        schemaVersion: 'ai_player_subject_read_model_v1',
        producer: 'buildAiPlayerSubjectReadModel',
        ownerLabels: ['server-owned', 'AI-read'],
        serverProduced: true,
        readOnly: true,
        clientMutationAllowed: false,
        directPrivateSourceRefsAllowed: false,
        sourceRefsVisibility: 'internal_link_only',
      },
    ],
    approvedSubjectInputs: [
      {
        packet: 'ai_player_subject_read_model_v1',
        producer: 'buildAiPlayerSubjectReadModel',
        visibility: 'AI-read',
        serverProduced: true,
        directRead: false,
        sourceRefsPolicy: 'none',
      },
      {
        packet: 'ai_player_subject_recent_body_changes_v1',
        producer: 'buildAiPlayerSubjectReadModel.recentBodyChanges',
        visibility: 'AI-read',
        serverProduced: true,
        directRead: false,
        sourceRefsPolicy: 'none',
      },
      {
        packet: 'ai_player_subject_history_anchors_v1',
        producer: 'buildAiPlayerSubjectReadModel.recentHistoryAnchors',
        visibility: 'server-produced-internal-link-only',
        serverProduced: true,
        directRead: false,
        sourceRefsPolicy: 'internal_link_only_visible_false',
      },
      {
        packet: 'ai_player_subject_recovery_anchors_v1',
        producer: 'buildAiPlayerSubjectReadModel.recentRecoveryAnchors',
        visibility: 'server-produced-internal-link-only',
        serverProduced: true,
        directRead: false,
        sourceRefsPolicy: 'internal_link_only_visible_false',
      },
      {
        packet: 'ai_player_autonomous_subject_recovery_commands_v1',
        producer: 'AiPlayerAutonomousDevelopmentService.subjectRecoveryCommands',
        visibility: 'AI-read',
        serverProduced: true,
        directRead: false,
        sourceRefsPolicy: 'none',
      },
    ],
    sourceRefsPolicy: {
      directPrivateSourceRefsAllowed: false,
      allowedWithinSubjectPacket: 'internal_link_only',
      visibleToPlayer: false,
      visibleToClient: false,
      rawPersistencePathsAllowed: false,
      providerKeysAllowed: false,
      restoreTokensAllowed: false,
    },
    packetExpiryRules: {
      subjectPacketBuild: 'server_rebuild_per_request',
      clientCacheAuthority: 'none',
      maxClientCacheTtlMs: 0,
      stalePacketAction: 'discard_and_refetch_subject',
      recoveryAnchorRetentionOwner: 'server',
    },
    driftProtection: {
      generatedArtifactPath: outputPath,
      releaseArtifactDriftTarget: 'AI subject boundary manifest',
      driftGateCommand: `npm.cmd run release:artifact-drift:check -- --profile ${profileId}`,
      releaseCandidateStep: 'verify release artifact drift is clean',
      generatorIsSourceOfTruth: true,
      addNewAiInputRequiresManifestUpdate: true,
      failOnUnlistedSubjectInput: true,
      privateInputDriftAction: 'reject_manifest',
    },
    forbiddenPrivateInputs: [...AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS],
    codeEvidence,
    generatedBy: {
      script: 'scripts/generate_ai_subject_release_boundary.ts',
    },
  }

  const validation = validateAiSubjectReleaseBoundaryManifest(manifest)
  if (!validation.ok) {
    throw new Error(`AI subject release boundary manifest is invalid: ${validation.errors.join('; ')}`)
  }

  const write = options.write ?? true
  if (write) {
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  }

  return { profileId, outputPath, manifest, written: write }
}

function collectCodeEvidence(): AiSubjectBoundaryCodeEvidence[] {
  for (const evidence of AI_SUBJECT_BOUNDARY_CODE_EVIDENCE) {
    const content = readFileSync(evidence.path, 'utf8')
    for (const marker of evidence.requiredMarkers) {
      if (!content.includes(marker)) {
        throw new Error(`AI subject release boundary code marker missing in ${evidence.path}: ${marker}`)
      }
    }
  }
  return AI_SUBJECT_BOUNDARY_CODE_EVIDENCE.map((evidence) => ({
    path: evidence.path,
    requiredMarkers: [...evidence.requiredMarkers],
  }))
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_AI_SUBJECT_RELEASE_BOUNDARY_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid ai subject release boundary profile id: ${profileId}`)
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
    const result = generateAiSubjectReleaseBoundary({
      profileId: optionArg(process.argv.slice(2), '--profile', DEFAULT_AI_SUBJECT_RELEASE_BOUNDARY_PROFILE),
      write: true,
    })
    console.log(`[ai-subject-release-boundary-generate] ${result.profileId} -> ${result.outputPath}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

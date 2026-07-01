import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type {
  AiPlayerProviderAccountOpsRuntimeConfigResponse,
  RestoreAiPlayerProviderAccountPoolOpsConfigRequest,
  UpsertAiPlayerProviderAccountPoolOpsConfigRequest,
} from '../../../shared/contracts/aiPlayerProviderAccount'
import {
  getAiPlayerProviderAccountOpsMutationDeployment,
  PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY_ENV,
  PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_ENV,
  PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET_ENV,
} from '../application/ai/aiPlayerProviderAccountOpsDeployment'

const DEFAULT_PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES = ['provider_ops_admin', 'admin'] as const
const DEFAULT_PROVIDER_ACCOUNT_OPS_AUTH_SOURCE = 'rbac_middleware'
const PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES_ENV = 'AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES'
const PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES_ENV = 'AI_PLAYER_PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES'
const PROVIDER_ACCOUNT_OPS_ACTOR_HEADER = 'x-ai-provider-ops-actor-id'
const PROVIDER_ACCOUNT_OPS_ROLE_HEADER = 'x-ai-provider-ops-role'
const PROVIDER_ACCOUNT_OPS_ROLES_HEADER = 'x-ai-provider-ops-roles'
const PROVIDER_ACCOUNT_OPS_AUTH_SOURCE_HEADER = 'x-ai-provider-ops-auth-source'
const PROVIDER_ACCOUNT_OPS_PROXY_SIGNATURE_HEADER = 'x-ai-provider-ops-proxy-signature'
const PROVIDER_ACCOUNT_OPS_PROXY_TIMESTAMP_HEADER = 'x-ai-provider-ops-proxy-timestamp'
const PROVIDER_ACCOUNT_OPS_PROXY_SIGNATURE_SKEW_MS = 5 * 60 * 1000

type ProviderAccountOpsClock = {
  nowIso?: () => string
}

function readHeaderValue(req: IncomingMessage, name: string): string | null {
  const value = req.headers[name]
  if (Array.isArray(value)) {
    return value.find((item) => item.trim())?.trim() ?? null
  }
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function parseOpsEnvList(name: string, fallback: readonly string[]) {
  const raw = process.env[name]?.trim()
  const configured = Boolean(raw)
  const values = raw
    ? raw.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean)
    : fallback.slice()
  return {
    configured,
    values,
  }
}

function readProviderAccountOpsAllowedRoles() {
  return parseOpsEnvList(PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES_ENV, DEFAULT_PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES)
}

function readProviderAccountOpsAllowedAuthSources() {
  return parseOpsEnvList(PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES_ENV, [DEFAULT_PROVIDER_ACCOUNT_OPS_AUTH_SOURCE])
}

function buildProviderAccountOpsReadOnlyConsumer(prefix: string) {
  return {
    mutationRequired: false as const,
    exposesSecrets: false as const,
    exposesRawProviderPayloads: false as const,
    routes: [
      {
        id: 'ops_runtime_config' as const,
        method: 'GET' as const,
        path: `${prefix}/account-pool/ops-runtime-config`,
        responseContract: 'AiPlayerProviderAccountOpsRuntimeConfigResponse' as const,
        optionalQueryParams: [],
        safeFields: [
          'opsMutationDeployment',
          'trustedProxyVerification',
          'actorBinding',
          'readOnlyConsumer',
          'warnings',
        ],
        forbiddenFields: [
          'apiKey',
          'authorization',
          'trustedProxySignatureSecretValue',
          'rawProviderPayload',
          'rawResponse',
        ],
      },
      {
        id: 'account_pool' as const,
        method: 'GET' as const,
        path: `${prefix}/account-pool`,
        responseContract: 'AiPlayerProviderAccountPoolReadModelResponse' as const,
        optionalQueryParams: ['factionId', 'ownerPlayerId', 'governorPlayerId'],
        safeFields: [
          'accountCount',
          'dispatchEligibleCount',
          'selectedAccount',
          'accounts[].provider',
          'accounts[].model',
          'accounts[].keyFingerprint',
          'accounts[].source',
          'accounts[].byokSource',
          'accounts[].healthStatus',
          'accounts[].dispatchEligible',
          'accounts[].rejectionReasons',
          'accounts[].ops.enabled',
          'accounts[].ops.maxConcurrency',
          'accounts[].ops.enterpriseQuota',
          'accounts[].ops.quotaLabel',
          'accounts[].health',
          'accounts[].billing',
        ],
        forbiddenFields: [
          'accounts[].apiKey',
          'accounts[].authorization',
          'accounts[].rawProviderPayload',
          'accounts[].prompt',
          'accounts[].completion',
          'accounts[].rawResponse',
        ],
      },
      {
        id: 'ops_audit' as const,
        method: 'GET' as const,
        path: `${prefix}/account-pool/ops-audit`,
        responseContract: 'ListAiPlayerProviderAccountPoolOpsAuditResponse' as const,
        optionalQueryParams: ['provider', 'model', 'keyFingerprint', 'actorId', 'enabled', 'limit'],
        safeFields: [
          'count',
          'items[].eventId',
          'items[].actorId',
          'items[].provider',
          'items[].model',
          'items[].keyFingerprint',
          'items[].action',
          'items[].enabled',
          'items[].opsReason',
          'items[].authRole',
          'items[].authSource',
          'items[].restoreSourceEventId',
          'items[].maxConcurrency',
          'items[].enterpriseQuota',
          'items[].quotaLabel',
          'items[].createdAt',
        ],
        forbiddenFields: [
          'items[].apiKey',
          'items[].authorization',
          'items[].rawProviderPayload',
          'items[].prompt',
          'items[].completion',
          'items[].rawResponse',
        ],
      },
    ],
  }
}

function parseProviderAccountOpsAllowedRoles() {
  return new Set(readProviderAccountOpsAllowedRoles().values)
}

function parseProviderAccountOpsAllowedAuthSources() {
  return new Set(readProviderAccountOpsAllowedAuthSources().values)
}

function readTrustedProxySignatureSecret() {
  return process.env[PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET_ENV]?.trim() ?? ''
}

function safeTextEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function buildTrustedProxySignature(method: string, path: string, timestamp: string, secret: string) {
  const signature = createHmac('sha256', secret)
    .update(`${method.toUpperCase()}\n${path}\n${timestamp}`)
    .digest('hex')
  return `sha256=${signature}`
}

function readProviderAccountOpsNowMs(clock?: ProviderAccountOpsClock) {
  const injectedNow = clock?.nowIso?.()
  if (injectedNow) {
    const injectedNowMs = Date.parse(injectedNow)
    if (Number.isFinite(injectedNowMs)) {
      return injectedNowMs
    }
  }
  return Date.now()
}

function isTrustedProxySignatureFresh(timestamp: string, clock?: ProviderAccountOpsClock) {
  const parsed = Date.parse(timestamp)
  return Number.isFinite(parsed)
    && Math.abs(readProviderAccountOpsNowMs(clock) - parsed) <= PROVIDER_ACCOUNT_OPS_PROXY_SIGNATURE_SKEW_MS
}

function verifyTrustedProxySignature(req: IncomingMessage, path: string, clock?: ProviderAccountOpsClock) {
  const deployment = getAiPlayerProviderAccountOpsMutationDeployment()
  if (!deployment.trustedProxySignatureRequired) {
    return true
  }
  const timestamp = readHeaderValue(req, PROVIDER_ACCOUNT_OPS_PROXY_TIMESTAMP_HEADER)
  const signature = readHeaderValue(req, PROVIDER_ACCOUNT_OPS_PROXY_SIGNATURE_HEADER)
  const secret = readTrustedProxySignatureSecret()
  if (!timestamp || !signature || !secret || !isTrustedProxySignatureFresh(timestamp, clock)) {
    return false
  }
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) {
    return false
  }
  const expected = buildTrustedProxySignature(req.method ?? 'GET', path, timestamp, secret)
  return safeTextEquals(signature, expected)
}

export function rejectUntrustedProviderAccountOpsMutation(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  clock?: ProviderAccountOpsClock,
) {
  const deployment = getAiPlayerProviderAccountOpsMutationDeployment()
  if (!deployment.mutationRoutesEnabled) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: deployment.blockedReason ?? 'provider_account_ops_deployment_not_trusted' }))
    return true
  }
  if (!verifyTrustedProxySignature(req, path, clock)) {
    res.statusCode = 403
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: 'provider_account_ops_proxy_not_trusted' }))
    return true
  }
  return false
}

function resolveProviderAccountOpsRuntimeConfigGeneratedAt(clock?: ProviderAccountOpsClock) {
  return clock?.nowIso?.() ?? new Date().toISOString()
}

export function buildProviderAccountOpsRuntimeConfig(
  prefix: string,
  clock?: ProviderAccountOpsClock,
): AiPlayerProviderAccountOpsRuntimeConfigResponse {
  const deployment = getAiPlayerProviderAccountOpsMutationDeployment()
  const allowedRoles = readProviderAccountOpsAllowedRoles()
  const allowedAuthSources = readProviderAccountOpsAllowedAuthSources()
  return {
    ok: true,
    generatedAt: resolveProviderAccountOpsRuntimeConfigGeneratedAt(clock),
    opsMutationDeployment: deployment,
    deploymentGuardEnv: {
      internalOnly: PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY_ENV,
      trustedProxy: PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_ENV,
      trustedProxySignatureSecret: PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET_ENV,
    },
    trustedProxyVerification: {
      signatureRequired: deployment.trustedProxySignatureRequired,
      signatureSecretConfigured: deployment.trustedProxySignatureConfigured,
      signatureAlgorithm: 'hmac-sha256',
      signatureHeader: 'X-AI-Provider-Ops-Proxy-Signature',
      timestampHeader: 'X-AI-Provider-Ops-Proxy-Timestamp',
      maxSkewMs: PROVIDER_ACCOUNT_OPS_PROXY_SIGNATURE_SKEW_MS,
    },
    authEnv: {
      allowedRoles: PROVIDER_ACCOUNT_OPS_ALLOWED_ROLES_ENV,
      allowedAuthSources: PROVIDER_ACCOUNT_OPS_ALLOWED_AUTH_SOURCES_ENV,
    },
    actorBinding: {
      actorHeader: 'X-AI-Provider-Ops-Actor-Id',
      roleHeaders: ['X-AI-Provider-Ops-Role', 'X-AI-Provider-Ops-Roles'],
      authSourceHeader: 'X-AI-Provider-Ops-Auth-Source',
      defaultAuthSource: DEFAULT_PROVIDER_ACCOUNT_OPS_AUTH_SOURCE,
      allowedRolesConfigured: allowedRoles.configured,
      allowedRoleCount: allowedRoles.values.length,
      allowedAuthSourcesConfigured: allowedAuthSources.configured,
      allowedAuthSourceCount: allowedAuthSources.values.length,
    },
    mutationRoutes: [
      {
        method: 'POST',
        path: `${prefix}/account-pool/ops-config`,
        requiresActor: true,
        requiresReason: true,
        requiresConfirmation: 'provider_account_ops_confirmed',
        productionDeploymentGuard: true,
      },
      {
        method: 'POST',
        path: `${prefix}/account-pool/ops-restore`,
        requiresActor: true,
        requiresReason: true,
        requiresConfirmation: 'provider_account_ops_confirmed',
        productionDeploymentGuard: true,
      },
    ],
    readRoutes: [
      {
        method: 'GET',
        path: `${prefix}/account-pool`,
        requiresActor: false,
        requiresReason: false,
        requiresConfirmation: null,
        productionDeploymentGuard: false,
      },
      {
        method: 'GET',
        path: `${prefix}/account-pool/ops-audit`,
        requiresActor: false,
        requiresReason: false,
        requiresConfirmation: null,
        productionDeploymentGuard: false,
      },
      {
        method: 'GET',
        path: `${prefix}/account-pool/ops-runtime-config`,
        requiresActor: false,
        requiresReason: false,
        requiresConfirmation: null,
        productionDeploymentGuard: false,
      },
    ],
    readOnlyConsumer: buildProviderAccountOpsReadOnlyConsumer(prefix),
    warnings: deployment.blockedReason ? [deployment.blockedReason] : [],
  }
}

function parseProviderAccountOpsRoles(req: IncomingMessage) {
  const raw = [
    readHeaderValue(req, PROVIDER_ACCOUNT_OPS_ROLE_HEADER),
    readHeaderValue(req, PROVIDER_ACCOUNT_OPS_ROLES_HEADER),
  ].filter(Boolean).join(',')
  return raw.split(/[,\s]+/)
    .map((item) => item.trim())
    .filter((item) => /^[a-zA-Z0-9:_-]{1,80}$/.test(item))
}

function readProviderAccountOpsActor(req: IncomingMessage) {
  const actorId = readHeaderValue(req, PROVIDER_ACCOUNT_OPS_ACTOR_HEADER)
  return actorId && /^[a-zA-Z0-9_-]{1,80}$/.test(actorId) ? actorId : null
}

function readProviderAccountOpsAuthSource(req: IncomingMessage) {
  const authSource = readHeaderValue(req, PROVIDER_ACCOUNT_OPS_AUTH_SOURCE_HEADER)
  return authSource && /^[a-zA-Z0-9:_-]{1,80}$/.test(authSource) ? authSource : null
}

export function bindProviderAccountOpsActor<
  T extends UpsertAiPlayerProviderAccountPoolOpsConfigRequest | RestoreAiPlayerProviderAccountPoolOpsConfigRequest,
>(
  req: IncomingMessage,
  input: T,
): { ok: true; value: T } | { ok: false; error: string } {
  const actorId = readProviderAccountOpsActor(req)
  const roles = parseProviderAccountOpsRoles(req)
  const authSource = readProviderAccountOpsAuthSource(req)
  const allowedRoles = parseProviderAccountOpsAllowedRoles()
  const allowedAuthSources = parseProviderAccountOpsAllowedAuthSources()
  const authRole = roles.find((role) => allowedRoles.has(role)) ?? null
  if (!actorId || !authRole || !authSource || !allowedAuthSources.has(authSource)) {
    return {
      ok: false,
      error: 'provider_account_ops_actor_not_authorized',
    }
  }
  if (input.opsActorId && input.opsActorId !== actorId) {
    return {
      ok: false,
      error: 'provider_account_ops_actor_not_authorized',
    }
  }
  return {
    ok: true,
    value: {
      ...input,
      opsActorId: actorId,
      opsAuthRole: authRole,
      opsAuthSource: authSource,
    },
  }
}

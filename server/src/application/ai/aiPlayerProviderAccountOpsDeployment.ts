import type { AiPlayerProviderAccountOpsMutationDeployment } from '../../../../shared/contracts/aiPlayerProviderAccount'

export const PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY_ENV = 'AI_PLAYER_PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY'
export const PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_ENV = 'AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY'
export const PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET_ENV =
  'AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET'

function readTruthyEnv(name: string) {
  const raw = process.env[name]?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

export function getAiPlayerProviderAccountOpsMutationDeployment(): AiPlayerProviderAccountOpsMutationDeployment {
  const production = (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production'
  const internalOnly = readTruthyEnv(PROVIDER_ACCOUNT_OPS_INTERNAL_ONLY_ENV)
  const trustedProxy = readTruthyEnv(PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_ENV)
  const trustedProxySignatureConfigured =
    Boolean(process.env[PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET_ENV]?.trim())
  const trustedProxySignatureRequired = production && trustedProxy && !internalOnly
  const trusted = !production || internalOnly || (trustedProxy && trustedProxySignatureConfigured)
  const blockedReason = trusted
    ? null
    : trustedProxy
      ? 'provider_account_ops_trusted_proxy_signature_not_configured'
      : 'provider_account_ops_deployment_not_trusted'
  return {
    production,
    internalOnly,
    trustedProxy,
    trustedProxySignatureConfigured,
    trustedProxySignatureRequired,
    trusted,
    mutationRoutesEnabled: trusted,
    blockedReason,
  }
}

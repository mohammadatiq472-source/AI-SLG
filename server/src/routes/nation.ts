import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  nationCapitalMigrationRequestSchema,
  nationEmpireUpgradeRequestSchema,
  nationFoundRequestSchema,
  nationProfileUpdateRequestSchema,
} from '../../../shared/schemas/nation'
import {
  foundNation,
  getOrganizationDiplomacyAuthorityReadModel,
  getNationProfiles,
  getNationWarObjectiveReadModel,
  getOrganizationMembershipReadModel,
  migrateNationCapital,
  updateNationProfile,
  upgradeNationToEmpire,
} from '../application/nation/NationService'
import { getSessionControlContextByToken } from '../multiplayer/SessionManager'
import { isHttpBodyError, readJsonBody, writeJson } from './http'

export function handleNationProfilesRoute(_req: IncomingMessage, res: ServerResponse) {
  writeJson(res, 200, getNationProfiles())
}

function readFactionIdFromUrl(req: IncomingMessage): string {
  const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
  return requestUrl.searchParams.get('factionId')?.trim() || 'player'
}

export function handleOrganizationMembershipRoute(req: IncomingMessage, res: ServerResponse) {
  try {
    writeJson(res, 200, getOrganizationMembershipReadModel(readFactionIdFromUrl(req)))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read organization membership.'
    const isClientError = message.startsWith('Unsupported factionId')
    writeJson(res, isClientError ? 400 : 500, { error: message })
  }
}

export function handleOrganizationDiplomacyAuthorityRoute(req: IncomingMessage, res: ServerResponse) {
  try {
    writeJson(res, 200, getOrganizationDiplomacyAuthorityReadModel(readFactionIdFromUrl(req)))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read organization diplomacy authority.'
    const isClientError = message.startsWith('Unsupported factionId')
    writeJson(res, isClientError ? 400 : 500, { error: message })
  }
}

export function handleNationWarObjectivesRoute(req: IncomingMessage, res: ServerResponse) {
  try {
    writeJson(res, 200, getNationWarObjectiveReadModel(readFactionIdFromUrl(req)))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read nation war objectives.'
    const isClientError = message.startsWith('Unsupported factionId')
    writeJson(res, isClientError ? 400 : 500, { error: message })
  }
}

function readBearerToken(req: IncomingMessage): string {
  const raw = req.headers.authorization
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) {
    return ''
  }
  const match = /^Bearer\s+(.+)$/i.exec(value.trim())
  return match?.[1]?.trim() ?? ''
}

function resolveSessionAuthorityContext(req: IncomingMessage) {
  const token = readBearerToken(req)
  if (!token) {
    return undefined
  }
  return getSessionControlContextByToken(token) ?? undefined
}

export async function handleNationFoundRoute(req: IncomingMessage, res: ServerResponse) {
  try {
    const payload = await readJsonBody(req)
    const parsed = nationFoundRequestSchema.safeParse(payload)

    if (!parsed.success) {
      writeJson(res, 400, {
        error: 'Invalid nation founding payload.',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
      return
    }

    const result = foundNation(parsed.data, resolveSessionAuthorityContext(req))
    const status =
      result.ok
        ? 200
        : result.failureCode === 'nation_found_session_required'
          ? 401
          : result.failureCode === 'nation_found_session_faction_mismatch' ||
              result.failureCode === 'nation_found_forbidden'
            ? 403
            : 409
    writeJson(res, status, result)
  } catch (error) {
    if (isHttpBodyError(error)) {
      writeJson(res, error.statusCode, { error: error.message })
      return
    }

    const message = error instanceof Error ? error.message : 'Failed to found nation.'
    const isClientError =
      message.startsWith('Unsupported factionId')
    writeJson(res, isClientError ? 400 : 500, { error: message })
  }
}

export async function handleNationProfileUpdateRoute(req: IncomingMessage, res: ServerResponse) {
  try {
    const payload = await readJsonBody(req)
    const parsed = nationProfileUpdateRequestSchema.safeParse(payload)

    if (!parsed.success) {
      writeJson(res, 400, {
        error: 'Invalid nation profile update payload.',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
      return
    }

    const result = updateNationProfile(parsed.data)
    writeJson(res, result.ok ? 200 : 409, result)
  } catch (error) {
    if (isHttpBodyError(error)) {
      writeJson(res, error.statusCode, { error: error.message })
      return
    }

    const message = error instanceof Error ? error.message : 'Failed to update nation profile.'
    const isClientError =
      message.startsWith('Unsupported factionId') ||
      message.startsWith('Faction has not founded a nation')
    writeJson(res, isClientError ? 400 : 500, { error: message })
  }
}

export async function handleNationCapitalMigrationRoute(req: IncomingMessage, res: ServerResponse) {
  try {
    const payload = await readJsonBody(req)
    const parsed = nationCapitalMigrationRequestSchema.safeParse(payload)

    if (!parsed.success) {
      writeJson(res, 400, {
        error: 'Invalid nation capital migration payload.',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
      return
    }

    const result = migrateNationCapital(parsed.data, resolveSessionAuthorityContext(req))
    const status =
      result.ok
        ? 200
        : result.failureCode === 'nation_capital_migration_session_required'
          ? 401
          : result.failureCode === 'nation_capital_migration_session_faction_mismatch' ||
              result.failureCode === 'nation_capital_migration_forbidden'
            ? 403
            : 409
    writeJson(res, status, result)
  } catch (error) {
    if (isHttpBodyError(error)) {
      writeJson(res, error.statusCode, { error: error.message })
      return
    }

    const message = error instanceof Error ? error.message : 'Failed to migrate nation capital.'
    const isClientError =
      message.startsWith('Unsupported factionId')
    writeJson(res, isClientError ? 400 : 500, { error: message })
  }
}

export async function handleNationEmpireUpgradeRoute(req: IncomingMessage, res: ServerResponse) {
  try {
    const payload = await readJsonBody(req)
    const parsed = nationEmpireUpgradeRequestSchema.safeParse(payload)

    if (!parsed.success) {
      writeJson(res, 400, {
        error: 'Invalid nation empire upgrade payload.',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
      return
    }

    const result = upgradeNationToEmpire(parsed.data, resolveSessionAuthorityContext(req))
    const status =
      result.ok
        ? 200
        : result.failureCode === 'nation_empire_session_required'
          ? 401
          : result.failureCode === 'nation_empire_session_faction_mismatch' ||
              result.failureCode === 'nation_empire_forbidden'
            ? 403
            : 409
    writeJson(res, status, result)
  } catch (error) {
    if (isHttpBodyError(error)) {
      writeJson(res, error.statusCode, { error: error.message })
      return
    }

    const message = error instanceof Error ? error.message : 'Failed to upgrade nation to empire.'
    const isClientError =
      message.startsWith('Unsupported factionId')
    writeJson(res, isClientError ? 400 : 500, { error: message })
  }
}

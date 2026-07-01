import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS,
  validateClientEndpointProfileManifest,
} from '../shared/contracts/release/clientEndpointProfileManifest'

export const CLIENT_PROFILE_SOURCE_DIR = 'godot-client/profiles'
export const ACTIVE_CLIENT_PROFILE_PATH = 'godot-client/profiles/active.client-profile.json'

export type SelectGodotClientProfileOptions = {
  profileId: string
}

export type SelectGodotClientProfileResult = {
  profileId: string
  sourcePath: string
  activePath: string
}

export function sourcePathForClientProfile(profileId: string): string {
  const normalizedProfileId = normalizeProfileId(profileId)
  return `${CLIENT_PROFILE_SOURCE_DIR}/${normalizedProfileId}.client-profile.json`
}

export function selectGodotClientProfile(options: SelectGodotClientProfileOptions): SelectGodotClientProfileResult {
  const profileId = normalizeProfileId(options.profileId)
  const sourcePath = sourcePathForClientProfile(profileId)
  const profile = JSON.parse(readFileSync(sourcePath, 'utf8')) as Record<string, unknown>
  const validation = validateClientEndpointProfileManifest(profile)
  if (!validation.ok) {
    throw new Error(`client profile ${sourcePath} is invalid: ${validation.errors.join('; ')}`)
  }
  if (profile.profileId !== profileId) {
    throw new Error(`client profile id mismatch: expected ${profileId}, found ${String(profile.profileId)}`)
  }

  const serialized = JSON.stringify(profile)
  for (const forbiddenKey of CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS) {
    if (serialized.includes(forbiddenKey)) {
      throw new Error(`client profile ${sourcePath} contains forbidden server/private key ${forbiddenKey}`)
    }
  }

  mkdirSync(dirname(ACTIVE_CLIENT_PROFILE_PATH), { recursive: true })
  writeFileSync(ACTIVE_CLIENT_PROFILE_PATH, `${JSON.stringify(profile, null, 2)}\n`, 'utf8')
  return { profileId, sourcePath, activePath: ACTIVE_CLIENT_PROFILE_PATH }
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim()
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid client profile id: ${profileId}`)
  }
  return normalized
}

function profileArg(argv: string[]): string {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') {
      return argv[index + 1] ?? ''
    }
    if (arg.startsWith('--profile=')) {
      return arg.slice('--profile='.length)
    }
  }
  return ''
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = selectGodotClientProfile({ profileId: profileArg(process.argv.slice(2)) })
    console.log(`[godot-client-profile-select] ${result.profileId} -> ${result.activePath}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

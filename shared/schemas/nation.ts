import { z } from 'zod'
import type {
  NationCapitalMigrationRequest,
  NationEmpireUpgradeRequest,
  NationFoundRequest,
  NationProfileUpdateRequest,
} from '../contracts/game'

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

export const nationFoundRequestSchema = z
  .object({
    factionId: z.string().trim().min(1).max(32),
    actorCommanderId: z.string().trim().min(1).max(64),
    nationName: z.string().trim().min(2).max(24),
    color: z.string().trim().regex(HEX_COLOR_REGEX, 'color must be #RRGGBB'),
    capitalTileId: z.string().trim().min(1).max(64),
  })
  .strict()

export function parseNationFoundRequest(input: unknown): NationFoundRequest {
  return nationFoundRequestSchema.parse(input) as NationFoundRequest
}

export const nationProfileUpdateRequestSchema = z
  .object({
    factionId: z.string().trim().min(1).max(32),
    nationName: z.string().trim().min(2).max(24).optional(),
    color: z.string().trim().regex(HEX_COLOR_REGEX, 'color must be #RRGGBB').optional(),
  })
  .strict()
  .refine((payload) => payload.nationName !== undefined || payload.color !== undefined, {
    message: 'nationName or color is required',
  })

export function parseNationProfileUpdateRequest(input: unknown): NationProfileUpdateRequest {
  return nationProfileUpdateRequestSchema.parse(input) as NationProfileUpdateRequest
}

export const nationCapitalMigrationRequestSchema = z
  .object({
    factionId: z.string().trim().min(1).max(32),
    actorCommanderId: z.string().trim().min(1).max(64),
    capitalTileId: z.string().trim().min(1).max(64),
    nationName: z.string().trim().min(2).max(24),
    color: z.string().trim().regex(HEX_COLOR_REGEX, 'color must be #RRGGBB'),
  })
  .strict()

export function parseNationCapitalMigrationRequest(input: unknown): NationCapitalMigrationRequest {
  return nationCapitalMigrationRequestSchema.parse(input) as NationCapitalMigrationRequest
}

export const nationEmpireUpgradeRequestSchema = z
  .object({
    factionId: z.string().trim().min(1).max(32),
    actorCommanderId: z.string().trim().min(1).max(64),
  })
  .strict()

export function parseNationEmpireUpgradeRequest(input: unknown): NationEmpireUpgradeRequest {
  return nationEmpireUpgradeRequestSchema.parse(input) as NationEmpireUpgradeRequest
}

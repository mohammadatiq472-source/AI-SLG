export type PersistFailureStatusInput = {
  failureCount: number
  lastPersistAt: number | null
  lastPersistErrorAt: number | null
}

export function hasUnresolvedPersistFailure(input: PersistFailureStatusInput) {
  if (input.failureCount <= 0) {
    return false
  }
  if (input.lastPersistErrorAt === null) {
    return true
  }
  if (input.lastPersistAt === null) {
    return true
  }
  return input.lastPersistErrorAt >= input.lastPersistAt
}

import assert from 'node:assert/strict'
import { hasUnresolvedPersistFailure } from '../src/application/persistence/persistFailureStatus'

assert.equal(
  hasUnresolvedPersistFailure({
    failureCount: 0,
    lastPersistAt: null,
    lastPersistErrorAt: null,
  }),
  false,
)

assert.equal(
  hasUnresolvedPersistFailure({
    failureCount: 1,
    lastPersistAt: null,
    lastPersistErrorAt: 100,
  }),
  true,
)

assert.equal(
  hasUnresolvedPersistFailure({
    failureCount: 1,
    lastPersistAt: 200,
    lastPersistErrorAt: 100,
  }),
  false,
)

assert.equal(
  hasUnresolvedPersistFailure({
    failureCount: 1,
    lastPersistAt: 100,
    lastPersistErrorAt: 200,
  }),
  true,
)

assert.equal(
  hasUnresolvedPersistFailure({
    failureCount: 1,
    lastPersistAt: 100,
    lastPersistErrorAt: 100,
  }),
  true,
)

console.log('persist_failure_recovery_contract: ok')

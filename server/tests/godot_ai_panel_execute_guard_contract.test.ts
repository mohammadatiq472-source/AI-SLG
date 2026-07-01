import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const closureBatchSource = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf-8')

for (const legacyToken of [
  'legacy_execute_button',
  'aiLegacyExecuteButtonVisible',
  'aiLegacyExecuteGuardVerified',
  'aiLegacyExecuteGuardError',
  'aiLegacyExecuteRemoteAttempted',
  'legacyExecuteButtonVisible',
]) {
  assert.equal(
    mainSource.includes(legacyToken) || closureBatchSource.includes(legacyToken),
    false,
    `AI panel execute guard should not use legacy token: ${legacyToken}`,
  )
}

assert.ok(
  mainSource.includes('aiDirectExecuteActionVisible') &&
    mainSource.includes('aiApprovalOnlyExecuteGuardVerified') &&
    mainSource.includes('aiApprovalOnlyExecuteGuardError') &&
    mainSource.includes('aiApprovalOnlyExecuteRemoteAttempted'),
  'AI panel execute guard should expose replacement approval-only guard summary fields',
)
assert.ok(
  closureBatchSource.includes('aiDirectExecuteActionVisible!=false') &&
    closureBatchSource.includes('aiApprovalOnlyExecuteGuardVerified!=true') &&
    closureBatchSource.includes('aiApprovalOnlyExecuteGuardError!=approval_only_ui_guard') &&
    closureBatchSource.includes('aiApprovalOnlyExecuteRemoteAttempted!=false'),
  'closure batch should validate replacement approval-only guard summary fields',
)

console.log('[godot_ai_panel_execute_guard_contract] all checks passed')

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const presenter = readFileSync('godot-client/scripts/ui/presenters/world_event_activity_presenter.gd', 'utf-8')

for (const forbidden of [
  '当前展示来自 GET /api/world/tasks 的只读章节与任务组。',
  '来自任务读取模型',
  'world_tasks_read_model',
]) {
  assert.ok(!presenter.includes(forbidden), `world event activity presenter must not expose player-visible engineering copy: ${forbidden}`)
}

const entryStart = presenter.indexOf('func _append_nation_midgame_task_entry')
assert.ok(entryStart >= 0, 'presenter must keep nation-midgame task entry helper.')
const entryEnd = presenter.indexOf('\nfunc ', entryStart + 1)
const entryBody = presenter.slice(entryStart, entryEnd >= 0 ? entryEnd : presenter.length)

assert.ok(entryBody.includes('"meta": "州郡目标已开启"'), 'nation midgame task entry meta must use short Chinese player copy.')
assert.ok(!entryBody.includes('activeChapterId'), 'nation midgame visible meta must not depend on raw activeChapterId.')
assert.ok(!entryBody.includes('chapter_label'), 'nation midgame visible meta must not build raw read-model labels.')

assert.ok(presenter.includes('"章节进度与任务奖励已同步。"'), 'tasks page summary should use player-facing Chinese copy.')
assert.ok(presenter.includes('"完成任务后，可在此领取奖励。"'), 'tasks page summary should tell the player the action outcome without backend wording.')

console.log('[godot_world_event_activity_player_copy_contract] all checks passed')

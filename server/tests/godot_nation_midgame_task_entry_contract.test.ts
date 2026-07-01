import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const presenterSource = readFileSync('godot-client/scripts/ui/presenters/world_event_activity_presenter.gd', 'utf-8')
const panelSource = readFileSync('godot-client/scripts/ui/world_event_activity_panel.gd', 'utf-8')
const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmokeSource = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.ok(
  presenterSource.includes('NATION_MIDGAME_TASK_ENTRY_CONTRACT := "nation_midgame_task_entry_v1"'),
  'WorldEventActivityPresenter must declare the nation midgame task-entry contract.',
)
assert.ok(
  presenterSource.includes('"nation_midgame_task_entry"') &&
    presenterSource.includes('"open_nation_midgame_frontend"') &&
    presenterSource.includes('"world_open_main_city_organization_nation_midgame_frontend"'),
  'Tasks read-model rendering must expose a reusable nation midgame entry that jumps to the W15 organization/nation skeleton.',
)
assert.ok(
  panelSource.includes('nationMidgameTaskEntryContractId') &&
    panelSource.includes('nationMidgameTaskEntryVisible') &&
    panelSource.includes('nationMidgameTaskEntryActionId'),
  'WorldEventActivityPanel visual summary must expose the nation midgame task entry for Godot smoke validation.',
)
assert.ok(
  mainSource.includes('"world_open_main_city_tasks_nation_midgame_entry"') &&
    mainSource.includes('func _press_mainline_visual_smoke_tasks_nation_midgame_entry(') &&
    mainSource.includes('open_nation_midgame_frontend') &&
    mainSource.includes('_press_mainline_visual_smoke_nation_midgame_frontend()'),
  'main.gd must provide a formal smoke action that opens the existing tasks page and follows the W15 nation midgame entry.',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_city_tasks_nation_midgame_entry"') &&
    visualSmokeSource.includes('seedNationMidgameFrontendFixture'),
  'run_mainline_visual_smoke.py must whitelist and seed the formal nation midgame tasks entry smoke.',
)

console.log('[godot_nation_midgame_task_entry_contract] all checks passed')

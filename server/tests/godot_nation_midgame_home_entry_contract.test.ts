import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const alliancePanel = readFileSync('godot-client/scripts/ui/alliance_panel.gd', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.match(
  alliancePanel,
  /"国家中局"[\s\S]*"目标"[\s\S]*"nation\/midgame"/,
  'Nation organization home must expose a player-visible 国家中局 entry targeting nation/midgame.',
)

assert.match(
  alliancePanel,
  /_build_home_entry_button\("国家中局", "目标", "nation\/midgame", true\)/,
  'The governed organization-home button list must include the same 国家中局 target for click smoke.',
)

assert.match(
  main,
  /"world_open_main_city_organization_home_entry_nation_midgame"[\s\S]*_press_mainline_visual_smoke_organization_home_entry\("founded_nation", "nation\/midgame", "国家中局"\)/,
  'Mainline visual smoke must click the home 国家中局 button into the existing W15.1 page.',
)

assert.match(
  main,
  /nationMidgameHomeEntryVisible/,
  'Nation home smoke summary must expose whether the 国家中局 home entry is visible.',
)

assert.match(
  smokeRunner,
  /"world_open_main_city_organization_home_entry_nation_midgame"/,
  'Visual smoke runner must whitelist the nation-home-to-midgame click action.',
)

assert.match(
  smokeRunner,
  /"world_open_main_city_organization_home_entry_nation_midgame"[\s\S]*seedNationMidgameFrontendFixture/,
  'Nation-home-to-midgame smoke must reuse the existing nation midgame fixture seed.',
)

console.log('[godot_nation_midgame_home_entry_contract] all checks passed')

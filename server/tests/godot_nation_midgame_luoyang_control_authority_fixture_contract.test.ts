import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

const actionId = 'world_open_main_city_organization_nation_midgame_luoyang_control_authority'

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"`),
  'Visual smoke runner must whitelist the D-W5 Luoyang control authority action.',
)

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*"required_summary_fields"[\\s\\S]*"nationMidgameLuoyangControlAuthorityOk"[\\s\\S]*"controlAuthorityId"[\\s\\S]*"prefectureControlProgressId"[\\s\\S]*"nationMidgameControlScope"`),
  'D-W5 runner defaults must require control receipt/readback and narrow scope fields.',
)

assert.match(
  main,
  new RegExp(`"${actionId}"[\\s\\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_control_authority\\(`),
  'Mainline visual smoke must dispatch D-W5 to a dedicated control-authority helper.',
)

assert.match(
  main,
  /func _press_mainline_visual_smoke_nation_midgame_luoyang_control_authority\(\) -> Dictionary:[\s\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_battle_report_feedback\(\)[\s\S]*recordNationMidgameLuoyangControlAuthority[\s\S]*sourceLuoyangContestId[\s\S]*sourceOrganizationReportId[\s\S]*controlAuthorityId[\s\S]*prefectureControlProgressId[\s\S]*controlStatus/,
  'D-W5 must reuse D-W4 report feedback, issue the backend control action, and read back control fields.',
)

assert.match(
  main,
  /洛阳推进[\s\S]*州府控制[\s\S]*战况入册[\s\S]*下一步固守/,
  'D-W5 must render short Chinese player-visible control feedback copy.',
)

assert.match(
  main,
  /feedbackVisible[\s\S]*visibleCopyForbiddenHits[\s\S]*playerVisibleEngineeringCopyLeak[\s\S]*nationMidgameControlScope[\s\S]*luoyang_control_authority_only_not_full_occupation/,
  'D-W5 summary must prove feedback visibility, visible-copy guard, and narrow control scope.',
)

assert.match(
  main,
  /"tier"[\s\S]*"contract"[\s\S]*"read model"[\s\S]*"authority"[\s\S]*"neutral"[\s\S]*"v0"/,
  'D-W5 visible-copy guard must still reject known engineering words.',
)

console.log('[godot_nation_midgame_luoyang_control_authority_fixture_contract] all checks passed')

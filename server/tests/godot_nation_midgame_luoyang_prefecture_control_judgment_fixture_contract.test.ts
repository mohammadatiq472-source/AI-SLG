import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

const actionId = 'world_open_main_city_organization_nation_midgame_luoyang_prefecture_control_judgment'

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"`),
  'Visual smoke runner must whitelist the D-W8 Luoyang prefecture-control judgment action.',
)

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*"required_summary_fields"[\\s\\S]*"nationMidgameLuoyangPrefectureControlJudgmentOk"[\\s\\S]*"prefectureControlJudgmentId"[\\s\\S]*"prefectureControlJudgmentStatus"[\\s\\S]*"ownershipTransferApplied"[\\s\\S]*"nationMidgamePrefectureControlJudgmentScope"`),
  'D-W8 runner defaults must require judgment receipt/readback, ownership boundary, and narrow scope fields.',
)

assert.match(
  main,
  new RegExp(`"${actionId}"[\\s\\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_prefecture_control_judgment\\(`),
  'Mainline visual smoke must dispatch D-W8 to a dedicated prefecture-control judgment helper.',
)

assert.match(
  main,
  /func _press_mainline_visual_smoke_nation_midgame_luoyang_prefecture_control_judgment\(\) -> Dictionary:[\s\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_control_authority\(\)[\s\S]*recordNationMidgameLuoyangPrefectureControlJudgment[\s\S]*sourceControlAuthorityId[\s\S]*sourceLuoyangControlProgressId[\s\S]*prefectureControlJudgmentId[\s\S]*prefectureControlJudgmentStatus/,
  'D-W8 must reuse D-W5 control progress, issue the backend judgment action, and read back judgment fields.',
)

assert.match(
  main,
  /州府已控[\s\S]*固守洛阳[\s\S]*控制判定[\s\S]*继续固守/,
  'D-W8 must render short Chinese player-visible prefecture-control judgment feedback copy.',
)

assert.match(
  main,
  /ownershipTransferApplied[\s\S]*false[\s\S]*feedbackVisible[\s\S]*visibleCopyForbiddenHits[\s\S]*playerVisibleEngineeringCopyLeak[\s\S]*luoyang_prefecture_control_judgment_only_not_ownership_transfer/,
  'D-W8 summary must prove no ownership transfer, feedback visibility, copy guard, and narrow scope.',
)

console.log('[godot_nation_midgame_luoyang_prefecture_control_judgment_fixture_contract] all checks passed')

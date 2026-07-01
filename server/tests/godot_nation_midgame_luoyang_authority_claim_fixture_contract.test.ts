import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const alliancePanel = readFileSync('godot-client/scripts/ui/alliance_panel.gd', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

const actionId = 'world_open_main_city_organization_nation_midgame_luoyang_authority_claim'

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"`),
  'Visual smoke runner must whitelist the D-W3 Luoyang authority claim action.',
)

assert.match(
  smokeRunner,
  new RegExp(`"${actionId}"[\\s\\S]*"required_summary_fields"[\\s\\S]*"nationMidgameLuoyangAuthorityClaimOk"[\\s\\S]*"luoyangContestId"[\\s\\S]*"visibleCopyForbiddenHits"`),
  'D-W3 runner defaults must require authority receipt/readback and visible-copy guard fields.',
)

assert.match(
  main,
  new RegExp(`"${actionId}"[\\s\\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_authority_claim\\(`),
  'Mainline visual smoke must dispatch D-W3 to a dedicated authority-claim helper.',
)

assert.match(
  main,
  /func _press_mainline_visual_smoke_nation_midgame_luoyang_authority_claim\(\) -> Dictionary:[\s\S]*_press_mainline_visual_smoke_nation_midgame_luoyang_feedback\(\)[\s\S]*issueNationMidgameLuoyangAuthorityClaim[\s\S]*luoyangContestId[\s\S]*contestStatus/,
  'D-W3 must reuse D-W2 feedback, issue the backend action, and read back contest receipt fields.',
)

assert.match(
  main,
  /洛阳争夺[\s\S]*军令入册[\s\S]*州府推进[\s\S]*战况回写/,
  'D-W3 must render short Chinese player result copy after backend receipt/readback.',
)

assert.match(
  main,
  /backendReceiptVisible[\s\S]*visibleCopyForbiddenHits[\s\S]*playerVisibleEngineeringCopyLeak[\s\S]*nationMidgameAuthorityScope[\s\S]*luoyang_prefecture_authority_only_not_full_unification/,
  'D-W3 summary must prove receipt visibility, visible-copy guard, and narrow authority scope.',
)

assert.match(
  main,
  /"tier"[\s\S]*"contract"[\s\S]*"read model"[\s\S]*"authority"[\s\S]*"neutral"[\s\S]*"v0"/,
  'D-W3 visible-copy guard must reject known engineering words.',
)

assert.match(
  alliancePanel,
  /NATION_MIDGAME_LUOYANG_ROUTE_LABEL := "进军洛阳"[\s\S]*NationMidgameLuoyangRouteButton/,
  'D-W3 must keep the real D-W1/D-W2 Godot button as the route origin.',
)

console.log('[godot_nation_midgame_luoyang_authority_claim_fixture_contract] all checks passed')

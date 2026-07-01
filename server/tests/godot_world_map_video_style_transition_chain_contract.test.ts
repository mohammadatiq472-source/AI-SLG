import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, startNeedle: string, nextNeedle = '\nfunc '): string {
  const start = source.indexOf(startNeedle)
  assert.notEqual(start, -1, `missing source section ${startNeedle}`)
  const next = source.indexOf(nextNeedle, start + startNeedle.length)
  return source.slice(start, next === -1 ? source.length : next)
}

const requiredStages = [
  'target_list',
  'pre_jump_pulse',
  'jump_or_fast_zoom',
  'arrival_settle',
  'state_detail_zoom',
  'road_reveal',
  'march_preview',
  'combat_outbreak',
  'report_focus',
  'reward_settle',
  'return_mainline',
]

const requiredFrameFiles = [
  '01_target_list.png',
  '02_pre_jump_pulse.png',
  '03_jump_or_fast_zoom.png',
  '04_arrival_settle.png',
  '05_state_detail_zoom.png',
  '06_road_reveal.png',
  '07_march_preview.png',
  '08_combat_outbreak.png',
  '09_report_focus.png',
  '10_reward_settle.png',
  '11_return_mainline.png',
]

const requiredSummaryFields = [
  'worldMapFocusMotionToken',
  'worldMapFocusTransitionMode',
  'worldMapFocusJumpDeltaCells',
  'worldMapFocusCameraSettle',
  'worldMapFocusTargetPulse',
  'preJumpArrivalMotionToken',
  'preJumpPulseMotion',
  'preJumpPulseMotionSource',
  'preJumpPulseMotionPending',
  'preJumpPulseMotionPendingReason',
  'arrivalSettleMotion',
  'arrivalSettleMotionSource',
  'arrivalSettleMotionPending',
  'arrivalSettleMotionPendingReason',
  'preJumpArrivalRejectIf',
  'worldMapVideoStyleTransitionChainFixtureOk',
  'worldMapVideoStyleTransitionChainFixtureFailureReasons',
  'cityRoadRevealVisible',
  'roadRevealLevel',
  'visibleRoadNodeCount',
  'focusContextPreserved',
  'combatOutbreakMotion',
  'combatOutbreakMotionSource',
  'combatOutbreakMotionPending',
  'combatOutbreakMotionPendingReason',
  'rewardSettleMotion',
  'rewardSettleMotionSource',
  'rewardSettleMotionPending',
  'rewardSettleMotionPendingReason',
  'rewardSettleSourceCandidate',
  'rewardSettleRequiredClickAction',
  'rewardSettleRequiredSummaryField',
  'rewardSettleNextFrameName',
  'rewardSettleUnwiredReason',
  'returnMainlineCameraSettle',
  'returnMainlineCameraSettleSource',
  'returnMainlineCameraSettlePending',
  'returnMainlineCameraSettlePendingReason',
  'returnMainlineSourceCandidate',
  'returnMainlineRequiredClickAction',
  'returnMainlineRequiredSummaryField',
  'returnMainlineNextFrameName',
  'returnMainlineUnwiredReason',
  'reducedMotionPathOk',
  'lowEndMotionBudgetOk',
]

const fixtureAction = 'world_map_video_style_transition_chain_fixture'
const summaryPath = 'worldMapVideoStyleTransitionChain'

const validationDoc = read('docs/parallel-validation/2026-06-19-world-map-video-style-transition-chain-validation.md')
const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const yutuPolicy = read('docs/TIANXIA_YUTU_MOBILE_AND_EXPLICIT_JUMP_CURRENT_2026_06_03.md')
const packageJson = read('package.json')
const smokeRunner = read('godot-client/tools/run_mainline_visual_smoke.py')
const mainGd = read('godot-client/scripts/app/main.gd')
const mapGridGd = read('godot-client/scripts/map/map_grid.gd')
const unitViewLayerGd = read('godot-client/scripts/map/unit_view_layer.gd')
const smokeValidatorSource = functionSource(
  smokeRunner,
  'def _validate_world_map_video_style_transition_chain_contract(',
  '\ndef _validate_',
)
const compactSummarySource = functionSource(
  smokeRunner,
  'def _world_map_video_style_transition_chain_compact_summary(',
  '\ndef _',
)
const stdoutSummarySource = functionSource(
  smokeRunner,
  'def _summary_for_stdout(',
  '\ndef _',
)
const videoSummarySource = functionSource(
  mainGd,
  'func _read_world_map_video_style_transition_chain_summary(',
)
const payloadGateStart = mainGd.indexOf('var world_map_video_style_transition_chain_fixture_payload_ok := (')
assert.notEqual(payloadGateStart, -1, 'missing video-style fixture payload gate')
const payloadGateEnd = mainGd.indexOf('\tvar payload := {', payloadGateStart)
assert.notEqual(payloadGateEnd, -1, 'missing payload after video-style fixture gate')
const payloadGateSource = mainGd.slice(payloadGateStart, payloadGateEnd)

for (const stage of requiredStages) {
  assert.ok(validationDoc.includes(stage), `validation doc must record stage ${stage}`)
}

for (const field of requiredSummaryFields) {
  assert.ok(validationDoc.includes(field), `validation doc must define summary field ${field}`)
  assert.ok(mainGd.includes(field), `main.gd must wire summary field ${field}`)
}

assert.ok(validationDoc.includes(fixtureAction), 'validation doc must record fixture action')
assert.ok(validationDoc.includes(summaryPath), 'validation doc must record summary path')
assert.ok(validationDoc.includes('NDJSON Frame Review Table'), 'validation doc must include the NDJSON frame review table')
assert.ok(
  validationDoc.includes('The expected frame manifest is not proof by itself') &&
    validationDoc.includes('It is not semantic proof'),
  'validation doc must state the manifest and NDJSON checklist are not semantic proof',
)
assert.ok(validationDoc.includes('Motion Quality Rubric'), 'validation doc must include motion quality rubric')
for (const token of [
  '"qualityGate":"no_hard_cut"',
  '"qualityGate":"tempo_budget"',
  '"qualityGate":"control_occlusion"',
  '"qualityGate":"reward_return_cleanup"',
  '"qualityGate":"player_copy_clean"',
  'hard cut',
  'too fast to read',
  'too slow',
  'motion overlays hide real Button hit areas',
  'lingering particles',
  'snake_case or contract ids appear in player copy',
]) {
  assert.ok(validationDoc.includes(token), `validation doc must preserve motion quality rubric token ${token}`)
}
assert.ok(validationDoc.includes('Motion Implementation Suggestions'), 'validation doc must include follow-up motion implementation suggestions')
for (const token of [
  'pre_jump_pulse -> arrival_settle',
  'reward_settle -> return_mainline',
  'style owner',
  'candidate whitelist',
  'TianxiaYutuOverviewRoot',
  'reward/report surface owner',
]) {
  assert.ok(validationDoc.includes(token), `validation doc must preserve implementation suggestion token ${token}`)
}
assert.ok(validationDoc.includes('First Implementation Guardrail'), 'validation doc must include first implementation guardrail')
for (const token of [
  'required runtime fields',
  'player-visible effect',
  'rejectIf',
  'manual review focus',
  'worldMapFocusTargetPulse',
  'worldMapFocusTransitionMode',
  'worldMapFocusJumpDeltaCells',
  'worldMapFocusCameraSettle',
  'focusContextPreserved',
  'preJumpPulseMotionSource',
  'preJumpPulseMotionPending',
  'arrivalSettleMotionSource',
  'arrivalSettleMotionPending',
  'rewardSettleMotionSource',
  'rewardSettleMotionPending',
  'rewardSettleMotionPendingReason',
  'returnMainlineCameraSettleSource',
  'returnMainlineCameraSettlePending',
  'returnMainlineCameraSettlePendingReason',
  'rewardSettleRequiredSummaryField',
  'returnMainlineRequiredSummaryField',
  'preJumpArrivalRejectIf',
  'bare teleport / hard cut',
  'source-plan-only',
  'lingering reward/report overlay',
  'shared dirty files',
]) {
  assert.ok(validationDoc.includes(token), `validation doc must preserve first implementation guardrail token ${token}`)
}
assert.ok(
  validationDoc.includes('frame_evidence_not_run'),
  'validation doc must state frame evidence is still not run',
)
assert.ok(validationDoc.includes('button_occlusion_risk'), 'validation doc must mention button occlusion risk evidence')
assert.ok(validationDoc.includes('particle_density_risk'), 'validation doc must mention particle density risk evidence')
assert.ok(
  validationDoc.includes('fixture_gate_independent_of_legacy_fields'),
  'validation doc must state old fields do not drive fixture gate',
)

assert.ok(
  packageJson.includes('"test:world:map-focus-motion-contract"') ||
    packageJson.includes('"test:world:troop-march-motion-contract"'),
  'package.json should keep existing world motion contract entry points',
)

assert.ok(
  motionAuthority.includes('world_map_focus_motion_contract') &&
    motionAuthority.includes('world_troop_march_motion_contract') &&
    motionAuthority.includes('world_troop_march_result_motion_contract'),
  'motion authority should keep prerequisite world motion contract families',
)

assert.ok(
  yutuPolicy.includes('explicit jump') || yutuPolicy.includes('\u663e\u5f0f\u8df3\u8f6c'),
  'Yutu policy should preserve explicit-jump basis used by this chain',
)

assert.ok(smokeRunner.includes(`"${fixtureAction}"`), 'smoke runner must whitelist fixture action')
assert.ok(
  smokeRunner.includes(`"${fixtureAction}": {`) &&
    smokeRunner.includes('"worldMapVideoStyleTransitionChain"') &&
    smokeRunner.includes('"worldMapVideoStyleTransitionChainSummaryPath"'),
  'smoke runner defaults must require fixture summary fields',
)
assert.ok(
  smokeRunner.includes('def _validate_world_map_video_style_transition_chain_contract(') &&
    smokeRunner.includes('worldMapVideoStyleTransitionChainFixtureOk') &&
    smokeRunner.includes('worldMapVideoStyleTransitionChainStages mismatch') &&
    smokeRunner.includes('worldMapVideoStyleTransitionChainFixtureAction mismatch'),
  'smoke runner must validate fixture summary path and stage list',
)
assert.ok(
  !smokeValidatorSource.includes('mainCityHubRequirementOk') &&
    !smokeValidatorSource.includes('panelOpenOk') &&
    !smokeValidatorSource.includes('seaRouteStatusFixtureOk'),
  'video-style runner validator must not gate on unrelated legacy fixture fields',
)
assert.ok(
  smokeValidatorSource.includes('missing_runtime_source') &&
    smokeValidatorSource.includes('preJumpPulseMotion') &&
    smokeValidatorSource.includes('arrivalSettleMotion') &&
    smokeValidatorSource.includes('fixture_ok and pending') &&
    smokeValidatorSource.includes('fixture_ok and not bool(chain_summary.get(motion_key, False))'),
  'video-style runner validator must keep source-plan/pending/missing motion sources from passing the fixture contract',
)
assert.ok(
  smokeRunner.includes('def _materialize_world_map_video_style_transition_chain_frame_evidence(') &&
    smokeRunner.includes('worldMapVideoStyleTransitionChainFrameEvidence') &&
    smokeRunner.includes('worldMapVideoStyleTransitionChainFrameEvidenceOk') &&
    smokeRunner.includes('worldMapVideoStyleTransitionChainFrameEvidenceMissing') &&
    smokeValidatorSource.includes('worldMapVideoStyleTransitionChainFrameEvidenceOk false') &&
    smokeValidatorSource.includes('worldMapVideoStyleTransitionChainFrameEvidenceMissing not empty'),
  'video-style runner validator must reject missing stage frame evidence paths',
)
assert.ok(
  smokeRunner.includes('WORLD_MAP_VIDEO_STYLE_TRANSITION_EXPECTED_FRAME_MANIFEST') &&
    smokeRunner.includes('def _world_map_video_style_transition_expected_frame_manifest(') &&
    smokeRunner.includes('worldMapVideoStyleTransitionExpectedFrameManifest') &&
    smokeRunner.includes('worldMapVideoStyleTransitionExpectedFrameManifestOk') &&
    validationDoc.includes('worldMapVideoStyleTransitionExpectedFrameManifest') &&
    validationDoc.includes('worldMapVideoStyleTransitionExpectedFrameManifestOk') &&
    smokeValidatorSource.includes('worldMapVideoStyleTransitionExpectedFrameManifest stages mismatch') &&
    smokeValidatorSource.includes('semanticReviewRequired false') &&
    smokeValidatorSource.includes('requiredSummaryFields') &&
    smokeValidatorSource.includes('rejectIf missing'),
  'video-style runner must expose and validate an expected frame manifest for machine and human semantic review',
)
for (const stage of requiredStages) {
  assert.ok(
    smokeRunner.includes(`"stage": "${stage}"`) &&
      smokeValidatorSource.includes('worldMapVideoStyleTransitionExpectedFrameManifest.{stage_name}'),
    `runner expected frame manifest must cover ${stage}`,
  )
}
requiredStages.forEach((stage, index) => {
  const frame = requiredFrameFiles[index]
  assert.ok(validationDoc.includes(`"frame":"${frame}"`), `validation doc NDJSON must include frame ${frame}`)
  assert.ok(validationDoc.includes(`"stage":"${stage}"`), `validation doc NDJSON must include stage ${stage}`)
})
const ndjsonMatch = validationDoc.match(/```ndjson\n([\s\S]*?)\n```/)
assert.ok(ndjsonMatch, 'validation doc must keep a fenced NDJSON frame review table')
const ndjsonRows = ndjsonMatch[1].trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
assert.equal(ndjsonRows.length, 11, 'validation doc NDJSON table must remain exactly 11 rows')
assert.deepEqual(
  ndjsonRows.map((row) => row.stage),
  requiredStages,
  'validation doc NDJSON table stage order must remain stable',
)
for (const row of ndjsonRows) {
  assert.ok(!JSON.stringify(row).includes('worldMapVideoStyleTransitionChainCompactSummary'), 'compact summary must not pollute the 11-row NDJSON frame table')
}
for (const stage of ['combat_outbreak', 'report_focus', 'reward_settle', 'return_mainline']) {
  assert.ok(
    validationDoc.includes(stage) &&
      validationDoc.includes('manualReviewFocus') &&
      validationDoc.includes('rejectIf'),
    `validation doc must spell out manual review and rejection notes for ${stage}`,
  )
}
for (const token of [
  '"frame":"08_combat_outbreak.png"',
  '"combatOutbreakMotion=false"',
  '"combatOutbreakMotionPending=true"',
  '"frame":"10_reward_settle.png"',
  '"rewardSettleMotion=false"',
  '"rewardSettleMotionPending=true"',
  '"frame":"11_return_mainline.png"',
  '"returnMainlineCameraSettle=false"',
  '"returnMainlineCameraSettlePending=true"',
  'source-plan-only evidence',
]) {
  assert.ok(validationDoc.includes(token), `validation doc must preserve false-green rejection token ${token}`)
}
assert.ok(
  smokeRunner.includes('WORLD_MAP_VIDEO_STYLE_TRANSITION_MIN_SEQUENCE_CAPTURE_COUNT = len(WORLD_MAP_VIDEO_STYLE_TRANSITION_STAGE_FRAMES)') &&
    smokeRunner.includes('effective_sequence_capture_count = max(0, int(args.sequence_capture_count))') &&
    smokeRunner.includes('effective_sequence_capture_count = max(') &&
    smokeRunner.includes('WORLD_MAP_VIDEO_STYLE_TRANSITION_MIN_SEQUENCE_CAPTURE_COUNT') &&
    smokeRunner.includes('env["SLG_MAINLINE_VISUAL_SMOKE_SEQUENCE_COUNT"] = str(effective_sequence_capture_count)') &&
    smokeRunner.includes('len(sequence_frame_stats) >= effective_sequence_capture_count'),
  'video-style runner must auto-enforce at least 11 sequence frames without lowering larger operator requests',
)
assert.ok(
  stdoutSummarySource.includes('"stateCaseSetSummary": summary.get("stateCaseSetSummary", {})') &&
    stdoutSummarySource.includes('"worldMapVideoStyleTransitionChainCompactSummary"'),
  'runner compact stdout must preserve stateCaseSetSummary while exposing video-style transition compact summary',
)
assert.ok(
  smokeRunner.includes('def _world_map_video_style_transition_chain_compact_summary(') &&
    smokeRunner.includes('summary["worldMapVideoStyleTransitionChainCompactSummary"] = compact_transition_summary') &&
    smokeRunner.includes('godot_report["worldMapVideoStyleTransitionChainCompactSummary"] = compact_transition_summary'),
  'runner must attach video-style compact summary to both report and stdout summary path',
)
for (const token of [
  'preJumpPulseToArrivalSettle',
  'rewardSettleToReturnMainline',
  'runtimeFields',
  'rejectIf',
  'frameEvidence',
  'worldMapFocusTargetPulse',
  'worldMapFocusTransitionMode',
  'worldMapFocusJumpDeltaCells',
  'worldMapFocusCameraSettle',
  'focusContextPreserved',
  'preJumpPulseMotion',
  'preJumpPulseMotionSource',
  'preJumpPulseMotionPending',
  'preJumpPulseMotionPendingReason',
  'arrivalSettleMotion',
  'arrivalSettleMotionSource',
  'arrivalSettleMotionPending',
  'arrivalSettleMotionPendingReason',
  'preJumpArrivalRejectIf',
  'rewardSettleMotion',
  'rewardSettleMotionSource',
  'rewardSettleMotionPending',
  'rewardSettleMotionPendingReason',
  'returnMainlineCameraSettle',
  'returnMainlineCameraSettleSource',
  'returnMainlineCameraSettlePending',
  'returnMainlineCameraSettlePendingReason',
  'missing_runtime_source',
]) {
  assert.ok(compactSummarySource.includes(token), `runner compact summary must expose ${token}`)
}
assert.ok(
  validationDoc.includes('Stage 19 Runner Summary Wiring') &&
    validationDoc.includes('worldMapVideoStyleTransitionChainCompactSummary') &&
    validationDoc.includes('stateCaseSetSummary') &&
    validationDoc.includes('It is a report aid, not semantic GREEN'),
  'validation doc must describe runner summary wiring without claiming semantic green',
)

assert.ok(
  mainGd.includes(`"${fixtureAction}":`) &&
    mainGd.includes('func _press_mainline_visual_smoke_world_map_video_style_transition_chain_fixture() -> Dictionary:') &&
    mainGd.includes('func _read_world_map_video_style_transition_chain_summary(') &&
    mainGd.includes('func _world_map_video_style_transition_chain_stages() -> Array:'),
  'main.gd must register fixture action and transition-chain summary helpers',
)
assert.ok(
  mainGd.includes(`"worldMapVideoStyleTransitionChain": world_map_video_style_transition_chain_summary`) &&
    mainGd.includes('"worldMapVideoStyleTransitionChainFixtureOk"') &&
    mainGd.includes('"worldMapVideoStyleTransitionChainFixtureFailureReasons"') &&
    mainGd.includes('"worldMapVideoStyleTransitionChainFixtureAction"') &&
    mainGd.includes('"worldMapVideoStyleTransitionChainSummaryPath"') &&
    mainGd.includes('"worldMapVideoStyleTransitionChainStages"'),
  'main.gd payload must expose fixture summary path and stage list',
)
assert.ok(
  mainGd.includes('"combatOutbreakMotionSource"') &&
    mainGd.includes('"combatOutbreakMotionPendingReason"') &&
    mainGd.includes('"rewardSettleMotionSource"') &&
    mainGd.includes('"rewardSettleMotionPendingReason"') &&
    mainGd.includes('"rewardSettleSourceCandidate"') &&
    mainGd.includes('"rewardSettleRequiredClickAction"') &&
    mainGd.includes('"rewardSettleRequiredSummaryField"') &&
    mainGd.includes('"rewardSettleNextFrameName"') &&
    mainGd.includes('"rewardSettleUnwiredReason"') &&
    mainGd.includes('"returnMainlineCameraSettleSource"') &&
    mainGd.includes('"returnMainlineCameraSettlePendingReason"') &&
    mainGd.includes('"returnMainlineSourceCandidate"') &&
    mainGd.includes('"returnMainlineRequiredClickAction"') &&
    mainGd.includes('"returnMainlineRequiredSummaryField"') &&
    mainGd.includes('"returnMainlineNextFrameName"') &&
    mainGd.includes('"returnMainlineUnwiredReason"'),
  'main.gd must expose source/pending metadata and runtime source-plan fields for chain verdict transparency',
)
assert.ok(
  mainGd.includes('"preJumpArrivalMotionToken"') &&
    mainGd.includes('"preJumpPulseMotionSource"') &&
    mainGd.includes('"preJumpPulseMotionPendingReason"') &&
    mainGd.includes('"arrivalSettleMotionSource"') &&
    mainGd.includes('"arrivalSettleMotionPendingReason"') &&
    mainGd.includes('"preJumpArrivalRejectIf"'),
  'main.gd must expose pre-jump pulse and arrival settle runtime source/pending/reject fields',
)
assert.ok(
  videoSummarySource.includes('pre_jump_pulse_motion_source = "tianxia_summary.jumpTarget"') &&
    videoSummarySource.includes('pre_jump_pulse_motion_source = "tianxia_summary.lastExplicitJump.ok"') &&
    videoSummarySource.includes('arrival_settle_motion_source = "tianxia_summary.lastExplicitJump.ok&&selectedCoordinate"') &&
    videoSummarySource.includes('pre_jump_arrival_reject_if.append("preJumpPulseMotion=false")') &&
    videoSummarySource.includes('pre_jump_arrival_reject_if.append("arrivalSettleMotion=false")') &&
    videoSummarySource.includes('preJumpPulseMotionPending=true') &&
    videoSummarySource.includes('arrivalSettleMotionPending=true'),
  'pre-jump pulse and arrival settle must be derived from runtime jump/focus sources and keep pending rejection fields',
)
assert.ok(
  videoSummarySource.includes('combat_outbreak_motion_source = "missing_runtime_source"') &&
    videoSummarySource.includes('world_click_main_city_node_troop_intercepted_screenshot_fixture') &&
    videoSummarySource.includes('reward_settle_motion_source = "missing_runtime_source"') &&
    videoSummarySource.includes('world_affairs_claim_reward') &&
    videoSummarySource.includes('shell_chat_unified_inbox_claim_reward_settlement') &&
    videoSummarySource.includes('click_action_result.inboxClaimReceiptOk&&inboxClaimPostReadbackOk&&inboxClaimTargetRemoved') &&
    videoSummarySource.includes('return_mainline_camera_settle_source = "missing_runtime_source"') &&
    videoSummarySource.includes('click_action_result.returnedToMap and click_action_result.focusResult.ok'),
  'main.gd must expose real source mapping gaps instead of fabricating combat/reward/return motion',
)
assert.ok(
  videoSummarySource.includes('reward_settle_next_frame_name := "10_reward_settle"') &&
    videoSummarySource.includes('return_mainline_next_frame_name := "11_return_mainline"') &&
    videoSummarySource.includes('world_click_main_city_asset_enter_hub_return_map') &&
    videoSummarySource.includes('world_click_main_city_node_troop_submit_march_map_unit'),
  'main.gd must record executable source candidates, click actions, and next frame names for reward/return follow-up smoke',
)
assert.ok(
  videoSummarySource.includes('map_unit_visual_summary.worldTroopMarchHistoryAnchor=%s is report/result anchor only'),
  'reward settle must not treat troop march history/report anchor as reward-settle motion',
)
assert.ok(
  payloadGateSource.includes('world_map_video_style_transition_chain_fixture_ok') &&
    !payloadGateSource.includes('hub_requirement_ok') &&
    !payloadGateSource.includes('panel_requirement_ok') &&
    !payloadGateSource.includes('seaRouteStatusFixtureOk'),
  'video-style fixture payload ok must be independent of unrelated legacy gate fields',
)
assert.ok(
  videoSummarySource.includes('and combat_outbreak_motion') &&
    videoSummarySource.includes('and reward_settle_motion') &&
    videoSummarySource.includes('and return_mainline_camera_settle') &&
    videoSummarySource.includes('and not combat_outbreak_motion_pending') &&
    videoSummarySource.includes('and not reward_settle_motion_pending') &&
    videoSummarySource.includes('and not return_mainline_camera_settle_pending'),
  'video-style fixture ok must remain false while combat/reward/return motion is false or pending',
)
assert.ok(
  mainGd.includes('"deltaCells": delta_cells') &&
    mainGd.includes('"beforeSelectedCell": before_selected_context.duplicate(true)'),
  'explicit jump summary must record jump delta for video-style transition proof',
)

assert.ok(
  mapGridGd.includes('func get_main_map_streaming_debug_summary() -> Dictionary:'),
  'map_grid.gd must keep main map streaming summary entry',
)
assert.ok(
  unitViewLayerGd.includes('func get_visual_acceptance_summary() -> Dictionary:') &&
    unitViewLayerGd.includes('"worldTroopMarchInterceptedMotion"') &&
    unitViewLayerGd.includes('"worldTroopMarchHistoryAnchor"'),
  'unit_view_layer.gd must keep motion fields reused by the product chain summary',
)

const pendingStages = requiredStages.filter((stage) => !mainGd.includes(stage) && !validationDoc.includes(stage))
const pendingSummaryFields = requiredSummaryFields.filter((field) => !mainGd.includes(field))

console.log(
  JSON.stringify(
    {
      contract: 'world_map_video_transition_chain_contract_v1',
      ok: true,
      mode: 'runtime_wiring_static',
      fixtureAction,
      summaryPath,
      requiredStages,
      requiredSummaryFields,
      wiring: {
        runnerActionRegistered: smokeRunner.includes(`"${fixtureAction}"`),
        runnerValidatorRegistered: smokeRunner.includes(
          'def _validate_world_map_video_style_transition_chain_contract(',
        ),
        godotFixtureRegistered: mainGd.includes(
          'func _press_mainline_visual_smoke_world_map_video_style_transition_chain_fixture() -> Dictionary:',
        ),
        godotSummaryRegistered: mainGd.includes(
          'func _read_world_map_video_style_transition_chain_summary(',
        ),
      },
      pending: {
        stages: pendingStages,
        summaryFields: pendingSummaryFields,
      },
      proofMode: {
        requiresVisualSmoke: true,
        requiresVideoFrameEvidence: true,
        staticWiringVerified: true,
      },
    },
    null,
    2,
  ),
)
console.log('[godot_world_map_video_style_transition_chain_contract] all checks passed')

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const mapGrid = readFileSync('godot-client/scripts/map/map_grid.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.ok(
  main.includes('var tianxia_yutu_governance := _build_mainline_visual_smoke_player_visible_ui_governance_result({'),
  'world_tianxia_yutu_product_acceptance_qa must feed the reusable player_visible_ui_governance_v1 helper.',
)

for (const requiredField of [
  'tianxiaYutuPlayerUiGovernanceContractId',
  'tianxiaYutuPlayerUiGovernanceVerified',
  'tianxiaYutuForbiddenVisibleCopyClear',
  'tianxiaYutuVisibleDensityOk',
]) {
  assert.ok(main.includes(requiredField), `Tianxia Yutu smoke result must expose ${requiredField}.`)
  assert.ok(visualSmoke.includes(`"${requiredField}"`), `world_tianxia_yutu_product_acceptance_qa runner must require ${requiredField}.`)
}

for (const forbiddenVisibleCopy of ['read model', 'authority', 'tier', 'child page', '结构化展示', '当前切项', 'proposalId', 'worldAction', 'queuePlanExecution', 'provider', 'env', 'key', 'west_highland_tianzhu']) {
  assert.ok(
    main.includes(`"${forbiddenVisibleCopy}"`),
    `Tianxia Yutu governance adapter must check forbidden visible copy: ${forbiddenVisibleCopy}`,
  )
}

for (const requiredLayerLabelCopy of ['天下舆图加载中', '天下舆图暂不可用', '天下舆图已就绪']) {
  assert.ok(
    main.includes(`_tianxia_yutu_layer_label.text = "${requiredLayerLabelCopy}"`),
    `Tianxia Yutu LayerLabel must use short Chinese player copy: ${requiredLayerLabelCopy}`,
  )
}

for (const forbiddenLayerLabelCopy of [
  'overview layer request pending',
  '_tianxia_yutu_layer_label.text = str(result)',
  'scale=%s | tiles=%d | max=%s | jumpTargets=%d | source=%s',
]) {
  assert.ok(
    !main.includes(forbiddenLayerLabelCopy),
    `Tianxia Yutu LayerLabel must not expose engineering/debug copy: ${forbiddenLayerLabelCopy}`,
  )
}

assert.ok(
  main.includes('"west_highland_tianzhu": "高原天竺"') &&
    mapGrid.includes('"west_highland_tianzhu": "高原天竺"'),
  'Tianxia Yutu gate boundary copy must translate west_highland_tianzhu before player-visible panels/tooltips.',
)

console.log('[godot_tianxia_yutu_player_ui_governance_adapter_contract] all checks passed')

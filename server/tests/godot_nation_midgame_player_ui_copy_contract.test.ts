import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

const presenter = readUtf8('godot-client/scripts/ui/presenters/alliance_presenter.gd')
const panel = readUtf8('godot-client/scripts/ui/alliance_panel.gd')
const main = readUtf8('godot-client/scripts/app/main.gd')

const bannedVisibleCopy = [
  'region_control',
  'state_capital',
  'luoyang_control',
  'empire_status',
  'east_han_unification',
  'alliance -> kingdom -> empire',
  'alliance',
  'kingdom',
  'empire',
  'nation tier',
  'read model',
  'authority',
  'tier',
]

const bannedMobileMicroCopy = [
  '今日目标',
  '今日方向',
  '下一步',
  '组织不是空壳',
  '每个目标只保留',
  '先稳住',
  '真人主控',
  'AI 执行',
  '官职分工已经接入',
  'child page',
  '结构化展示',
  '当前切项',
]

assert.ok(
  presenter.includes('NATION_MIDGAME_PLAYER_UI_COPY_CONTRACT := "nation_midgame_player_ui_copy_v1"'),
  'AlliancePresenter must declare a player-visible nation midgame copy contract.',
)

assert.ok(
  presenter.includes('func _build_nation_midgame_player_ui_copy('),
  'AlliancePresenter must build a separate player UI copy payload instead of rendering raw read-model rows.',
)

const playerCopyStart = presenter.indexOf('func _build_nation_midgame_player_ui_copy(')
const playerCopyEnd = presenter.indexOf('\nfunc ', playerCopyStart + 1)
assert.ok(playerCopyStart >= 0 && playerCopyEnd > playerCopyStart, 'player UI copy helper must be extractable.')
const playerCopySource = presenter.slice(playerCopyStart, playerCopyEnd)
const stageCopyStart = presenter.indexOf('func _build_nation_midgame_player_stage_cards(')
const stageCopyEnd = presenter.indexOf('\nfunc ', stageCopyStart + 1)
assert.ok(stageCopyStart >= 0 && stageCopyEnd > stageCopyStart, 'nation midgame stage copy helper must be extractable.')
const stageCopySource = presenter.slice(stageCopyStart, stageCopyEnd)

for (const requiredCopy of ['从同盟发育到东汉十三州', '同盟发育', '建国称王', '晋升帝国', '东汉十三州']) {
  assert.ok(
    `${playerCopySource}\n${stageCopySource}`.includes(requiredCopy),
    `player UI copy must include large readable Chinese goal copy: ${requiredCopy}`,
  )
}

for (const forbidden of bannedVisibleCopy) {
  assert.ok(
    !playerCopySource.toLowerCase().includes(forbidden.toLowerCase()),
    `player-visible nation midgame copy helper must not expose engineering copy: ${forbidden}`,
  )
}

const nationMidgameSectionStart = presenter.indexOf('func _build_nation_midgame_section(')
const nationMidgameSectionEnd = presenter.indexOf('\nfunc ', nationMidgameSectionStart + 1)
assert.ok(nationMidgameSectionStart >= 0 && nationMidgameSectionEnd > nationMidgameSectionStart, 'nation midgame section helper must be extractable.')
const nationMidgameVisibleSource = presenter.slice(nationMidgameSectionStart, nationMidgameSectionEnd) + playerCopySource + stageCopySource

for (const forbidden of bannedMobileMicroCopy) {
  assert.ok(
    !nationMidgameVisibleSource.includes(forbidden),
    `nation-midgame mobile visible copy must not render explanatory micro-copy: ${forbidden}`,
  )
}

assert.ok(
  main.includes('"requiredMemberCardCount": 1'),
  'Nation-midgame governance must accept one concise member summary card instead of forcing three explanatory member cards.',
)

assert.ok(
  panel.includes('"nation/midgame"') && panel.includes('OrganizationNationMidgameSingleStage'),
  'AlliancePanel must render nation/midgame through a bespoke mobile stage instead of the generic child-page factory.',
)

assert.ok(
  panel.includes('NATION_MIDGAME_PLAYER_UI_COPY_CONTRACT := "nation_midgame_player_ui_copy_v1"'),
  'AlliancePanel must know the player-visible copy contract.',
)

for (const requiredSummaryField of [
  'organizationNationMidgamePlayerUiCopyContractId',
  'organizationNationMidgamePrimaryGoalText',
  'organizationNationMidgamePrimaryGoalTextShortChinese',
  'organizationNationMidgameForbiddenVisibleCopyHits',
  'organizationNationMidgameForbiddenVisibleCopyClear',
]) {
  assert.ok(panel.includes(requiredSummaryField), `AlliancePanel smoke summary must expose ${requiredSummaryField}.`)
}

assert.ok(
  panel.includes('func _nation_midgame_player_visible_copy_lines('),
  'AlliancePanel must collect player-visible nation midgame copy for forbidden-copy checks.',
)

const visibleCopyCollectorStart = panel.indexOf('func _nation_midgame_player_visible_copy_lines(')
const visibleCopyCollectorEnd = panel.indexOf('\nfunc ', visibleCopyCollectorStart + 1)
assert.ok(visibleCopyCollectorStart >= 0 && visibleCopyCollectorEnd > visibleCopyCollectorStart, 'visible copy collector must be extractable.')
const visibleCopyCollectorSource = panel.slice(visibleCopyCollectorStart, visibleCopyCollectorEnd)

for (const forbidden of bannedVisibleCopy) {
  assert.ok(
    visibleCopyCollectorSource.includes(`"${forbidden}"`),
    `AlliancePanel forbidden-copy collector must check ${forbidden}.`,
  )
}

for (const requiredSmokeCheck of [
  'organizationNationMidgamePlayerUiCopyVerified',
  'organizationNationMidgamePlayerUiGovernanceVerified',
  'organizationNationMidgamePlayerUiCopyContractId',
  'organizationNationMidgameForbiddenVisibleCopyClear',
  'organizationNationMidgamePrimaryGoalTextShortChinese',
]) {
  assert.ok(main.includes(requiredSmokeCheck), `main.gd formal click action must verify ${requiredSmokeCheck}.`)
}

console.log('[godot_nation_midgame_player_ui_copy_contract] all checks passed')

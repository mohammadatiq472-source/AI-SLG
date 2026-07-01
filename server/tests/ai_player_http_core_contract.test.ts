import assert from 'node:assert/strict'
import type { AiPlayerActionProposal } from '../../shared/contracts/aiPlayer'
import { executeSupportedAiPlayerProposal } from '../src/application/ai/aiPlayerProposalExecution'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'
import { refineAiPlayerContextDocumentResponseSchema } from '../../shared/schemas/aiPlayer'

const EXECUTABLE_ACTIONS: Record<string, string> = {
  city_upgrade: 'upgradeCity',
  building_upgrade: 'promoteCityBuilding',
  tactical_skill_upgrade: 'upgradeTacticalSkill',
  hero_star_upgrade: 'upgradeHeroStar',
  queue_fill_idle_slot: 'enqueueAffair',
  research_start: 'upgradeCityTech',
  troop_train: 'deployReserveHero',
  troop_heal: 'healTroop',
  recruit_pool_select: 'setRecruitSelectedPool',
  recruit_commander: 'recruitProspectHero',
  world_scout: 'queuePlanExecution',
  march_move: 'moveUnit',
  garrison_set: 'queueTacticalOverride',
  resource_gather: 'gatherAiResourceTile',
  tile_occupy: 'occupyTile',
  troop_facility_upgrade: 'promoteTroopFacilityBuilding',
  general_focus_set: 'setGeneralActiveHero',
  formation_assign: 'setGeneralTactic',
  threat_escape: 'queueAiAgendaAction',
  alliance_help: 'allianceHelp',
  resource_transfer_to_governor: 'transferFactionResourcesToGovernor',
  reward_claim: 'claimReward',
}

const ACTION_WHITELIST = [...Object.keys(EXECUTABLE_ACTIONS), 'battle_report_read', 'hero_level_upgrade']

const INVALID_PROPOSAL_CASES: Array<{
  action: string
  args: Record<string, unknown>
  message: string
}> = [
  { action: 'research_start', args: { techId: 'invalid_track' }, message: 'research_start rejects unsupported techId' },
  { action: 'building_upgrade', args: { groupId: 'invalid_group' }, message: 'building_upgrade rejects unsupported groupId' },
  { action: 'tactical_skill_upgrade', args: { heroId: 123, skillId: 'lib_s_chase_rending_charge' }, message: 'tactical_skill_upgrade rejects non-string heroId' },
  { action: 'tactical_skill_upgrade', args: { heroId: '100027', skillId: 123 }, message: 'tactical_skill_upgrade rejects non-string skillId' },
  { action: 'hero_level_upgrade', args: { heroId: 123 }, message: 'hero_level_upgrade rejects direct level-up args' },
  { action: 'hero_star_upgrade', args: { heroId: 123 }, message: 'hero_star_upgrade rejects non-string heroId' },
  { action: 'queue_fill_idle_slot', args: { groupId: 'invalid_group' }, message: 'queue_fill_idle_slot rejects unsupported groupId' },
  { action: 'march_move', args: { unitId: 123, targetTileId: 'tile_01' }, message: 'march_move rejects non-string unitId' },
  { action: 'world_scout', args: { targetTileId: 123 }, message: 'world_scout rejects non-string targetTileId' },
  { action: 'resource_gather', args: { unitId: 123, tileId: 'tile_01' }, message: 'resource_gather rejects non-string unitId' },
  { action: 'tile_occupy', args: { unitId: 123, tileId: 'tile_01' }, message: 'tile_occupy rejects non-string unitId' },
  { action: 'troop_heal', args: { unitId: 123 }, message: 'troop_heal rejects non-string unitId' },
  { action: 'troop_train', args: { heroId: 123 }, message: 'troop_train rejects non-string heroId' },
  {
    action: 'troop_facility_upgrade',
    args: { buildingId: 'invalid_building' },
    message: 'troop_facility_upgrade rejects unsupported buildingId',
  },
  {
    action: 'recruit_pool_select',
    args: { poolId: 'invalid_pool' },
    message: 'recruit_pool_select rejects unsupported poolId',
  },
  { action: 'recruit_commander', args: { count: 0 }, message: 'recruit_commander rejects out-of-range count' },
  { action: 'garrison_set', args: { summary: 123 }, message: 'garrison_set rejects non-string summary' },
  { action: 'general_focus_set', args: { heroId: 123 }, message: 'general_focus_set rejects non-string heroId' },
  { action: 'formation_assign', args: { tacticId: 'invalid_tactic' }, message: 'formation_assign rejects tacticId' },
  { action: 'threat_escape', args: { mode: 'invalid_mode' }, message: 'threat_escape rejects unsupported mode' },
  { action: 'alliance_help', args: { regionId: 123 }, message: 'alliance_help rejects non-string regionId' },
  {
    action: 'resource_transfer_to_governor',
    args: { resources: { food: 0 } },
    message: 'resource_transfer_to_governor rejects non-positive resources',
  },
  { action: 'reward_claim', args: { rewardId: 123 }, message: 'reward_claim rejects non-string rewardId' },
  { action: 'battle_report_read', args: { unexpected: 'field' }, message: 'empty-args actions reject stray args' },
]

async function testProposalExecutorRejectsDirectHeroLevelUpgrade() {
  const result = await executeSupportedAiPlayerProposal({
    proposalId: 'contract_direct_hero_level_upgrade',
    aiPlayerId: 'player_operator_alpha',
    governorPlayerId: 'human_alpha',
    factionId: 'player',
    action: 'hero_level_upgrade',
    args: { heroId: '100027' },
    reason: 'Contract guard: direct hero level upgrade must stay outside AI proposal execution.',
    riskLevel: 'medium',
    source: 'mcp',
    status: 'approved',
    requiresApproval: true,
    executableInV1: false,
    createdAt: '2026-05-27T00:00:00.000Z',
    updatedAt: '2026-05-27T00:00:00.000Z',
    approvedAt: '2026-05-27T00:00:00.000Z',
    approvedBy: 'human_alpha',
  } as unknown as AiPlayerActionProposal, false)

  assert.equal('error' in result, true, 'proposal executor must reject direct hero_level_upgrade')
  assert.match(
    'error' in result ? result.error : '',
    /not executable in v1/,
    'proposal executor rejection should explain that direct hero level upgrades are not executable',
  )
}

async function run() {
  await testProposalExecutorRejectsDirectHeroLevelUpgrade()

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const aiPlayerPersistPath = buildSessionPersistPath('ai_player_http_core_governance_state')
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: aiPlayerPersistPath,
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_http_core_session_state'),
    AI_PLAYER_RUNTIME_MODEL: '',
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)
    const healthPayload = readObject(health.data)
    const persistence = readObject(healthPayload.persistence)
    assert.equal(readObject(persistence.aiPlayerGovernance).enabled, true, 'health should expose AI player persistence')

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'human_alpha',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)

    const catalog = await requestJson(baseUrl, '/api/ai/player-actions/catalog', 'GET')
    assert.equal(catalog.status, 200, `catalog route failed: ${JSON.stringify(catalog.data)}`)
    const catalogByAction = new Map(
      readArray(readObject(catalog.data).catalog).map((item) => {
        const entry = readObject(item)
        return [String(entry.action), entry] as const
      }),
    )
    for (const [action, worldAction] of Object.entries(EXECUTABLE_ACTIONS)) {
      const entry = catalogByAction.get(action)
      assert.ok(entry, `${action} should exist in AI player action catalog`)
      assert.equal(entry.executableInV1, true, `${action} should be executable in v1`)
      assert.equal(entry.mappedWorldAction, worldAction, `${action} should map to ${worldAction}`)
    }
    const heroLevelEntry = catalogByAction.get('hero_level_upgrade')
    assert.ok(heroLevelEntry, 'hero_level_upgrade should remain documented as an internal-only legacy action')
    assert.equal(heroLevelEntry.executableInV1, false, 'hero_level_upgrade must not be executable by AI v1')
    assert.equal(heroLevelEntry.internalOnly, true, 'hero_level_upgrade catalog entry must be marked internal-only')
    assert.equal(heroLevelEntry.mappedWorldAction, 'upgradeHeroLevel')

    const registerAlpha = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: 'player_operator_alpha',
      displayName: 'Player Operator Alpha',
      governorPlayerId: 'human_alpha',
      factionId: 'player',
      actionWhitelist: ACTION_WHITELIST,
    })
    assert.equal(registerAlpha.status, 200, `register alpha failed: ${JSON.stringify(registerAlpha.data)}`)

    const listPlayers = await requestJson(baseUrl, '/api/ai/players?governorPlayerId=human_alpha', 'GET')
    assert.equal(listPlayers.status, 200, `list players failed: ${JSON.stringify(listPlayers.data)}`)
    const players = readArray(readObject(listPlayers.data).items)
    const playerAlphaRuntime = players.map((item) => readObject(item)).find((item) => item.aiPlayerId === 'player_operator_alpha')
    assert.ok(playerAlphaRuntime, 'runtime list should include alpha AI player')
    assert.equal(playerAlphaRuntime.autonomyLevel, 'L1_assigned', 'runtime should reflect SessionManager authority')
    assert.equal(playerAlphaRuntime.controlMode, 'human_assigned', 'runtime should derive control mode from session authority')
    assert.equal(playerAlphaRuntime.governorOnline, true, 'runtime should detect online governor through session roster')
    assert.equal(playerAlphaRuntime.modelName, 'deepseek-v4-flash')
    assert.equal(playerAlphaRuntime.modelSource, 'default')
    const playerAlphaModelStatus = readObject(playerAlphaRuntime.modelStatus)
    assert.equal(playerAlphaModelStatus.activeModel, 'deepseek-v4-flash')
    assert.equal(playerAlphaModelStatus.activeProvider, 'api.deepseek.com')
    assert.equal(playerAlphaModelStatus.source, 'default')
    assert.equal(playerAlphaModelStatus.strictJsonOnlyCapable, true)
    assert.equal(playerAlphaModelStatus.budgetTier, 'strict_action')
    assert.equal(playerAlphaModelStatus.fallbackEnabled, false)
    assert.equal(playerAlphaModelStatus.fallbackModel, null)
    assert.equal(playerAlphaModelStatus.secretConfigured, false)
    assert.equal(playerAlphaModelStatus.secretSource, null)
    assert.equal('apiKeys' in playerAlphaModelStatus, false, 'runtime modelStatus must not expose raw apiKeys')

    const runtimeBeforeProposal = await requestJson(baseUrl, '/api/ai/players/player_operator_alpha', 'GET')
    assert.equal(runtimeBeforeProposal.status, 200, 'get ai player runtime should return 200')
    const runtimeBeforeProposalPayload = readObject(runtimeBeforeProposal.data)
    assert.equal(readObject(runtimeBeforeProposalPayload.observability).factionId, 'player')
    assert.equal(readObject(runtimeBeforeProposalPayload.persistence).path, aiPlayerPersistPath)
    assert.deepEqual(
      readObject(runtimeBeforeProposalPayload.modelStatus),
      playerAlphaModelStatus,
      'runtime detail should expose the same modelStatus read-model as list',
    )

    const renameAlpha = await requestJson(baseUrl, '/api/ai/players/player_operator_alpha/profile', 'POST', {
      displayName: '青州 AI 参谋',
      avatarId: 'cai_wenji_fate_frontier_qin_v1',
      avatarImagePath: 'res://assets/portraits/ai_chat/cai_wenji_fate_frontier_qin_v1_avatar_160.png',
      updatedBy: 'human_alpha',
    })
    assert.equal(renameAlpha.status, 200, `rename alpha failed: ${JSON.stringify(renameAlpha.data)}`)
    const renamedAlphaPlayer = readObject(readObject(renameAlpha.data).player)
    assert.equal(renamedAlphaPlayer.displayName, '青州 AI 参谋')
    assert.equal(renamedAlphaPlayer.avatarId, 'cai_wenji_fate_frontier_qin_v1')
    assert.equal(renamedAlphaPlayer.avatarImagePath, 'res://assets/portraits/ai_chat/cai_wenji_fate_frontier_qin_v1_avatar_160.png')

    const avatarOnlyUpdate = await requestJson(baseUrl, '/api/ai/players/player_operator_alpha/profile', 'POST', {
      avatarId: 'cao_cao_fate_v1',
      avatarImagePath: 'res://assets/portraits/ai_chat/cao_cao_fate_v1_avatar_160.png',
      updatedBy: 'human_alpha',
    })
    assert.equal(avatarOnlyUpdate.status, 200, `avatar profile update failed: ${JSON.stringify(avatarOnlyUpdate.data)}`)
    const avatarOnlyPlayer = readObject(readObject(avatarOnlyUpdate.data).player)
    assert.equal(avatarOnlyPlayer.displayName, '青州 AI 参谋')
    assert.equal(avatarOnlyPlayer.avatarId, 'cao_cao_fate_v1')
    assert.equal(avatarOnlyPlayer.avatarImagePath, 'res://assets/portraits/ai_chat/cao_cao_fate_v1_avatar_160.png')

    const uploadedAvatar = await requestJson(baseUrl, '/api/ai/players/player_operator_alpha/avatar-image', 'POST', {
      contentType: 'image/png',
      fileName: 'qingzhou-avatar.png',
      imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      updatedBy: 'human_alpha',
    })
    assert.equal(uploadedAvatar.status, 200, `avatar image upload failed: ${JSON.stringify(uploadedAvatar.data)}`)
    const uploadedAvatarPayload = readObject(uploadedAvatar.data)
    assert.equal(uploadedAvatarPayload.ok, true)
    assert.equal('imageBase64' in uploadedAvatarPayload, false, 'avatar upload response must not echo raw base64')
    const uploadedAvatarAsset = readObject(uploadedAvatarPayload.asset)
    assert.equal(uploadedAvatarAsset.contentType, 'image/png')
    assert.equal(uploadedAvatarAsset.byteSize, 68)
    assert.match(String(uploadedAvatarAsset.assetId), /^ai_avatar_player_operator_alpha_[a-f0-9]{16}$/)
    assert.match(String(uploadedAvatarAsset.avatarImagePath), /tmp[\\/]ai_player_avatar_uploads[\\/]player_operator_alpha[\\/]/)
    const uploadedAvatarPlayer = readObject(uploadedAvatarPayload.player)
    assert.equal(uploadedAvatarPlayer.avatarId, uploadedAvatarAsset.assetId)
    assert.equal(uploadedAvatarPlayer.avatarImagePath, uploadedAvatarAsset.avatarImagePath)
    const runtimeAfterAvatarUpload = await requestJson(baseUrl, '/api/ai/players/player_operator_alpha', 'GET')
    assert.equal(runtimeAfterAvatarUpload.status, 200, 'runtime after avatar upload should return 200')
    assert.equal(readObject(runtimeAfterAvatarUpload.data).avatarImagePath, uploadedAvatarAsset.avatarImagePath)

    const contextDocument = await requestJson(baseUrl, '/api/ai/players/player_operator_alpha/context-documents', 'POST', {
      kind: 'skill',
      title: '青州后勤官 SKLL',
      content: '身份：后勤 AI。规则：只生成 proposal，移动、采集、征兵都等待后端回执。',
      sourceFileName: 'qingzhou-logistics.skll',
      updatedBy: 'human_alpha',
    })
    assert.equal(contextDocument.status, 200, `context document upsert failed: ${JSON.stringify(contextDocument.data)}`)
    const contextDocumentPayload = readObject(contextDocument.data)
    assert.equal(readObject(contextDocumentPayload.document).kind, 'skill')
    const playerWithContext = readObject(contextDocumentPayload.player)
    const contextDocuments = readArray(playerWithContext.contextDocuments)
    assert.equal(contextDocuments.length, 1)
    assert.equal(readObject(contextDocuments[0]).title, '青州后勤官 SKLL')

    const identityRefine = await requestJson(baseUrl, '/api/ai/players/player_operator_alpha/context-documents/refine', 'POST', {
      sourceContent: [
        '张飞 2026/05/05 21:00: 俺今天守青州粮道，别让弟兄们饿着。',
        '张飞 2026/05/05 21:03: 遇到敌人先护粮，再看有没有机会干就完了。',
        '刘备 2026/05/05 21:05: 你说话直，但记得先报风险。',
      ].join('\n'),
      sourceFileName: 'wechat-zhangfei-2026-05-05.txt',
      titleHint: '张飞微信身份提炼',
      updatedBy: 'human_alpha',
    })
    assert.equal(identityRefine.status, 200, `identity refine preview failed: ${JSON.stringify(identityRefine.data)}`)
    refineAiPlayerContextDocumentResponseSchema.parse(identityRefine.data)
    const identityRefinePayload = readObject(identityRefine.data)
    assert.equal(identityRefinePayload.ok, true)
    const refinedIdentity = readObject(identityRefinePayload.refined)
    assert.equal(refinedIdentity.kind, 'identity')
    assert.equal(refinedIdentity.title, '张飞微信身份提炼')
    assert.match(String(refinedIdentity.content), /俺/)
    assert.match(String(refinedIdentity.content), /护粮/)
    assert.equal(refinedIdentity.sourceFileName, 'wechat-zhangfei-2026-05-05.txt')
    assert.equal(typeof refinedIdentity.estimatedTokens, 'number')
    assert.equal(identityRefinePayload.persisted, false, 'refine should return a preview and must not auto-save contextDocuments')

    const runtimeAfterRefine = await requestJson(baseUrl, '/api/ai/players/player_operator_alpha', 'GET')
    assert.equal(runtimeAfterRefine.status, 200, 'runtime after refine should return 200')
    assert.equal(
      readArray(readObject(runtimeAfterRefine.data).contextDocuments).length,
      1,
      'refine preview must not mutate contextDocuments before explicit upsert',
    )

    for (const testCase of INVALID_PROPOSAL_CASES) {
      const invalidProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
        aiPlayerId: 'player_operator_alpha',
        action: testCase.action,
        source: 'mcp',
        reason: `Core contract validation: ${testCase.message}`,
        args: testCase.args,
      })
      assert.equal(invalidProposal.status, 422, testCase.message)
    }

    for (const action of ['battle_report_read', 'hero_level_upgrade']) {
      const nonExecutableProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
        aiPlayerId: 'player_operator_alpha',
        action,
        source: 'mcp',
        reason: `Core contract validation: ${action} should not create executable AI proposals`,
        args: {},
      })
      assert.equal(nonExecutableProposal.status, 400, `${action} should be rejected at proposal creation`)
      assert.match(
        String(readObject(nonExecutableProposal.data).error),
        /not executable in v1/,
        `${action} rejection should explain the v1 execution boundary`,
      )
    }

    const createProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'player_operator_alpha',
      action: 'recruit_pool_select',
      source: 'mcp',
      reason: 'Core HTTP contract execution smoke test',
      args: {
        poolId: 'pool_season',
      },
    })
    assert.equal(createProposal.status, 200, `create proposal failed: ${JSON.stringify(createProposal.data)}`)
    const proposal = readObject(readObject(createProposal.data).proposal)
    const proposalId = String(proposal.proposalId)
    assert.equal(proposal.status, 'pending_approval', 'proposal should require explicit approval in v1')
    assert.deepEqual(proposal.args, { poolId: 'pool_season' }, 'proposal should preserve action-specific args')

    const approveProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
      approvedBy: 'human_alpha',
    })
    assert.equal(approveProposal.status, 200, `approve proposal failed: ${JSON.stringify(approveProposal.data)}`)

    const executeProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
      executedBy: 'human_alpha',
      includeWorld: false,
    })
    assert.equal(executeProposal.status, 200, `execute proposal failed: ${JSON.stringify(executeProposal.data)}`)
    const receipt = readObject(readObject(executeProposal.data).receipt)
    assert.equal(receipt.ok, true, `receipt should report success: ${JSON.stringify(executeProposal.data)}`)
    assert.equal(receipt.worldAction, 'setRecruitSelectedPool', 'receipt should preserve mapped world action')
    assert.equal(receipt.failureCode, null, 'receipt should expose null failureCode on success')
    assert.ok(readObject(receipt.execution), 'receipt should expose execution snapshot')
    assert.deepEqual(
      receipt.worldActionPayload,
      { factionId: 'player', poolId: 'pool_season' },
      'receipt should surface resolved action payload',
    )

    async function executeApprovedProposal(action: string, args: Record<string, unknown>) {
      const create = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
        aiPlayerId: 'player_operator_alpha',
        action,
        source: 'mcp',
        reason: `Core HTTP contract execution smoke test for ${action}`,
        args,
      })
      assert.equal(create.status, 200, `create ${action} proposal failed: ${JSON.stringify(create.data)}`)
      const createdProposal = readObject(readObject(create.data).proposal)
      const createdProposalId = String(createdProposal.proposalId)
      assert.equal(createdProposal.status, 'pending_approval', `${action} proposal should require approval`)

      const approve = await requestJson(baseUrl, `/api/ai/players/proposals/${createdProposalId}/approve`, 'POST', {
        approvedBy: 'human_alpha',
      })
      assert.equal(approve.status, 200, `approve ${action} proposal failed: ${JSON.stringify(approve.data)}`)

      const execute = await requestJson(baseUrl, `/api/ai/players/proposals/${createdProposalId}/execute`, 'POST', {
        executedBy: 'human_alpha',
        includeWorld: false,
      })
      assert.equal(execute.status, 200, `execute ${action} proposal failed: ${JSON.stringify(execute.data)}`)
      const actionReceipt = readObject(readObject(execute.data).receipt)
      assert.equal(actionReceipt.ok, true, `${action} receipt should report success: ${JSON.stringify(execute.data)}`)
      assert.equal(actionReceipt.failureCode, null, `${action} AI receipt failureCode should be null on success`)
      assert.ok(readObject(actionReceipt.worldReceipt), `${action} receipt should include authoritative worldReceipt`)
      return actionReceipt
    }

    const tacticalReceipt = await executeApprovedProposal('tactical_skill_upgrade', {
      heroId: '100027',
      skillId: 'lib_s_chase_rending_charge',
    })
    assert.equal(tacticalReceipt.worldAction, 'upgradeTacticalSkill')
    assert.deepEqual(tacticalReceipt.worldActionPayload, {
      factionId: 'player',
      heroId: '100027',
      skillId: 'lib_s_chase_rending_charge',
    })
    const tacticalWorldReceipt = readObject(tacticalReceipt.worldReceipt)
    assert.equal(tacticalWorldReceipt.action, 'upgradeTacticalSkill')
    assert.equal(tacticalWorldReceipt.heroId, '100027')
    assert.equal(tacticalWorldReceipt.skillId, 'lib_s_chase_rending_charge')
    assert.equal(tacticalWorldReceipt.previousLevel, 5)
    assert.equal(tacticalWorldReceipt.nextLevel, 6)
    const subjectAfterTactical = await requestJson(
      baseUrl,
      '/api/ai/players/player_operator_alpha/subject?governorPlayerId=human_alpha',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectAfterTactical.status, 200, `subject after tactical_skill_upgrade failed: ${JSON.stringify(subjectAfterTactical.data)}`)
    const tacticalSubject = readObject(readObject(subjectAfterTactical.data).subject)
    const tacticalRecentBodyChanges = readObject(tacticalSubject.recentBodyChanges)
    assert.equal(tacticalRecentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const tacticalBodyChangeItems = readArray(tacticalRecentBodyChanges.items).map((item) => readObject(item))
    const tacticalBodyChange = tacticalBodyChangeItems.find((item) => item.action === 'tactical_skill_upgrade')
    assert.ok(tacticalBodyChange, 'tactical_skill_upgrade receipt must become a subject body change')
    assert.equal(tacticalBodyChange.bodyNode, 'generals_and_troops')
    assert.equal(tacticalBodyChange.status, 'completed')
    assert.equal(tacticalBodyChange.heroId, '100027')
    assert.equal(tacticalBodyChange.skillId, 'lib_s_chase_rending_charge')
    assert.equal(tacticalBodyChange.previousLevel, 5)
    assert.equal(tacticalBodyChange.nextLevel, 6)
    assert.equal(tacticalBodyChange.nextSubjectFocus, 'troops')
    assert.equal(tacticalBodyChange.visibleToAi, true)
    assert.equal(tacticalBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(tacticalBodyChange.governanceApprovedBy, 'human_alpha')
    assert.equal(typeof tacticalBodyChange.governanceApprovedAt, 'string')
    const tacticalHistoryAnchors = readObject(tacticalSubject.recentHistoryAnchors)
    assert.equal(tacticalHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
    const tacticalHistoryAnchorItems = readArray(tacticalHistoryAnchors.items).map((item) => readObject(item))
    const tacticalHistoryAnchor = tacticalHistoryAnchorItems.find((item) => item.proposalId === tacticalReceipt.proposalId)
    assert.ok(tacticalHistoryAnchor, 'tactical_skill_upgrade history anchor must link to the same proposal')
    assert.equal(tacticalHistoryAnchor.action, 'tactical_skill_upgrade')
    assert.equal(tacticalHistoryAnchor.bodyNode, 'generals_and_troops')
    assert.equal(tacticalHistoryAnchor.status, 'completed')
    assert.equal(tacticalHistoryAnchor.heroId, '100027')
    assert.equal(tacticalHistoryAnchor.skillId, 'lib_s_chase_rending_charge')
    assert.equal(tacticalHistoryAnchor.previousLevel, 5)
    assert.equal(tacticalHistoryAnchor.nextLevel, 6)
    assert.equal(tacticalHistoryAnchor.governanceApprovedBeforeExecution, true)
    assert.equal(tacticalHistoryAnchor.governanceApprovedBy, 'human_alpha')

    const heroStarReceipt = await executeApprovedProposal('hero_star_upgrade', {
      heroId: '100027',
    })
    assert.equal(heroStarReceipt.worldAction, 'upgradeHeroStar')
    const heroStarWorldReceipt = readObject(heroStarReceipt.worldReceipt)
    assert.equal(heroStarWorldReceipt.action, 'upgradeHeroStar')
    assert.equal(heroStarWorldReceipt.heroId, '100027')
    assert.equal(heroStarWorldReceipt.previousStarLevel, 0)
    assert.equal(heroStarWorldReceipt.nextStarLevel, 1)
    assert.equal(readObject(heroStarWorldReceipt.hero).starLevel, 1)
    const subjectAfterHeroStar = await requestJson(
      baseUrl,
      '/api/ai/players/player_operator_alpha/subject?governorPlayerId=human_alpha',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectAfterHeroStar.status, 200, `subject after hero_star_upgrade failed: ${JSON.stringify(subjectAfterHeroStar.data)}`)
    const heroStarSubject = readObject(readObject(subjectAfterHeroStar.data).subject)
    const heroStarRecentBodyChanges = readObject(heroStarSubject.recentBodyChanges)
    assert.equal(heroStarRecentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const heroStarBodyChangeItems = readArray(heroStarRecentBodyChanges.items).map((item) => readObject(item))
    const heroStarBodyChange = heroStarBodyChangeItems.find((item) => item.action === 'hero_star_upgrade')
    assert.ok(heroStarBodyChange, 'hero_star_upgrade receipt must become a subject body change')
    assert.equal(heroStarBodyChange.bodyNode, 'generals_and_troops')
    assert.equal(heroStarBodyChange.status, 'completed')
    assert.equal(heroStarBodyChange.heroId, '100027')
    assert.equal(heroStarBodyChange.previousStarLevel, 0)
    assert.equal(heroStarBodyChange.nextStarLevel, 1)
    assert.equal(heroStarBodyChange.nextSubjectFocus, 'troops')
    assert.equal(heroStarBodyChange.visibleToAi, true)
    assert.equal(heroStarBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(heroStarBodyChange.governanceApprovedBy, 'human_alpha')
    assert.equal(typeof heroStarBodyChange.governanceApprovedAt, 'string')
    const heroStarHistoryAnchors = readObject(heroStarSubject.recentHistoryAnchors)
    assert.equal(heroStarHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
    const heroStarHistoryAnchorItems = readArray(heroStarHistoryAnchors.items).map((item) => readObject(item))
    const heroStarHistoryAnchor = heroStarHistoryAnchorItems.find((item) => item.proposalId === heroStarReceipt.proposalId)
    assert.ok(heroStarHistoryAnchor, 'hero_star_upgrade history anchor must link to the same proposal')
    assert.equal(heroStarHistoryAnchor.action, 'hero_star_upgrade')
    assert.equal(heroStarHistoryAnchor.bodyNode, 'generals_and_troops')
    assert.equal(heroStarHistoryAnchor.status, 'completed')
    assert.equal(heroStarHistoryAnchor.heroId, '100027')
    assert.equal(heroStarHistoryAnchor.previousStarLevel, 0)
    assert.equal(heroStarHistoryAnchor.nextStarLevel, 1)
    assert.equal(heroStarHistoryAnchor.governanceApprovedBeforeExecution, true)
    assert.equal(heroStarHistoryAnchor.governanceApprovedBy, 'human_alpha')

    const buildingReceipt = await executeApprovedProposal('building_upgrade', {
      cityId: 'tile_08',
      groupId: 'tax',
      buildingId: 'tax_office',
    })
    assert.equal(buildingReceipt.worldAction, 'promoteCityBuilding')
    const buildingWorldReceipt = readObject(buildingReceipt.worldReceipt)
    assert.equal(buildingWorldReceipt.action, 'promoteCityBuilding')
    assert.equal(buildingWorldReceipt.cityId, 'tile_08')
    assert.equal(buildingWorldReceipt.groupId, 'tax')
    assert.equal(buildingWorldReceipt.buildingId, 'tax_office')
    assert.equal(readObject(buildingWorldReceipt.readModelRefresh).endpoint, '/api/world/main-city/facility-tree')

    console.log('[ai_player_http_core_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[ai_player_http_core_contract] failed:', error)
  process.exitCode = 1
})

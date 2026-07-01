extends RefCounted
class_name AIPanelPresenter

var _world_data: Dictionary = {}
var _map_layout_data: Dictionary = {}
var _target_faction_id: String = ""

const AI_CHAT_PORTRAIT_MANIFEST := "res://data/ai_chat_portraits.json"
const AI_PLAYER_EXECUTION_TRACE_CONTRACT := "ai_player_execution_trace_first_screen_v1"
const AI_PANEL_EXECUTION_TRACE_CARD_CHROME_TOKEN := "ai_panel_execution_trace_card_chrome_v1"
const AI_PLAYER_LIVING_WORLD_FIRST_SCREEN_CONTRACT := "ai_player_living_world_first_screen_v1"
const AI_PROPOSAL_DECISION_SURFACE_CONTRACT := "ai_proposal_decision_surface_v1"
const AI_PROPOSAL_MUTATION_RESULT_CONTRACT := "ai_proposal_mutation_result_visual_smoke_v1"
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const AI_PANEL_PLAYER_VISIBLE_NAME_FORBIDDEN_TERMS := [
	"contract",
	"backend",
	"read model",
	"authority",
	"tier",
	"/api/",
	"fixture",
	"local_only",
	"snake_case",
]

func configure(world_data: Dictionary, map_layout_data: Dictionary, target_faction_id: String) -> void:
	_world_data = world_data
	_map_layout_data = map_layout_data
	_target_faction_id = target_faction_id.strip_edges()

func build_snapshot(runtime_context: Dictionary) -> Dictionary:
	var faction_state := _read_target_faction_state()
	var hero_command: Dictionary = faction_state.get("heroCommand", {}) as Dictionary
	var ai_players: Array = faction_state.get("aiPlayers", []) as Array
	var captured_cities: Array = faction_state.get("capturedCities", []) as Array
	var ai_state := WorldStore.get_ai_state(_target_faction_id)
	var control_context := WorldStore.get_resolved_ai_control_context(_target_faction_id)
	var autonomy_level := str(control_context.get("autonomyLevel", "L2_delegated")).strip_edges()
	var control_mode := str(control_context.get("controlMode", "ai_delegated")).strip_edges()
	var control_authority_source := str(control_context.get("authoritySource", "unknown")).strip_edges()
	var context_focus_id := str(ai_state.get("contextFocusId", "focus_city"))
	var agenda: Dictionary = WorldStore.get_resolved_ai_agenda(_target_faction_id)
	var agenda_options: Array = _resolve_agenda_options(agenda)
	var execution_state := WorldStore.get_resolved_ai_execution(_target_faction_id)
	var action_receipt := WorldStore.get_ai_action_receipt(_target_faction_id)
	var ai_player_runtimes: Array = ai_state.get("playerRuntimeList", []) as Array
	var ai_player_receipt_items: Array = ai_state.get("playerRuntimeReceiptItems", []) as Array
	var ai_player_receipt_history_page: Dictionary = ai_state.get("playerRuntimeReceiptHistoryPage", {}) as Dictionary
	var ai_player_proposal_items: Array = ai_state.get("playerRuntimeProposalItems", []) as Array
	var ai_proposal_mutation_result: Dictionary = ai_state.get("playerRuntimeProposalMutationResult", {}) as Dictionary
	var ai_player_action_catalog: Array = ai_state.get("playerRuntimeActionCatalog", []) as Array
	var ai_player_development_plan: Dictionary = ai_state.get("playerRuntimeDevelopmentPlan", {}) as Dictionary
	var ai_player_autonomous_combat_daily_summary: Dictionary = ai_state.get("playerRuntimeAutonomousCombatDailySummary", {}) as Dictionary
	var ai_player_battle_report_items: Array = ai_state.get("playerRuntimeBattleReportItems", []) as Array
	var ai_player_battle_report_read_model: Dictionary = ai_state.get("playerRuntimeBattleReportReadModel", {}) as Dictionary
	var ai_player_execution_trace_items: Array = ai_state.get("playerRuntimeExecutionTraceItems", []) as Array
	var ai_player_execution_trace_read_model: Dictionary = ai_state.get("playerRuntimeExecutionTraceReadModel", {}) as Dictionary
	var ai_player_list_summary: Dictionary = ai_state.get("playerRuntimeListSummary", {}) as Dictionary
	var ai_player_home_city_candidates: Dictionary = ai_state.get("playerRuntimeHomeCityCandidates", {}) as Dictionary
	var ai_player_autonomy_guard := _read_ai_player_autonomy_guard(ai_state, ai_player_runtimes)
	var primary_ai_player_id := str(ai_state.get("playerRuntimePrimaryAiPlayerId", "")).strip_edges()
	var primary_ai_player_display_name := _resolve_primary_ai_player_display_name(ai_player_runtimes, primary_ai_player_id)
	var primary_ai_player_home_city_status := _resolve_primary_ai_player_home_city_status(ai_player_runtimes, primary_ai_player_id)
	var primary_ai_player_report_policy := _resolve_primary_ai_player_report_policy(ai_player_runtimes, primary_ai_player_id)
	var ai_home_city_candidate_items: Array = ai_player_home_city_candidates.get("candidates", []) as Array
	var ai_home_city_first_candidate_center_tile_id := _resolve_first_ai_home_city_candidate_center_tile_id(ai_home_city_candidate_items)
	var ai_player_runtime_updated_at := str(ai_state.get("playerRuntimeUpdatedAt", "")).strip_edges()
	if ai_player_runtime_updated_at == "":
		ai_player_runtime_updated_at = "未更新"
	var ai_player_runtime_error := str(ai_state.get("playerRuntimeLastError", "")).strip_edges()
	var ai_context_document_count := _count_ai_context_documents(ai_player_runtimes)
	var ai_context_document_summary := _format_ai_context_document_summary(ai_player_runtimes)
	var ai_resource_accounts: Dictionary = faction_state.get("aiResourceAccounts", {}) as Dictionary
	var governor_resource_inboxes: Dictionary = faction_state.get("governorResourceInboxes", {}) as Dictionary
	var ai_resource_account_count := ai_resource_accounts.size()
	var governor_pending_transfer_count := _count_pending_governor_transfers(governor_resource_inboxes)
	var ai_latest_receipt_summary := _format_ai_player_latest_receipt(ai_player_runtimes, ai_player_receipt_items)
	var ai_latest_proposal_summary := _format_ai_player_latest_proposal(ai_player_proposal_items)
	var ai_actionable_proposal_count := _count_actionable_ai_proposals(ai_player_proposal_items)
	var ai_model_summary := _format_ai_player_model_summary(ai_player_runtimes)
	var ai_model_access_summary := _format_ai_player_model_access_summary(ai_player_runtimes)
	var ai_key_status := _format_ai_player_key_status(ai_player_runtimes)
	autonomy_level = _resolve_autonomy_display_level(autonomy_level, ai_player_runtimes, control_authority_source)
	var ai_failure_summary := _format_ai_player_failure_summary(ai_player_runtimes, ai_player_proposal_items, ai_player_receipt_items, ai_player_runtime_error)
	var ai_resource_summary := _format_ai_resource_accounts_summary(ai_resource_accounts)
	var governor_inbox_summary := _format_governor_inbox_summary(governor_resource_inboxes)
	var ai_development_goal_summary := _format_ai_development_goal_summary(ai_player_development_plan)
	var ai_development_risk_summary := _format_ai_development_risk_summary(ai_player_development_plan)
	var ai_development_ready_action_count := _count_ai_development_ready_actions(ai_player_development_plan)
	var ai_battle_report_summary := _format_ai_battle_report_summary(ai_player_battle_report_items)
	var ai_battle_report_damage_summary := _format_ai_battle_report_damage_summary(ai_player_battle_report_items)
	var ai_battle_report_suggestion := _format_ai_battle_report_suggestion(ai_player_battle_report_items)
	var ai_battle_report_next_action := _resolve_ai_battle_report_next_action(ai_player_battle_report_items)
	var ai_latest_execution_trace_summary := _format_ai_latest_execution_trace_summary(ai_player_execution_trace_items)
	var ai_execution_trace_first_trace_id := _resolve_first_ai_execution_trace_id(ai_player_execution_trace_items)
	var ai_receipt_maritime_activity_chip_id := _resolve_maritime_activity_chip_id(ai_player_receipt_items, action_receipt)
	var ai_portrait_assignments := _load_ai_chat_portrait_assignments()
	var context_memory_summary: Dictionary = ai_state.get("contextMemorySummary", {}) as Dictionary
	var context_memory_lines: Array = context_memory_summary.get("lines", []) as Array
	var context_related_id := str(context_memory_summary.get("relatedId", ""))
	var context_related_label := _format_context_related_id(context_focus_id, context_related_id)
	var development_points := int(hero_command.get("developmentPoints", 0))
	var home_tile_id := str(hero_command.get("homeTileId", ""))
	var current_agenda_target_unit_id := _resolve_primary_agenda_target_unit_id(agenda)
	var runtime_receipt_lines := _build_runtime_receipt_lines(runtime_context)
	var ai_chat_history_snapshot: Dictionary = runtime_context.get("ai_chat_history_snapshot", {}) as Dictionary
	var context_focus_label := _focus_label(context_focus_id)
	var home_tile_label := _format_ai_tile_display_label(home_tile_id) if home_tile_id != "" else "未定位"
	var agenda_source_label := _format_agenda_source_for_player(str(agenda.get("source", "domain")).strip_edges())
	var agenda_summary := str(agenda.get("summary", "无路线。")).strip_edges()
	if agenda_summary == "":
		agenda_summary = "无路线。"
	var current_agenda_target_unit_label := current_agenda_target_unit_id if current_agenda_target_unit_id != "" else "未定位"
	var execution_status := _resolve_execution_status(execution_state, action_receipt)
	var execution_request_id := _resolve_execution_request_id(agenda, execution_state, action_receipt)
	var execution_queue_summary := _format_execution_queue_summary(execution_state)
	var execution_budget_summary := _format_execution_budget_summary(execution_state)
	var last_failure_code := _resolve_failure_code(action_receipt)
	var last_receipt_message := _resolve_receipt_message(action_receipt)
	var context_memory_headline := str(context_memory_lines[0] if not context_memory_lines.is_empty() else "尚未查询").strip_edges()
	if context_memory_headline == "":
		context_memory_headline = "尚未查询"
	var ai_player_model_name := _format_ai_player_model_name(ai_player_runtimes)
	var ai_player_model_source_label := _format_ai_player_model_source_label(ai_player_runtimes)
	var ai_player_model_budget_tier := _format_model_budget_text(ai_player_runtimes)
	var ai_player_model_fallback_status := _format_ai_player_model_fallback_status(ai_player_runtimes)
	var ai_player_model_fallback_short := _format_ai_player_model_fallback_short(ai_player_runtimes)
	var ai_budget_summary := _format_ai_player_budget_summary(ai_player_runtimes, ai_resource_accounts, governor_resource_inboxes, execution_budget_summary)
	var ai_failure_player_summary := _format_failure_to_player_text(ai_failure_summary)
	var ai_next_step_summary := _format_ai_player_next_step_summary(ai_player_development_plan, ai_player_battle_report_items, ai_failure_summary)
	var ai_proposal_decision_surface := _resolve_primary_actionable_ai_proposal(ai_player_proposal_items)
	var ai_proposal_decision_surface_active := not ai_proposal_decision_surface.is_empty()
	var ai_proposal_decision_copy_lines := _build_ai_proposal_decision_copy_lines(ai_proposal_decision_surface)
	var ai_proposal_mutation_result_active := not ai_proposal_mutation_result.is_empty()
	var ai_proposal_mutation_result_copy_lines := _build_ai_proposal_mutation_result_copy_lines(ai_proposal_mutation_result)
	return {
		"title": "AI玩家",
		"subtitle": "",
		"hide_summary_chrome": true,
		"empty_state_text": "AI玩家正在等待最新状态。",
		"shared_state": {
			"ai_player_living_world_first_screen_contract": AI_PLAYER_LIVING_WORLD_FIRST_SCREEN_CONTRACT,
			"autonomy_level": autonomy_level,
			"control_mode": control_mode,
			"control_authority_source": control_authority_source if control_authority_source != "" else "unknown",
			"ai_player_count": ai_players.size(),
			"captured_city_count": captured_cities.size(),
			"context_focus_id": context_focus_id,
			"context_focus_label": context_focus_label,
			"context_related_id": context_related_id,
			"context_related_label": context_related_label,
			"current_agenda_target_unit_id": current_agenda_target_unit_id,
			"current_agenda_target_unit_label": current_agenda_target_unit_label,
			"agenda": agenda.duplicate(true),
			"agenda_option_count": agenda_options.size(),
			"agenda_source_label": agenda_source_label,
			"agenda_summary": agenda_summary,
			"execution_status": execution_status,
			"execution_request_id": execution_request_id,
			"execution_queue_summary": execution_queue_summary,
			"execution_budget_summary": execution_budget_summary,
			"last_failure_code": last_failure_code,
			"last_receipt_message": last_receipt_message,
			"context_memory_headline": context_memory_headline,
			"home_tile_label": home_tile_label,
			"runtime_receipt_summary": runtime_receipt_lines[0],
			"runtime_receipt_tick": runtime_receipt_lines[1],
			"runtime_receipt_lines": runtime_receipt_lines.duplicate(),
			"ai_chat_history_count": _count_ai_chat_history_messages(ai_chat_history_snapshot),
			"ai_chat_history_source": str(ai_chat_history_snapshot.get("sourceLabel", "聊天频道")).strip_edges(),
			"ai_player_runtime_count": ai_player_runtimes.size(),
			"ai_player_list_card_count": _count_ai_player_list_cards(ai_player_runtimes),
			"ai_player_list_summary_count": int(ai_player_list_summary.get("count", ai_player_runtimes.size())),
			"ai_player_list_summary_pending_approval_count": int(ai_player_list_summary.get("pendingApprovalCount", 0)),
			"ai_player_list_summary_runtime_failure_count": int(ai_player_list_summary.get("runtimeFailureCount", 0)),
			"ai_player_autonomy_guard_mode": str(ai_player_autonomy_guard.get("mode", "")).strip_edges(),
			"ai_player_autonomy_guard_execution_enabled": bool(ai_player_autonomy_guard.get("autonomousExecutionEnabled", false)),
			"ai_player_autonomy_guard_pending_blocks": bool(ai_player_autonomy_guard.get("pendingApprovalBlocksExecution", true)),
			"ai_player_primary_id": primary_ai_player_id if primary_ai_player_id != "" else "未选择",
			"ai_player_primary_display_name": primary_ai_player_display_name,
			"ai_player_primary_avatar_id": _resolve_primary_ai_player_avatar_field(ai_player_runtimes, primary_ai_player_id, "avatarId"),
			"ai_player_primary_avatar_image_path": _resolve_primary_ai_player_avatar_field(ai_player_runtimes, primary_ai_player_id, "avatarImagePath"),
			"ai_player_report_daily_summary_enabled": bool(primary_ai_player_report_policy.get("dailySummary", true)),
			"ai_player_report_war_event_enabled": bool(primary_ai_player_report_policy.get("warEvent", true)),
			"ai_player_report_voice_enabled": bool(primary_ai_player_report_policy.get("voice", false)),
			"ai_player_home_city_binding_status": primary_ai_player_home_city_status,
			"ai_player_home_city_candidate_count": ai_home_city_candidate_items.size(),
			"ai_player_home_city_first_candidate_center_tile_id": ai_home_city_first_candidate_center_tile_id,
			"ai_player_runtime_updated_at": ai_player_runtime_updated_at,
			"ai_player_runtime_error": ai_player_runtime_error if ai_player_runtime_error != "" else "none",
			"ai_player_model_name": _format_ai_model_name_for_player(ai_player_model_name),
			"ai_player_model_source_label": ai_player_model_source_label,
			"ai_player_model_budget_tier": ai_player_model_budget_tier,
			"ai_player_model_fallback_status": ai_player_model_fallback_short,
			"ai_player_model_summary": ai_model_summary,
			"ai_player_model_access_summary": ai_model_access_summary,
			"ai_player_key_status": ai_key_status,
			"ai_context_document_count": ai_context_document_count,
			"ai_context_document_summary": ai_context_document_summary,
			"ai_player_failure_summary": ai_failure_summary,
			"ai_player_candidate_action_count": _count_candidate_actions(ai_player_runtimes, ai_player_action_catalog),
			"ai_resource_account_count": ai_resource_account_count,
			"ai_resource_summary": ai_resource_summary,
			"governor_pending_transfer_count": governor_pending_transfer_count,
			"governor_inbox_summary": governor_inbox_summary,
			"ai_development_goal_summary": ai_development_goal_summary,
			"ai_development_ready_action_count": ai_development_ready_action_count,
			"ai_development_risk_summary": ai_development_risk_summary,
			"ai_battle_report_count": int(ai_player_battle_report_read_model.get("count", ai_player_battle_report_items.size())),
			"ai_battle_report_summary": ai_battle_report_summary,
			"ai_battle_report_damage_summary": ai_battle_report_damage_summary,
			"ai_battle_report_suggestion": ai_battle_report_suggestion,
			"ai_battle_report_next_action": ai_battle_report_next_action,
			"ai_execution_trace_count": int(ai_player_execution_trace_read_model.get("count", ai_player_execution_trace_items.size())),
			"ai_execution_trace_first_trace_id": ai_execution_trace_first_trace_id,
			"ai_latest_execution_trace_summary": ai_latest_execution_trace_summary,
			"ai_execution_trace_visible": not ai_player_execution_trace_items.is_empty(),
			"ai_activity_identity_chip_token": UI_COMPONENT_FACTORY.ai_activity_identity_chip_token(),
			"ai_receipt_maritime_activity_chip_id": ai_receipt_maritime_activity_chip_id,
			"ai_receipt_maritime_activity_chip_visible": ai_receipt_maritime_activity_chip_id == "maritime_activity_chip_v1",
			"ai_autonomous_combat_daily_summary_text": _format_ai_autonomous_combat_daily_summary(ai_player_autonomous_combat_daily_summary),
			"ai_autonomous_combat_rally_campaign_memory_text": _format_ai_autonomous_combat_daily_summary_field(ai_player_autonomous_combat_daily_summary, "rallyCampaignMemory"),
			"ai_autonomous_combat_diplomacy_posture_text": _format_ai_autonomous_combat_daily_summary_field(ai_player_autonomous_combat_daily_summary, "diplomacyPosture"),
			"ai_autonomous_combat_cross_day_recap_text": _format_ai_autonomous_combat_daily_summary_field(ai_player_autonomous_combat_daily_summary, "crossDayRecap"),
			"ai_autonomous_combat_daily_summary_visible": not ai_player_autonomous_combat_daily_summary.is_empty(),
			"ai_latest_receipt_summary": ai_latest_receipt_summary,
			"ai_latest_proposal_summary": ai_latest_proposal_summary,
			"ai_actionable_proposal_count": ai_actionable_proposal_count,
			"ai_player_budget_summary": ai_budget_summary,
			"ai_player_failure_player_summary": ai_failure_player_summary,
			"ai_next_step_summary": ai_next_step_summary,
			"ai_proposal_decision_surface_contract": AI_PROPOSAL_DECISION_SURFACE_CONTRACT,
			"ai_proposal_decision_surface_ready": ai_proposal_decision_surface_active,
			"ai_proposal_decision_style_owner": "AIPanelPresenter+SlgSnapshotSectionPage+SlgUiComponentFactory",
			"ai_proposal_decision_copy_lines": ai_proposal_decision_copy_lines.duplicate(true),
			"ai_proposal_decision_copy_text": " / ".join(ai_proposal_decision_copy_lines),
			"ai_proposal_mutation_result_contract": AI_PROPOSAL_MUTATION_RESULT_CONTRACT,
			"ai_proposal_mutation_result_ready": ai_proposal_mutation_result_active,
			"ai_proposal_mutation_result_kind": str(ai_proposal_mutation_result.get("kind", "")).strip_edges(),
			"ai_proposal_mutation_result_status": str(ai_proposal_mutation_result.get("status", "")).strip_edges(),
			"ai_proposal_mutation_result_copy_lines": ai_proposal_mutation_result_copy_lines.duplicate(true),
			"ai_proposal_mutation_result_copy_text": " / ".join(ai_proposal_mutation_result_copy_lines),
		},
		"default_page_id": "advisor",
		"tabs": [],
		"sidebar_items": _build_ai_panel_sidebar_items(primary_ai_player_display_name, ai_next_step_summary, ai_actionable_proposal_count, ai_context_document_count),
		"sections": {
			"autonomy": {
				"summary_title": "托管范围",
				"shared_state_title": "",
				"player_reading_mode": true,
				"shared_state_fields": [],
				"summary_lines": [
					"默认日常代管；全权保留红线。",
				],
				"list_title": "AI玩家",
				"item_cards": [],
				"detail_title": "托管范围",
				"content_blocks": [
					_build_status_hero_block("当前托管", _build_autonomy_status_hero(autonomy_level, ai_player_autonomy_guard), "AIAutonomyStatusHeroBlock"),
					_build_button_row_block("托管档位", [
						{"id": "autonomy_L1_assigned", "label": "只出主意", "disabled": autonomy_level == "L1_assigned", "min_width": 176},
						{"id": "autonomy_L2_delegated", "label": "日常代管", "disabled": autonomy_level == "L2_delegated", "min_width": 176},
						{"id": "autonomy_L3_negotiated", "label": "全权托管", "disabled": autonomy_level == "L3_negotiated", "min_width": 176},
					], "AIAutonomyActionBlock"),
					_build_reading_list_block("托管档位", _build_autonomy_reading_items(autonomy_level, ai_player_autonomy_guard), "AIAutonomyReadingListBlock"),
				],
			},
			"players": {
				"summary_title": "AI玩家",
				"shared_state_title": "当前AI玩家",
				"player_reading_mode": true,
				"hide_detail_title": true,
				"mobile_stack": true,
				"mobile_stack_breakpoint": 920,
				"left_card_columns": 2,
				"shared_state_fields": [],
				"summary_lines": [
					"先看需处理，再决定出手。",
				],
				"list_title": "AI玩家",
				"item_cards": [],
				"detail_title": "先看",
				"content_blocks": _build_ai_players_first_screen_blocks(
					primary_ai_player_id,
					primary_ai_player_display_name,
					ai_player_runtimes,
					ai_player_home_city_candidates,
					ai_home_city_candidate_items,
					primary_ai_player_home_city_status,
					ai_next_step_summary,
					ai_failure_player_summary,
					ai_player_battle_report_items,
					ai_player_execution_trace_items,
					ai_player_autonomous_combat_daily_summary,
					ai_player_proposal_items,
					ai_player_runtime_error,
					ai_actionable_proposal_count
				),
			},
			"advisor": {
				"summary_title": "AI玩家",
				"shared_state_title": "",
				"player_reading_mode": true,
				"mobile_stack": true,
				"mobile_stack_breakpoint": 920,
				"shared_state_fields": [],
				"summary_lines": [
					"头像、称呼、设定。",
				],
				"list_title": "AI玩家",
				"item_cards": [],
				"detail_title": "AI玩家档案",
				"content_blocks": [
					_build_status_hero_block("", _build_ai_advisor_identity_hero(primary_ai_player_display_name, ai_player_runtimes), "AIAdvisorIdentityHeroBlock"),
					_build_card_grid_block("AI玩家档案", _build_ai_advisor_profile_cards(ai_player_runtimes, ai_portrait_assignments, ai_player_development_plan, ai_player_battle_report_items, ai_failure_summary, ai_player_list_summary), "AIAdvisorProfileBlock", 2),
					_build_button_row_block("头像与档案", [
						{"id": "ai_player_display_name_edit", "label": "改名", "disabled": ai_player_runtimes.is_empty(), "min_width": 132, "min_height": 64},
						{"id": "ai_player_avatar_select_open", "label": "自选头像", "disabled": ai_player_runtimes.is_empty(), "min_width": 176, "min_height": 64},
						{"id": "ai_player_context_document_open", "label": "写设定", "disabled": ai_player_runtimes.is_empty(), "min_width": 176, "min_height": 64},
						{"id": "ai_player_context_document_file_open", "label": "导入设定", "disabled": ai_player_runtimes.is_empty(), "min_width": 176, "min_height": 64},
					], "AIAdvisorActionBlock"),
					_build_card_grid_block("档案", _build_ai_context_document_cards(ai_player_runtimes), "AIAdvisorDocumentBlock", 2),
				],
			},
			"voice": {
				"summary_title": "声色",
				"shared_state_title": "",
				"player_reading_mode": true,
				"mobile_stack": true,
				"mobile_stack_breakpoint": 920,
				"shared_state_fields": [],
				"summary_lines": [
					"声色和自动语音在这里调；聊天频道只负责说话。",
				],
				"list_title": "AI玩家",
				"item_cards": [],
				"detail_title": "声色",
				"content_blocks": [
					_build_status_hero_block("", _build_ai_voice_profile_status_hero(primary_ai_player_display_name, ai_player_runtimes), "AIVoiceProfileHeroBlock"),
					_build_reading_list_block("使用范围", _build_ai_voice_profile_scope_items(primary_ai_player_display_name, ai_player_runtimes), "AIVoiceProfileScopeBlock"),
				],
			},
			"model": {
				"summary_title": "在线",
				"shared_state_title": "",
				"player_reading_mode": true,
				"mobile_stack": true,
				"mobile_stack_breakpoint": 920,
				"shared_state_fields": [],
				"summary_lines": [
					"在线、主意、出手。",
				],
				"list_title": "AI玩家",
				"item_cards": [],
				"detail_title": "在线",
				"content_blocks": [
					_build_card_grid_block("在线", _build_ai_player_model_status_cards(ai_player_runtimes), "AIPlayerModelStatusBlock", 3),
					_build_card_grid_block("还能做", _build_ai_player_budget_cards(ai_player_runtimes, ai_resource_accounts, governor_resource_inboxes, execution_budget_summary), "AIPlayerBudgetBlock", 2),
					_build_button_row_block("", [
						{"id": "ai_players_refresh", "label": "看看近况"},
					], "AIModelActionBlock"),
				],
			},
			"agenda": {
				"summary_title": "" if ai_proposal_mutation_result_active or ai_proposal_decision_surface_active else "待确认",
				"shared_state_title": "",
				"player_reading_mode": true,
				"content_first_mode": ai_proposal_mutation_result_active or ai_proposal_decision_surface_active,
				"content_first_keep_left_panel": ai_proposal_mutation_result_active or ai_proposal_decision_surface_active,
				"hide_detail_title": ai_proposal_mutation_result_active or ai_proposal_decision_surface_active,
				"mobile_stack": true,
				"mobile_stack_breakpoint": 920,
				"shared_state_fields": [],
				"summary_lines": [] if ai_proposal_mutation_result_active or ai_proposal_decision_surface_active else [
					"要你定的事放前面。",
				],
				"list_title": "" if ai_proposal_mutation_result_active or ai_proposal_decision_surface_active else "AI玩家",
				"item_cards": [],
				"detail_title": "" if ai_proposal_mutation_result_active or ai_proposal_decision_surface_active else "待确认",
				"content_blocks": _build_ai_proposal_mutation_result_blocks(ai_proposal_mutation_result) if ai_proposal_mutation_result_active else _build_ai_proposal_decision_surface_blocks(ai_proposal_decision_surface) if ai_proposal_decision_surface_active else [
					_build_status_hero_block("待确认总览", _build_action_management_status_hero(ai_next_step_summary, ai_failure_player_summary, ai_development_ready_action_count, ai_actionable_proposal_count, ai_player_battle_report_items), "AIActionManagementHeroBlock"),
					_build_button_row_block("操作", _build_agenda_actions(agenda), "AIAgendaActionBlock"),
					_build_reading_list_block("先看", _build_action_management_priority_items(ai_next_step_summary, ai_failure_player_summary, ai_player_battle_report_items, ai_player_proposal_items, ai_player_runtime_error), "AIActionPriorityListBlock"),
					_build_reading_list_block("可做的事", _build_candidate_action_reading_items(ai_player_development_plan, ai_player_runtimes, ai_player_action_catalog), "AIActionCandidateListBlock"),
					_build_reading_list_block("军情和待确认", _build_proposal_battle_reading_items(ai_player_proposal_items, ai_player_battle_report_items), "AIActionProposalBattleListBlock"),
				],
			},
			"context": {
				"summary_title": "聊天记忆",
				"shared_state_title": "",
				"player_reading_mode": true,
				"shared_state_fields": [],
				"summary_lines": [
					"主要聊天在主界面频道；这里整理记忆和结果。",
				],
				"list_title": "AI玩家",
				"item_cards": [],
				"detail_title": "聊天记忆",
				"content_blocks": [
					_build_card_grid_block("记忆摘要", _build_ai_chat_memory_summary_cards(primary_ai_player_display_name, ai_chat_history_snapshot, context_memory_lines, runtime_receipt_lines, ai_latest_proposal_summary, ai_failure_player_summary, ai_battle_report_suggestion), "AIContextMemorySummaryBlock", 2),
					_build_card_grid_block("结果明细", _build_ai_receipt_detail_cards(ai_player_receipt_items, ai_player_runtimes, ai_player_receipt_history_page), "AIReceiptDetailBlock", 2),
					_build_button_row_block("", [
						{"id": "ai_player_open_chat_channel", "label": "打开频道", "disabled": ai_player_runtimes.is_empty(), "min_width": 220, "min_height": 64},
					], "AIContextOpenChatBlock"),
					_build_collapsible_chat_timeline_block("最近对话", _build_ai_chat_timeline_messages(primary_ai_player_display_name, ai_chat_history_snapshot, context_memory_lines, runtime_receipt_lines, ai_latest_proposal_summary, ai_failure_player_summary, ai_battle_report_suggestion), "AIContextRecentChatBlock", false),
					_build_card_grid_block("记录来源", _build_ai_chat_history_source_cards(ai_chat_history_snapshot), "AIContextChatSourceBlock", 3),
				],
			},
		},
	}

func build_overlay_payload(runtime_context: Dictionary) -> Dictionary:
	return {
		"snapshot": build_snapshot(runtime_context),
		"runtime_state_patch": {},
	}

func _build_item_cards_from_items(raw_items: Array) -> Array:
	var cards: Array = []
	for item_variant in raw_items:
		if not (item_variant is Dictionary):
			continue
		var item := item_variant as Dictionary
		cards.append({
			"title": str(item.get("label", "")).strip_edges(),
			"value": str(item.get("status", "")).strip_edges(),
			"meta": str(item.get("meta", "")).strip_edges(),
			"description": str(item.get("description", "")).strip_edges(),
			"image_path": str(item.get("image_path", "")).strip_edges(),
		})
	return cards

func _build_card_grid_block(title: String, cards: Array, node_name: String = "", columns: int = 2) -> Dictionary:
	return {
		"kind": "card_grid",
		"title": title,
		"cards": cards.duplicate(true),
		"columns": maxi(1, columns),
		"node_name": node_name,
	}


func _build_ai_players_first_screen_blocks(
	primary_ai_player_id: String,
	primary_ai_player_display_name: String,
	ai_player_runtimes: Array,
	ai_player_home_city_candidates: Dictionary,
	ai_home_city_candidate_items: Array,
	primary_ai_player_home_city_status: String,
	ai_next_step_summary: String,
	ai_failure_player_summary: String,
	ai_player_battle_report_items: Array,
	ai_player_execution_trace_items: Array,
	ai_player_autonomous_combat_daily_summary: Dictionary,
	ai_player_proposal_items: Array,
	ai_player_runtime_error: String,
	ai_actionable_proposal_count: int
) -> Array:
	var blocks: Array = [
		_build_status_hero_block("", _build_ai_player_model_status_hero(primary_ai_player_display_name, ai_player_runtimes), "AIPlayerModelStatusFirstScreenBlock"),
	]
	var execution_trace_cards := _build_ai_execution_trace_cards(ai_player_execution_trace_items)
	if not execution_trace_cards.is_empty():
		blocks.append(_build_card_grid_block("正在做", execution_trace_cards, "AIPlayerExecutionTraceBlock", 1))
	blocks.append(_build_card_grid_block("主城", _build_ai_home_city_status_cards(primary_ai_player_id, primary_ai_player_display_name, ai_player_runtimes, ai_player_home_city_candidates), "AIPlayerHomeCityStatusBlock", 2))
	blocks.append(_build_button_row_block("", _build_ai_home_city_primary_actions(primary_ai_player_id, primary_ai_player_home_city_status, ai_player_runtimes), "AIPlayerHomeCityActionBlock", {"layout": "ai_first_screen_compact_v1"}))
	var daily_summary_text := _format_ai_autonomous_combat_daily_summary(ai_player_autonomous_combat_daily_summary)
	if daily_summary_text != "":
		blocks.append(_build_card_grid_block("今日战况", [{
			"title": "后端每日总结",
			"value": daily_summary_text,
			"meta": "AI战报",
			"description": "后端自然语言结果",
		}], "AIPlayerDailySummaryNaturalLanguageBlock", 1))
		var combat_memory_cards := _build_ai_autonomous_combat_daily_summary_cards(ai_player_autonomous_combat_daily_summary)
		if not combat_memory_cards.is_empty():
			blocks.append(_build_card_grid_block("战役复盘", combat_memory_cards, "AIPlayerDailySummaryCampaignMemoryBlock", 3))
	if primary_ai_player_home_city_status != "bound":
		blocks.append(_build_button_row_block("候选点", _build_ai_home_city_candidate_actions(ai_home_city_candidate_items), "AIPlayerHomeCityCandidateActionBlock", {"layout": "ai_first_screen_compact_v1"}))
	var runtime_actions: Array = [
		{"id": "ai_players_refresh", "label": "刷新", "min_width": 156, "min_height": 56},
	]
	if ai_actionable_proposal_count > 0:
		runtime_actions.append({"id": "ai_player_pending_proposals_review", "label": "去处理", "min_width": 196, "min_height": 56})
	blocks.append(_build_button_row_block("", runtime_actions, "AIPlayerRuntimeActionBlock", {"layout": "ai_first_screen_compact_v1"}))
	return blocks

func _build_status_hero_block(title: String, payload: Dictionary, node_name: String = "") -> Dictionary:
	return {
		"kind": "status_hero",
		"title": title,
		"payload": payload.duplicate(true),
		"node_name": node_name,
	}

func _build_chat_timeline_block(title: String, messages: Array, node_name: String = "") -> Dictionary:
	return {
		"kind": "chat_timeline",
		"title": title,
		"messages": messages.duplicate(true),
		"node_name": node_name,
	}

func _build_collapsible_chat_timeline_block(title: String, messages: Array, node_name: String = "", default_expanded: bool = false) -> Dictionary:
	return {
		"kind": "collapsible_chat_timeline",
		"title": title,
		"messages": messages.duplicate(true),
		"node_name": node_name,
		"default_expanded": default_expanded,
	}

func _build_reading_list_block(title: String, items: Array, node_name: String = "", options: Dictionary = {}) -> Dictionary:
	var block := {
		"kind": "reading_list",
		"title": title,
		"items": items.duplicate(true),
		"node_name": node_name,
	}
	for key in options.keys():
		block[key] = options.get(key)
	return block

func _build_text_block(title: String, lines: Array, node_name: String = "") -> Dictionary:
	return {
		"kind": "text_block",
		"title": title,
		"lines": lines.duplicate(true),
		"node_name": node_name,
	}

func _build_button_row_block(title: String, actions: Array, node_name: String = "", options: Dictionary = {}) -> Dictionary:
	var block := {
		"kind": "button_row",
		"title": title,
		"actions": actions.duplicate(true),
		"node_name": node_name,
	}
	for key in options.keys():
		block[key] = options.get(key)
	return block

func _merge_card_sets(primary: Array, secondary: Array) -> Array:
	var merged: Array = []
	for source in [primary, secondary]:
		for card_variant in source:
			if card_variant is Dictionary:
				merged.append((card_variant as Dictionary).duplicate(true))
	return merged

func _build_ai_player_identity_cards(ai_player_runtimes: Array, portrait_assignments: Dictionary) -> Array:
	var cards: Array = []
	for runtime_variant in ai_player_runtimes.slice(0, min(ai_player_runtimes.size(), 3)):
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var ai_player_id := _read_runtime_ai_player_id(runtime)
		var display_name := str(runtime.get("displayName", runtime.get("name", ai_player_id))).strip_edges()
		if display_name == "":
			display_name = ai_player_id if ai_player_id != "" else "未命名AI玩家"
		var source_label := _format_ai_source_player_state(_format_single_runtime_model_source_label(runtime))
		var key_status := _format_single_runtime_model_secret_status(runtime)
		var budget_label := _format_single_runtime_model_budget_text(runtime)
		var status_label := _format_runtime_status_label(str(runtime.get("status", "active")).strip_edges())
		var saved_avatar_path := str(runtime.get("avatarImagePath", "")).strip_edges()
		var portrait_path := saved_avatar_path if saved_avatar_path != "" and FileAccess.file_exists(saved_avatar_path) else _resolve_ai_player_portrait_path(ai_player_id, display_name, cards.size(), portrait_assignments)
		cards.append({
			"title": display_name,
			"value": status_label,
			"meta": "在线 %s / %s" % [source_label, _format_ai_budget_player_state(budget_label)],
			"description": "对话%s，行动前仍需确认。" % key_status,
			"image_path": portrait_path,
			"tone": "gold",
			"min_width": 190,
		})
	if not cards.is_empty():
		return cards
	var fallback_portrait := _resolve_ai_player_portrait_path("player_operator_alpha", "青州从事", 0, portrait_assignments)
	return [{
		"title": "AI玩家档案",
		"value": "未上阵",
		"meta": "头像待选 / 等AI玩家上阵",
		"description": "上阵后展示头像、称呼和状态。",
		"image_path": fallback_portrait,
		"tone": "neutral",
	}]

func _resolve_primary_ai_player_home_city_status(ai_player_runtimes: Array, primary_ai_player_id: String) -> String:
	var runtime := _resolve_primary_ai_player_runtime(ai_player_runtimes, primary_ai_player_id)
	var status := str(runtime.get("homeCityBindingStatus", "")).strip_edges()
	return status if status != "" else "unbound"

func _resolve_primary_ai_player_runtime(ai_player_runtimes: Array, primary_ai_player_id: String) -> Dictionary:
	var fallback: Dictionary = {}
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime := runtime_variant as Dictionary
		var ai_player_id := _read_runtime_ai_player_id(runtime)
		if fallback.is_empty():
			fallback = runtime
		if primary_ai_player_id != "" and ai_player_id == primary_ai_player_id:
			return runtime
	return fallback

func _first_non_empty(values: Array) -> String:
	for value in values:
		var text := str(value).strip_edges()
		if text != "":
			return text
	return ""

func _build_ai_home_city_status_cards(primary_ai_player_id: String, primary_display_name: String, ai_player_runtimes: Array, candidates_read_model: Dictionary) -> Array:
	var runtime := _resolve_primary_ai_player_runtime(ai_player_runtimes, primary_ai_player_id)
	if runtime.is_empty():
		return [{
			"title": "AI主城",
			"value": "未上阵",
			"meta": "先刷新 AI 玩家",
			"description": "没有可操作的 AI 玩家时，不显示候选主城绑定。",
			"tone": "neutral",
		}]
	var status := str(runtime.get("homeCityBindingStatus", "unbound")).strip_edges()
	var display_name := primary_display_name.strip_edges()
	if display_name == "":
		display_name = str(runtime.get("displayName", runtime.get("name", primary_ai_player_id))).strip_edges()
	var candidate_count := int(candidates_read_model.get("count", (candidates_read_model.get("candidates", []) as Array).size()))
	if status == "bound":
		return [{
			"title": "AI主城",
			"value": "已绑定",
			"meta": "",
			"description": "",
			"tone": "gold",
		}]
	return [{
		"title": "AI主城",
		"value": "待选择",
		"meta": "%s 个候选点" % str(candidate_count),
		"description": "注册后尚未选择主城时，需要由玩家指定一个候选中心格。",
		"tone": "blue",
	}]

func _build_ai_home_city_primary_actions(primary_ai_player_id: String, binding_status: String, ai_player_runtimes: Array = []) -> Array:
	if primary_ai_player_id.strip_edges() == "":
		return [{
			"id": "ai_players_refresh",
			"label": "刷新",
			"min_width": 156,
			"min_height": 56,
		}]
	if binding_status == "bound":
		var actions: Array = []
		var home_tile_id := _resolve_ai_home_city_coordinate_tile_id(primary_ai_player_id, ai_player_runtimes)
		if home_tile_id != "":
			actions.append({
				"id": "coordinate_jump_tile:ai_home_city:%s" % home_tile_id.uri_encode(),
				"label": "定位主城",
				"min_width": 220,
				"min_height": 64,
			})
		return actions
	return [{
		"id": "ai_player_home_city_candidates_open",
		"label": "选择主城",
		"min_width": 196,
		"min_height": 56,
	}, {
		"id": "ai_players_refresh",
		"label": "刷新",
		"min_width": 156,
		"min_height": 56,
	}]


func _resolve_ai_home_city_coordinate_tile_id(primary_ai_player_id: String, ai_player_runtimes: Array) -> String:
	var runtime := _resolve_primary_ai_player_runtime(ai_player_runtimes, primary_ai_player_id)
	if runtime.is_empty():
		return ""
	return _first_non_empty([
		runtime.get("homeCityTileId", ""),
		runtime.get("homeTileId", ""),
		runtime.get("homeCityId", ""),
	])

func _build_ai_home_city_candidate_actions(candidate_items: Array) -> Array:
	var actions: Array = []
	for candidate_variant in candidate_items.slice(0, min(candidate_items.size(), 4)):
		if not (candidate_variant is Dictionary):
			continue
		var candidate := candidate_variant as Dictionary
		var center_tile_id := str(candidate.get("centerTileId", "")).strip_edges()
		if center_tile_id == "":
			continue
		var eligible := bool(candidate.get("eligible", false))
		var label := _first_non_empty([
			candidate.get("centerTileName", ""),
			center_tile_id,
		])
		var distance := str(candidate.get("distanceFromGovernorHome", "")).strip_edges()
		actions.append({
			"id": "ai_player_home_city_bind:%s" % center_tile_id.uri_encode(),
			"label": "%s%s" % [label, " · %s格" % distance if distance != "" else ""],
			"disabled": not eligible,
			"min_width": 220,
			"min_height": 56,
		})
	if actions.is_empty():
		actions.append({
			"id": "ai_player_home_city_candidates_open",
			"label": "拉取候选",
			"min_width": 196,
			"min_height": 56,
		})
	return actions

func _resolve_first_ai_home_city_candidate_center_tile_id(candidate_items: Array) -> String:
	for candidate_variant in candidate_items:
		if not (candidate_variant is Dictionary):
			continue
		var candidate := candidate_variant as Dictionary
		if candidate.has("eligible") and not bool(candidate.get("eligible", false)):
			continue
		var center_tile_id := str(candidate.get("centerTileId", "")).strip_edges()
		if center_tile_id != "":
			return center_tile_id
	for candidate_variant in candidate_items:
		if not (candidate_variant is Dictionary):
			continue
		var candidate := candidate_variant as Dictionary
		var center_tile_id := str(candidate.get("centerTileId", "")).strip_edges()
		if center_tile_id != "":
			return center_tile_id
	return ""

func _build_ai_panel_sidebar_items(primary_display_name: String, next_step_summary: String, actionable_proposal_count: int, context_document_count: int) -> Array:
	return [{
		"id": "players",
		"label": "AI玩家",
		"meta": primary_display_name if primary_display_name.strip_edges() != "" else "选择角色",
		"description": "",
	}, {
		"id": "advisor",
		"label": "档案",
		"meta": _format_ai_context_document_sidebar_label(context_document_count),
		"description": "",
	}, {
		"id": "voice",
		"label": "声色",
		"meta": "语音外观",
		"description": "",
	}, {
		"id": "context",
		"label": "记忆",
		"meta": "最近记录",
		"description": "",
	}, {
		"id": "agenda",
		"label": "待定",
		"meta": "%s 件待定" % str(actionable_proposal_count),
		"description": "",
	}, {
		"id": "autonomy",
		"label": "托管",
		"meta": "日常 / 红线",
		"description": "",
	}]

func _format_ai_context_document_sidebar_label(context_document_count: int) -> String:
	return "已存 %s 份" % str(context_document_count) if context_document_count > 0 else "可添加"

func _format_ai_next_step_sidebar_label(next_step: String) -> String:
	var short_label := _format_ai_next_step_short_label(next_step)
	return short_label if short_label != "" else "先看"

func _format_ai_next_step_short_label(next_step: String) -> String:
	var normalized := next_step.strip_edges()
	if normalized == "":
		return "先看看"
	if normalized.find("需处理") >= 0:
		return "看需处理"
	if normalized.find("风险") >= 0:
		return "看需处理"
	if normalized.find("批准") >= 0:
		return "待定"
	if normalized.find("刷新") >= 0:
		return "待更新"
	if normalized.find("目标") >= 0:
		return "选目标"
	if normalized.find("军情") >= 0:
		return "看军情"
	if normalized.find("候选") >= 0:
		return "看待确认"
	if normalized.find("_") >= 0 or normalized.find("/") >= 0:
		return "先看看"
	if _contains_ascii_letter(normalized):
		return "先看看"
	if normalized.length() > 8:
		return "%s..." % normalized.substr(0, 8).strip_edges()
	return normalized

func _format_ai_next_step_player_hint(next_step: String) -> String:
	var normalized := next_step.strip_edges()
	if normalized == "":
		return "等AI玩家就位。"
	if normalized.find("需处理") >= 0:
		return "先看需处理，再选一件事。"
	if normalized.find("风险") >= 0:
		return "先看需处理，再选行动。"
	if normalized.find("批准") >= 0:
		return "有待确认待定。"
	if normalized.find("刷新") >= 0:
		return "先更新最新局势。"
	if normalized.find("目标") >= 0:
		return "需要玩家点选目标。"
	if normalized.find("军情") >= 0:
		return "先看军情再行动。"
	if normalized.find("候选") >= 0:
		return "查看可选待确认。"
	if normalized.find("_") >= 0 or normalized.find("/") >= 0:
		return "先看当前状态。"
	if _contains_ascii_letter(normalized):
		return "先看当前状态。"
	return _format_ai_display_copy(normalized) if normalized.length() <= 14 else _format_ai_next_step_short_label(normalized)

func _build_ai_voice_profile_status_hero(primary_display_name: String, ai_player_runtimes: Array) -> Dictionary:
	var display_name := primary_display_name.strip_edges()
	if display_name == "":
		display_name = _resolve_primary_ai_player_display_name(ai_player_runtimes, "")
	if display_name == "":
		display_name = "AI玩家"
	return {
		"headline": display_name,
		"subtitle": "声色只影响这个 AI 玩家说话时的听感；不改变行动、托管或管理权限。",
		"state": "可设置" if not ai_player_runtimes.is_empty() else "等AI玩家上阵",
		"facts": [{
			"label": "声色",
			"value": "公开档位",
			"meta": "只显示公开名称",
			"tone": "gold",
			"min_width": 190,
		}, {
			"label": "自动语音",
			"value": "关闭 / 按情境 / 始终",
			"meta": "仅播放策略",
			"tone": "blue",
			"min_width": 260,
		}, {
			"label": "克隆",
			"value": "后续能力",
			"meta": "当前不可用",
			"tone": "neutral",
			"min_width": 180,
		}],
	}

func _build_ai_voice_profile_scope_items(primary_display_name: String, ai_player_runtimes: Array) -> Array:
	var display_name := primary_display_name.strip_edges()
	if display_name == "":
		display_name = _resolve_primary_ai_player_display_name(ai_player_runtimes, "")
	if display_name == "":
		display_name = "当前AI玩家"
	return [{
		"badge": "声",
		"title": "选择声色",
		"value": "按AI玩家保存",
		"meta": display_name,
		"description": "每个AI玩家可以有不同声色。",
		"tone": "gold",
	}, {
		"badge": "播",
		"title": "自动语音",
		"value": "播放策略",
		"meta": "不改聊天规则",
		"description": "只决定什么时候自动播放，不影响提案、回执或战斗。",
		"tone": "blue",
	}, {
		"badge": "后",
		"title": "声音克隆",
		"value": "暂不可用",
		"meta": "后续能力",
		"description": "本阶段不做上传链路。",
		"tone": "neutral",
	}]

func _build_autonomy_status_hero(autonomy_level: String, autonomy_guard: Dictionary = {}) -> Dictionary:
	var level_label := _format_autonomy_level_label(autonomy_level)
	if not autonomy_guard.is_empty():
		var guard_state := _format_ai_autonomy_guard_state(autonomy_guard, _format_autonomy_guardrail_state(autonomy_level))
		return {
			"headline": guard_state,
		"subtitle": "只看局势和主意；动手前会停住。",
			"state": _format_ai_autonomy_guard_pending_label(autonomy_guard),
			"facts": [{
				"label": "范围",
				"value": _format_ai_autonomy_guard_mode(autonomy_guard, level_label),
				"tone": "gold",
				"min_width": 190,
			}, {
				"label": "出手",
				"value": _format_ai_autonomy_guard_auto_scope(autonomy_guard),
				"tone": "green" if bool(autonomy_guard.get("autonomousExecutionEnabled", false)) else "neutral",
				"min_width": 210,
			}, {
				"label": "出手前",
				"value": _format_ai_autonomy_guard_confirm_scope(autonomy_guard),
				"tone": "blue",
				"min_width": 210,
			}, {
				"label": "红线",
				"value": "已启用",
				"tone": "neutral",
				"min_width": 170,
			}],
		}
	return {
		"headline": level_label,
		"subtitle": "日常可托管；攻伐、外交、大额消耗先停手。",
		"state": _format_autonomy_guardrail_state(autonomy_level),
		"facts": [{
			"label": "范围",
			"value": level_label,
			"tone": "gold",
			"min_width": 190,
		}, {
			"label": "出手",
			"value": _format_autonomy_ai_scope(autonomy_level),
			"tone": "green",
			"min_width": 210,
		}, {
			"label": "红线",
			"value": _format_autonomy_player_confirm_scope(autonomy_level),
			"tone": "blue",
			"min_width": 210,
		}, {
			"label": "主意",
			"value": "已就绪",
			"tone": "neutral",
			"min_width": 170,
		}],
	}

func _build_autonomy_reading_items(autonomy_level: String, autonomy_guard: Dictionary = {}) -> Array:
	var items: Array = [{
		"badge": "1",
		"title": "只出主意",
		"value": _autonomy_status(autonomy_level, "L1_assigned"),
		"meta": "旁观",
		"description": "看局势，不落子。",
		"tone": "gold" if autonomy_level == "L1_assigned" else "neutral",
	}, {
		"badge": "2",
		"title": "日常代管",
		"value": _autonomy_status(autonomy_level, "L2_delegated"),
		"meta": "默认",
		"description": "采集、治疗、训练、队列。",
		"tone": "blue" if autonomy_level == "L2_delegated" else "neutral",
	}, {
		"badge": "3",
		"title": "全权托管",
		"value": _autonomy_status(autonomy_level, "L3_negotiated"),
		"meta": "高强度",
		"description": "连续推进；红线停手。",
		"tone": "green" if autonomy_level == "L3_negotiated" else "neutral",
	}]
	if not autonomy_guard.is_empty():
		items.push_front({
			"badge": "守",
			"title": "托管红线",
			"value": _format_ai_autonomy_guard_state(autonomy_guard, "只读观察"),
			"meta": _format_ai_autonomy_guard_pending_label(autonomy_guard),
			"description": "只看提醒和主意，动手前会停住。",
			"tone": "gold",
		})
	return items

func _format_ai_autonomy_guard_state(guard: Dictionary, fallback: String) -> String:
	var mode := str(guard.get("mode", "")).strip_edges()
	var autonomous_execution_enabled := bool(guard.get("autonomousExecutionEnabled", false))
	if mode == "approval_only" or not autonomous_execution_enabled:
		return "只读观察"
	if mode != "":
		return _format_ai_autonomy_guard_mode(guard, fallback)
	return fallback

func _format_ai_autonomy_guard_mode(guard: Dictionary, fallback: String) -> String:
	match str(guard.get("mode", "")).strip_edges():
		"approval_only":
			return "你点头才动"
		"observe_only":
			return "只看不动"
		"autonomous":
			return "自动推进"
		"":
			return fallback
		_:
			return fallback

func _format_ai_autonomy_guard_auto_scope(guard: Dictionary) -> String:
	if bool(guard.get("autonomousExecutionEnabled", false)):
		return "已开启"
	return "不自动出手"

func _format_ai_autonomy_guard_confirm_scope(guard: Dictionary) -> String:
	if bool(guard.get("pendingApprovalBlocksExecution", true)):
		return "待你点头"
	return "允许通过"

func _format_ai_autonomy_guard_pending_label(guard: Dictionary) -> String:
	if bool(guard.get("pendingApprovalBlocksExecution", true)):
		return "待你点头"
	return "已放行"

func _format_autonomy_level_label(autonomy_level: String) -> String:
	match autonomy_level.strip_edges():
		"L1_assigned":
			return "只出主意"
		"L2_delegated":
			return "日常代管"
		"L3_negotiated":
			return "全权托管"
		_:
			return "待定"

func _format_autonomy_ai_scope(autonomy_level: String) -> String:
	match autonomy_level.strip_edges():
		"L1_assigned":
			return "无"
		"L2_delegated":
			return "内政日常"
		"L3_negotiated":
			return "多数动作"
		_:
			return "待定"

func _format_autonomy_player_confirm_scope(autonomy_level: String) -> String:
	match autonomy_level.strip_edges():
		"L1_assigned":
			return "全部"
		"L2_delegated":
			return "攻伐外交"
		"L3_negotiated":
			return "红线"
		_:
			return "待定"

func _format_autonomy_guardrail_state(autonomy_level: String) -> String:
	match autonomy_level.strip_edges():
		"L1_assigned":
			return "只看不动"
		"L2_delegated":
			return "默认托管"
		"L3_negotiated":
			return "红线停手"
		_:
			return "待定"

func _resolve_autonomy_display_level(raw_level: String, ai_player_runtimes: Array, authority_source: String) -> String:
	var normalized := raw_level.strip_edges()
	if normalized == "" or normalized == "unknown":
		return "L2_delegated" if _has_configured_ai_player_secret(ai_player_runtimes) else "L1_assigned"
	if normalized == "L1_assigned" and _has_configured_ai_player_secret(ai_player_runtimes):
		var source := authority_source.strip_edges()
		if source == "" or source == "unknown" or source == "session_join" or source == "runtime_bootstrap_reused" or source == "runtime_bootstrap_readonly":
			return "L2_delegated"
	return normalized

func _has_configured_ai_player_secret(ai_player_runtimes: Array) -> bool:
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var model_status := _read_runtime_model_status(runtime_variant as Dictionary)
		for key_variant in ["secretConfigured", "hasSecret", "hasApiKey"]:
			var key := str(key_variant)
			if model_status.has(key) and bool(model_status.get(key, false)):
				return true
	return false

func _build_action_management_status_hero(next_step: String, failure_summary: String, ready_action_count: int, proposal_count: int, battle_report_items: Array) -> Dictionary:
	var player_failure := _format_failure_to_player_text(failure_summary)
	var failure_clear := _is_ai_failure_clear(player_failure)
	return {
		"headline": next_step,
		"subtitle": "先看现在可做，再决定出手。",
		"state": "待定" if proposal_count > 0 or ready_action_count > 0 else "等主意",
		"facts": [{
			"label": "需处理",
			"value": _format_ai_failure_display_text(player_failure),
			"tone": "green" if failure_clear else "blue",
			"min_width": 190,
		}, {
			"label": "可选待确认",
			"value": "%s 条可看" % str(ready_action_count),
			"tone": "green" if ready_action_count > 0 else "neutral",
			"min_width": 180,
		}, {
			"label": "待确认",
			"value": "%s 个" % str(proposal_count),
			"tone": "gold" if proposal_count > 0 else "neutral",
			"min_width": 180,
		}, {
			"label": "军情",
			"value": _format_ai_battle_report_summary(battle_report_items),
			"meta": _format_ai_battle_report_damage_summary(battle_report_items),
			"tone": "blue" if not battle_report_items.is_empty() else "neutral",
			"min_width": 220,
		}],
	}

func _resolve_primary_actionable_ai_proposal(proposal_items: Array) -> Dictionary:
	for proposal_variant in proposal_items:
		if not (proposal_variant is Dictionary):
			continue
		var proposal: Dictionary = proposal_variant as Dictionary
		var action := str(proposal.get("action", "")).strip_edges()
		if action == "" or _is_ai_direct_hero_level_action(action):
			continue
		if str(proposal.get("status", "")).strip_edges() == "pending_approval":
			return proposal.duplicate(true)
	return {}

func _build_ai_proposal_decision_surface_blocks(proposal: Dictionary) -> Array:
	return [
		_build_status_hero_block("", _build_ai_proposal_decision_hero(proposal), "AIProposalDecisionHeroBlock"),
		_build_reading_list_block("", _build_ai_proposal_decision_items(proposal), "AIProposalDecisionEssentialsBlock"),
		_build_button_row_block("", _build_ai_proposal_decision_actions(proposal), "AIProposalDecisionActionBlock"),
	]

func _build_ai_proposal_mutation_result_blocks(result: Dictionary) -> Array:
	return [
		_build_status_hero_block("", _build_ai_proposal_mutation_result_hero(result), "AIProposalMutationResultBlock"),
		_build_button_row_block("", _build_ai_proposal_mutation_result_actions(result), "AIProposalMutationResultActionBlock"),
	]

func _build_ai_proposal_mutation_result_hero(result: Dictionary) -> Dictionary:
	var kind := str(result.get("kind", "")).strip_edges()
	var title := "已批准" if kind == "approve" else "已驳回"
	var subtitle := "AI 会继续处理。" if kind == "approve" else "这件事已拦下。"
	if kind != "approve" and kind != "reject":
		subtitle = str(result.get("resultText", "")).strip_edges()
	if subtitle == "":
		subtitle = "AI 可以继续执行这件事。" if kind == "approve" else "这件事不会执行。"
	return {
		"headline": title,
		"subtitle": subtitle,
		"state": "决定已生效",
		"facts": [],
	}

func _build_ai_proposal_mutation_result_actions(result: Dictionary) -> Array:
	var kind := str(result.get("kind", "")).strip_edges()
	var primary_label := "看回报" if kind == "approve" else "等新方案"
	var primary_target := "context" if kind == "approve" else "agenda"
	return [{
		"id": "ai_sidebar_open:%s" % primary_target,
		"label": primary_label,
		"min_width": 180,
		"min_height": 64,
		"font_size": 24,
	}, {
		"id": "ai_sidebar_open:context",
		"label": "看原意",
		"min_width": 180,
		"min_height": 64,
		"font_size": 24,
	}]

func _build_ai_proposal_decision_hero(proposal: Dictionary) -> Dictionary:
	var action := str(proposal.get("action", "")).strip_edges()
	return {
		"headline": "要批准这件事吗",
		"subtitle": _format_ai_action_label(action),
		"state": "待你决定",
		"facts": [{
			"label": "AI 想做什么",
			"value": _format_ai_proposal_intent_text(proposal),
			"tone": "gold",
			"min_width": 320,
		}, {
			"label": "你会失去或得到什么",
			"value": _format_ai_proposal_consequence_text(proposal),
			"tone": "blue",
			"min_width": 360,
		}],
	}

func _build_ai_proposal_decision_items(proposal: Dictionary) -> Array:
	return [{
		"badge": "1",
		"title": "AI 想做什么",
		"value": _format_ai_proposal_intent_text(proposal),
		"meta": "",
		"description": _clip_ai_chat_line(_format_ai_proposal_reason_text(proposal), 26),
		"tone": "gold",
	}, {
		"badge": "2",
		"title": "你会失去或得到什么",
		"value": _format_ai_proposal_consequence_text(proposal),
		"meta": "",
		"description": "",
		"tone": "blue",
	}]

func _build_ai_proposal_decision_actions(proposal: Dictionary) -> Array:
	var proposal_id := _read_ai_proposal_id(proposal)
	return [{
		"id": "ai_player_proposal_approve:%s" % proposal_id,
		"label": "批准",
		"min_width": 240,
		"min_height": 82,
		"font_size": 28,
	}, {
		"id": "ai_player_proposal_reject:%s" % proposal_id,
		"label": "驳回",
		"min_width": 240,
		"min_height": 82,
		"font_size": 28,
	}]

func _build_ai_proposal_decision_copy_lines(proposal: Dictionary) -> Array:
	if proposal.is_empty():
		return []
	return [
		"要批准这件事吗",
		"AI 想做什么",
		_format_ai_proposal_intent_text(proposal),
		"你会失去或得到什么",
		_format_ai_proposal_consequence_text(proposal),
		"批准",
		"驳回",
	]

func _build_ai_proposal_mutation_result_copy_lines(result: Dictionary) -> Array:
	if result.is_empty():
		return []
	var kind := str(result.get("kind", "")).strip_edges()
	var title := "已批准" if kind == "approve" else "已驳回"
	var subtitle := "AI 会继续处理。" if kind == "approve" else "这件事已拦下。"
	var primary_label := "看回报" if kind == "approve" else "等新方案"
	return [
		title,
		subtitle,
		primary_label,
		"看原意",
	]

func _read_ai_proposal_id(proposal: Dictionary) -> String:
	var proposal_id := str(proposal.get("proposalId", proposal.get("id", ""))).strip_edges()
	if proposal_id == "":
		proposal_id = "current"
	return proposal_id

func _format_ai_proposal_intent_text(proposal: Dictionary) -> String:
	var action := str(proposal.get("action", "")).strip_edges()
	var target := _format_ai_action_target_summary(action, proposal)
	var label := _format_ai_action_label(action)
	if target != "":
		return "%s：%s" % [label, target.replace(" -> ", " 到 ")]
	return label

func _format_ai_proposal_consequence_text(proposal: Dictionary) -> String:
	var action := str(proposal.get("action", "")).strip_edges()
	var consequence := _format_ai_action_approval_result(action)
	if consequence == "" or consequence == "等待正式处理":
		consequence = "批准后立即执行，驳回则不动。"
	return consequence

func _format_ai_proposal_reason_text(proposal: Dictionary) -> String:
	var reason := str(proposal.get("reason", proposal.get("proposalReason", ""))).strip_edges()
	if reason == "":
		return "等你拍板。"
	return _format_ai_display_copy(reason)

func _build_action_management_priority_items(next_step: String, failure_summary: String, battle_report_items: Array, proposal_items: Array, runtime_error: String) -> Array:
	var player_failure := _format_failure_to_player_text(failure_summary)
	var failure_clear := _is_ai_failure_clear(player_failure)
	var runtime_error_text := runtime_error.strip_edges()
	var proposal_count := _count_actionable_ai_proposals(proposal_items)
	var blocker_meta := "要处理" if runtime_error_text != "" or not failure_clear else ""
	var blocker_description := runtime_error_text if runtime_error_text != "" else ""
	var items: Array = [{
		"badge": "先",
		"title": "现在可做",
		"value": _format_ai_next_step_short_label(next_step),
		"meta": "",
		"description": "",
		"tone": "gold",
	}, {
		"badge": "处",
		"title": "需处理",
		"value": "接通异常" if runtime_error_text != "" else _format_ai_failure_display_text(player_failure),
		"meta": blocker_meta,
		"description": blocker_description,
		"tone": "green" if runtime_error_text == "" and failure_clear else "blue",
	}]
	items.append({
		"badge": "确",
		"title": "待确认",
		"value": "%s 个" % str(proposal_count) if proposal_count > 0 else "没有待确认",
		"meta": "可处理" if proposal_count > 0 else "",
		"description": "",
		"tone": "gold" if proposal_count > 0 else "neutral",
	})
	items.append({
		"badge": "军",
		"title": "军情",
		"value": _format_ai_battle_report_summary(battle_report_items) if not battle_report_items.is_empty() else "无军情",
		"meta": _format_ai_battle_report_damage_summary(battle_report_items) if not battle_report_items.is_empty() else "",
		"description": "",
		"tone": "blue" if not battle_report_items.is_empty() else "neutral",
	})
	return items

func _build_candidate_action_reading_items(development_plan: Dictionary, ai_player_runtimes: Array, action_catalog: Array) -> Array:
	var actions: Array = development_plan.get("candidateActions", []) as Array
	var items: Array = []
	for action_variant in actions.slice(0, min(actions.size(), 3)):
		if not (action_variant is Dictionary):
			continue
		var action: Dictionary = action_variant as Dictionary
		var action_id := str(action.get("action", "")).strip_edges()
		if action_id == "":
			continue
		if _is_ai_direct_hero_level_action(action_id):
			continue
		var readiness := str(action.get("readiness", "unknown")).strip_edges()
		var reason := str(action.get("proposalReason", action.get("reason", ""))).strip_edges()
		var blockers: Array = action.get("blockers", []) as Array
		var target_summary := _format_ai_action_target_summary(action_id, action)
		var blocker_text := "" if blockers.is_empty() else "还差：%s" % _format_ai_player_blockers(blockers)
		var base_description := target_summary if target_summary != "" else blocker_text if blocker_text != "" else _format_ai_action_player_reason(action_id, reason)
		var priority_text := _format_ai_action_priority_text(action)
		items.append({
			"badge": str(items.size() + 1),
			"title": _format_ai_action_label(action_id),
			"value": _format_action_readiness_label(readiness),
			"meta": _format_ai_action_approval_result(action_id),
			"description": _join_string_array([base_description, priority_text], "。"),
			"tone": "green" if readiness == "ready" else "blue" if readiness == "needs_target" else "neutral",
		})
	if not items.is_empty():
		return items
	var fallback_cards := _build_ai_player_candidate_action_cards(ai_player_runtimes, action_catalog)
	for card_variant in fallback_cards.slice(0, min(fallback_cards.size(), 3)):
		if not (card_variant is Dictionary):
			continue
		var card: Dictionary = card_variant as Dictionary
		items.append({
			"badge": str(items.size() + 1),
			"title": str(card.get("title", "可选待确认")).strip_edges(),
			"value": "等主意",
			"meta": "等新待确认",
			"description": "",
			"tone": str(card.get("tone", "neutral")).strip_edges(),
		})
	return items

func _build_proposal_battle_reading_items(proposal_items: Array, battle_report_items: Array) -> Array:
	var items: Array = []
	for proposal_variant in proposal_items.slice(0, min(proposal_items.size(), 3)):
		if not (proposal_variant is Dictionary):
			continue
		var proposal: Dictionary = proposal_variant as Dictionary
		var action := str(proposal.get("action", "unknown")).strip_edges()
		var status := str(proposal.get("status", "unknown")).strip_edges()
		var risk_level := str(proposal.get("riskLevel", "unknown")).strip_edges()
		var failure_reason := str(proposal.get("rejectionReason", proposal.get("error", ""))).strip_edges()
		var description := _format_failure_to_player_text(failure_reason) if failure_reason != "" else _format_ai_action_player_reason(action, str(proposal.get("reason", "")).strip_edges())
		var target_summary := _format_ai_action_target_summary(action, proposal)
		if target_summary != "":
			description = target_summary
		items.append({
			"badge": "办",
			"title": _format_ai_action_label(action),
			"value": _format_ai_proposal_status_label(status),
			"meta": _format_ai_risk_label(risk_level),
			"description": _clip_ai_chat_line(description, 24),
			"tone": "gold" if status == "pending_approval" or status == "approved" else "neutral",
		})
	for report_variant in battle_report_items.slice(0, min(battle_report_items.size(), 2)):
		if not (report_variant is Dictionary):
			continue
		var report: Dictionary = report_variant as Dictionary
		var severity := str(report.get("severity", "unknown")).strip_edges()
		items.append({
			"badge": "战",
			"title": _format_ai_battle_report_perspective(report),
			"value": _format_ai_battle_report_outcome(report),
			"meta": _format_ai_battle_report_damage(report),
			"description": _format_ai_display_copy(str(report.get("nextStepSuggestion", "等待军情建议。")).strip_edges()),
			"tone": "gold" if severity == "high" else "blue" if severity == "medium" else "green",
		})
	if not items.is_empty():
		return items
	return [{
		"badge": "空",
		"title": "无待确认",
		"value": "无",
		"meta": "",
		"description": "",
		"tone": "neutral",
	}]

func _build_ai_advisor_identity_hero(primary_display_name: String, ai_player_runtimes: Array) -> Dictionary:
	var runtime := _read_primary_ai_player_runtime(ai_player_runtimes)
	var display_name := primary_display_name.strip_edges()
	if display_name == "":
		display_name = "AI玩家"
	var saved_avatar_path := ""
	if not runtime.is_empty():
		saved_avatar_path = str(runtime.get("avatarImagePath", "")).strip_edges()
	var avatar_status := "已设置" if saved_avatar_path != "" else "可选择或上传"
	var document_count := _count_ai_context_documents(ai_player_runtimes)
	return {
		"headline": display_name,
		"subtitle": "头像、名字、身份和记忆都在这里。",
		"state": "档案可编辑" if not ai_player_runtimes.is_empty() else "等AI玩家上阵",
		"facts": [{
			"label": "头像",
			"value": avatar_status,
			"meta": "内置头像",
			"tone": "gold",
			"min_width": 160,
		}, {
			"label": "档案",
			"value": "%s 份" % str(document_count),
			"meta": "身份 / 记忆",
			"tone": "blue",
			"min_width": 160,
		}, {
			"label": "导入",
			"value": "文字 / 文件",
			"meta": "可粘贴",
			"tone": "green",
			"min_width": 180,
		}, {
			"label": "聊天",
			"value": "回频道",
			"meta": "右下角",
			"tone": "neutral",
			"min_width": 220,
		}],
	}

func _build_ai_advisor_profile_cards(ai_player_runtimes: Array, portrait_assignments: Dictionary, development_plan: Dictionary, battle_report_items: Array, failure_summary: String, list_summary: Dictionary = {}) -> Array:
	var cards: Array = []
	if not list_summary.is_empty():
		cards.append({
			"title": "AI玩家",
			"value": "%s 位" % str(int(list_summary.get("count", ai_player_runtimes.size()))),
			"meta": "待确认 %s / 需处理 %s" % [
				str(int(list_summary.get("pendingApprovalCount", 0))),
				str(int(list_summary.get("runtimeFailureCount", 0))),
			],
			"description": "",
			"tone": "gold",
			"min_width": 260,
		})
	for runtime_variant in ai_player_runtimes.slice(0, min(ai_player_runtimes.size(), 4)):
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var list_card := _read_runtime_list_card(runtime)
		var ai_player_id := _read_runtime_ai_player_id(runtime)
		var display_name := _read_runtime_display_name(runtime, list_card, ai_player_id)
		var portrait_path := _resolve_ai_player_list_card_portrait(runtime, list_card, display_name, cards.size(), portrait_assignments)
		cards.append({
			"title": display_name,
			"value": _format_ai_list_card_status_label(list_card, runtime),
			"meta": _format_ai_list_card_meta(list_card, runtime),
			"description": _format_ai_list_card_description(list_card, runtime, development_plan, battle_report_items, failure_summary),
			"image_path": portrait_path,
			"image_size": 124,
			"tone": _format_ai_list_card_tone(list_card, runtime),
			"min_width": 260,
		})
	if cards.is_empty() and ai_player_runtimes.is_empty():
		return [{
			"title": "AI玩家",
			"value": "未上阵",
			"meta": "等AI玩家上阵",
			"description": "上阵后显示AI玩家。",
			"tone": "neutral",
		}]
	cards.append({
		"title": "档案",
		"value": _format_ai_context_document_summary(ai_player_runtimes),
		"meta": "身份 / 记忆",
		"description": "",
		"tone": "blue" if not ai_player_runtimes.is_empty() else "neutral",
		"min_width": 260,
	})
	return cards

func _read_ai_player_autonomy_guard(ai_state: Dictionary, ai_player_runtimes: Array) -> Dictionary:
	var state_guard_variant: Variant = ai_state.get("playerRuntimeAutonomyGuard", {})
	if state_guard_variant is Dictionary and not (state_guard_variant as Dictionary).is_empty():
		return state_guard_variant as Dictionary
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var guard_variant: Variant = runtime.get("autonomyGuard", {})
		if guard_variant is Dictionary and not (guard_variant as Dictionary).is_empty():
			return guard_variant as Dictionary
	return {}

func _count_ai_player_list_cards(ai_player_runtimes: Array) -> int:
	var count := 0
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		if not _read_runtime_list_card(runtime).is_empty():
			count += 1
	return count

func _read_runtime_list_card(runtime: Dictionary) -> Dictionary:
	var list_card_variant: Variant = runtime.get("listCard", {})
	if list_card_variant is Dictionary:
		return list_card_variant as Dictionary
	return {}

func _read_runtime_display_name(runtime: Dictionary, list_card: Dictionary, ai_player_id: String) -> String:
	var display_name := str(list_card.get("displayName", runtime.get("displayName", runtime.get("name", ai_player_id)))).strip_edges()
	if display_name == "":
		display_name = ai_player_id if ai_player_id != "" else "未命名AI玩家"
	return display_name

func _resolve_ai_player_list_card_portrait(runtime: Dictionary, list_card: Dictionary, display_name: String, index: int, portrait_assignments: Dictionary) -> String:
	var ai_player_id := _read_runtime_ai_player_id(runtime)
	var saved_avatar_path := str(list_card.get("avatarImagePath", runtime.get("avatarImagePath", ""))).strip_edges()
	if saved_avatar_path != "" and FileAccess.file_exists(saved_avatar_path):
		return saved_avatar_path
	return _resolve_ai_player_portrait_path(ai_player_id, display_name, index, portrait_assignments)

func _format_ai_list_card_status_label(list_card: Dictionary, runtime: Dictionary) -> String:
	var status_reason := str(list_card.get("statusReason", "")).strip_edges()
	match status_reason:
		"active":
			return "正常"
		"pending_proposals":
			return "待定"
		"runtime_failure":
			return "需查看"
		"inactive":
			return "停用"
	if list_card.is_empty():
		return _format_runtime_status_label(str(runtime.get("status", "active")).strip_edges())
	return "未上阵"

func _format_ai_list_card_meta(list_card: Dictionary, runtime: Dictionary) -> String:
	var action_count := int(list_card.get("actionableProposalCount", 0))
	var view_action_id := str(list_card.get("viewActionId", "")).strip_edges()
	if action_count > 0:
		return "待确认 %s" % str(action_count)
	if view_action_id != "":
		return "可打开"
	return _format_ai_model_name_for_player(_format_single_runtime_model_name(runtime))

func _format_ai_list_card_description(list_card: Dictionary, runtime: Dictionary, development_plan: Dictionary, battle_report_items: Array, failure_summary: String) -> String:
	var failure_receipt := _read_list_card_failure_receipt(list_card)
	if not failure_receipt.is_empty():
		var failure_code := _normalize_failure_code_value(failure_receipt.get("failureCode", ""))
		var recovery_hint := _read_recovery_hint_summary(failure_receipt)
		if recovery_hint != "":
			return "%s：%s" % [_format_ai_failure_code_label(failure_code), _format_ai_display_copy(recovery_hint)]
		return _format_ai_failure_code_label(failure_code)
	var status_reason := str(list_card.get("statusReason", "")).strip_edges()
	match status_reason:
		"pending_proposals":
			return "有待确认待你定。"
		"active":
			return "点开看近况。"
		"inactive":
			return "该AI玩家当前不可用。"
	var last_error := ""
	var last_error_variant: Variant = list_card.get("playerRuntimeLastError", null)
	if last_error_variant != null:
		last_error = str(last_error_variant).strip_edges()
	if last_error != "":
		return _format_ai_failure_code_label(last_error)
	return "现在可做：%s" % _format_ai_player_next_step_summary(development_plan, battle_report_items, failure_summary)

func _read_list_card_failure_receipt(list_card: Dictionary) -> Dictionary:
	var receipt_variant: Variant = list_card.get("runtimeFailureReceipt", {})
	if receipt_variant is Dictionary:
		return receipt_variant as Dictionary
	return {}

func _read_recovery_hint_summary(source: Dictionary) -> String:
	var hint_variant: Variant = source.get("recoveryHint", {})
	if not (hint_variant is Dictionary):
		return ""
	var hint: Dictionary = hint_variant as Dictionary
	return str(hint.get("summary", "")).strip_edges()

func _format_ai_failure_code_label(failure_code: String) -> String:
	var normalized := _normalize_failure_code_value(failure_code)
	match normalized:
		"transfer_limit_exceeded":
			return "输送额度不足"
		"provider_budget_exhausted":
			return "主意次数不足"
		"patrol_model_failure":
			return "巡查失败"
		"patrol_model_validation_failed":
			return "主意未通过"
		"ai_player_runtime_failed":
			return "运行失败"
		"":
			return "需查看"
		_:
			return "需查看"

func _format_ai_list_card_tone(list_card: Dictionary, runtime: Dictionary) -> String:
	match str(list_card.get("statusDot", "")).strip_edges():
		"yellow":
			return "gold"
		"red":
			return "blue"
		"green":
			return "green"
		"gray":
			return "neutral"
	var status := str(runtime.get("status", "")).strip_edges()
	return "green" if status == "active" else "neutral"

func _build_ai_chat_memory_summary_cards(_primary_display_name: String, chat_history_snapshot: Dictionary, context_memory_lines: Array, runtime_receipt_lines: Array, latest_proposal_summary: String, failure_summary: String, battle_report_suggestion: String) -> Array:
	var loaded_count := _count_ai_chat_history_messages(chat_history_snapshot)
	var total_count := int(chat_history_snapshot.get("messageCount", loaded_count))
	var memory_headline := _resolve_ai_chat_memory_headline(context_memory_lines, battle_report_suggestion)
	var followup_text := _resolve_ai_chat_followup_text(latest_proposal_summary, failure_summary, battle_report_suggestion, runtime_receipt_lines)
	return [{
		"title": "记忆摘要",
		"value": _clip_ai_chat_line(memory_headline, 72),
		"meta": "主频道",
		"description": "%s 条 / 已读 %s" % [str(total_count), str(loaded_count)],
		"tone": "gold",
		"min_width": 320,
	}, {
		"title": "待跟进",
		"value": _clip_ai_chat_line(followup_text, 72),
		"meta": "点下面按钮回频道继续聊",
		"description": "",
		"tone": "blue",
		"min_width": 320,
	}]

func _resolve_ai_chat_memory_headline(context_memory_lines: Array, battle_report_suggestion: String) -> String:
	for line_variant in context_memory_lines.slice(0, min(context_memory_lines.size(), 4)):
		var line := str(line_variant).strip_edges()
		if line != "" and line != "尚未查询":
			return line
	if battle_report_suggestion.strip_edges() != "":
		return battle_report_suggestion.strip_edges()
	return "等第一条记忆。"

func _resolve_ai_chat_followup_text(latest_proposal_summary: String, failure_summary: String, battle_report_suggestion: String, runtime_receipt_lines: Array) -> String:
	var player_failure := _format_failure_to_player_text(failure_summary)
	if player_failure != "" and player_failure != "暂无失败":
		return player_failure
	var latest_proposal := latest_proposal_summary.strip_edges()
	if latest_proposal != "" and latest_proposal != "无待确认":
		return latest_proposal
	var receipt_text := str(runtime_receipt_lines[0] if runtime_receipt_lines.size() > 0 else "").strip_edges()
	if receipt_text != "" and receipt_text != "无结果" and receipt_text != "暂无回执":
		return receipt_text
	if battle_report_suggestion.strip_edges() != "":
		return battle_report_suggestion.strip_edges()
	return "无跟进。"

func _build_ai_chat_history_source_cards(chat_history_snapshot: Dictionary) -> Array:
	var loaded_count := _count_ai_chat_history_messages(chat_history_snapshot)
	var total_count := int(chat_history_snapshot.get("messageCount", loaded_count))
	if total_count < loaded_count:
		total_count = loaded_count
	var channel_label := str(chat_history_snapshot.get("channelLabel", "")).strip_edges()
	if channel_label == "":
		channel_label = str(chat_history_snapshot.get("sourceLabel", "主聊天频道")).strip_edges()
	channel_label = _format_ai_chat_channel_label(channel_label)
	var has_more := bool(chat_history_snapshot.get("hasMore", false))
	return [{
		"title": "频道",
		"value": channel_label,
		"meta": "主频道",
		"description": "",
		"tone": "gold",
		"min_width": 240,
	}, {
		"title": "已载入",
		"value": "%s / %s" % [str(loaded_count), str(total_count)],
		"meta": "最近记录",
		"description": "",
		"tone": "blue",
		"min_width": 240,
	}, {
		"title": "更多历史",
		"value": "可继续看" if has_more else "已看完",
		"meta": "不按主题拆分",
		"description": "",
		"tone": "green" if has_more else "neutral",
		"min_width": 240,
	}]

func _build_ai_chat_history_status_hero(chat_history_snapshot: Dictionary, context_focus_label: String) -> Dictionary:
	var message_count := _count_ai_chat_history_messages(chat_history_snapshot)
	var channel_label := str(chat_history_snapshot.get("channelLabel", "")).strip_edges()
	if channel_label == "":
		channel_label = str(chat_history_snapshot.get("sourceLabel", "主聊天频道")).strip_edges()
	channel_label = _format_ai_chat_channel_label(channel_label)
	var source_label := str(chat_history_snapshot.get("sourceLabel", "主聊天频道")).strip_edges()
	source_label = _format_ai_chat_channel_label(source_label)
	var filter_label := _format_ai_chat_filter_label(str(chat_history_snapshot.get("filter", "all")).strip_edges())
	var has_more := bool(chat_history_snapshot.get("hasMore", false))
	return {
		"headline": "打开聊天频道",
		"subtitle": "",
		"state": "%s 条记录" % str(message_count) if message_count > 0 else "等待聊天",
		"facts": [{
			"label": "频道",
			"value": channel_label,
			"meta": "主频道" if source_label.find("聊天") >= 0 else source_label,
			"tone": "gold",
			"min_width": 190,
		}, {
			"label": "记录",
			"value": "%s 条" % str(message_count),
			"meta": "记录",
			"tone": "blue",
			"min_width": 150,
		}, {
			"label": "筛选",
			"value": filter_label,
			"meta": context_focus_label,
			"tone": "green",
			"min_width": 150,
		}, {
			"label": "更多",
			"value": "可继续看" if has_more else "已看完",
			"meta": "记录",
			"tone": "neutral",
			"min_width": 170,
		}],
	}

func _format_ai_chat_channel_label(label: String) -> String:
	var normalized := label.strip_edges()
	if normalized == "" or normalized.find("主聊天") >= 0:
		return "主频道"
	if normalized.find("聊天") >= 0:
		return normalized.replace("聊天", "")
	return "主频道" if _contains_ascii_letter(normalized) else normalized

func _build_ai_player_model_status_cards(ai_player_runtimes: Array) -> Array:
	return [{
		"title": "对话",
		"value": "在线" if not ai_player_runtimes.is_empty() else "未接通",
		"meta": "",
		"description": "",
		"tone": "gold",
		"min_width": 168,
	}, {
		"title": "接通",
		"value": _format_ai_source_player_state(_format_ai_player_model_source_label(ai_player_runtimes)),
		"meta": "",
		"description": "",
		"tone": "blue",
		"min_width": 168,
	}, {
		"title": "主意",
		"value": _format_ai_budget_player_state(_format_model_budget_text(ai_player_runtimes)),
		"meta": "",
		"description": "",
		"tone": "green",
		"min_width": 168,
	}, {
		"title": "出手",
		"value": _format_ai_confirm_player_state(ai_player_runtimes),
		"meta": "",
		"description": "",
		"tone": "neutral",
		"min_width": 168,
	}]

func _build_ai_player_model_status_hero(primary_display_name: String, ai_player_runtimes: Array) -> Dictionary:
	var runtime := _read_primary_ai_player_runtime(ai_player_runtimes)
	var model_status: Dictionary = {}
	if not runtime.is_empty():
		model_status = _read_runtime_model_status(runtime)
	var display_name := primary_display_name.strip_edges()
	if display_name == "":
		display_name = "AI玩家"
	var budget_label := _format_model_budget_text(ai_player_runtimes)
	var online_label := "在线" if not ai_player_runtimes.is_empty() else "未接通"
	var advice_label := _format_ai_budget_player_state(budget_label)
	var safety_label := _format_ai_confirm_player_state(ai_player_runtimes)
	return {
		"headline": "%s 在岗" % display_name,
		"subtitle": "",
		"state": "",
		"fact_mode": "status_pills_v1",
		"facts": [{
			"label": "对话",
			"value": online_label,
			"tone": "gold",
			"min_width": 168,
		}, {
			"label": "主意",
			"value": advice_label,
			"tone": "green",
			"min_width": 168,
		}, {
			"label": "出手",
			"value": safety_label,
			"tone": "neutral",
			"min_width": 168,
		}],
	}

func _build_ai_player_priority_cards(development_plan: Dictionary, ai_player_runtimes: Array, action_catalog: Array, failure_summary: String, battle_report_items: Array, proposal_items: Array, runtime_error: String) -> Array:
	var player_failure := _format_failure_to_player_text(failure_summary)
	var next_step := _format_ai_player_next_step_summary(development_plan, battle_report_items, failure_summary)
	var runtime_error_text := runtime_error.strip_edges()
	var candidate_cards := _build_ai_player_management_candidate_cards(development_plan, ai_player_runtimes, action_catalog)
	var candidate_card: Dictionary = {}
	if not candidate_cards.is_empty() and candidate_cards[0] is Dictionary:
		candidate_card = candidate_cards[0] as Dictionary
	var actionable_proposal_count := _count_actionable_ai_proposals(proposal_items)
	var latest_proposal := _format_ai_player_latest_proposal(proposal_items)
	var battle_summary := _format_ai_battle_report_summary(battle_report_items)
	var battle_meta := _format_ai_battle_report_damage_summary(battle_report_items)
	var battle_description := _format_ai_battle_report_suggestion(battle_report_items)
	var failure_clear := _is_ai_failure_clear(player_failure)
	var report_and_proposal_description := battle_description
	if latest_proposal != "无待确认":
		report_and_proposal_description = latest_proposal
	return [{
		"title": "现在可做",
		"value": next_step,
		"meta": "优先处理",
		"description": "",
		"tone": "gold",
		"min_width": 260,
	}, {
		"title": "需处理",
		"value": "接通异常" if runtime_error_text != "" else _format_ai_failure_display_text(player_failure),
		"meta": "要处理" if not failure_clear or runtime_error_text != "" else "没卡住",
		"description": runtime_error_text if runtime_error_text != "" else "",
		"tone": "green" if failure_clear and runtime_error_text == "" else "blue",
		"min_width": 260,
	}, {
		"title": "可处理",
		"value": str(candidate_card.get("value", "等主意")),
		"meta": str(candidate_card.get("title", "可选待确认")),
		"description": "",
		"tone": str(candidate_card.get("tone", "neutral")),
		"min_width": 260,
	}, {
		"title": "军情",
		"value": battle_summary,
		"meta": "%s / 待确认 %s" % [battle_meta, str(actionable_proposal_count)],
		"description": report_and_proposal_description,
		"tone": "blue" if actionable_proposal_count > 0 else "neutral",
		"min_width": 260,
	}]

func _build_ai_chat_history_cards(primary_display_name: String, chat_history_snapshot: Dictionary, context_memory_lines: Array, runtime_receipt_lines: Array, latest_proposal_summary: String, failure_summary: String, battle_report_suggestion: String) -> Array:
	var ai_name := primary_display_name.strip_edges()
	if ai_name == "":
		ai_name = "AI玩家"
	var message_cards := _build_ai_chat_message_cards(chat_history_snapshot)
	if not message_cards.is_empty():
		return message_cards
	var cards: Array = [{
		"title": "聊天频道",
		"value": "还没有聊天记忆",
		"meta": _format_ai_chat_channel_label(str(chat_history_snapshot.get("sourceLabel", "聊天频道")).strip_edges()),
		"description": "打开频道后显示。",
		"tone": "gold",
		"min_width": 320,
	}]
	var ai_reply := ""
	for line_variant in context_memory_lines.slice(0, min(context_memory_lines.size(), 3)):
		var line := str(line_variant).strip_edges()
		if line != "":
			ai_reply = line
			break
	if ai_reply == "":
		ai_reply = battle_report_suggestion.strip_edges()
	if ai_reply == "":
		ai_reply = "先看需处理，再选下一件事。"
	cards.append({
		"title": ai_name,
		"value": _clip_ai_chat_line(ai_reply),
		"meta": "AI玩家回复",
		"description": "",
		"tone": "blue",
		"min_width": 300,
	})
	var receipt_text := str(runtime_receipt_lines[0] if runtime_receipt_lines.size() > 0 else "").strip_edges()
	var receipt_meta := str(runtime_receipt_lines[1] if runtime_receipt_lines.size() > 1 else "最近结果").strip_edges()
	if receipt_text == "":
		receipt_text = "无结果"
	if receipt_meta == "":
		receipt_meta = "最近结果"
	cards.append({
		"title": "结果",
		"value": _clip_ai_chat_line(receipt_text),
		"meta": receipt_meta,
		"description": "",
		"tone": "green" if _is_ai_failure_clear(failure_summary) else "neutral",
		"min_width": 300,
	})
	if latest_proposal_summary.strip_edges() != "":
		cards.append({
			"title": "待确认",
			"value": _clip_ai_chat_line(latest_proposal_summary),
			"meta": "待处理",
			"description": "",
			"tone": "neutral",
			"min_width": 300,
		})
	return cards

func _build_ai_chat_message_cards(chat_history_snapshot: Dictionary) -> Array:
	var raw_messages: Array = chat_history_snapshot.get("messages", []) as Array
	var cards: Array = []
	var start_index := maxi(0, raw_messages.size() - 6)
	for index in range(start_index, raw_messages.size()):
		var raw_message = raw_messages[index]
		if not (raw_message is Dictionary):
			continue
		var message: Dictionary = raw_message as Dictionary
		var body := str(message.get("body", "")).strip_edges()
		if body == "":
			continue
		cards.append({
			"title": _format_ai_chat_message_title(message),
			"value": _clip_ai_chat_line(body, 78),
			"meta": _format_ai_chat_message_meta(message),
			"description": _format_ai_chat_message_description(message),
			"footer": _format_ai_chat_message_footer(message),
			"tone": _resolve_ai_chat_message_tone(message),
			"min_width": 360,
		})
	return cards

func _build_ai_chat_timeline_messages(primary_display_name: String, chat_history_snapshot: Dictionary, context_memory_lines: Array, runtime_receipt_lines: Array, latest_proposal_summary: String, failure_summary: String, battle_report_suggestion: String) -> Array:
	var raw_messages: Array = chat_history_snapshot.get("messages", []) as Array
	var messages: Array = []
	var start_index := maxi(0, raw_messages.size() - 18)
	for index in range(start_index, raw_messages.size()):
		var raw_message = raw_messages[index]
		if not (raw_message is Dictionary):
			continue
		var message: Dictionary = raw_message as Dictionary
		var body := str(message.get("body", "")).strip_edges()
		if body == "":
			continue
		messages.append({
			"name": _format_ai_chat_message_title(message),
			"body": body,
			"meta": _format_ai_chat_message_meta(message),
			"footer": _format_ai_chat_message_footer(message),
			"tone": _resolve_ai_chat_message_tone(message),
			"align": "right" if str(message.get("kind", "")).strip_edges() == "player" else "left",
			"min_width": 520,
		})
	if not messages.is_empty():
		return messages
	messages.append({
		"name": "聊天频道",
		"body": "无聊天记忆。",
		"meta": _format_ai_chat_channel_label(str(chat_history_snapshot.get("sourceLabel", "聊天频道")).strip_edges()),
		"footer": "",
		"tone": "gold",
		"align": "left",
	})
	return messages

func _count_ai_chat_history_messages(chat_history_snapshot: Dictionary) -> int:
	var raw_messages: Array = chat_history_snapshot.get("messages", []) as Array
	return raw_messages.size()

func _format_ai_chat_message_title(message: Dictionary) -> String:
	var display_name := str(message.get("name", "")).strip_edges()
	if display_name != "":
		return display_name
	match str(message.get("kind", "")).strip_edges():
		"player":
			return "总督"
		"ai":
			return "AI玩家"
		"proposal":
			return "待确认"
		"receipt":
			return "结果"
		_:
			return "记录"

func _format_ai_chat_message_meta(message: Dictionary) -> String:
	var parts: Array[String] = []
	var metadata := _read_ai_chat_metadata(message)
	var proactive_reason := str(metadata.get("proactiveReason", "")).strip_edges()
	if proactive_reason != "":
		parts.append(_format_ai_proactive_reason_label(proactive_reason))
		var severity := str(metadata.get("severity", "")).strip_edges()
		if severity != "":
			parts.append(_format_ai_severity_label(severity))
		var suggested_action := str(metadata.get("suggestedAction", "")).strip_edges()
		if suggested_action != "":
			parts.append("主意：%s" % _format_ai_action_label(suggested_action))
		return " / ".join(parts)
	var receipt_narrative := _read_dictionary_field(metadata, "receiptNarrative")
	if not receipt_narrative.is_empty():
		parts.append("结果")
		var outcome := str(receipt_narrative.get("outcome", "")).strip_edges()
		if outcome != "":
			parts.append(_format_ai_receipt_outcome_label(outcome))
		var receipt_action := str(receipt_narrative.get("action", "")).strip_edges()
		if receipt_action != "":
			parts.append(_format_ai_action_label(receipt_action))
		var receipt_failure := _normalize_failure_code_value(receipt_narrative.get("failureCode", ""))
		if receipt_failure != "":
			parts.append("需处理：%s" % _format_failure_to_player_text(receipt_failure))
		return " / ".join(parts)
	parts.append(_format_ai_chat_kind_label(str(message.get("kind", "")).strip_edges()))
	var action := _format_runtime_action_for_player(str(message.get("action", "")).strip_edges())
	if action != "" and action != "最近行动":
		parts.append(action)
	var failure_code := _normalize_failure_code_value(metadata.get("failureCode", message.get("failureCode", "")))
	if failure_code != "":
		parts.append("需处理：%s" % _format_failure_to_player_text(failure_code))
	return " / ".join(parts)

func _format_ai_chat_message_description(message: Dictionary) -> String:
	var kind := str(message.get("kind", "")).strip_edges()
	var metadata := _read_ai_chat_metadata(message)
	var proactive_reason := str(metadata.get("proactiveReason", "")).strip_edges()
	if proactive_reason != "":
		var description_parts: Array[String] = ["巡查提醒：%s。" % _format_ai_proactive_reason_label(proactive_reason)]
		var trigger_condition := _read_dictionary_field(metadata, "triggerCondition")
		var cooldown := str(metadata.get("cooldownMinutes", trigger_condition.get("cooldownMinutes", ""))).strip_edges()
		if cooldown != "":
			description_parts.append("同类提醒冷却 %s 分钟。" % cooldown)
		var suggested_action := str(metadata.get("suggestedAction", "")).strip_edges()
		if suggested_action != "":
			description_parts.append("点开待确认查看。")
		return "".join(description_parts)
	var receipt_narrative := _read_dictionary_field(metadata, "receiptNarrative")
	if not receipt_narrative.is_empty():
		var outcome := _format_ai_receipt_outcome_label(str(receipt_narrative.get("outcome", "")).strip_edges())
		var action := _format_ai_action_label(str(receipt_narrative.get("action", "")).strip_edges())
		return "%s：%s。" % [outcome, action]
	var recovery_hint := _read_dictionary_field(metadata, "recoveryHint")
	var recovery_summary := str(recovery_hint.get("summary", "")).strip_edges()
	if recovery_summary != "":
		return recovery_summary
	if kind == "proposal":
		return "这条聊天已经形成待确认。"
	if kind == "receipt":
		return "这是行动后的结果。"
	if kind == "player":
		return "玩家发来的指令。"
	if kind == "ai":
		return "AI玩家在聊天频道给出的回复。"
	var metadata_failure := _normalize_failure_code_value(metadata.get("failureCode", ""))
	if metadata_failure != "":
		return "记录了需处理：%s。" % _format_failure_to_player_text(metadata_failure)
	return "来自聊天频道的记录。"

func _format_ai_chat_message_footer(message: Dictionary) -> String:
	var parts: Array[String] = []
	var created_at := str(message.get("createdAt", "")).strip_edges()
	if created_at != "":
		parts.append(created_at)
	var proposal_id := str(message.get("proposalId", "")).strip_edges()
	if proposal_id == "":
		proposal_id = str(message.get("receiptProposalId", "")).strip_edges()
	if proposal_id != "":
		parts.append("待确认 %s" % proposal_id)
	return " / ".join(parts)

func _format_ai_chat_kind_label(kind: String) -> String:
	match kind:
		"player":
			return "玩家"
		"ai":
			return "AI玩家"
		"proposal":
			return "待确认"
		"receipt":
			return "结果"
		"system":
			return "记录"
		_:
			return "聊天"

func _format_ai_chat_filter_label(filter_id: String) -> String:
	match filter_id:
		"command":
			return "命令"
		"proposal":
			return "待确认"
		"receipt":
			return "结果"
		"failure":
			return "需处理"
		_:
			return "全部"

func _resolve_ai_chat_message_tone(message: Dictionary) -> String:
	var metadata := _read_ai_chat_metadata(message)
	var proactive_reason := str(metadata.get("proactiveReason", "")).strip_edges()
	if proactive_reason != "":
		match str(metadata.get("severity", "")).strip_edges():
			"high":
				return "gold"
			"medium":
				return "blue"
			"low":
				return "green"
	var receipt_narrative := _read_dictionary_field(metadata, "receiptNarrative")
	if not receipt_narrative.is_empty():
		return "green" if str(receipt_narrative.get("outcome", "")).strip_edges() == "success" else "neutral"
	var failure_code := _normalize_failure_code_value(metadata.get("failureCode", message.get("failureCode", "")))
	if failure_code != "":
		return "neutral"
	match str(message.get("kind", "")).strip_edges():
		"player":
			return "gold"
		"ai":
			return "blue"
		"proposal":
			return "gold"
		"receipt":
			return "green" if bool(message.get("receiptOk", false)) else "neutral"
		_:
			return "neutral"

func _read_ai_chat_metadata(message: Dictionary) -> Dictionary:
	return _read_dictionary_field(message, "metadata")

func _read_dictionary_field(source: Dictionary, key: String) -> Dictionary:
	var value: Variant = source.get(key, {})
	if value is Dictionary:
		return value as Dictionary
	return {}

func _format_ai_proactive_reason_label(reason: String) -> String:
	match reason.strip_edges():
		"battle_high_loss":
			return "战损提醒"
		"battle_victory":
			return "军情捷报"
		"action_ready_for_approval":
			return "待决策"
		"human_input_needed":
			return "缺目标"
		"patrol_heartbeat":
			return "巡查"
		_:
			return "巡查提醒"

func _format_ai_severity_label(severity: String) -> String:
	match severity.strip_edges():
		"high":
			return "紧急"
		"medium":
			return "需看"
		"low":
			return "普通"
		_:
			return "提醒"

func _format_ai_receipt_outcome_label(outcome: String) -> String:
	match outcome.strip_edges():
		"success":
			return "已完成"
		"failure":
			return "未完成"
		_:
			return "结果"

func _clip_ai_chat_line(value: String, max_chars: int = 52) -> String:
	var text := value.strip_edges()
	if text.length() <= max_chars:
		return text
	return "%s..." % text.substr(0, max_chars).strip_edges()

func _format_ai_display_copy(value: String) -> String:
	var text := value.strip_edges()
	if text == "":
		return ""
	if _ai_player_visible_name_has_forbidden_term(text):
		return "AI玩家"
	text = text.replace("建议次数", "主意次数")
	text = text.replace("等待军情建议", "等军情主意")
	text = text.replace("军情建议", "军情主意")
	text = text.replace("后续建议", "后续路线")
	text = text.replace("行动建议", "行动主意")
	text = text.replace("AI玩家建议", "AI玩家主意")
	text = text.replace("权威建议", "推荐")
	text = text.replace("可选建议", "可选待确认")
	text = text.replace("等建议", "等主意")
	text = text.replace("建议", "主意")
	text = text.replace("待接入", "未接通")
	text = text.replace("未入席", "未上阵")
	text = text.replace("入席", "上阵")
	text = text.replace("待领取资源", "待领资源")
	text = text.replace("待领取转入", "待领")
	text = text.replace("待领转入", "待领")
	text = text.replace("转入", "交接")
	text = text.replace("青州后勤官", "青州从事")
	text = text.replace("后勤官", "从事")
	return text

func _ai_player_visible_name_has_forbidden_term(value: String) -> bool:
	var normalized := value.strip_edges().to_lower()
	if normalized == "":
		return false
	for raw_term in AI_PANEL_PLAYER_VISIBLE_NAME_FORBIDDEN_TERMS:
		var term := str(raw_term).strip_edges().to_lower()
		if term != "" and normalized.find(term) >= 0:
			return true
	return false

func _build_ai_player_budget_cards(ai_player_runtimes: Array, resource_accounts: Dictionary, governor_resource_inboxes: Dictionary, execution_budget_summary: String) -> Array:
	var cards: Array = [{
		"title": "还能做",
		"value": _format_execution_budget_player_text(execution_budget_summary),
		"meta": "行动余量",
		"description": "",
		"tone": "gold",
	}]
	cards.append({
		"title": "仓库",
		"value": _format_ai_resource_accounts_summary(resource_accounts),
		"meta": "资源",
		"description": "",
		"tone": "green",
	})
	cards.append({
		"title": "交给主城",
		"value": _format_primary_transfer_budget(ai_player_runtimes),
		"meta": "",
		"description": "",
		"tone": "blue",
	})
	cards.append({
		"title": "问主意",
		"value": _format_ai_budget_player_state(_format_model_budget_text(ai_player_runtimes)),
		"meta": _format_pending_transfer_budget(governor_resource_inboxes),
		"description": "",
		"tone": "neutral",
	})
	return cards

func _build_ai_player_roster_cards(ai_player_runtimes: Array, portrait_assignments: Dictionary, development_plan: Dictionary, failure_summary: String, battle_report_items: Array, proposal_items: Array) -> Array:
	var cards: Array = []
	for runtime_variant in ai_player_runtimes.slice(0, min(ai_player_runtimes.size(), 2)):
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var ai_player_id := _read_runtime_ai_player_id(runtime)
		var display_name := str(runtime.get("displayName", runtime.get("name", ai_player_id))).strip_edges()
		if display_name == "":
			display_name = "未命名AI玩家"
		var saved_avatar_path := str(runtime.get("avatarImagePath", "")).strip_edges()
		var portrait_path := saved_avatar_path if saved_avatar_path != "" and FileAccess.file_exists(saved_avatar_path) else _resolve_ai_player_portrait_path(ai_player_id, display_name, cards.size(), portrait_assignments)
		var status_label := _format_runtime_status_label(str(runtime.get("status", "active")).strip_edges())
		cards.append({
			"title": display_name,
			"value": status_label,
			"meta": _format_ai_source_player_state(_format_single_runtime_model_source_label(runtime)),
			"description": "现在可做：%s" % _format_ai_player_next_step_summary(development_plan, battle_report_items, failure_summary),
			"image_path": portrait_path,
			"tone": "gold",
			"min_width": 220,
		})
	if cards.is_empty():
		cards.append({
			"title": "青州从事",
			"value": "未接通",
			"meta": "未上阵",
			"description": "",
			"image_path": _resolve_ai_player_portrait_path("player_operator_alpha", "青州从事", 0, portrait_assignments),
			"tone": "neutral",
		})
	cards.append({
		"title": "先看这件事",
		"value": _format_ai_player_next_step_summary(development_plan, battle_report_items, failure_summary),
		"meta": "先处理",
			"description": "",
		"tone": "blue",
		"min_width": 220,
	})
	cards.append({
		"title": "待确认",
		"value": str(_count_actionable_ai_proposals(proposal_items)),
			"meta": "待定",
		"description": "",
		"tone": "green" if _count_actionable_ai_proposals(proposal_items) > 0 else "neutral",
		"min_width": 220,
	})
	return cards

func _build_ai_player_management_candidate_cards(development_plan: Dictionary, ai_player_runtimes: Array, action_catalog: Array) -> Array:
	var actions: Array = development_plan.get("candidateActions", []) as Array
	var cards: Array = []
	for action_variant in actions.slice(0, min(actions.size(), 3)):
		if not (action_variant is Dictionary):
			continue
		var action: Dictionary = action_variant as Dictionary
		var action_id := str(action.get("action", "")).strip_edges()
		if action_id == "":
			continue
		if _is_ai_direct_hero_level_action(action_id):
			continue
		var readiness := str(action.get("readiness", "unknown")).strip_edges()
		var reason := str(action.get("proposalReason", action.get("reason", ""))).strip_edges()
		var blockers: Array = action.get("blockers", []) as Array
		var blocker_text := "" if blockers.is_empty() else "缺少条件：%s" % _format_ai_player_blockers(blockers)
		var target_summary := _format_ai_action_target_summary(action_id, action)
		var why_text := _format_ai_action_player_reason(action_id, reason)
		var priority_text := _format_ai_action_priority_text(action)
		var description := target_summary if target_summary != "" else blocker_text if blocker_text != "" else why_text
		cards.append({
			"title": _format_ai_action_label(action_id),
			"value": _format_action_readiness_label(readiness),
			"meta": _format_ai_action_approval_result(action_id),
			"description": _join_string_array([description, priority_text], "。"),
			"tone": "green" if readiness == "ready" else "blue" if readiness == "needs_target" else "neutral",
			"min_width": 260,
		})
	if not cards.is_empty():
		return cards
	var fallback_cards := _build_ai_player_candidate_action_cards(ai_player_runtimes, action_catalog)
	return fallback_cards.slice(0, min(fallback_cards.size(), 3))

func _build_ai_player_failure_next_step_cards(failure_summary: String, development_plan: Dictionary, battle_report_items: Array, runtime_error: String) -> Array:
	var player_failure := _format_failure_to_player_text(failure_summary)
	var next_step := _format_ai_player_next_step_summary(development_plan, battle_report_items, failure_summary)
	var cards: Array = [{
		"title": "需处理",
		"value": _format_ai_failure_display_text(player_failure),
		"meta": "状态 / 待确认 / 结果",
		"description": "",
		"tone": "green" if _is_ai_failure_clear(player_failure) else "blue",
	}, {
		"title": "现在可做",
		"value": next_step,
		"meta": "可处理",
		"description": "",
		"tone": "gold",
	}, {
		"title": "军情提示",
		"value": _format_ai_battle_report_summary(battle_report_items),
		"meta": _format_ai_battle_report_damage_summary(battle_report_items),
		"description": _format_ai_battle_report_suggestion(battle_report_items),
		"tone": "blue",
	}]
	if runtime_error.strip_edges() != "":
		cards.append({
		"title": "接通异常",
			"value": "需要重试",
			"meta": "等恢复",
			"description": runtime_error.strip_edges(),
			"tone": "neutral",
		})
	return cards

func _build_agenda_items(agenda: Dictionary, captured_city_count: int, ai_player_count: int, home_tile_id: String) -> Array:
	var items: Array = []
	var agenda_options: Array = _resolve_agenda_options(agenda)
	for option_variant in agenda_options.slice(0, min(agenda_options.size(), 4)):
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		var action_meta := str(option.get("actionId", "")).strip_edges()
		var intent_meta := str(option.get("intent", action_meta)).strip_edges()
		var target_tile_id := str(option.get("targetTileId", "")).strip_edges()
		var support_count := int(option.get("supportCount", 0))
		var priority := str(option.get("priority", "P2")).strip_edges()
		var summary := str(option.get("summary", option.get("label", ""))).strip_edges()
		var supporting_ai_player_ids: Array = option.get("supportingAiPlayerIds", []) as Array
		var support_ai_description := ""
		if not supporting_ai_player_ids.is_empty():
			support_ai_description = " 支援AI玩家 %s 位。" % str(supporting_ai_player_ids.size())
		var action_label := _format_ai_action_label(action_meta if action_meta != "" else intent_meta)
		var agenda_meta := action_label if action_label != "待处理" and action_label != "未标记动作" else _format_agenda_source_for_player(str(agenda.get("source", "domain")))
		items.append({
			"label": str(option.get("label", summary)).strip_edges(),
			"meta": "%s%s" % [
				agenda_meta,
				" @ %s" % _format_ai_tile_display_label(target_tile_id) if target_tile_id != "" else "",
			],
			"status": "%s / %s票" % [priority, str(support_count)],
			"description": "%s%s" % [summary if summary != "" else "当前议程预览项。", support_ai_description],
		})
	if items.is_empty():
		items = [
			{"label": "扩张优先", "meta": "已占城池 %s" % str(captured_city_count), "status": "待安排", "description": "当前势力仍保留扩张路线。"},
			{"label": "补给修复", "meta": "主城 %s" % (_format_ai_tile_display_label(home_tile_id) if home_tile_id != "" else "未定位"), "status": "待安排", "description": "补给紧张时，先修复队伍状态。"},
			{"label": "盟友支援", "meta": "AI玩家 %s" % str(ai_player_count), "status": "待安排", "description": "有盟友待确认时，会放到这里提醒。"},
		]
	var followups: Array = agenda.get("recommendedFollowups", []) as Array
	if not followups.is_empty():
		items.append({
			"label": "后续路线",
			"meta": ",".join(followups.slice(0, min(followups.size(), 2))),
			"status": "推荐",
		"description": "当前路线完成后的后续动作。",
		})
	return items

func _build_agenda_actions(agenda: Dictionary) -> Array:
	var actions: Array = [
		{"id": "agenda_refresh", "label": "更新路线"},
	]
	var agenda_options: Array = _resolve_agenda_options(agenda)
	for option_variant in agenda_options.slice(0, min(agenda_options.size(), 5)):
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		var label_text := str(option.get("label", "")).strip_edges()
		if label_text == "":
			continue
		var action_id := str(option.get("actionId", "")).strip_edges()
		if action_id == "":
			continue
		var target_tile_id := str(option.get("targetTileId", "")).strip_edges()
		var summary := str(option.get("summary", label_text)).strip_edges()
		actions.append({
			"id": action_id,
			"label": label_text,
			"description": summary,
			"targetTileId": target_tile_id,
			"priority": str(option.get("priority", "P2")).strip_edges(),
		})
	var target_unit_id := _resolve_primary_agenda_target_unit_id(agenda)
	actions.append({
		"id": "agenda_open_troop",
		"label": "查看部队",
		"disabled": target_unit_id == "",
	})
	actions.append({
		"id": "agenda_open_interior",
		"label": "查看内政",
	})
	actions.append({
		"id": "agenda_open_alliance",
		"label": "查看同盟",
	})
	return actions

func _build_agenda_detail_lines(agenda: Dictionary, agenda_options: Array, runtime_context: Dictionary) -> Array:
	var execution_state := WorldStore.get_resolved_ai_execution(_target_faction_id)
	var action_receipt := WorldStore.get_ai_action_receipt(_target_faction_id)
	var execution_request_id := _resolve_execution_request_id(agenda, execution_state, action_receipt)
	var execution_status := _resolve_execution_status(execution_state, action_receipt)
	var failure_code := _resolve_failure_code(action_receipt)
	var lines := [
		"路线来源：%s" % _format_agenda_source_for_player(str(agenda.get("source", "domain"))),
		"处理方式：%s" % _format_agenda_mode_for_player(str(agenda.get("authorityMode", "authoritative_world"))),
		"路线摘要：%s" % str(agenda.get("summary", "暂无路线。")),
		"目标地块：%s" % str(agenda.get("targetTileId", "未定位")),
		"目标部队：%s" % _join_target_units(agenda.get("targetUnitIds", []) as Array),
		"首项选项：%s" % _agenda_option_detail(agenda_options),
		"请求编号：%s" % execution_request_id,
		"当前状态：%s" % execution_status,
		"剩余行动：%s" % _format_execution_budget_summary(execution_state),
		"队列摘要：%s" % _format_execution_queue_summary(execution_state),
	]
	if failure_code != "none":
		lines.append("失败码：%s" % failure_code)
	var receipt_message := _resolve_receipt_message(action_receipt)
	if receipt_message != "none":
		lines.append("结果详情：%s" % receipt_message)
	var target_unit_id := _resolve_primary_agenda_target_unit_id(agenda)
	lines.append("联动提示：%s" % _resolve_agenda_link_hint(agenda, target_unit_id))
	var runtime_receipt_lines := _build_runtime_receipt_lines(runtime_context)
	for runtime_receipt_line in runtime_receipt_lines:
		lines.append(runtime_receipt_line)
	return lines

func _build_ai_player_runtime_items(ai_player_runtimes: Array, resource_accounts: Dictionary, portrait_assignments: Dictionary = {}) -> Array:
	var items: Array = []
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var ai_player_id := _read_runtime_ai_player_id(runtime)
		var list_card := _read_runtime_list_card(runtime)
		var display_name := _read_runtime_display_name(runtime, list_card, ai_player_id)
		if display_name == "":
			display_name = "未命名AI玩家"
		var source_label := _format_ai_source_player_state(_format_single_runtime_model_source_label(runtime))
		var advice_label := _format_ai_budget_player_state(_format_single_runtime_model_budget_text(runtime))
		var resource_transfer: Dictionary = runtime.get("resourceTransfer", {}) as Dictionary
		var account: Dictionary = resource_accounts.get(ai_player_id, {}) as Dictionary
		var account_resources: Dictionary = account.get("resources", {}) as Dictionary
		var latest_receipt: Dictionary = runtime.get("latestReceipt", {}) as Dictionary
		var receipt_summary := _format_receipt_summary(latest_receipt)
		var transfer_blocked_by := str(resource_transfer.get("blockedBy", "")).strip_edges()
		var transfer_status := "现在可交" if bool(resource_transfer.get("canTransferNow", false)) else transfer_blocked_by
		if transfer_status == "":
			transfer_status = "待回报"
		elif transfer_status == "none":
			transfer_status = "没卡住"
		var saved_avatar_id := str(runtime.get("avatarId", "")).strip_edges()
		var saved_avatar_path := str(runtime.get("avatarImagePath", "")).strip_edges()
		var portrait_path := saved_avatar_path if saved_avatar_path != "" and FileAccess.file_exists(saved_avatar_path) else _resolve_ai_player_portrait_path(ai_player_id, display_name, items.size(), portrait_assignments)
		var avatar_summary := saved_avatar_id if saved_avatar_id != "" else "默认头像"
		items.append({
			"label": display_name,
			"meta": "在线 %s / 主意 %s" % [source_label, advice_label],
			"status": _format_runtime_status_label(str(runtime.get("status", "active"))),
			"image_path": portrait_path,
			"description": "%s / 资源 %s / 交接 %s / 结果 %s" % [
				avatar_summary,
				_format_resource_bundle(account_resources),
				transfer_status,
				receipt_summary,
			],
		})
	if not items.is_empty():
		return items
	var fallback_portrait := _resolve_ai_player_portrait_path("player_operator_alpha", "青州从事", 0, portrait_assignments)
	return [{
		"label": "青州从事",
		"meta": "等AI玩家上阵",
		"status": "未上阵",
		"image_path": fallback_portrait,
		"description": "上阵后显示在线状态。",
	}]

func _load_ai_chat_portrait_assignments() -> Dictionary:
	var assignments: Dictionary = {}
	if not FileAccess.file_exists(AI_CHAT_PORTRAIT_MANIFEST):
		return assignments
	var raw := FileAccess.get_file_as_string(AI_CHAT_PORTRAIT_MANIFEST)
	if FileAccess.get_open_error() != OK or raw.strip_edges() == "":
		return assignments
	var parsed = JSON.parse_string(raw)
	if not (parsed is Dictionary):
		return assignments
	var manifest := parsed as Dictionary
	var portrait_paths: Array[String] = []
	var assignments_value = manifest.get("assignments", {})
	if assignments_value is Dictionary:
		for key in (assignments_value as Dictionary).keys():
			var portrait_path := str((assignments_value as Dictionary).get(key, "")).strip_edges()
			if portrait_path != "":
				assignments[str(key).strip_edges()] = portrait_path
	var players_value = manifest.get("players", {})
	if players_value is Dictionary:
		for key in (players_value as Dictionary).keys():
			var player_value = (players_value as Dictionary).get(key, {})
			if player_value is Dictionary:
				var path := str((player_value as Dictionary).get("portraitPath", "")).strip_edges()
				if path != "":
					assignments[str(key).strip_edges()] = path
	var portraits_value = manifest.get("portraits", [])
	if portraits_value is Array:
		for portrait_value in portraits_value as Array:
			if not (portrait_value is Dictionary):
				continue
			var portrait := portrait_value as Dictionary
			if not bool(portrait.get("selectable", true)):
				continue
			var image_path := str(portrait.get("image", portrait.get("portraitPath", ""))).strip_edges()
			if image_path == "":
				continue
			portrait_paths.append(image_path)
			var portrait_id := str(portrait.get("id", "")).strip_edges()
			if portrait_id != "":
				assignments[portrait_id] = image_path
			var display_name := str(portrait.get("display_name", "")).strip_edges()
			if display_name != "":
				assignments[display_name] = image_path
	for i in range(portrait_paths.size()):
		assignments["__index_%d" % i] = portrait_paths[i]
	if portrait_paths.size() > 0:
		assignments["player_operator_alpha"] = assignments.get("player_operator_alpha", portrait_paths[0])
		assignments["青州从事"] = assignments.get("青州从事", portrait_paths[0])
	if portrait_paths.size() > 1:
		assignments["player_operator_beta"] = assignments.get("player_operator_beta", portrait_paths[1])
		assignments["兖州斥候官"] = assignments.get("兖州斥候官", portrait_paths[1])
	return assignments

func _resolve_ai_player_portrait_path(ai_player_id: String, display_name: String, index: int, portrait_assignments: Dictionary) -> String:
	for key in [ai_player_id.strip_edges(), display_name.strip_edges(), "__index_%d" % index]:
		if key != "" and portrait_assignments.has(key):
			var path := str(portrait_assignments.get(key, "")).strip_edges()
			if path != "" and FileAccess.file_exists(path):
				return path
	return ""

func _resolve_primary_ai_player_display_name(ai_player_runtimes: Array, primary_ai_player_id: String) -> String:
	var normalized_primary_id := primary_ai_player_id.strip_edges()
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var ai_player_id := _read_runtime_ai_player_id(runtime)
		if normalized_primary_id != "" and ai_player_id != normalized_primary_id:
			continue
		var display_name := str(runtime.get("displayName", runtime.get("name", ai_player_id))).strip_edges()
		if display_name != "":
			return _format_ai_display_copy(display_name)
		if ai_player_id != "":
			return ai_player_id
	if normalized_primary_id != "":
		return normalized_primary_id
	return ""

func _resolve_primary_ai_player_report_policy(ai_player_runtimes: Array, primary_ai_player_id: String) -> Dictionary:
	var normalized_primary_id := primary_ai_player_id.strip_edges()
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var ai_player_id := _read_runtime_ai_player_id(runtime)
		if normalized_primary_id != "" and ai_player_id != normalized_primary_id:
			continue
		var runtime_policy: Dictionary = runtime.get("runtimePolicy", {}) as Dictionary
		return {
			"dailySummary": bool(runtime_policy.get("allowAutonomousCombatDailySummaryChatReports", true)),
			"warEvent": bool(runtime_policy.get("allowAutonomousCombatWarEventChatReports", true)),
			"voice": bool(runtime_policy.get("allowAutonomousCombatVoiceReports", false)),
		}
	return {
		"dailySummary": true,
		"warEvent": true,
		"voice": false,
	}

func _build_ai_resource_account_cards(resource_accounts: Dictionary) -> Array:
	var cards: Array = []
	for ai_player_id_variant in resource_accounts.keys():
		var ai_player_id := str(ai_player_id_variant).strip_edges()
		if ai_player_id == "":
			continue
		var account_variant: Variant = resource_accounts.get(ai_player_id, {})
		if not (account_variant is Dictionary):
			continue
		var account: Dictionary = account_variant as Dictionary
		var resources: Dictionary = account.get("resources", {}) as Dictionary
		cards.append({
			"title": "仓库",
			"value": _format_resource_bundle(resources),
			"meta": "可转给主城",
			"description": "",
			"tone": "green",
		})
	if not cards.is_empty():
		return cards
	return [{
		"title": "仓库",
		"value": "无",
		"meta": "无资源",
		"description": "",
		"tone": "neutral",
	}]

func _build_ai_player_proposal_cards(proposal_items: Array) -> Array:
	var cards: Array = []
	for proposal_variant in proposal_items.slice(0, min(proposal_items.size(), 3)):
		if not (proposal_variant is Dictionary):
			continue
		var proposal: Dictionary = proposal_variant as Dictionary
		var action := str(proposal.get("action", "unknown")).strip_edges()
		if _is_ai_direct_hero_level_action(action):
			continue
		var status := str(proposal.get("status", "unknown")).strip_edges()
		var risk_level := str(proposal.get("riskLevel", "unknown")).strip_edges()
		var failure_reason := str(proposal.get("rejectionReason", proposal.get("error", ""))).strip_edges()
		var description := _format_failure_to_player_text(failure_reason) if failure_reason != "" else _format_ai_action_player_reason(action, str(proposal.get("reason", "")).strip_edges())
		var target_summary := _format_ai_action_target_summary(action, proposal)
		if target_summary != "":
			description = "%s。%s" % [target_summary, description]
		cards.append({
			"title": _format_ai_action_label(action),
			"value": _format_ai_proposal_status_label(status),
			"meta": _format_ai_risk_label(risk_level),
			"description": description,
			"tone": "blue" if status == "pending_approval" or status == "approved" else "neutral",
		})
	if not cards.is_empty():
		return cards
	return [{
		"title": "待确认",
		"value": "无",
		"meta": "",
		"description": "",
		"tone": "neutral",
	}]

func _build_ai_receipt_detail_cards(receipt_items: Array, ai_player_runtimes: Array, receipt_history_page: Dictionary = {}) -> Array:
	var cards: Array = []
	var max_receipt_cards := 4 if not receipt_history_page.is_empty() else 6
	for receipt_variant in receipt_items:
		if not (receipt_variant is Dictionary):
			continue
		var card := _build_ai_world_receipt_detail_card(receipt_variant as Dictionary)
		if not card.is_empty():
			cards.append(card)
		if cards.size() >= max_receipt_cards:
			break
	for runtime_variant in ai_player_runtimes:
		if cards.size() >= max_receipt_cards:
			break
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var latest_receipt: Dictionary = runtime.get("latestReceipt", {}) as Dictionary
		if latest_receipt.is_empty():
			continue
		var card := _build_ai_world_receipt_detail_card(latest_receipt)
		if not card.is_empty():
			cards.append(card)
		if cards.size() >= max_receipt_cards:
			break
	if not receipt_history_page.is_empty():
		for history_card_variant in _build_ai_receipt_history_pagination_cards(receipt_history_page):
			if cards.size() >= 6:
				break
			if history_card_variant is Dictionary:
				cards.append(history_card_variant as Dictionary)
	if not cards.is_empty():
		return cards
	return [{
		"title": "结果明细",
		"value": "无结果",
		"meta": "等待回执",
		"description": "批准后的行动结果会在这里归档。",
		"tone": "neutral",
	}]

func _build_ai_receipt_history_pagination_cards(receipt_history_page: Dictionary) -> Array:
	if receipt_history_page.is_empty():
		return []
	var messages_variant: Variant = receipt_history_page.get("messages", [])
	var messages: Array = messages_variant if messages_variant is Array else []
	var history_counts_variant: Variant = receipt_history_page.get("historyCounts", receipt_history_page.get("history_counts", {}))
	var history_counts: Dictionary = history_counts_variant if history_counts_variant is Dictionary else {}
	var filter := str(receipt_history_page.get("filter", "all")).strip_edges()
	if filter == "":
		filter = "all"
	var count := int(receipt_history_page.get("count", messages.size()))
	var total_count := int(receipt_history_page.get("totalCount", receipt_history_page.get("total_count", count)))
	var receipt_count := int(history_counts.get("receipt", total_count))
	var failure_count := int(history_counts.get("failure", 0))
	var has_more := bool(receipt_history_page.get("hasMore", receipt_history_page.get("has_more", false)))
	return [{
		"title": "回执历史",
		"value": "%s %s/%s" % [filter, count, total_count],
		"meta": "还有更早" if has_more else "已到开头",
		"description": "成功 %s / 需处理 %s" % [receipt_count, failure_count],
		"tone": "gold" if has_more else "neutral",
	}, {
		"title": "更早记录",
		"value": "还有更早" if has_more else "已到开头",
		"meta": "按时间继续查看" if has_more else "没有更多",
		"description": "只显示玩家需要看的结果。",
		"tone": "blue" if has_more else "neutral",
	}]

func _build_ai_world_receipt_detail_card(receipt: Dictionary) -> Dictionary:
	if receipt.is_empty():
		return {}
	var receipt_payload := receipt
	var using_world_receipt := false
	var world_receipt_variant: Variant = receipt.get("worldReceipt", receipt.get("world_receipt", {}))
	if world_receipt_variant is Dictionary and not (world_receipt_variant as Dictionary).is_empty():
		receipt_payload = world_receipt_variant as Dictionary
		using_world_receipt = true
	var world_action := ""
	if using_world_receipt:
		world_action = str(receipt_payload.get("action", receipt_payload.get("worldAction", receipt.get("worldAction", receipt.get("source_action", "none"))))).strip_edges()
	else:
		world_action = str(receipt_payload.get("worldAction", receipt_payload.get("world_action", receipt_payload.get("action", receipt_payload.get("source_action", "none"))))).strip_edges()
	var failure_code := _normalize_failure_code_value(receipt_payload.get("failureCode", receipt_payload.get("failure_code", receipt.get("failureCode", receipt.get("failure_code", "")))))
	var value_text := "未完成" if failure_code != "" and failure_code != "none" else "已完成" if bool(receipt_payload.get("ok", receipt_payload.get("success", receipt.get("ok", receipt.get("success", false))))) else "未完成"
	var level_exp_text := _format_receipt_level_exp_detail(receipt_payload)
	var receipt_failed := failure_code != "" and failure_code != "none"
	var resource_refresh_text := _format_receipt_resource_refresh_detail(receipt_payload, receipt_failed)
	var maritime_activity_chip_id := _read_receipt_string(receipt_payload, receipt, "maritimeActivityChipId", "maritime_activity_chip_id")
	var maritime_report_result_chip_id := _read_receipt_string(receipt_payload, receipt, "maritimeReportResultChipId", "maritime_report_result_chip_id")
	var hero_variant: Variant = receipt_payload.get("hero", {})
	var hero_name := ""
	if hero_variant is Dictionary:
		var hero: Dictionary = hero_variant as Dictionary
		hero_name = str(hero.get("name", hero.get("displayName", ""))).strip_edges()
	var detail_parts: Array[String] = []
	var hero_id := str(receipt_payload.get("heroId", receipt_payload.get("hero_id", ""))).strip_edges()
	var skill_id := str(receipt_payload.get("skillId", receipt_payload.get("skill_id", ""))).strip_edges()
	if hero_name != "":
		detail_parts.append("武将 %s" % hero_name)
	elif hero_id != "":
		detail_parts.append("武将 已选")
	if skill_id != "":
		detail_parts.append("战法 已选")
	if resource_refresh_text != "":
		detail_parts.append(resource_refresh_text)
	if failure_code != "" and failure_code != "none":
		detail_parts.append("需处理：%s" % _format_failure_to_player_text(failure_code))
	if maritime_activity_chip_id == "maritime_activity_chip_v1":
		detail_parts.append("海巡活动")
	if maritime_report_result_chip_id == "maritime_report_result_chip_v1":
		detail_parts.append("海巡回报")
	return {
		"title": _format_ai_action_label(world_action),
		"value": value_text,
		"meta": level_exp_text if level_exp_text != "" else "等级/经验无变化",
		"description": _join_string_array(detail_parts, " / "),
		"tone": "green" if value_text == "已完成" else "blue",
		"ai_receipt_maritime_activity_chip_id": maritime_activity_chip_id,
		"ai_receipt_maritime_report_result_chip_id": maritime_report_result_chip_id,
	}

func _format_receipt_level_exp_detail(receipt_payload: Dictionary) -> String:
	var parts: Array[String] = []
	var hero_variant: Variant = receipt_payload.get("hero", {})
	var hero_name := ""
	if hero_variant is Dictionary:
		var hero: Dictionary = hero_variant as Dictionary
		hero_name = str(hero.get("name", hero.get("displayName", ""))).strip_edges()
	var previous_level := _format_receipt_value(receipt_payload.get("previousLevel", receipt_payload.get("previous_level", "")))
	var next_level := _format_receipt_value(receipt_payload.get("nextLevel", receipt_payload.get("next_level", "")))
	if previous_level != "" and next_level != "":
		parts.append("%sLv.%s->%s" % [
			"%s " % hero_name if hero_name != "" else "",
			previous_level,
			next_level,
		])
	elif previous_level != "":
		parts.append("%sLv.%s" % ["%s " % hero_name if hero_name != "" else "", previous_level])
	elif next_level != "":
		parts.append("%sLv.%s" % ["%s " % hero_name if hero_name != "" else "", next_level])
	var previous_star_level := _format_receipt_value(receipt_payload.get("previousStarLevel", receipt_payload.get("previous_star_level", "")))
	var next_star_level := _format_receipt_value(receipt_payload.get("nextStarLevel", receipt_payload.get("next_star_level", "")))
	if previous_star_level != "" and next_star_level != "":
		parts.append("%s星级 %s->%s" % [
			"%s " % hero_name if hero_name != "" else "",
			previous_star_level,
			next_star_level,
		])
	elif previous_star_level != "":
		parts.append("%s星级 %s" % ["%s " % hero_name if hero_name != "" else "", previous_star_level])
	elif next_star_level != "":
		parts.append("%s星级 %s" % ["%s " % hero_name if hero_name != "" else "", next_star_level])
	var bonus_points_awarded := _format_receipt_value(receipt_payload.get("bonusPointsAwarded", receipt_payload.get("bonus_points_awarded", "")))
	if bonus_points_awarded != "":
		parts.append("加点 +%s" % bonus_points_awarded)
	var previous_exp := _format_receipt_value(receipt_payload.get("previousExp", receipt_payload.get("previous_exp", "")))
	var next_exp := _format_receipt_value(receipt_payload.get("nextExp", receipt_payload.get("next_exp", "")))
	var exp_gained := _format_receipt_value(receipt_payload.get("expGained", receipt_payload.get("exp_gained", "")))
	if exp_gained != "" or previous_exp != "" or next_exp != "":
		parts.append("%s经验 +%s %s->%s" % [
			"%s " % hero_name if hero_name != "" else "",
			exp_gained if exp_gained != "" else "?",
			previous_exp if previous_exp != "" else "?",
			next_exp if next_exp != "" else "?",
		])
	return " / ".join(parts)

func _format_receipt_resource_refresh_detail(receipt_payload: Dictionary, receipt_failed := false) -> String:
	var parts: Array[String] = []
	var resources_spent_variant: Variant = receipt_payload.get("resourcesSpent", receipt_payload.get("resources_spent", {}))
	if resources_spent_variant is Dictionary and not (resources_spent_variant as Dictionary).is_empty():
		parts.append("%s %s" % ["需要" if receipt_failed else "消耗", _format_resource_bundle(resources_spent_variant as Dictionary)])
	var read_model_refresh_variant: Variant = receipt_payload.get("readModelRefresh", receipt_payload.get("read_model_refresh", {}))
	if read_model_refresh_variant is Dictionary and not (read_model_refresh_variant as Dictionary).is_empty():
		var read_model_refresh: Dictionary = read_model_refresh_variant as Dictionary
		var refresh_endpoint := str(read_model_refresh.get("endpoint", "")).strip_edges()
		var refresh_strategy := str(read_model_refresh.get("strategy", "")).strip_edges()
		if refresh_endpoint != "":
			parts.append("结果已同步")
		elif refresh_strategy != "":
			parts.append("结果已同步")
	return " / ".join(parts)

func _build_ai_player_candidate_action_cards(ai_player_runtimes: Array, action_catalog: Array) -> Array:
	var catalog_by_action: Dictionary = {}
	for catalog_variant in action_catalog:
		if not (catalog_variant is Dictionary):
			continue
		var catalog_entry: Dictionary = catalog_variant as Dictionary
		var action := str(catalog_entry.get("action", "")).strip_edges()
		if action != "":
			catalog_by_action[action] = catalog_entry
	var cards: Array = []
	for runtime_variant in ai_player_runtimes.slice(0, min(ai_player_runtimes.size(), 2)):
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var ai_player_id := _read_runtime_ai_player_id(runtime)
		var action_whitelist: Array = runtime.get("actionWhitelist", []) as Array
		for action_variant in action_whitelist.slice(0, min(action_whitelist.size(), 5)):
			var action_id := str(action_variant).strip_edges()
			if action_id == "":
				continue
			if _is_ai_direct_hero_level_action(action_id):
				continue
			var catalog_entry: Dictionary = catalog_by_action.get(action_id, {}) as Dictionary
			var label := _format_ai_action_label(action_id)
			if label == "待处理":
				label = _format_ai_display_copy(str(catalog_entry.get("label", "待处理")).strip_edges())
			var risk_level := str(catalog_entry.get("riskLevel", "unknown")).strip_edges()
			var mapped_world_action := str(catalog_entry.get("mappedWorldAction", "")).strip_edges()
			var executable := bool(catalog_entry.get("executableInV1", false))
			cards.append({
				"title": label,
				"value": "可提交" if executable else "待开放",
				"meta": _format_ai_risk_label(risk_level),
				"description": "可安排" if mapped_world_action != "" else "",
				"tone": "green" if executable else "neutral",
			})
	if not cards.is_empty():
		return cards.slice(0, min(cards.size(), 8))
	return [{
			"title": "可选待确认",
			"value": "等主意",
		"meta": "",
		"description": "",
		"tone": "neutral",
	}]

func _build_ai_development_action_cards(development_plan: Dictionary) -> Array:
	var actions: Array = development_plan.get("candidateActions", []) as Array
	var cards: Array = []
	for action_variant in actions.slice(0, min(actions.size(), 6)):
		if not (action_variant is Dictionary):
			continue
		var action: Dictionary = action_variant as Dictionary
		var action_id := str(action.get("action", "")).strip_edges()
		if action_id == "":
			continue
		if _is_ai_direct_hero_level_action(action_id):
			continue
		var readiness := str(action.get("readiness", "unknown")).strip_edges()
		var blockers: Array = action.get("blockers", []) as Array
		var blocker_text := "可生成待确认" if blockers.is_empty() else "需处理：%s" % _format_ai_player_blockers(blockers)
		var target_summary := _format_ai_action_target_summary(action_id, action)
		var description := _format_ai_action_player_reason(action_id, str(action.get("reason", "")))
		if target_summary != "":
			description = "%s。%s" % [target_summary, description]
		var priority_text := _format_ai_action_priority_text(action)
		if priority_text != "":
			description = _join_string_array([description, priority_text], "。")
		var readiness_text := _format_action_readiness_label(readiness)
		cards.append({
			"title": _format_ai_action_label(action_id),
			"value": readiness_text,
			"meta": "可处理" if readiness == "ready" else readiness_text,
			"description": "%s。%s" % [description, blocker_text],
			"tone": "green" if readiness == "ready" else "blue" if readiness == "needs_target" else "neutral",
		})
	if not cards.is_empty():
		return cards
	return [{
		"title": "发育主赛项",
		"value": "等主意",
		"meta": "等新待确认",
		"description": "有新待确认会出现在这里。",
		"tone": "neutral",
	}]

func _build_ai_development_risk_cards(development_plan: Dictionary) -> Array:
	var risks: Array = development_plan.get("riskItems", []) as Array
	var cards: Array = []
	for risk_variant in risks.slice(0, min(risks.size(), 6)):
		if not (risk_variant is Dictionary):
			continue
		var risk: Dictionary = risk_variant as Dictionary
		var severity := str(risk.get("severity", "warning")).strip_edges()
		var risk_action := str(risk.get("action", risk.get("code", ""))).strip_edges()
		var risk_title := _format_ai_display_copy(str(risk.get("title", "")).strip_edges())
		var risk_detail := _format_ai_display_copy(str(risk.get("detail", "")).strip_edges())
		var risk_next_step := _format_ai_display_copy(str(risk.get("nextStep", "")).strip_edges())
		var risk_description := risk_detail
		if risk_next_step != "":
			risk_description = "%s 现在可做：%s" % [risk_detail if risk_detail != "" else "需要处理", risk_next_step]
		cards.append({
			"title": risk_title if risk_title != "" else "需处理",
			"value": _format_ai_risk_label(severity),
			"meta": _format_ai_action_label(risk_action) if risk_action != "" else "待处理",
			"description": risk_description,
			"tone": "blue" if severity == "warning" else "neutral",
		})
	if not cards.is_empty():
		return cards
	return [{
		"title": "需处理",
		"value": "没卡住",
		"meta": "可继续",
		"description": "目前没有需要你处理的需处理。",
		"tone": "green",
	}]

func _build_ai_execution_trace_cards(execution_trace_items: Array) -> Array:
	var cards: Array = []
	var trace_card_index := 0
	for trace_variant in execution_trace_items.slice(0, min(execution_trace_items.size(), 2)):
		if not (trace_variant is Dictionary):
			continue
		var trace: Dictionary = trace_variant as Dictionary
		var phase := str(trace.get("phase", "")).strip_edges()
		var action_label := _format_ai_action_label(str(trace.get("action", "unknown")).strip_edges())
		var task_text := _format_ai_display_copy(str(trace.get("currentTaskText", trace.get("title", ""))).strip_edges())
		if task_text == "":
			task_text = action_label
		var result_text := _format_ai_display_copy(str(trace.get("summary", trace.get("result", ""))).strip_edges())
		var marker_text := _format_ai_execution_trace_marker(trace)
		var meta_parts: Array = [_format_ai_execution_trace_source(str(trace.get("sourceKind", "")).strip_edges())]
		if marker_text != "":
			meta_parts.append(marker_text)
		cards.append({
			"title": task_text,
			"value": _format_ai_execution_trace_phase(phase),
			"meta": " / ".join(meta_parts),
			"description": result_text,
			"tone": _format_ai_execution_trace_tone(phase),
			"contract": AI_PLAYER_EXECUTION_TRACE_CONTRACT,
			"ai_execution_trace_card_chrome_token": AI_PANEL_EXECUTION_TRACE_CARD_CHROME_TOKEN,
			"ai_execution_trace_phase": phase,
			"ai_execution_trace_stagger_index": trace_card_index,
			"ai_execution_trace_motion_mode": "phase_chip_stagger_v1",
			"ai_activity_identity_chip": {
				"token": UI_COMPONENT_FACTORY.ai_activity_identity_chip_token(),
				"surface": "ai_panel",
				"node_prefix": "AIPanelAiActivityIdentity",
				"trace_id": str(trace.get("traceId", trace.get("trace_id", trace.get("reportId", "")))).strip_edges(),
				"trace_count": execution_trace_items.size(),
				"phase_label": _format_ai_execution_trace_phase(phase),
				"status_dot": _format_ai_execution_trace_tone(phase),
				"task_text": task_text,
			},
		})
		trace_card_index += 1
	return cards

func _format_ai_latest_execution_trace_summary(execution_trace_items: Array) -> String:
	if execution_trace_items.is_empty() or not (execution_trace_items[0] is Dictionary):
		return "暂无执行流"
	var trace: Dictionary = execution_trace_items[0] as Dictionary
	var task_text := _format_ai_display_copy(str(trace.get("currentTaskText", trace.get("title", ""))).strip_edges())
	if task_text == "":
		task_text = _format_ai_action_label(str(trace.get("action", "unknown")).strip_edges())
	return "%s / %s" % [_format_ai_execution_trace_phase(str(trace.get("phase", "")).strip_edges()), task_text]


func _resolve_first_ai_execution_trace_id(execution_trace_items: Array) -> String:
	for trace_variant in execution_trace_items:
		if not (trace_variant is Dictionary):
			continue
		var trace: Dictionary = trace_variant as Dictionary
		var trace_id := str(trace.get("traceId", trace.get("trace_id", trace.get("reportId", "")))).strip_edges()
		if trace_id != "":
			return trace_id
	return ""


func _format_ai_execution_trace_phase(phase: String) -> String:
	match phase:
		"completed":
			return "已完成"
		"failed":
			return "未完成"
		"skipped":
			return "暂缓"
		"active":
			return "进行中"
		_:
			return "待回报"

func _format_ai_execution_trace_source(source_kind: String) -> String:
	match source_kind:
		"autonomous_combat":
			return "战斗自主"
		"autonomous_development":
			return "发育自主"
		"governed_proposal":
			return "提案回执"
		_:
			return "AI行动"

func _format_ai_execution_trace_tone(phase: String) -> String:
	match phase:
		"completed":
			return "green"
		"failed":
			return "red"
		"skipped":
			return "gold"
		"active":
			return "blue"
		_:
			return "neutral"

func _format_ai_execution_trace_marker(trace: Dictionary) -> String:
	var marker_variant: Variant = trace.get("marker", {})
	if marker_variant is Dictionary:
		var marker: Dictionary = marker_variant as Dictionary
		var label := _format_ai_display_copy(str(marker.get("label", "")).strip_edges())
		if label != "":
			return label
		var marker_tile_id := str(marker.get("tileId", "")).strip_edges()
		if marker_tile_id != "":
			return _format_ai_tile_display_label(marker_tile_id)
	var target_tile_id := str(trace.get("targetTileId", "")).strip_edges()
	return _format_ai_tile_display_label(target_tile_id) if target_tile_id != "" else ""

func _build_ai_battle_report_cards(battle_report_items: Array) -> Array:
	var cards: Array = []
	for report_variant in battle_report_items.slice(0, min(battle_report_items.size(), 2)):
		if not (report_variant is Dictionary):
			continue
		var report: Dictionary = report_variant as Dictionary
		var tile_id := str(report.get("tileId", "未知地块")).strip_edges()
		var severity := str(report.get("severity", "unknown")).strip_edges()
		cards.append({
			"title": "最近军情",
			"value": _format_ai_battle_report_outcome(report),
			"meta": "%s / %s" % [_format_ai_risk_label(severity), _format_ai_tile_display_label(tile_id)],
			"description": "军情：%s。损伤：%s。主意：%s" % [
				_format_ai_battle_report_perspective(report),
				_format_ai_battle_report_damage(report),
				_format_ai_display_copy(str(report.get("nextStepSuggestion", "等待军情建议。"))),
			],
			"tone": "gold" if severity == "high" else "blue" if severity == "medium" else "green",
		})
	if not cards.is_empty():
		return cards
	return [{
		"title": "最近军情",
		"value": "无",
		"meta": "没有新的损伤",
		"description": "",
		"tone": "neutral",
	}]

func _format_ai_battle_report_summary(battle_report_items: Array) -> String:
	if battle_report_items.is_empty() or not (battle_report_items[0] is Dictionary):
		return "无军情"
	var report: Dictionary = battle_report_items[0] as Dictionary
	return "%s / %s" % [
		_format_ai_battle_report_outcome(report),
		_format_ai_battle_report_perspective(report),
	]

func _format_ai_autonomous_combat_daily_summary(summary: Dictionary) -> String:
	if summary.is_empty():
		return ""
	if str(summary.get("itemKind", "")).strip_edges() != "ai_autonomous_combat_daily_summary":
		return ""
	var text := str(summary.get("summary", summary.get("result", ""))).strip_edges()
	if text == "":
		text = str(summary.get("title", "")).strip_edges()
	for forbidden in ["proposalId", "worldAction", "MCP", "tool", "approve", "execute", "JSON"]:
		text = text.replace(forbidden, "")
	return text.strip_edges()

func _format_ai_autonomous_combat_daily_summary_field(summary: Dictionary, field_name: String) -> String:
	if summary.is_empty():
		return ""
	if str(summary.get("itemKind", "")).strip_edges() != "ai_autonomous_combat_daily_summary":
		return ""
	var text := str(summary.get(field_name, "")).strip_edges()
	for forbidden in ["proposalId", "worldAction", "MCP", "tool", "approve", "execute", "JSON"]:
		text = text.replace(forbidden, "")
	return text.strip_edges()

func _build_ai_autonomous_combat_daily_summary_cards(summary: Dictionary) -> Array:
	var cards: Array = []
	var fields := [
		{"field": "rallyCampaignMemory", "title": "同盟战役", "meta": "集结记忆"},
		{"field": "diplomacyPosture", "title": "外交态势", "meta": "关系判断"},
		{"field": "crossDayRecap", "title": "跨日复盘", "meta": "战线接力"},
	]
	for field_variant in fields:
		var field: Dictionary = field_variant as Dictionary
		var value := _format_ai_autonomous_combat_daily_summary_field(summary, str(field.get("field", "")))
		if value == "":
			continue
		cards.append({
			"title": str(field.get("title", "")).strip_edges(),
			"value": value,
			"meta": str(field.get("meta", "")).strip_edges(),
			"description": "后端自然语言结果",
			"tone": "blue",
		})
	return cards

func _format_ai_battle_report_damage_summary(battle_report_items: Array) -> String:
	if battle_report_items.is_empty() or not (battle_report_items[0] is Dictionary):
		return "无损伤"
	return _format_ai_battle_report_damage(battle_report_items[0] as Dictionary)

func _format_ai_battle_report_suggestion(battle_report_items: Array) -> String:
	if battle_report_items.is_empty() or not (battle_report_items[0] is Dictionary):
		return "无主意"
	var suggestion := str((battle_report_items[0] as Dictionary).get("nextStepSuggestion", "")).strip_edges()
	return _format_ai_display_copy(suggestion) if suggestion != "" else "等军情主意。"

func _resolve_ai_battle_report_next_action(battle_report_items: Array) -> String:
	if battle_report_items.is_empty() or not (battle_report_items[0] is Dictionary):
		return "无"
	var report: Dictionary = battle_report_items[0] as Dictionary
	var suggestion := str(report.get("nextStepSuggestion", "")).strip_edges().to_lower()
	var outcome := str(report.get("outcome", "")).strip_edges()
	var severity := str(report.get("severity", "")).strip_edges()
	if outcome == "loss" or severity == "high" or suggestion.find("补兵") >= 0 or suggestion.find("heal") >= 0:
		return "troop_heal"
	if suggestion.find("tile_occupy") >= 0 or suggestion.find("占地") >= 0:
		return "tile_occupy"
	if suggestion.find("resource_gather") >= 0 or suggestion.find("采集") >= 0:
		return "resource_gather"
	return "march_move"

func _format_ai_battle_report_outcome(report: Dictionary) -> String:
	var outcome := str(report.get("outcome", "unknown")).strip_edges()
	match outcome:
		"win":
			return "胜利"
		"loss":
			return "失败"
		"draw":
			return "平局"
		_:
			return "未知"

func _format_ai_battle_report_perspective(report: Dictionary) -> String:
	var perspective := str(report.get("perspective", "")).strip_edges()
	var unit_id := str(report.get("attackerUnitId", "")).strip_edges()
	var tile_id := str(report.get("tileId", "")).strip_edges()
	var perspective_label := "我方进攻" if perspective == "attacker" else "附近战斗" if perspective == "nearby" else "相关战斗"
	return "%s / 部队 %s / 地块 %s" % [
		perspective_label,
		"我方部队" if unit_id != "" else "未知",
		_format_ai_tile_display_label(tile_id) if tile_id != "" else "未知",
	]

func _format_ai_battle_report_damage(report: Dictionary) -> String:
	return "我方 %s / 敌方 %s" % [
		_format_optional_number(report.get("ownLoss", null)),
		_format_optional_number(report.get("enemyLoss", null)),
	]

func _format_optional_number(value: Variant) -> String:
	if value is int or value is float:
		return str(int(value))
	return "未知"

func _build_ai_context_document_cards(ai_player_runtimes: Array) -> Array:
	var cards: Array = []
	for runtime_variant in ai_player_runtimes.slice(0, min(ai_player_runtimes.size(), 2)):
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var documents: Array = runtime.get("contextDocuments", []) as Array
		for document_variant in documents.slice(0, min(documents.size(), 4)):
			if not (document_variant is Dictionary):
				continue
			var document: Dictionary = document_variant as Dictionary
			var title := str(document.get("title", "未命名档案")).strip_edges()
			var kind := str(document.get("kind", "identity")).strip_edges()
			var source_file_name := str(document.get("sourceFileName", "")).strip_edges()
			var source_label := "导入设定" if source_file_name != "" else "手动设定"
			cards.append({
				"title": title,
				"value": _format_context_document_kind(kind),
				"meta": source_label,
				"description": "",
				"tone": "blue",
			})
	if not cards.is_empty():
		return cards
	return [{
		"title": "档案",
		"value": "无",
		"meta": "身份 / 记忆",
		"description": "",
		"tone": "neutral",
	}]

func _build_governor_inbox_cards(governor_resource_inboxes: Dictionary) -> Array:
	var cards: Array = []
	for governor_id_variant in governor_resource_inboxes.keys():
		var governor_id := str(governor_id_variant).strip_edges()
		if governor_id == "":
			continue
		var inbox_variant: Variant = governor_resource_inboxes.get(governor_id, {})
		if not (inbox_variant is Dictionary):
			continue
		var inbox: Dictionary = inbox_variant as Dictionary
		var pending_transfers: Array = inbox.get("pendingTransfers", []) as Array
		var total_pending: Dictionary = inbox.get("totalPendingResources", {}) as Dictionary
		cards.append({
			"title": "待领资源",
			"value": _format_resource_bundle(total_pending),
			"meta": "待领 %s" % str(pending_transfers.size()),
			"description": "",
			"tone": "gold",
		})
	if not cards.is_empty():
		return cards
	return [{
		"title": "待领资源",
		"value": "无待领",
		"meta": "待领记录",
		"description": "",
		"tone": "neutral",
	}]

func _build_ai_player_detail_lines(
	ai_player_runtimes: Array,
	receipt_items: Array,
	proposal_items: Array,
	resource_accounts: Dictionary,
	governor_resource_inboxes: Dictionary,
	development_plan: Dictionary,
	battle_report_items: Array,
	updated_at: String,
	error_text: String
) -> Array:
	var lines: Array = [
		"AI玩家：%s" % str(ai_player_runtimes.size()),
		"状态：%s" % _format_ai_player_model_summary(ai_player_runtimes),
		"需处理：%s" % _format_ai_failure_display_text(_format_ai_player_failure_summary(ai_player_runtimes, proposal_items, receipt_items, error_text)),
		"待确认：%s 件 / 最近 %s" % [
			str(_count_actionable_ai_proposals(proposal_items)),
			_format_ai_player_latest_proposal(proposal_items),
		],
		"仓库：%s / %s" % [str(resource_accounts.size()), _format_ai_resource_accounts_summary(resource_accounts)],
		"待领资源：%s" % _format_governor_inbox_summary(governor_resource_inboxes),
		"成长路线：%s" % _format_ai_development_goal_summary(development_plan),
		"现在可做：可做 %s 件 / 需处理 %s" % [
			str(_count_ai_development_ready_actions(development_plan)),
			_format_ai_development_risk_summary(development_plan),
		],
		"军情：%s" % _format_ai_battle_report_summary(battle_report_items),
		"损伤：%s" % _format_ai_battle_report_damage_summary(battle_report_items),
		"主意：%s" % _format_ai_battle_report_suggestion(battle_report_items),
		"近况：%s" % ("已整理" if updated_at.strip_edges() != "" else "待整理"),
	]
	if error_text.strip_edges() != "":
		lines.append("最近问题：%s" % error_text.strip_edges())
	for runtime_variant in ai_player_runtimes.slice(0, min(ai_player_runtimes.size(), 3)):
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var ai_player_id := _read_runtime_ai_player_id(runtime)
		var list_card := _read_runtime_list_card(runtime)
		var display_name := _read_runtime_display_name(runtime, list_card, ai_player_id)
		var resource_transfer: Dictionary = runtime.get("resourceTransfer", {}) as Dictionary
		var remaining_text := str(resource_transfer.get("remainingQuotaTotal", resource_transfer.get("remainingAmount", ""))).strip_edges()
		var cooldown_text := str(resource_transfer.get("cooldownRemainingTicks", "")).strip_edges()
		var blocked_text := str(resource_transfer.get("blockedBy", "没有")).strip_edges()
		if remaining_text == "" or remaining_text == "unknown":
			remaining_text = "未标"
		if cooldown_text == "" or cooldown_text == "unknown":
			cooldown_text = "不用等"
		if blocked_text == "" or blocked_text == "unknown" or blocked_text == "none":
			blocked_text = "没有"
		lines.append("%s：完成 %s / 可交 %s / 冷却 %s / 需处理 %s" % [
			display_name if display_name != "" else "AI玩家",
			str((runtime.get("proposalStats", {}) as Dictionary).get("executedCount", 0)),
			remaining_text,
			cooldown_text,
			blocked_text,
		])
	if receipt_items.is_empty():
		lines.append("结果：无")
	else:
		for receipt_variant in receipt_items.slice(0, min(receipt_items.size(), 3)):
			if receipt_variant is Dictionary:
				lines.append("结果：%s" % _format_receipt_summary(receipt_variant as Dictionary))
	return lines

func _format_ai_action_label(action: String) -> String:
	match action:
		"resource_transfer_to_governor":
			return "交资源"
		"transferFactionResourcesToGovernor":
			return "交资源"
		"resource_gather":
			return "采集"
		"gatherAiResourceTile":
			return "采集"
		"tile_occupy", "occupyTile":
			return "占地"
		"troop_heal", "healTroop":
			return "整补部队"
		"march_move":
			return "行军"
		"battle_report_read":
			return "看军情"
		"tactical_skill_upgrade", "upgradeTacticalSkill":
			return "战法升级"
		"hero_star_upgrade", "upgradeHeroStar":
			return "武将升星"
		"building_upgrade", "promoteCityBuilding":
			return "建筑升级"
		"reward_claim":
			return "领取奖励"
		"claimReward":
			return "领取奖励"
		"formation_assign":
			return "调整部队编组"
		"recruit_commander":
			return "招募武将"
		"troop_train":
			return "征兵"
		_:
			return "待处理" if action != "" else "未标记动作"

func _format_ai_tile_display_label(tile_id: String) -> String:
	var normalized := tile_id.strip_edges()
	if normalized == "" or normalized == "未知地块":
		return "未知地块"
	if normalized.begins_with("tile_") or normalized.begins_with("grid_"):
		return "目标地块"
	return _format_ai_display_copy(normalized)

func _contains_ascii_letter(text: String) -> bool:
	for index in range(text.length()):
		var code := text.unicode_at(index)
		if (code >= 65 and code <= 90) or (code >= 97 and code <= 122):
			return true
	return false

func _is_ai_direct_hero_level_action(action: String) -> bool:
	var normalized := action.strip_edges()
	return normalized == "hero_level_upgrade" or normalized == "upgradeHeroLevel"

func _format_ai_action_target_summary(action: String, payload: Dictionary) -> String:
	var args: Dictionary = payload.get("proposalArgs", payload.get("args", {})) as Dictionary
	var unit_id := str(payload.get("targetUnitId", args.get("unitId", ""))).strip_edges()
	var tile_id := str(payload.get("targetTileId", args.get("targetTileId", args.get("tileId", "")))).strip_edges()
	var hero_id := str(payload.get("heroId", args.get("heroId", ""))).strip_edges()
	var skill_id := str(payload.get("skillId", args.get("skillId", ""))).strip_edges()
	var city_id := str(payload.get("cityId", args.get("cityId", ""))).strip_edges()
	var group_id := str(payload.get("groupId", args.get("groupId", ""))).strip_edges()
	var building_id := str(payload.get("buildingId", args.get("buildingId", ""))).strip_edges()
	match action:
		"march_move":
			return "部队 %s -> 地块 %s" % [
				unit_id if unit_id != "" else "自动选择",
				_format_ai_tile_display_label(tile_id) if tile_id != "" else "待选择",
			]
		"tile_occupy":
			return "部队 %s -> 占地 %s" % [
				unit_id if unit_id != "" else "自动选择",
				_format_ai_tile_display_label(tile_id) if tile_id != "" else "待选择",
			]
		"resource_gather":
			return "部队 %s -> 资源地 %s" % [
				unit_id if unit_id != "" else "自动选择",
				_format_ai_tile_display_label(tile_id) if tile_id != "" else "待选择",
			]
		"troop_heal":
			return "整补部队 %s" % (unit_id if unit_id != "" else str(args.get("unitId", "自动选择")).strip_edges())
		"tactical_skill_upgrade":
			return "武将 %s -> 战法 %s" % [
				"已选" if hero_id != "" else "待选择",
				"已选" if skill_id != "" else "待选择",
			]
		"hero_star_upgrade":
			return "武将 %s -> 升星" % ("已选" if hero_id != "" else "待选择")
		"building_upgrade":
			var building_target := building_id if building_id != "" else group_id
			return "城池 %s -> 建筑 %s" % [
				city_id if city_id != "" else "主城",
				building_target if building_target != "" else "待选择",
			]
		_:
			if tile_id != "":
				return "地块 %s" % _format_ai_tile_display_label(tile_id)
			if unit_id != "":
				return "部队已选"
			return ""

func _format_ai_action_priority_text(action: Dictionary) -> String:
	var score_text := str(action.get("priorityScore", "")).strip_edges()
	var reason := str(action.get("priorityReason", "")).strip_edges()
	if score_text != "":
		return "优先 %s：%s" % [score_text, reason] if reason != "" else "优先 %s" % score_text
	return reason

func _read_runtime_ai_player_id(runtime: Dictionary) -> String:
	return str(runtime.get("aiPlayerId", runtime.get("id", ""))).strip_edges()

func _format_ai_player_latest_receipt(ai_player_runtimes: Array, receipt_items: Array) -> String:
	if not receipt_items.is_empty() and receipt_items[0] is Dictionary:
		return _format_receipt_summary(receipt_items[0] as Dictionary)
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var latest_receipt: Dictionary = runtime.get("latestReceipt", {}) as Dictionary
		if not latest_receipt.is_empty():
			return _format_receipt_summary(latest_receipt)
	return "无结果"

func _read_receipt_string(receipt_payload: Dictionary, fallback_receipt: Dictionary, camel_key: String, snake_key: String) -> String:
	var text := str(receipt_payload.get(camel_key, receipt_payload.get(snake_key, fallback_receipt.get(camel_key, fallback_receipt.get(snake_key, ""))))).strip_edges()
	if text != "":
		return text
	var world_receipt_variant: Variant = fallback_receipt.get("worldReceipt", fallback_receipt.get("world_receipt", {}))
	if world_receipt_variant is Dictionary:
		var world_receipt: Dictionary = world_receipt_variant as Dictionary
		return str(world_receipt.get(camel_key, world_receipt.get(snake_key, ""))).strip_edges()
	return ""

func _resolve_maritime_activity_chip_id(receipt_items: Array, action_receipt: Dictionary) -> String:
	for receipt_variant in receipt_items:
		if not (receipt_variant is Dictionary):
			continue
		var receipt: Dictionary = receipt_variant as Dictionary
		var receipt_payload := receipt
		var world_receipt_variant: Variant = receipt.get("worldReceipt", receipt.get("world_receipt", {}))
		if world_receipt_variant is Dictionary and not (world_receipt_variant as Dictionary).is_empty():
			receipt_payload = world_receipt_variant as Dictionary
		var chip_id := _read_receipt_string(receipt_payload, receipt, "maritimeActivityChipId", "maritime_activity_chip_id")
		if chip_id == "maritime_activity_chip_v1":
			return chip_id
		var result_chip_id := _read_receipt_string(receipt_payload, receipt, "maritimeReportResultChipId", "maritime_report_result_chip_id")
		if result_chip_id == "maritime_report_result_chip_v1":
			return "maritime_activity_chip_v1"
	if not action_receipt.is_empty():
		var direct_chip_id := _read_receipt_string(action_receipt, action_receipt, "maritimeActivityChipId", "maritime_activity_chip_id")
		if direct_chip_id == "maritime_activity_chip_v1":
			return direct_chip_id
		var direct_result_chip_id := _read_receipt_string(action_receipt, action_receipt, "maritimeReportResultChipId", "maritime_report_result_chip_id")
		if direct_result_chip_id == "maritime_report_result_chip_v1":
			return "maritime_activity_chip_v1"
	return ""

func _format_ai_player_latest_proposal(proposal_items: Array) -> String:
	if proposal_items.is_empty() or not (proposal_items[0] is Dictionary):
		return "无待确认"
	for proposal_variant in proposal_items:
		if not (proposal_variant is Dictionary):
			continue
		var proposal: Dictionary = proposal_variant as Dictionary
		var action := str(proposal.get("action", "unknown")).strip_edges()
		if _is_ai_direct_hero_level_action(action):
			continue
		return _format_ai_action_label(action)
	return "无待确认"

func _count_actionable_ai_proposals(proposal_items: Array) -> int:
	var count := 0
	for proposal_variant in proposal_items:
		if not (proposal_variant is Dictionary):
			continue
		var proposal: Dictionary = proposal_variant as Dictionary
		var action := str(proposal.get("action", "")).strip_edges()
		if _is_ai_direct_hero_level_action(action):
			continue
		var status := str(proposal.get("status", "")).strip_edges()
		if status == "pending_approval" or status == "approved":
			count += 1
	return count

func _count_candidate_actions(ai_player_runtimes: Array, action_catalog: Array) -> int:
	var catalog_actions := {}
	for catalog_variant in action_catalog:
		if catalog_variant is Dictionary:
			var catalog_entry: Dictionary = catalog_variant as Dictionary
			var catalog_action := str(catalog_entry.get("action", "")).strip_edges()
			if catalog_action != "":
				catalog_actions[catalog_action] = true
	var count := 0
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var action_whitelist: Array = runtime.get("actionWhitelist", []) as Array
		for action_variant in action_whitelist:
			var action_id := str(action_variant).strip_edges()
			if _is_ai_direct_hero_level_action(action_id):
				continue
			if action_id != "" and (catalog_actions.is_empty() or catalog_actions.has(action_id)):
				count += 1
	return count

func _count_ai_development_ready_actions(development_plan: Dictionary) -> int:
	var count := 0
	var actions: Array = development_plan.get("candidateActions", []) as Array
	for action_variant in actions:
		if not (action_variant is Dictionary):
			continue
		var action: Dictionary = action_variant as Dictionary
		if _is_ai_direct_hero_level_action(str(action.get("action", "")).strip_edges()):
			continue
		if str(action.get("readiness", "")).strip_edges() == "ready":
			count += 1
	return count

func _format_ai_development_goal_summary(development_plan: Dictionary) -> String:
	var goal: Dictionary = development_plan.get("goal", {}) as Dictionary
	if goal.is_empty():
		return "无路线"
	var current_points := int(goal.get("currentDevelopmentPoints", 0))
	var target_points := int(goal.get("targetDevelopmentPoints", 4000))
	var remaining_points := int(goal.get("remainingDevelopmentPoints", max(0, target_points - current_points)))
	return "已到 %s / 目标 %s / 还差 %s" % [str(current_points), str(target_points), str(remaining_points)]

func _format_ai_development_risk_summary(development_plan: Dictionary) -> String:
	var risks: Array = development_plan.get("riskItems", []) as Array
	if risks.is_empty():
		return "无"
	var blocker_count := 0
	var warning_count := 0
	for risk_variant in risks:
		if not (risk_variant is Dictionary):
			continue
		var severity := str((risk_variant as Dictionary).get("severity", "")).strip_edges()
		if severity == "blocker":
			blocker_count += 1
		elif severity == "warning":
			warning_count += 1
	return "需处理 %s / 提醒 %s" % [str(blocker_count), str(warning_count)]

func _count_ai_context_documents(ai_player_runtimes: Array) -> int:
	var count := 0
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var documents: Array = runtime.get("contextDocuments", []) as Array
		count += documents.size()
	return count

func _resolve_primary_ai_player_avatar_field(ai_player_runtimes: Array, primary_ai_player_id: String, field_name: String) -> String:
	var normalized_primary_id := primary_ai_player_id.strip_edges()
	var normalized_field := field_name.strip_edges()
	if normalized_field == "":
		return ""
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var runtime_id := _read_runtime_ai_player_id(runtime)
		if normalized_primary_id != "" and runtime_id != normalized_primary_id:
			continue
		return str(runtime.get(normalized_field, "")).strip_edges()
	return ""

func _format_ai_context_document_summary(ai_player_runtimes: Array) -> String:
	var titles: Array[String] = []
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var documents: Array = runtime.get("contextDocuments", []) as Array
		for document_variant in documents:
			if not (document_variant is Dictionary):
				continue
			var document: Dictionary = document_variant as Dictionary
			var title := str(document.get("title", "")).strip_edges()
			if title != "":
				titles.append(title)
			if titles.size() >= 2:
				break
		if titles.size() >= 2:
			break
	if titles.is_empty():
		return "暂未添加"
	return "、".join(titles)

func _format_context_document_kind(kind: String) -> String:
	match kind:
		"identity":
			return "身份"
		"memory":
			return "记忆"
		"skill":
			return "技能"
		"image":
			return "图片"
		"instruction":
			return "指令"
		_:
			return kind if kind != "" else "身份"

func _read_primary_ai_player_runtime(ai_player_runtimes: Array) -> Dictionary:
	if ai_player_runtimes.is_empty() or not (ai_player_runtimes[0] is Dictionary):
		return {}
	return ai_player_runtimes[0] as Dictionary

func _read_runtime_model_status(runtime: Dictionary) -> Dictionary:
	var model_status_value: Variant = runtime.get("modelStatus", {})
	if model_status_value is Dictionary:
		return model_status_value as Dictionary
	return {}

func _read_model_status_text(model_status: Dictionary, keys: Array, fallback_text: String) -> String:
	for key_variant in keys:
		var key := str(key_variant).strip_edges()
		if key == "" or not model_status.has(key):
			continue
		var value_text := str(model_status.get(key, "")).strip_edges()
		if value_text != "":
			return value_text
	return fallback_text

func _format_ai_player_model_name(ai_player_runtimes: Array) -> String:
	var runtime := _read_primary_ai_player_runtime(ai_player_runtimes)
	if runtime.is_empty():
		return "未接通"
	return _format_single_runtime_model_name(runtime)

func _format_single_runtime_model_name(runtime: Dictionary) -> String:
	var model_status := _read_runtime_model_status(runtime)
	if model_status.is_empty():
		return "未接通"
	var model_name := _read_model_status_text(model_status, ["activeModel", "modelName", "model", "targetModel"], "")
	return model_name if model_name != "" else "未接通"

func _format_ai_model_name_for_player(model_name: String) -> String:
	var normalized := model_name.strip_edges()
	if normalized == "" or normalized == "待同步" or normalized == "待入席":
		return "未接通"
	if _contains_ascii_letter(normalized) or normalized.find("/") >= 0 or normalized.find(":") >= 0:
		return "已接通"
	return normalized

func _format_ai_player_model_source_label(ai_player_runtimes: Array) -> String:
	var runtime := _read_primary_ai_player_runtime(ai_player_runtimes)
	if runtime.is_empty():
		return "待接通"
	return _format_single_runtime_model_source_label(runtime)

func _format_single_runtime_model_source_label(runtime: Dictionary) -> String:
	var model_status := _read_runtime_model_status(runtime)
	if model_status.is_empty():
		return "待接通"
	var source := _read_model_status_text(model_status, ["source", "modelSource", "activeProvider", "provider", "providerId"], "")
	match source:
		"default":
			return "默认接入"
		"env":
			return "系统接入"
		"faction_config":
			return "势力接入"
		"player_config":
			return "玩家接入"
		"fallback":
			return "保底接入"
		"":
			return "待接通"
		_:
			return "系统接入"

func _format_ai_player_key_status(ai_player_runtimes: Array) -> String:
	var runtime := _read_primary_ai_player_runtime(ai_player_runtimes)
	if runtime.is_empty():
		return "未接通"
	return _format_single_runtime_model_secret_status(runtime)

func _format_single_runtime_model_secret_status(runtime: Dictionary) -> String:
	var model_status := _read_runtime_model_status(runtime)
	if model_status.is_empty():
		return "未接通"
	for key_variant in ["secretConfigured", "hasSecret", "hasApiKey"]:
		var key := str(key_variant)
		if model_status.has(key):
			return "已配置" if bool(model_status.get(key, false)) else "未配置"
	return "未接通"

func _format_ai_player_model_fallback_status(ai_player_runtimes: Array) -> String:
	var runtime := _read_primary_ai_player_runtime(ai_player_runtimes)
	if runtime.is_empty():
		return "未启用"
	return _format_single_runtime_model_fallback_status(runtime)

func _format_ai_player_model_fallback_short(ai_player_runtimes: Array) -> String:
	var status := _format_ai_player_model_fallback_status(ai_player_runtimes)
	if status.begins_with("已启用"):
		return "已开启"
	if status == "保底可用":
		return "已开启"
	if status == "未触发":
		return "待命"
	if status == "待同步" or status == "待入席":
		return "未启用"
	return "待命" if _contains_ascii_letter(status) else status

func _format_ai_player_model_fallback_display(fallback_status: String) -> String:
	return "已准备" if fallback_status == "已开启" else fallback_status

func _format_ai_player_model_fallback_meta(fallback_value: String) -> String:
	match fallback_value.strip_edges():
		"已准备":
			return "需处理时启用"
		"待命":
			return "需处理时启用"
		"未启用":
			return ""
		_:
			return "保底状态"

func _format_single_runtime_model_fallback_status(runtime: Dictionary) -> String:
	var model_status := _read_runtime_model_status(runtime)
	if model_status.is_empty():
		return "未启用"
	if model_status.has("fallbackEnabled"):
		if bool(model_status.get("fallbackEnabled", false)):
			var fallback_model := str(model_status.get("fallbackModel", "")).strip_edges()
			return "保底可用" if fallback_model == "" or fallback_model == "<null>" else "保底可用"
		var last_reason := str(model_status.get("lastFallbackReason", "")).strip_edges()
		return "未触发" if last_reason == "" or last_reason == "<null>" else "未触发，上次失败 %s" % last_reason
	for key_variant in ["fallbackStatus", "fallbackState", "fallback", "fallbackActive"]:
		var key := str(key_variant)
		if not model_status.has(key):
			continue
		var value: Variant = model_status.get(key)
		if value is bool:
			return "已启用" if bool(value) else "未触发"
		var status := str(value).strip_edges()
		match status:
			"active", "enabled", "fallback":
				return "已启用"
			"inactive", "none", "disabled", "off":
				return "未触发"
			"":
				continue
			_:
				return "待命"
	return "未启用"

func _format_runtime_status_label(status: String) -> String:
	match status:
		"active":
			return "在线"
		"paused":
			return "暂停"
		"disabled":
			return "停用"
		"":
			return "未上阵"
		_:
			return "未上阵"

func _format_ai_player_budget_summary(ai_player_runtimes: Array, resource_accounts: Dictionary, governor_resource_inboxes: Dictionary, execution_budget_summary: String) -> String:
	var transfer_budget := _format_primary_transfer_budget(ai_player_runtimes)
	var pending_transfer_count := _count_pending_governor_transfers(governor_resource_inboxes)
	return "%s；输送 %s；仓库 %s；待领 %s" % [
		_format_execution_budget_player_text(execution_budget_summary),
		transfer_budget,
		_format_ai_resource_accounts_summary(resource_accounts),
		str(pending_transfer_count),
	]

func _format_execution_budget_player_text(execution_budget_summary: String) -> String:
	var normalized := execution_budget_summary.strip_edges()
	if normalized == "" or normalized == "AP unknown / food unknown":
		return "行动点待定"
	if normalized == "normal":
		return "可继续"
	return normalized.replace("AP", "行动点").replace("Food", "粮草").replace("food", "粮草").replace("unknown", "待定")

func _format_primary_transfer_budget(ai_player_runtimes: Array) -> String:
	if ai_player_runtimes.is_empty() or not (ai_player_runtimes[0] is Dictionary):
		return "暂不可交"
	var runtime: Dictionary = ai_player_runtimes[0] as Dictionary
	var resource_transfer: Dictionary = runtime.get("resourceTransfer", {}) as Dictionary
	if resource_transfer.is_empty():
		return "暂不可交"
	var remaining := str(resource_transfer.get("remainingQuotaTotal", "")).strip_edges()
	var cooldown := str(resource_transfer.get("cooldownRemainingTicks", "")).strip_edges()
	var blocked_by := str(resource_transfer.get("blockedBy", "")).strip_edges()
	var can_transfer := bool(resource_transfer.get("canTransferNow", false))
	if can_transfer:
		if remaining != "":
			return "现在可交 %s" % remaining
		return "现在可交"
	if blocked_by != "":
		if cooldown != "":
			return "%s，还要等 %s 回合" % [_format_failure_to_player_text(blocked_by), cooldown]
		return _format_failure_to_player_text(blocked_by)
	if remaining != "":
		return "暂不能交，可用 %s" % remaining
	return "暂不能交"

func _format_model_budget_text(ai_player_runtimes: Array) -> String:
	var runtime := _read_primary_ai_player_runtime(ai_player_runtimes)
	if runtime.is_empty():
		return "未接通"
	return _format_single_runtime_model_budget_text(runtime)

func _format_ai_budget_player_state(budget_label: String) -> String:
	match budget_label.strip_edges():
		"建议余量", "还能问":
			return "还能问"
		"行动余量", "可看行动":
			return "可看行动"
		"余量关闭", "暂时别问":
			return "暂时别问"
		"待同步", "待入席", "未接通":
			return "未接通"
		_:
			return budget_label

func _format_ai_source_player_state(source_label: String) -> String:
	match source_label.strip_edges():
		"待同步", "待连接", "待接通":
			return "待接通"
		"默认接入", "系统接入", "势力接入", "玩家接入", "备用接入", "兜底接入", "保底接入", "后手通道":
			return "已接通"
		_:
			return "已接通" if source_label.strip_edges() != "" else "待接通"

func _format_ai_confirm_player_state(ai_player_runtimes: Array) -> String:
	if ai_player_runtimes.is_empty():
		return "未上阵"
	return "待你点头"

func _format_single_runtime_model_budget_text(runtime: Dictionary) -> String:
	var model_status := _read_runtime_model_status(runtime)
	if model_status.is_empty():
		return "未接通"
	var budget_tier := _read_model_status_text(model_status, ["budgetTier", "budget", "budgetClass"], "")
	if budget_tier == "":
		return "未接通"
	match budget_tier:
		"strict_action":
			return "可看行动"
		"economy_chat":
			return "还能问"
		"disabled":
			return "暂时别问"
		_:
			return "待评估"

func _format_pending_transfer_budget(governor_resource_inboxes: Dictionary) -> String:
	var pending_count := _count_pending_governor_transfers(governor_resource_inboxes)
	if pending_count <= 0:
		return "无待领"
	return "待领 %s 笔" % str(pending_count)

func _format_action_readiness_label(readiness: String) -> String:
	match readiness:
		"ready":
			return "可处理"
		"needs_target":
			return "需要玩家选目标"
		"blocked":
			return "暂不可用"
		"":
			return "待评估"
		_:
			return "待评估"

func _format_ai_action_player_reason(action: String, raw_reason: String) -> String:
	match action:
		"resource_transfer_to_governor":
			return "交给主城"
		"resource_gather":
			return "补资源"
		"tile_occupy":
			return "扩控制"
		"troop_heal":
			return "补兵力"
		"march_move":
			return "换位置"
		"battle_report_read":
			return "看结果"
		_:
			var reason := raw_reason.strip_edges()
			if reason == "":
				return "根据当前局势给出的主意。"
			if reason.find("_") >= 0 or reason.find("{") >= 0 or reason.find("}") >= 0:
				return "根据当前局势给出的主意。"
			return _format_ai_display_copy(reason) if reason.length() < 36 else "根据当前局势给出的主意。"

func _format_ai_player_blockers(blockers: Array) -> String:
	var labels: Array[String] = []
	for blocker_variant in blockers.slice(0, min(blockers.size(), 3)):
		var blocker := str(blocker_variant).strip_edges()
		if blocker == "":
			continue
		labels.append(_format_ai_player_blocker_label(blocker))
	return "、".join(labels) if not labels.is_empty() else "等待条件满足"

func _format_ai_player_blocker_label(blocker: String) -> String:
	match blocker:
		"no_assigned_unit":
			return "没有可派出的部队"
		"action_not_whitelisted":
			return "该行动尚未开放"
		"missing_target", "target_required", "no_target_tile":
			return "需要先选目标"
		"insufficient_resource", "insufficient_resources":
			return "资源不足"
		"action_points_insufficient", "insufficient_action_points":
			return "行动点不足"
		"cooldown_active", "transfer_cooldown_active":
			return "仍在冷却"
		_:
			return "条件未满足"

func _format_ai_risk_label(risk_level: String) -> String:
	match risk_level.strip_edges():
		"low":
			return "轻微"
		"medium":
			return "注意"
		"high":
			return "严重"
		"unknown", "":
			return "待评估"
		_:
			return "待评估"

func _format_ai_action_approval_result(action: String) -> String:
	match action:
		"resource_transfer_to_governor":
			return "资源送到主城，等你领取"
		"resource_gather":
			return "资源进仓"
		"tile_occupy":
			return "目标地块改为我方控制"
		"troop_heal":
			return "部队恢复兵力和补给"
		"march_move":
			return "部队移动到目标地块"
		"battle_report_read":
			return "更新军情主意"
		"reward_claim":
			return "领取奖励"
		"formation_assign":
			return "更新部队编组"
		"recruit_commander":
			return "发起武将招募"
		"troop_train":
			return "补充兵力"
		_:
			return "等待正式处理"

func _format_failure_to_player_text(failure: String) -> String:
	var normalized := _normalize_failure_code_value(failure)
	match normalized:
		"", "none", "暂无失败":
			return "无失败"
		"approval_required":
			return "需要玩家批准"
		"transfer_cooldown_active":
			return "资源输送还在冷却"
		"daily_quota_exceeded":
			return "今日资源输送额度已用完"
		"insufficient_resource", "insufficient_resources":
			return "资源不足"
		"insufficient_materials":
			return "材料不足"
		"unit_already_full":
			return "部队已经满状态"
		"skill_not_equipped":
			return "战法未装备"
		"missing_skill_level":
			return "战法等级缺失"
		"skill_level_out_of_range":
			return "战法等级越界"
		"skill_level_at_max":
			return "战法已满级"
		"building_level_at_max":
			return "建筑已满级"
		"prerequisite_not_met":
			return "前置条件未满足"
		"construction_queue_occupied":
			return "建造队列忙碌"
		"hero_star_at_max":
			return "武将星级已满"
		"action_points_insufficient", "insufficient_action_points":
			return "行动点不足"
		"missing_target", "target_required":
			return "需要先选择目标"
		"invalid_target":
			return "目标不符合处理条件"
		"no_assigned_unit":
			return "没有可派出的部队"
		"action_not_whitelisted":
			return "该行动尚未开放"
		_:
			return "需处理"

func _normalize_failure_code_value(raw_value: Variant) -> String:
	if raw_value == null:
		return ""
	var normalized := str(raw_value).strip_edges()
	if normalized == "" or normalized == "<null>" or normalized.to_lower() == "null":
		return ""
	return normalized

func _is_ai_failure_clear(failure_text: String) -> bool:
	var normalized := _normalize_failure_code_value(failure_text)
	return normalized == "" or normalized == "none" or normalized == "暂无失败" or normalized == "无失败"

func _format_ai_failure_display_text(failure_text: String) -> String:
	if _is_ai_failure_clear(failure_text):
		return "没卡住"
	return _format_failure_to_player_text(failure_text)

func _format_ai_player_next_step_summary(development_plan: Dictionary, battle_report_items: Array, failure_summary: String) -> String:
	var failure_text := _format_failure_to_player_text(failure_summary)
	if failure_text == "需要玩家批准":
		return "有待确认待定"
	if failure_text == "行动点不足" or failure_text == "资源不足":
		return "先等资源或选低消耗待确认"
	if failure_text == "资源输送还在冷却":
		return "等待冷却后再输送资源"
	var actions: Array = development_plan.get("candidateActions", []) as Array
	for action_variant in actions:
		if not (action_variant is Dictionary):
			continue
		var action: Dictionary = action_variant as Dictionary
		if str(action.get("readiness", "")).strip_edges() != "ready":
			continue
		var action_id := str(action.get("action", "")).strip_edges()
		if _is_ai_direct_hero_level_action(action_id):
			continue
		if action_id != "":
			return "先处理：%s" % _format_ai_action_label(action_id)
	var battle_suggestion := _format_ai_battle_report_suggestion(battle_report_items)
	if battle_suggestion != "暂无建议" and battle_suggestion != "等待军情建议。" and battle_suggestion != "无建议" and battle_suggestion != "无主意" and battle_suggestion != "等军情主意。":
		return battle_suggestion
	if development_plan.is_empty():
		return "等新的军情主意"
	return "先看需处理"

func _format_ai_proposal_status_label(status: String) -> String:
	match status.strip_edges():
		"pending_approval":
			return "待定"
		"approved":
			return "已定"
		"executed":
			return "已完成"
		"rejected":
			return "未通过"
		"failed":
			return "未完成"
		"":
			return "待回报"
		_:
			return "待回报"

func _format_ai_player_model_summary(ai_player_runtimes: Array) -> String:
	return "问话：%s / 接通：%s / 主意：%s / 出手：%s / 保底：%s" % [
		"可用" if not ai_player_runtimes.is_empty() else "未接通",
		_format_ai_source_player_state(_format_ai_player_model_source_label(ai_player_runtimes)),
		_format_ai_budget_player_state(_format_model_budget_text(ai_player_runtimes)),
		_format_ai_confirm_player_state(ai_player_runtimes),
		_format_ai_player_model_fallback_display(_format_ai_player_model_fallback_short(ai_player_runtimes)),
	]

func _format_ai_player_model_access_summary(ai_player_runtimes: Array) -> String:
	return _format_ai_player_model_summary(ai_player_runtimes)

func _format_ai_player_failure_summary(ai_player_runtimes: Array, proposal_items: Array, receipt_items: Array, error_text: String) -> String:
	var normalized_error := error_text.strip_edges()
	if normalized_error != "":
		return _format_failure_to_player_text(normalized_error)
	for proposal_variant in proposal_items:
		if proposal_variant is Dictionary:
			var proposal: Dictionary = proposal_variant as Dictionary
			var rejection_reason := str(proposal.get("rejectionReason", "")).strip_edges()
			if rejection_reason != "":
				return rejection_reason
	for receipt_variant in receipt_items:
		if receipt_variant is Dictionary:
			var receipt: Dictionary = receipt_variant as Dictionary
			var failure_code := _normalize_failure_code_value(receipt.get("failureCode", ""))
			if failure_code != "":
				return failure_code
	for runtime_variant in ai_player_runtimes:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var latest_receipt: Dictionary = runtime.get("latestReceipt", {}) as Dictionary
		var receipt_failure := _normalize_failure_code_value(latest_receipt.get("failureCode", ""))
		if receipt_failure != "":
			return receipt_failure
		var observability: Dictionary = runtime.get("observability", {}) as Dictionary
		var last_failure: Dictionary = observability.get("lastFailure", {}) as Dictionary
		var observed_failure := _normalize_failure_code_value(last_failure.get("failureCode", last_failure.get("message", "")))
		if observed_failure != "":
			return observed_failure
	return "无失败"

func _format_receipt_summary(receipt: Dictionary) -> String:
	if receipt.is_empty():
		return "无结果"
	var receipt_payload := receipt
	var world_receipt_variant: Variant = receipt.get("worldReceipt", receipt.get("world_receipt", {}))
	if world_receipt_variant is Dictionary and not (world_receipt_variant as Dictionary).is_empty():
		receipt_payload = world_receipt_variant as Dictionary
	var world_action := str(receipt_payload.get("action", receipt_payload.get("worldAction", receipt.get("worldAction", receipt.get("source_action", "none"))))).strip_edges()
	var action_text := _format_ai_action_label(world_action) if world_action != "" and world_action != "none" else "未记录动作"
	var ok_text := "已完成" if bool(receipt_payload.get("ok", receipt_payload.get("success", receipt.get("ok", receipt.get("success", false))))) else "未完成"
	var parts: Array[String] = [action_text, ok_text]
	var hero_variant: Variant = receipt_payload.get("hero", {})
	var hero_name := ""
	if hero_variant is Dictionary:
		var hero: Dictionary = hero_variant as Dictionary
		hero_name = str(hero.get("name", hero.get("displayName", ""))).strip_edges()
	var previous_level := _format_receipt_value(receipt_payload.get("previousLevel", receipt_payload.get("previous_level", "")))
	var next_level := _format_receipt_value(receipt_payload.get("nextLevel", receipt_payload.get("next_level", "")))
	if previous_level != "" or next_level != "":
		parts.append("%sLv.%s->%s" % [
			"%s " % hero_name if hero_name != "" else "",
			previous_level if previous_level != "" else "?",
			next_level if next_level != "" else "?",
		])
	var previous_exp := _format_receipt_value(receipt_payload.get("previousExp", receipt_payload.get("previous_exp", "")))
	var next_exp := _format_receipt_value(receipt_payload.get("nextExp", receipt_payload.get("next_exp", "")))
	var exp_gained := _format_receipt_value(receipt_payload.get("expGained", receipt_payload.get("exp_gained", "")))
	if exp_gained != "" or previous_exp != "" or next_exp != "":
		parts.append("%s经验 +%s %s->%s" % [
			"%s " % hero_name if hero_name != "" else "",
			exp_gained if exp_gained != "" else "?",
			previous_exp if previous_exp != "" else "?",
			next_exp if next_exp != "" else "?",
		])
	var resources_spent_variant: Variant = receipt_payload.get("resourcesSpent", receipt_payload.get("resources_spent", {}))
	if resources_spent_variant is Dictionary and not (resources_spent_variant as Dictionary).is_empty():
		parts.append("消耗 %s" % _format_resource_bundle(resources_spent_variant as Dictionary))
	var read_model_refresh_variant: Variant = receipt_payload.get("readModelRefresh", receipt_payload.get("read_model_refresh", {}))
	if read_model_refresh_variant is Dictionary and not (read_model_refresh_variant as Dictionary).is_empty():
		var read_model_refresh: Dictionary = read_model_refresh_variant as Dictionary
		var refresh_endpoint := str(read_model_refresh.get("endpoint", "")).strip_edges()
		var refresh_strategy := str(read_model_refresh.get("strategy", "")).strip_edges()
		if refresh_endpoint != "":
			parts.append("结果已同步")
		elif refresh_strategy != "":
			parts.append("结果已同步")
	var failure_code := _normalize_failure_code_value(receipt_payload.get("failureCode", receipt_payload.get("failure_code", receipt.get("failureCode", receipt.get("failure_code", "")))))
	if failure_code != "" and failure_code != "none":
		parts.append(_format_failure_to_player_text(failure_code))
	return " / ".join(parts)

func _format_receipt_value(raw_value: Variant) -> String:
	var text := str(raw_value).strip_edges()
	if text == "" or text == "<null>" or text == "null":
		return ""
	return text

func _format_ai_resource_accounts_summary(resource_accounts: Dictionary) -> String:
	if resource_accounts.is_empty():
		return "无资源"
	var summaries: Array[String] = []
	for ai_player_id_variant in resource_accounts.keys():
		var ai_player_id := str(ai_player_id_variant).strip_edges()
		var account_variant: Variant = resource_accounts.get(ai_player_id, {})
		if not (account_variant is Dictionary):
			continue
		var account: Dictionary = account_variant as Dictionary
		var display_name := str(account.get("displayName", account.get("name", ""))).strip_edges()
		if display_name == "" or display_name == "AI玩家资源":
			display_name = "仓库"
		summaries.append("%s %s" % [display_name, _format_resource_bundle(account.get("resources", {}) as Dictionary)])
	return " | ".join(summaries.slice(0, min(summaries.size(), 2))) if not summaries.is_empty() else "无资源"

func _format_governor_inbox_summary(governor_resource_inboxes: Dictionary) -> String:
	var pending_count := _count_pending_governor_transfers(governor_resource_inboxes)
	if pending_count <= 0:
		return "无待领"
	for governor_id_variant in governor_resource_inboxes.keys():
		var governor_id := str(governor_id_variant).strip_edges()
		var inbox_variant: Variant = governor_resource_inboxes.get(governor_id, {})
		if not (inbox_variant is Dictionary):
			continue
		var inbox: Dictionary = inbox_variant as Dictionary
		var pending: Array = inbox.get("pendingTransfers", []) as Array
		if pending.is_empty():
			continue
		return "待领 %s 笔 / %s" % [
			str(pending.size()),
			_format_resource_bundle(inbox.get("totalPendingResources", {}) as Dictionary),
		]
	return "待领 %s 笔" % str(pending_count)

func _count_pending_governor_transfers(governor_resource_inboxes: Dictionary) -> int:
	var count := 0
	for inbox_variant in governor_resource_inboxes.values():
		if not (inbox_variant is Dictionary):
			continue
		var inbox: Dictionary = inbox_variant as Dictionary
		var pending: Array = inbox.get("pendingTransfers", []) as Array
		count += pending.size()
	return count

func _format_resource_bundle(resources: Dictionary) -> String:
	if resources.is_empty():
		return "粮草 0 / 木材 0 / 石料 0 / 铁矿 0"
	var base := "粮草 %s / 木材 %s / 石料 %s / 铁矿 %s" % [
		str(int(resources.get("food", 0))),
		str(int(resources.get("wood", 0))),
		str(int(resources.get("stone", 0))),
		str(int(resources.get("iron", 0))),
	]
	var copper := int(resources.get("copper", 0))
	var extras: Array[String] = []
	if copper > 0:
		extras.append("铜钱 %s" % str(copper))
	var action_points := int(resources.get("actionPoints", resources.get("action_points", 0)))
	if action_points > 0:
		extras.append("行动点 %s" % str(action_points))
	var development_points := int(resources.get("developmentPoints", resources.get("development_points", 0)))
	if development_points > 0:
		extras.append("建设点 %s" % str(development_points))
	return "%s / %s" % [base, " / ".join(extras)] if not extras.is_empty() else base

func _format_pending_transfer_ids(pending_transfers: Array) -> String:
	if pending_transfers.is_empty():
		return "无待领。"
	var ids: Array[String] = []
	for transfer_variant in pending_transfers.slice(0, min(pending_transfers.size(), 3)):
		if not (transfer_variant is Dictionary):
			continue
		var transfer: Dictionary = transfer_variant as Dictionary
		var transfer_id := str(transfer.get("id", "")).strip_edges()
		if transfer_id != "":
			ids.append(transfer_id)
	return "待领：%s" % ", ".join(ids) if not ids.is_empty() else "有待领。"

func _resolve_agenda_options(agenda: Dictionary) -> Array:
	var options: Array = agenda.get("options", []) as Array
	if not options.is_empty():
		return _normalize_agenda_options(options, agenda.get("recommendedFollowups", []) as Array)
	var candidates: Array = agenda.get("candidates", []) as Array
	var fallback_followups: Array = agenda.get("recommendedFollowups", []) as Array
	var fallback_options: Array = []
	for candidate_variant in candidates:
		if not (candidate_variant is Dictionary):
			continue
		var candidate: Dictionary = candidate_variant as Dictionary
		var supporting_ai_player_ids: Array = candidate.get("supportingAiPlayerIds", []) as Array
		fallback_options.append({
			"actionId": str(candidate.get("actionId", "")).strip_edges(),
			"intent": str(candidate.get("intent", candidate.get("actionId", ""))).strip_edges(),
			"label": str(candidate.get("summary", "")).strip_edges(),
			"summary": str(candidate.get("summary", "")).strip_edges(),
			"priority": str(candidate.get("priority", "P2")).strip_edges(),
			"targetTileId": str(candidate.get("targetTileId", "")).strip_edges(),
			"targetUnitIds": candidate.get("targetUnitIds", []) as Array,
			"supportingAiPlayerIds": supporting_ai_player_ids,
			"evidenceRefs": candidate.get("evidenceRefs", []) as Array,
			"supportCount": supporting_ai_player_ids.size(),
			"recommendedFollowups": candidate.get("recommendedFollowups", fallback_followups) as Array,
		})
	return fallback_options

func _normalize_agenda_options(options: Array, fallback_followups: Array) -> Array:
	var normalized_options: Array = []
	for option_variant in options:
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		var supporting_ai_player_ids: Array = option.get("supportingAiPlayerIds", []) as Array
		normalized_options.append({
			"actionId": str(option.get("actionId", "")).strip_edges(),
			"intent": str(option.get("intent", option.get("actionId", ""))).strip_edges(),
			"label": str(option.get("label", option.get("summary", ""))).strip_edges(),
			"summary": str(option.get("summary", option.get("label", ""))).strip_edges(),
			"priority": str(option.get("priority", "P2")).strip_edges(),
			"targetTileId": str(option.get("targetTileId", "")).strip_edges(),
			"targetUnitIds": option.get("targetUnitIds", []) as Array,
			"supportingAiPlayerIds": supporting_ai_player_ids,
			"evidenceRefs": option.get("evidenceRefs", []) as Array,
			"supportCount": int(option.get("supportCount", supporting_ai_player_ids.size())),
			"recommendedFollowups": option.get("recommendedFollowups", fallback_followups) as Array,
		})
	return normalized_options

func _agenda_option_detail(agenda_options: Array) -> String:
	if agenda_options.is_empty() or not (agenda_options[0] is Dictionary):
		return "无"
	var option: Dictionary = agenda_options[0] as Dictionary
	var label_text := str(option.get("label", option.get("summary", "未命名"))).strip_edges()
	var priority := str(option.get("priority", "P2")).strip_edges()
	var support_count := int(option.get("supportCount", 0))
	var target_tile_id := str(option.get("targetTileId", "")).strip_edges()
	var summary := str(option.get("summary", label_text)).strip_edges()
	var target_suffix := " / %s" % _format_ai_tile_display_label(target_tile_id) if target_tile_id != "" else ""
	var summary_suffix := " / %s" % summary if summary != "" else ""
	return "%s / %s / %s票%s%s" % [
		label_text if label_text != "" else "未命名",
		priority,
		str(support_count),
		target_suffix,
		summary_suffix,
	]

func _join_target_units(target_unit_ids: Array) -> String:
	if target_unit_ids.is_empty():
		return "未定位"
	return ",".join(target_unit_ids.slice(0, min(target_unit_ids.size(), 3)))

func _join_string_array(items: Array, separator: String = ",") -> String:
	var normalized: Array[String] = []
	for item in items:
		var text := str(item).strip_edges()
		if text != "":
			normalized.append(text)
	return separator.join(normalized)

func _resolve_primary_agenda_target_unit_id(agenda: Dictionary) -> String:
	var target_unit_ids: Array = agenda.get("targetUnitIds", []) as Array
	var direct_target := _first_target_unit_id(target_unit_ids)
	if direct_target != "":
		return direct_target
	var agenda_options: Array = _resolve_agenda_options(agenda)
	for option_variant in agenda_options:
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		var option_target := _first_target_unit_id(option.get("targetUnitIds", []) as Array)
		if option_target != "":
			return option_target
	return ""


func _first_target_unit_id(target_unit_ids: Array) -> String:
	for target_unit_id in target_unit_ids:
		var normalized_target_unit_id := str(target_unit_id).strip_edges()
		if normalized_target_unit_id != "":
			return normalized_target_unit_id
	return ""

func _resolve_agenda_link_hint(agenda: Dictionary, target_unit_id: String) -> String:
	var source := str(agenda.get("source", "")).strip_edges()
	if source == "authoritative_action":
		return "完成后先复核部队和同盟协同。"
	if target_unit_id != "":
		return "先看部队 %s，再按需要跳同盟 / 内政。" % target_unit_id
	return "先看内政，再根据路线判断是否转同盟。"

func _format_agenda_source_for_player(source: String) -> String:
	match source.strip_edges():
		"", "domain":
			return "局势判断"
		"authoritative_action":
			return "行动主意"
		"authoritative_world":
			return "天下局势"
		"ai_player":
			return "AI玩家主意"
		_:
			return "局势判断"

func _format_agenda_mode_for_player(mode: String) -> String:
	match mode.strip_edges():
		"", "authoritative_world":
			return "自动整理"
		"authoritative_action":
			return "行动主意"
		"approval_required":
			return "待你点头"
		_:
			return "待你点头"

func _build_runtime_receipt_lines(runtime_context: Dictionary) -> Array:
	var last_action := str(runtime_context.get("last_action", "none")).strip_edges()
	var last_status := str(runtime_context.get("last_action_status", "idle")).strip_edges()
	var last_tick := str(runtime_context.get("last_action_tick", "unknown")).strip_edges()
	var action_receipt := WorldStore.get_ai_action_receipt(_target_faction_id)
	var lines := [
		"最近结果：%s / %s" % [_format_runtime_action_for_player(last_action), _format_runtime_status_for_player(last_status)],
		"结果回合：%s" % (last_tick if last_tick != "" and last_tick != "unknown" else "无"),
	]
	var request_id := _resolve_execution_request_id(
		WorldStore.get_resolved_ai_agenda(_target_faction_id),
		WorldStore.get_resolved_ai_execution(_target_faction_id),
		action_receipt
	)
	if request_id != "尚未提交":
		lines.append("请求已提交")
	var failure_code := _resolve_failure_code(action_receipt)
	if failure_code != "none":
		lines.append("需处理：%s" % _format_failure_to_player_text(failure_code))
	var receipt_message := _resolve_receipt_message(action_receipt)
	if receipt_message != "none":
		lines.append("结果说明：%s" % receipt_message)
	return lines

func _format_runtime_action_for_player(action_id: String) -> String:
	var normalized := action_id.strip_edges()
	if normalized == "" or normalized == "none":
		return "无行动"
	if normalized.contains("ai_players_refresh"):
		return "更新AI玩家"
	if normalized.contains("ai_player") and normalized.contains("proposal_create"):
		return "整理AI玩家主意"
	if normalized.contains("ai_player_transfer_proposal_create"):
		return "安排资源交接"
	if normalized.contains("battle_report"):
		return "处理军情"
	if normalized.contains("/"):
		var parts := normalized.split("/", false)
		if not parts.is_empty():
			return _format_runtime_action_for_player(str(parts[parts.size() - 1]))
	return "处理行动" if _contains_ascii_letter(normalized) else normalized

func _format_runtime_status_for_player(status: String) -> String:
	var normalized := status.strip_edges()
	match normalized:
		"", "idle":
			return "待命"
		"refreshed", "updated", "selected":
			return "已完成"
		"rejected", "failed":
			return "未完成"
		_:
			return "待命"

func _resolve_execution_request_id(agenda: Dictionary, execution_state: Dictionary, action_receipt: Dictionary) -> String:
	var request_id := str(action_receipt.get("request_id", "")).strip_edges()
	if request_id == "":
		request_id = str(execution_state.get("requestId", "")).strip_edges()
	if request_id == "":
		request_id = str(agenda.get("executionRequestId", "")).strip_edges()
	return request_id if request_id != "" else "尚未提交"

func _resolve_execution_status(execution_state: Dictionary, action_receipt: Dictionary) -> String:
	var execution_status := str(execution_state.get("status", "")).strip_edges()
	if execution_status == "":
		execution_status = str(action_receipt.get("execution_status", "")).strip_edges()
	return execution_status if execution_status != "" else "idle"

func _format_execution_queue_summary(execution_state: Dictionary) -> String:
	return "可执行 %s / 排队 %s / 进行中 %s" % [
		str(int(execution_state.get("activeOrderCount", 0))),
		str(int(execution_state.get("queuedOrderCount", 0))),
		str(int(execution_state.get("runningOrderCount", 0))),
	]

func _format_execution_budget_summary(execution_state: Dictionary) -> String:
	var action_points: Variant = execution_state.get("actionPointsRemaining", null)
	var food_remaining: Variant = execution_state.get("foodRemaining", null)
	var action_points_label := "待定"
	var food_label := "待定"
	if action_points is int or action_points is float:
		action_points_label = str(int(action_points))
	if food_remaining is int or food_remaining is float:
		food_label = str(int(food_remaining))
	return "行动点 %s / 粮草 %s" % [action_points_label, food_label]

func _resolve_failure_code(action_receipt: Dictionary) -> String:
	var failure_code := _normalize_failure_code_value(action_receipt.get("failure_code", action_receipt.get("failureCode", "")))
	return failure_code if failure_code != "" else "none"

func _resolve_receipt_message(action_receipt: Dictionary) -> String:
	var receipt_message := str(action_receipt.get("message", "")).strip_edges()
	return receipt_message if receipt_message != "" else "none"

func _autonomy_status(current_level: String, candidate_level: String) -> String:
	return "当前选择" if current_level == candidate_level else "可切换"

func _focus_status(current_focus_id: String, candidate_focus_id: String) -> String:
	return "当前焦点" if current_focus_id == candidate_focus_id else "可切换"

func _focus_label(focus_id: String) -> String:
	match focus_id:
		"focus_troop":
			return "部队压力"
		"focus_alliance":
			return "同盟协作"
		_:
			return "主城态势"


func _format_context_related_id(context_focus_id: String, context_related_id: String) -> String:
	var normalized_related_id := context_related_id.strip_edges()
	if normalized_related_id == "":
		return "未定位"
	if context_focus_id == "focus_alliance":
		var alliance_name := str((_world_data.get("alliance", {}) as Dictionary).get("name", "")).strip_edges()
		var region_name := _read_region_name(normalized_related_id)
		if region_name != "":
			return region_name
		if alliance_name != "":
			return alliance_name
	return "相关目标"


func _read_region_name(region_id: String) -> String:
	var map_data: Dictionary = _world_data.get("map", {}) as Dictionary
	var regions: Array = map_data.get("regions", []) as Array
	for region_variant in regions:
		if not (region_variant is Dictionary):
			continue
		var region: Dictionary = region_variant as Dictionary
		if str(region.get("id", "")).strip_edges() == region_id.strip_edges():
			return str(region.get("name", "")).strip_edges()
	return ""


func _read_target_faction_state() -> Dictionary:
	var raw_factions: Variant = _world_data.get("factions", {})
	if raw_factions is Dictionary and _target_faction_id != "":
		var faction_state: Variant = (raw_factions as Dictionary).get(_target_faction_id, {})
		if faction_state is Dictionary:
			return faction_state
	return {}

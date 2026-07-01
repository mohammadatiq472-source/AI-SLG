extends RefCounted
class_name SlgDomainActionAdapter

const SlgDomainStateAdapterScript = preload("res://scripts/app/adapters/slg_domain_state_adapter.gd")
const ALLIANCE_STANCE_IDS := ["hold", "support", "harass", "expand"]
const AI_PANEL_DIRECT_PROPOSAL_EXECUTE_ENABLED := false
const AI_PLAYER_AVATAR_UPLOAD_MAX_BYTES := 2000000

var _api_client
var _state_adapter
var _target_faction_id: String = ""
var _ai_runtime_refresh_sequence := 0
var _last_applied_ai_runtime_refresh_sequence := 0
var _last_rejected_ai_runtime_refresh_cache: Dictionary = {}

func configure(api_client, target_faction_id: String) -> void:
	_api_client = api_client
	_target_faction_id = target_faction_id.strip_edges()
	if _state_adapter == null:
		_state_adapter = SlgDomainStateAdapterScript.new()

func get_last_rejected_ai_runtime_refresh_cache() -> Dictionary:
	return _last_rejected_ai_runtime_refresh_cache.duplicate(true)

func request_troop_facility_upgrade(unit_id: String, facility_id: String, building_id: String) -> Dictionary:
	var world_action_intent := {
		"intent_id": "troop_facility_upgrade",
		"kind": "troop_facility_upgrade",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "promoteTroopFacilityBuilding",
		"include_world": true,
		"requires_map_refresh": false,
		"payload": {
			"factionId": _target_faction_id,
			"unitId": unit_id,
			"facilityId": facility_id,
			"buildingId": building_id,
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		bool(world_action_intent.get("include_world", true))
	)
	var remote_applied := bool(remote_result.get("ok", false))
	return {
		"ok": remote_applied,
		"local_item": {},
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": false,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}

func request_city_building_upgrade(city_id: String, group_id: String, building_id: String) -> Dictionary:
	var world_action_intent := {
		"intent_id": "city_building_upgrade",
		"kind": "city_building_upgrade",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "promoteCityBuilding",
		"include_world": true,
		"requires_map_refresh": false,
		"payload": {
			"factionId": _target_faction_id,
			"cityId": city_id,
			"groupId": group_id,
			"buildingId": building_id,
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		bool(world_action_intent.get("include_world", true))
	)
	var remote_applied := bool(remote_result.get("ok", false))
	return {
		"ok": remote_applied,
		"local_item": {},
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": false,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}

func request_affair_enqueue(city_id: String, affair_id: String) -> Dictionary:
	var world_action_intent := {
		"intent_id": "affair_enqueue",
		"kind": "affair_enqueue",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "enqueueAffair",
		"include_world": true,
		"requires_map_refresh": false,
		"payload": {
			"factionId": _target_faction_id,
			"cityId": city_id,
			"affairId": affair_id,
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		bool(world_action_intent.get("include_world", true))
	)
	var remote_applied := bool(remote_result.get("ok", false))
	return {
		"ok": remote_applied,
		"local_item": {},
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": false,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}

func request_select_recruit_pool(pool_id: String) -> Dictionary:
	var normalized_pool_id := pool_id.strip_edges()
	var world_action_intent := {
		"intent_id": "recruit_pool_select",
		"kind": "recruit_pool_select",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "setRecruitSelectedPool",
		"include_world": true,
		"requires_map_refresh": false,
		"payload": {
			"factionId": _target_faction_id,
			"poolId": normalized_pool_id,
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		true
	)
	var remote_applied := bool(remote_result.get("ok", false))
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": false,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}

func request_recruit_draw(draw_mode: String, pool_id: String) -> Dictionary:
	var normalized_draw_mode := draw_mode.strip_edges().to_lower()
	var normalized_pool_id := pool_id.strip_edges()
	if normalized_pool_id == "":
		var recruit_state: Dictionary = _state_adapter.get_recruit_state(_target_faction_id)
		normalized_pool_id = str(recruit_state.get("selectedPoolId", "pool_standard"))
	if normalized_pool_id == "":
		normalized_pool_id = "pool_standard"
	var count := 1 if normalized_draw_mode != "multi" else 5
	var world_action_intent := {
		"intent_id": "recruit_draw",
		"kind": "recruit_draw",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "recruitProspectHero",
		"include_world": true,
		"requires_map_refresh": false,
		"payload": {
			"factionId": _target_faction_id,
			"count": count,
			"poolId": normalized_pool_id,
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		true
	)
	var remote_applied := bool(remote_result.get("ok", false))
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": false,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}

func request_recruit_panel_action(action_id: String, tab_id: String) -> Dictionary:
	match action_id:
		"pool_standard", "pool_season", "pool_limited":
			var action_result: Dictionary = await request_select_recruit_pool(action_id)
			if not bool(action_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/recruit/%s/%s" % [tab_id, action_id],
					"record_state": "rejected",
					"runtime_label": "panel 招募 / %s / %s / rejected" % [tab_id, action_id],
				}
			return {
				"ok": true,
				"record_path": "panel/recruit/%s/%s" % [tab_id, action_id],
				"record_state": "selected",
				"runtime_label": "panel 招募 / %s / %s" % [tab_id, action_id],
				"action_result": action_result,
				"requires_finalize": true,
			}
		"draw_single", "draw_multi":
			var available_draw_count := _estimate_available_recruit_draw_count()
			if available_draw_count < 1:
				return {
					"ok": false,
					"record_path": "panel/recruit/%s/%s" % [tab_id, action_id],
					"record_state": "rejected",
					"runtime_label": "panel 招募 / %s / %s / development不足" % [tab_id, action_id],
				}
			var draw_mode := "multi" if action_id == "draw_multi" else "single"
			var pool_id := str(_state_adapter.get_recruit_state(_target_faction_id).get("selectedPoolId", "pool_standard"))
			var action_result: Dictionary = await request_recruit_draw(draw_mode, pool_id)
			if not bool(action_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/recruit/%s/%s" % [tab_id, action_id],
					"record_state": "rejected",
					"runtime_label": "panel 招募 / %s / %s / rejected" % [tab_id, action_id],
				}
			return {
				"ok": true,
				"record_path": "panel/recruit/%s/%s" % [tab_id, action_id],
				"record_state": "executed",
				"runtime_label": "panel 招募 / %s / %s" % [tab_id, action_id],
				"action_result": action_result,
				"requires_finalize": true,
				"post_open_page_id": "multi" if action_id == "draw_multi" else "single",
				"post_open_panel_id": "recruit",
			}
		"focus_latest_hero":
			var latest_hero_id := _resolve_latest_recruit_hero_id()
			if latest_hero_id == "":
				return {
					"ok": false,
					"record_path": "panel/recruit/%s/focus_latest" % tab_id,
					"record_state": "rejected",
					"runtime_label": "panel 招募 / %s / 聚焦武将 / missing_latest" % tab_id,
				}
			var focus_result: Dictionary = await request_focus_general_hero(latest_hero_id)
			if not bool(focus_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/recruit/%s/focus_latest" % tab_id,
					"record_state": "rejected",
					"runtime_label": "panel 招募 / %s / 聚焦武将 / rejected" % tab_id,
				}
			return {
				"ok": true,
				"record_path": "panel/recruit/%s/focus_latest" % tab_id,
				"record_state": "focused",
				"runtime_label": "panel 招募 / %s / 聚焦武将 / %s" % [tab_id, latest_hero_id],
				"action_result": focus_result,
				"requires_finalize": true,
				"post_open_page_id": "profile",
				"post_open_panel_id": "generals",
			}
		"deploy_latest_hero":
			var latest_hero_id_for_deploy := _resolve_latest_recruit_hero_id()
			var home_tile_id := _resolve_home_tile_id()
			if latest_hero_id_for_deploy == "" or home_tile_id == "":
				return {
					"ok": false,
					"record_path": "panel/recruit/%s/deploy_latest" % tab_id,
					"record_state": "rejected",
					"runtime_label": "panel 招募 / %s / 编组最新武将 / missing_anchor" % tab_id,
				}
			var deploy_result: Dictionary = await request_deploy_general(latest_hero_id_for_deploy, home_tile_id)
			if not bool(deploy_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/recruit/%s/deploy_latest" % tab_id,
					"record_state": "rejected",
					"runtime_label": "panel 招募 / %s / 编组最新武将 / rejected" % tab_id,
				}
			return {
				"ok": true,
				"record_path": "panel/recruit/%s/deploy_latest/%s" % [tab_id, latest_hero_id_for_deploy],
				"record_state": "executed",
				"runtime_label": "panel 招募 / %s / 编组最新武将 / %s" % [tab_id, latest_hero_id_for_deploy],
				"action_result": deploy_result,
				"requires_finalize": true,
				"post_focus_general_hero_id": latest_hero_id_for_deploy,
				"post_open_panel_id": "troop",
				"post_open_runtime_state_patch": _build_troop_focus_runtime_patch(_extract_remote_unit_id(deploy_result, latest_hero_id_for_deploy)),
			}
		_:
			return {}

func request_cycle_general_active(step: int, roster_ids: Array) -> Dictionary:
	var normalized_roster: Array[String] = []
	for hero_id_variant in roster_ids:
		var hero_id := str(hero_id_variant).strip_edges()
		if hero_id != "":
			normalized_roster.append(hero_id)
	if normalized_roster.is_empty():
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("general_cycle_active", {"reason": "empty_roster"}),
		}
	var general_state: Dictionary = _state_adapter.get_general_state(_target_faction_id)
	var current_hero_id := str(general_state.get("activeHeroId", normalized_roster[0]))
	var current_index := maxi(0, normalized_roster.find(current_hero_id))
	var next_index := posmod(current_index + step, normalized_roster.size())
	return await request_focus_general_hero(normalized_roster[next_index])

func request_focus_general_hero(hero_id: String) -> Dictionary:
	var normalized_hero_id := hero_id.strip_edges()
	if normalized_hero_id == "":
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("general_focus_hero", {"reason": "missing_hero"}),
		}
	var world_action_intent := {
		"intent_id": "general_focus_hero",
		"kind": "general_focus_hero",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"backend_capable": true,
		"action_name": "setGeneralActiveHero",
		"include_world": true,
		"payload": {
			"factionId": _target_faction_id,
			"heroId": normalized_hero_id,
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		true
	)
	if not bool(remote_result.get("ok", false)):
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": remote_result,
			"world_action_intent": world_action_intent,
		}
	return {
		"ok": true,
		"heroId": normalized_hero_id,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}

func request_set_general_tactic(hero_id: String, tactic_id: String) -> Dictionary:
	var normalized_hero_id := hero_id.strip_edges()
	if normalized_hero_id == "":
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("general_set_tactic", {"reason": "missing_hero"}),
		}
	var world_action_intent := {
		"intent_id": "general_set_tactic",
		"kind": "general_set_tactic",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "setGeneralTactic",
		"include_world": true,
		"payload": {
			"factionId": _target_faction_id,
			"heroId": normalized_hero_id,
			"tacticId": tactic_id,
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		true
	)
	if not bool(remote_result.get("ok", false)):
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": remote_result,
			"world_action_intent": world_action_intent,
		}
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}

func request_general_panel_action(action_id: String, tab_id: String) -> Dictionary:
	var faction_state := _read_target_faction_state()
	var hero_command: Dictionary = faction_state.get("heroCommand", {}) as Dictionary
	var roster_ids: Array = hero_command.get("rosterHeroIds", []) as Array
	var general_state: Dictionary = _state_adapter.get_general_state(_target_faction_id)
	var active_hero_id := str(general_state.get("activeHeroId", roster_ids[0] if not roster_ids.is_empty() else ""))
	var home_tile_id := str(hero_command.get("homeTileId", ""))
	if action_id.begins_with("focus_hero:"):
		var requested_hero_id := action_id.trim_prefix("focus_hero:").strip_edges()
		var focus_result: Dictionary = await request_focus_general_hero(requested_hero_id)
		if not bool(focus_result.get("ok", false)):
			return {
				"ok": false,
				"record_path": "panel/generals/%s/focus/%s" % [tab_id, requested_hero_id],
				"record_state": "rejected",
				"runtime_label": "panel 武将 / %s / 聚焦 / %s / rejected" % [tab_id, requested_hero_id],
			}
		return {
			"ok": true,
			"record_path": "panel/generals/%s/focus/%s" % [tab_id, requested_hero_id],
			"record_state": "selected",
			"runtime_label": "panel 武将 / %s / 聚焦 / %s" % [tab_id, requested_hero_id],
			"action_result": focus_result,
			"requires_finalize": true,
			"post_open_panel_id": "generals",
			"post_open_page_id": "profile",
		}
	match action_id:
		"hero_prev":
			var previous_result: Dictionary = await request_cycle_general_active(-1, roster_ids)
			if not bool(previous_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/generals/%s/%s" % [tab_id, action_id],
					"record_state": "rejected",
					"runtime_label": "panel 武将 / %s / 上一位 / rejected" % tab_id,
				}
			return {
				"ok": true,
				"record_path": "panel/generals/%s/%s" % [tab_id, action_id],
				"record_state": "selected",
				"runtime_label": "panel 武将 / %s / 上一位" % tab_id,
				"action_result": previous_result,
				"requires_finalize": true,
			}
		"hero_next":
			var next_result: Dictionary = await request_cycle_general_active(1, roster_ids)
			if not bool(next_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/generals/%s/%s" % [tab_id, action_id],
					"record_state": "rejected",
					"runtime_label": "panel 武将 / %s / 下一位 / rejected" % tab_id,
				}
			return {
				"ok": true,
				"record_path": "panel/generals/%s/%s" % [tab_id, action_id],
				"record_state": "selected",
				"runtime_label": "panel 武将 / %s / 下一位" % tab_id,
				"action_result": next_result,
				"requires_finalize": true,
			}
		"tactic_assault", "tactic_guard", "tactic_logistics":
			var tactic_id := action_id.trim_prefix("tactic_")
			if active_hero_id == "":
				return {}
			var tactic_result: Dictionary = await request_set_general_tactic(active_hero_id, tactic_id)
			if not bool(tactic_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/generals/%s/%s" % [tab_id, tactic_id],
					"record_state": "rejected",
					"runtime_label": "panel 武将 / %s / 战法 / %s / rejected" % [tab_id, tactic_id],
				}
			return {
				"ok": true,
				"record_path": "panel/generals/%s/%s" % [tab_id, tactic_id],
				"record_state": "tactic",
				"runtime_label": "panel 武将 / %s / 战法 / %s" % [tab_id, tactic_id],
				"action_result": tactic_result,
				"requires_finalize": true,
			}
		"deploy_active":
			if active_hero_id == "":
				return {
					"ok": false,
					"record_path": "panel/generals/%s/deploy" % tab_id,
					"record_state": "rejected",
					"runtime_label": "panel 武将 / %s / 编组 / missing_hero" % tab_id,
				}
			if home_tile_id == "":
				return {
					"ok": false,
					"record_path": "panel/generals/%s/deploy" % tab_id,
					"record_state": "rejected",
					"runtime_label": "panel 武将 / %s / 编组 / missing_home_tile" % tab_id,
				}
			var action_result: Dictionary = await request_deploy_general(active_hero_id, home_tile_id)
			if not bool(action_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/generals/%s/deploy" % tab_id,
					"record_state": "rejected",
					"runtime_label": "panel 武将 / %s / 编组 / rejected" % tab_id,
				}
			return {
				"ok": true,
				"record_path": "panel/generals/%s/deploy/%s" % [tab_id, active_hero_id],
				"record_state": "executed",
				"runtime_label": "panel 武将 / %s / 编组 / %s" % [tab_id, active_hero_id],
				"action_result": action_result,
				"requires_finalize": true,
				"post_open_panel_id": "troop",
				"post_open_runtime_state_patch": _build_troop_focus_runtime_patch(_extract_remote_unit_id(action_result, active_hero_id)),
			}
		"open_active_troop":
			var active_unit_id := _find_unit_id_for_hero(active_hero_id)
			if active_unit_id == "":
				return {
					"ok": false,
					"record_path": "panel/generals/%s/troop" % tab_id,
					"record_state": "rejected",
					"runtime_label": "panel 武将 / %s / 查看部队 / missing_unit" % tab_id,
				}
			return {
				"ok": true,
				"record_path": "panel/generals/%s/troop/%s" % [tab_id, active_unit_id],
				"record_state": "opened",
				"runtime_label": "panel 武将 / %s / 查看部队 / %s" % [tab_id, active_unit_id],
				"post_open_panel_id": "troop",
				"post_open_runtime_state_patch": _build_troop_focus_runtime_patch(active_unit_id),
			}
		_:
			return {}

func request_deploy_general(hero_id: String, tile_id: String, co_hero_ids: Array = [], include_world: bool = true, options: Dictionary = {}) -> Dictionary:
	var normalized_co_hero_ids: Array[String] = []
	for co_hero_id_variant in co_hero_ids:
		var co_hero_id := str(co_hero_id_variant).strip_edges()
		if co_hero_id == "" or co_hero_id == hero_id or normalized_co_hero_ids.has(co_hero_id):
			continue
		normalized_co_hero_ids.append(co_hero_id)
		if normalized_co_hero_ids.size() >= 2:
			break
	var world_action_intent := {
		"intent_id": "general_deploy",
		"kind": "general_deploy",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "deployReserveHero",
		"include_world": include_world,
		"requires_map_refresh": not include_world,
		"payload": {
			"factionId": _target_faction_id,
			"heroId": hero_id,
			"coHeroIds": normalized_co_hero_ids,
			"tileId": tile_id,
		},
	}
	var payload: Dictionary = world_action_intent.get("payload", {}) as Dictionary
	for optional_key in ["aiPlayerId", "teamId", "teamIndex"]:
		if options.has(optional_key):
			var optional_value: Variant = options.get(optional_key)
			if optional_value is String:
				var normalized_value := str(optional_value).strip_edges()
				if normalized_value != "":
					payload[optional_key] = normalized_value
			elif optional_value != null:
				payload[optional_key] = optional_value
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		payload,
		include_world
	)
	var remote_applied := bool(remote_result.get("ok", false))
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": not include_world,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}


func request_configure_deployed_unit_formation(hero_ids: Array, include_world: bool = true, options: Dictionary = {}) -> Dictionary:
	var normalized_hero_ids: Array[String] = []
	for index in range(3):
		var hero_id := ""
		if index < hero_ids.size():
			hero_id = str(hero_ids[index]).strip_edges()
		normalized_hero_ids.append(hero_id)
	var payload := {
		"factionId": _target_faction_id,
		"heroIds": normalized_hero_ids,
	}
	for optional_key in ["unitId", "teamId", "teamIndex"]:
		if options.has(optional_key):
			var optional_value: Variant = options.get(optional_key)
			if optional_value is String:
				var normalized_value := str(optional_value).strip_edges()
				if normalized_value != "":
					payload[optional_key] = normalized_value
			elif optional_value != null:
				payload[optional_key] = optional_value
	var remote_result: Dictionary = await _run_remote_action("configureDeployedUnitFormation", payload, include_world)
	var remote_applied := bool(remote_result.get("ok", false))
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": not include_world,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": {
			"intent_id": "configure_deployed_unit_formation",
			"kind": "formation_configure",
			"authority_strategy": "authoritative_first",
			"mode": "backend_world_action",
			"channel": "backend_world_action",
			"bridge_strategy": "direct_backend_action",
			"backend_capable": true,
			"action_name": "configureDeployedUnitFormation",
			"include_world": include_world,
			"requires_map_refresh": not include_world,
			"payload": payload,
		},
	}


func request_move_unit(unit_id: String, target_tile_id: String, include_world: bool = true) -> Dictionary:
	var normalized_unit_id := unit_id.strip_edges()
	var normalized_target_tile_id := target_tile_id.strip_edges()
	if normalized_unit_id == "" or normalized_target_tile_id == "":
		return {
			"ok": false,
			"remote_attempted": false,
			"remote_applied": false,
			"error": "missing_unit_or_target",
			"world_action_intent": _build_local_only_intent("unit_move", {
				"reason": "missing_unit_or_target",
				"unit_id": normalized_unit_id,
				"target_tile_id": normalized_target_tile_id,
			}),
		}
	var world_action_intent := {
		"intent_id": "unit_move",
		"kind": "unit_move",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "moveUnit",
		"include_world": include_world,
		"requires_map_refresh": false,
		"payload": {
			"factionId": _target_faction_id,
			"unitId": normalized_unit_id,
			"targetTileId": normalized_target_tile_id,
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		include_world
	)
	var remote_applied := bool(remote_result.get("ok", false))
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": not include_world,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}


func request_alliance_directive_update(region_id: String, stance_id: String) -> Dictionary:
	var normalized_region_id := region_id.strip_edges()
	var normalized_stance_id := stance_id.strip_edges().to_lower()
	if normalized_region_id == "" or not ALLIANCE_STANCE_IDS.has(normalized_stance_id):
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("alliance_directive_update", {
				"reason": "invalid_directive_action",
				"region_id": normalized_region_id,
				"stance_id": normalized_stance_id,
			}),
		}
	var previous_world_version := int(WorldStore.world.get("worldVersion", 0))
	var world_action_intent := {
		"intent_id": "alliance_directive_update",
		"kind": "alliance_directive_update",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "updateAllianceDirective",
		"include_world": true,
		"requires_map_refresh": false,
		"payload": {
			"regionId": normalized_region_id,
			"stance": normalized_stance_id,
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		true
	)
	if not bool(remote_result.get("ok", false)):
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": remote_result,
			"world_action_intent": world_action_intent,
		}
	var remote_world: Dictionary = remote_result.get("world", {}) as Dictionary
	var remote_alliance: Dictionary = remote_world.get("alliance", {}) as Dictionary
	var directives_by_region: Dictionary = remote_alliance.get("directives", {}) as Dictionary
	var next_directive: Dictionary = directives_by_region.get(normalized_region_id, {}) as Dictionary
	var next_world_version := int(remote_world.get("worldVersion", previous_world_version))
	var effective_applied := next_world_version != previous_world_version and str(next_directive.get("stance", "")).strip_edges() == normalized_stance_id
	return {
		"ok": effective_applied,
		"remote_attempted": true,
		"remote_applied": effective_applied,
		"remote_world": remote_world,
		"remote_result": remote_result,
		"requires_map_refresh": false,
		"world_action_intent": world_action_intent,
		"no_change": not effective_applied,
	}


func request_alliance_frontline_marker_update(marker_id: String, label: String, from_cell: Dictionary, to_cell: Dictionary, note: String = "", actor_commander_id: String = "ally_west") -> Dictionary:
	var normalized_marker_id := marker_id.strip_edges()
	var normalized_label := label.strip_edges()
	var normalized_actor_commander_id := actor_commander_id.strip_edges()
	if normalized_marker_id == "" or normalized_label == "" or from_cell.is_empty() or to_cell.is_empty() or normalized_actor_commander_id == "":
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("alliance_frontline_marker_update", {
				"reason": "invalid_frontline_marker_payload",
				"marker_id": normalized_marker_id,
				"label": normalized_label,
				"actor_commander_id": normalized_actor_commander_id,
			}),
		}
	var world_action_intent := {
		"intent_id": "alliance_frontline_marker_update",
		"kind": "alliance_frontline_marker_update",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "updateAllianceFrontlineMarker",
		"include_world": false,
		"requires_map_refresh": true,
		"payload": {
			"markerId": normalized_marker_id,
			"factionId": _target_faction_id,
			"label": normalized_label,
			"fromCell": {
				"x": int(from_cell.get("x", 0)),
				"y": int(from_cell.get("y", 0)),
			},
			"toCell": {
				"x": int(to_cell.get("x", 0)),
				"y": int(to_cell.get("y", 0)),
			},
			"actorCommanderId": normalized_actor_commander_id,
			"visibility": "alliance",
		},
	}
	var normalized_note := note.strip_edges()
	if normalized_note != "":
		(world_action_intent["payload"] as Dictionary)["note"] = normalized_note
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		false
	)
	var remote_applied := bool(remote_result.get("ok", false))
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": true,
		"remote_result": remote_result,
		"world_action_intent": world_action_intent,
	}


func request_alliance_nation_found(nation_name: String, color_hex: String, capital_tile_id: String = "", actor_commander_id: String = "ally_west") -> Dictionary:
	var normalized_name := nation_name.strip_edges()
	var normalized_color := color_hex.strip_edges().to_lower()
	var normalized_capital_tile_id := capital_tile_id.strip_edges()
	var normalized_actor_commander_id := actor_commander_id.strip_edges()
	if normalized_actor_commander_id == "":
		normalized_actor_commander_id = "ally_west"
	if _target_faction_id == "" or normalized_capital_tile_id == "" or normalized_name.length() < 2 or not _is_valid_hex_color(normalized_color):
		return {
			"ok": false,
			"failure_code": "nation_found_invalid_payload",
			"world_action_intent": _build_local_only_intent("alliance_nation_found", {
				"reason": "invalid_nation_found_payload",
				"faction_id": _target_faction_id,
				"capital_tile_id": normalized_capital_tile_id,
				"nation_name": normalized_name,
				"color_hex": normalized_color,
			}),
		}
	if _api_client == null or not _api_client.has_method("post_nation_found"):
		return {
			"ok": false,
			"remote_attempted": false,
			"remote_applied": false,
			"error": "api_client_unavailable",
			"world_action_intent": _build_local_only_intent("alliance_nation_found", {
				"reason": "api_client_unavailable",
				"faction_id": _target_faction_id,
			}),
		}
	var world_action_intent := {
		"intent_id": "alliance_nation_found",
		"kind": "alliance_nation_found",
		"authority_strategy": "authoritative_first",
		"mode": "backend_nation_route",
		"channel": "nation_route",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "foundNation",
		"include_world": false,
		"requires_map_refresh": true,
		"payload": {
			"factionId": _target_faction_id,
			"actorCommanderId": normalized_actor_commander_id,
			"nationName": normalized_name,
			"color": normalized_color,
			"capitalTileId": normalized_capital_tile_id,
		},
	}
	var response: Dictionary = await _api_client.post_nation_found(
		_target_faction_id,
		normalized_name,
		normalized_color,
		normalized_capital_tile_id,
		normalized_actor_commander_id
	)
	if not bool(response.get("ok", false)):
		var response_data: Dictionary = response.get("data", {}) as Dictionary
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": response,
			"failure_code": str(response_data.get("failureCode", "")),
			"conflicting_faction_id": str(response_data.get("conflictingFactionId", "")),
			"conflicting_nation_name": str(response_data.get("conflictingNationName", "")),
			"requires_map_refresh": false,
			"world_action_intent": world_action_intent,
		}
	var data: Dictionary = response.get("data", {}) as Dictionary
	var remote_applied := bool(data.get("ok", false))
	var profiles_result: Dictionary = {}
	if remote_applied and _api_client.has_method("get_nation_profiles"):
		profiles_result = await _api_client.get_nation_profiles()
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"remote_result": response,
		"failure_code": "" if remote_applied else str(data.get("failureCode", "")),
		"conflicting_faction_id": str(data.get("conflictingFactionId", "")),
		"conflicting_nation_name": str(data.get("conflictingNationName", "")),
		"nation_profiles_result": profiles_result,
		"requires_map_refresh": remote_applied,
		"world_action_intent": world_action_intent,
	}


func request_alliance_nation_profile_update(nation_name: String = "", color_hex: String = "") -> Dictionary:
	var normalized_name := nation_name.strip_edges()
	var normalized_color := color_hex.strip_edges().to_lower()
	if _target_faction_id == "" or (normalized_name == "" and normalized_color == "") or (normalized_color != "" and not _is_valid_hex_color(normalized_color)):
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("alliance_nation_profile_update", {
				"reason": "invalid_nation_profile_update_payload",
				"faction_id": _target_faction_id,
				"nation_name": normalized_name,
				"color_hex": normalized_color,
			}),
		}
	if _api_client == null or not _api_client.has_method("post_nation_profile_update"):
		return {
			"ok": false,
			"remote_attempted": false,
			"remote_applied": false,
			"error": "api_client_unavailable",
			"world_action_intent": _build_local_only_intent("alliance_nation_profile_update", {
				"reason": "api_client_unavailable",
				"faction_id": _target_faction_id,
			}),
		}
	var payload: Dictionary = {
		"factionId": _target_faction_id,
	}
	if normalized_name != "":
		payload["nationName"] = normalized_name
	if normalized_color != "":
		payload["color"] = normalized_color
	var world_action_intent := {
		"intent_id": "alliance_nation_profile_update",
		"kind": "alliance_nation_profile_update",
		"authority_strategy": "authoritative_first",
		"mode": "backend_nation_route",
		"channel": "nation_route",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "updateNationProfile",
		"include_world": false,
		"requires_map_refresh": true,
		"payload": payload,
	}
	var response: Dictionary = await _api_client.post_nation_profile_update(_target_faction_id, normalized_name, normalized_color)
	if not bool(response.get("ok", false)):
		var response_data: Dictionary = response.get("data", {}) as Dictionary
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": response,
			"failure_code": str(response_data.get("failureCode", "")),
			"retry_after_ms": int(response_data.get("retryAfterMs", 0)),
			"conflicting_faction_id": str(response_data.get("conflictingFactionId", "")),
			"conflicting_nation_name": str(response_data.get("conflictingNationName", "")),
			"requires_map_refresh": false,
			"world_action_intent": world_action_intent,
		}
	var data: Dictionary = response.get("data", {}) as Dictionary
	var remote_applied := bool(data.get("ok", false))
	var profiles_result: Dictionary = {}
	if remote_applied and _api_client.has_method("get_nation_profiles"):
		profiles_result = await _api_client.get_nation_profiles()
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"remote_result": response,
		"failure_code": "" if remote_applied else str(data.get("failureCode", "")),
		"retry_after_ms": int(data.get("retryAfterMs", 0)),
		"conflicting_faction_id": str(data.get("conflictingFactionId", "")),
		"conflicting_nation_name": str(data.get("conflictingNationName", "")),
		"nation_profiles_result": profiles_result,
		"requires_map_refresh": remote_applied,
		"world_action_intent": world_action_intent,
	}


func request_alliance_nation_capital_migrate(capital_tile_id: String, nation_name: String, color_hex: String, actor_commander_id: String = "ally_west") -> Dictionary:
	var normalized_capital_tile_id := capital_tile_id.strip_edges()
	var normalized_name := nation_name.strip_edges()
	var normalized_color := color_hex.strip_edges().to_lower()
	var normalized_actor_commander_id := actor_commander_id.strip_edges()
	if normalized_actor_commander_id == "":
		normalized_actor_commander_id = "ally_west"
	if _target_faction_id == "" or normalized_capital_tile_id == "" or normalized_name.length() < 2 or not _is_valid_hex_color(normalized_color):
		return {
			"ok": false,
			"failure_code": "nation_capital_migration_invalid_payload",
			"world_action_intent": _build_local_only_intent("alliance_nation_capital_migration", {
				"reason": "invalid_nation_capital_migration_payload",
				"faction_id": _target_faction_id,
				"capital_tile_id": normalized_capital_tile_id,
				"nation_name": normalized_name,
				"color_hex": normalized_color,
			}),
		}
	if _api_client == null or not _api_client.has_method("post_nation_capital_migrate"):
		return {
			"ok": false,
			"remote_attempted": false,
			"remote_applied": false,
			"error": "api_client_unavailable",
			"failure_code": "nation_capital_migration_api_client_unavailable",
			"world_action_intent": _build_local_only_intent("alliance_nation_capital_migration", {
				"reason": "api_client_unavailable",
				"faction_id": _target_faction_id,
			}),
		}
	var payload: Dictionary = {
		"factionId": _target_faction_id,
		"actorCommanderId": normalized_actor_commander_id,
		"capitalTileId": normalized_capital_tile_id,
		"nationName": normalized_name,
		"color": normalized_color,
	}
	var world_action_intent := {
		"intent_id": "alliance_nation_capital_migration",
		"kind": "alliance_nation_capital_migration",
		"authority_strategy": "authoritative_first",
		"mode": "backend_nation_route",
		"channel": "nation_route",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "migrateCapital",
		"include_world": false,
		"requires_map_refresh": true,
		"payload": payload,
	}
	var response: Dictionary = await _api_client.post_nation_capital_migrate(
		_target_faction_id,
		normalized_actor_commander_id,
		normalized_capital_tile_id,
		normalized_name,
		normalized_color
	)
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	if not bool(response.get("ok", false)):
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": response,
			"failure_code": str(response_data.get("failureCode", "")),
			"retry_after_ms": int(response_data.get("retryAfterMs", 0)),
			"conflicting_faction_id": str(response_data.get("conflictingFactionId", "")),
			"conflicting_nation_name": str(response_data.get("conflictingNationName", "")),
			"cost": response_data.get("cost", {}),
			"requires_map_refresh": false,
			"world_action_intent": world_action_intent,
		}
	var remote_applied := bool(response_data.get("ok", false))
	var profiles_result: Dictionary = {}
	if remote_applied and _api_client.has_method("get_nation_profiles"):
		profiles_result = await _api_client.get_nation_profiles()
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"remote_result": response,
		"failure_code": "" if remote_applied else str(response_data.get("failureCode", "")),
		"retry_after_ms": int(response_data.get("retryAfterMs", 0)),
		"conflicting_faction_id": str(response_data.get("conflictingFactionId", "")),
		"conflicting_nation_name": str(response_data.get("conflictingNationName", "")),
		"cost": response_data.get("cost", {}),
		"nation_profiles_result": profiles_result,
		"requires_map_refresh": remote_applied,
		"world_action_intent": world_action_intent,
	}


func request_alliance_nation_empire_upgrade(actor_commander_id: String = "ally_west") -> Dictionary:
	var normalized_actor_commander_id := actor_commander_id.strip_edges()
	if normalized_actor_commander_id == "":
		normalized_actor_commander_id = "ally_west"
	if _target_faction_id == "":
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("alliance_nation_empire_upgrade", {
				"reason": "missing_faction_id",
			}),
		}
	if _api_client == null or not _api_client.has_method("post_nation_empire_upgrade"):
		return {
			"ok": false,
			"remote_attempted": false,
			"remote_applied": false,
			"error": "api_client_unavailable",
			"world_action_intent": _build_local_only_intent("alliance_nation_empire_upgrade", {
				"reason": "api_client_unavailable",
				"faction_id": _target_faction_id,
			}),
		}
	var payload: Dictionary = {
		"factionId": _target_faction_id,
		"actorCommanderId": normalized_actor_commander_id,
	}
	var world_action_intent := {
		"intent_id": "alliance_nation_empire_upgrade",
		"kind": "alliance_nation_empire_upgrade",
		"authority_strategy": "authoritative_first",
		"mode": "backend_nation_route",
		"channel": "nation_route",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "upgradeEmpire",
		"include_world": false,
		"requires_map_refresh": true,
		"payload": payload,
	}
	var response: Dictionary = await _api_client.post_nation_empire_upgrade(_target_faction_id, normalized_actor_commander_id)
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	if not bool(response.get("ok", false)):
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": response,
			"failure_code": str(response_data.get("failureCode", "")),
			"requirement": response_data.get("requirement", {}),
			"cost": response_data.get("cost", {}),
			"requires_map_refresh": false,
			"world_action_intent": world_action_intent,
		}
	var remote_applied := bool(response_data.get("ok", false))
	var profiles_result: Dictionary = {}
	if remote_applied and _api_client.has_method("get_nation_profiles"):
		profiles_result = await _api_client.get_nation_profiles()
	var nation_war_objectives_result: Dictionary = {}
	if remote_applied and _api_client.has_method("get_nation_war_objectives"):
		nation_war_objectives_result = await _api_client.get_nation_war_objectives(_target_faction_id)
	return {
		"ok": remote_applied,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"remote_result": response,
		"failure_code": "" if remote_applied else str(response_data.get("failureCode", "")),
		"requirement": response_data.get("requirement", {}),
		"cost": response_data.get("cost", {}),
		"nation_profiles_result": profiles_result,
		"nation_war_objectives_result": nation_war_objectives_result,
		"requires_map_refresh": remote_applied,
		"world_action_intent": world_action_intent,
	}


func request_alliance_panel_action(action_id: String, tab_id: String) -> Dictionary:
	var action_tokens: PackedStringArray = action_id.split("|")
	if action_tokens.size() != 3 or action_tokens[0] != "directive":
		return {}
	var region_id := str(action_tokens[1]).strip_edges()
	var stance_id := str(action_tokens[2]).strip_edges().to_lower()
	var action_result: Dictionary = await request_alliance_directive_update(region_id, stance_id)
	if not bool(action_result.get("ok", false)):
		var no_change := bool(action_result.get("no_change", false))
		return {
			"ok": false,
			"record_path": "panel/alliance/%s/directive/%s/%s" % [tab_id, region_id, stance_id],
			"record_state": "noop" if no_change else "rejected",
			"runtime_label": "panel 同盟 / %s / 指令 / %s / %s / %s" % [
				tab_id,
				region_id,
				stance_id,
				"unchanged" if no_change else "rejected",
			],
		}
	return {
		"ok": true,
		"record_path": "panel/alliance/%s/directive/%s/%s" % [tab_id, region_id, stance_id],
		"record_state": "updated",
		"runtime_label": "panel 同盟 / %s / 指令 / %s / %s" % [tab_id, region_id, stance_id],
		"action_result": action_result,
		"requires_finalize": true,
	}

func request_ai_autonomy(level: String) -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("ai_autonomy", {"reason": "api_client_unavailable"}),
		}
	var token := SessionStore.token.strip_edges()
	if token == "":
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("ai_autonomy", {"reason": "missing_session_token"}),
		}
	var response: Dictionary = await _api_client.post_session_autonomy(token, level)
	if not bool(response.get("ok", false)):
		return {
			"ok": false,
			"remote_result": response,
			"world_action_intent": {
				"intent_id": "ai_autonomy",
				"kind": "ai_autonomy",
				"authority_strategy": "authoritative_first",
				"mode": "session_route",
				"channel": "session_route",
				"backend_capable": true,
			},
		}
	var payload: Dictionary = response.get("data", {}) as Dictionary
	var control_context := WorldStore.get_resolved_ai_control_context(_target_faction_id)
	SessionStore.set_control_context(
		str(payload.get("autonomyLevel", level)),
		str(payload.get("controlMode", control_context.get("controlMode", "")))
	)
	WorldStore.set_ai_control_state(_target_faction_id, {
		"autonomyLevel": str(payload.get("autonomyLevel", level)),
		"controlMode": str(payload.get("controlMode", control_context.get("controlMode", ""))),
		"authoritySource": "session_autonomy_action",
		"sessionId": SessionStore.session_id,
		"seatId": SessionStore.seat_id,
	})
	return {
		"ok": true,
		"remote_result": response,
		"world_action_intent": {
			"intent_id": "ai_autonomy",
			"kind": "ai_autonomy",
			"authority_strategy": "authoritative_first",
			"mode": "session_route",
			"channel": "session_route",
			"backend_capable": true,
			"level": level,
		},
	}

func request_ai_agenda_preview() -> Dictionary:
	var remote_result: Dictionary = await _run_remote_action(
		"previewDomainAgenda",
		{
			"factionId": _target_faction_id,
			"includeMessages": true,
		},
		false
	)
	if not bool(remote_result.get("ok", false)):
		return {
			"ok": false,
			"remote_result": remote_result,
			"world_action_intent": _build_local_only_intent("ai_agenda_preview", {"reason": "preview_failed"}),
		}
	var data: Dictionary = remote_result.get("data", {}) as Dictionary
	var agenda: Dictionary = data.get("domainAgenda", {}) as Dictionary
	var translated_agenda := _translate_domain_agenda(
		agenda,
		int(data.get("tick", WorldStore.world.get("tick", 0))),
		int(remote_result.get("worldVersion", WorldStore.world.get("worldVersion", -1)))
	)
	translated_agenda["authorityMode"] = "preview_cache"
	_state_adapter.set_ai_agenda_preview(_target_faction_id, translated_agenda)
	return {
		"ok": true,
		"remote_result": remote_result,
		"world_action_intent": {
			"intent_id": "ai_agenda_preview",
			"kind": "ai_agenda_preview",
			"authority_strategy": "authoritative_read",
			"mode": "backend_world_action",
			"channel": "backend_world_action",
			"backend_capable": true,
		},
	}

func request_ai_context_focus(focus_id: String, extra_payload: Dictionary = {}) -> Dictionary:
	var payload: Dictionary = {
		"factionId": _target_faction_id,
		"contextFocusId": focus_id,
	}
	for key in extra_payload.keys():
		var normalized_key := str(key).strip_edges()
		if normalized_key != "":
			payload[normalized_key] = extra_payload[key]
	var world_action_intent := {
		"intent_id": "ai_context_focus",
		"kind": "ai_context_focus",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"backend_capable": true,
		"action_name": "setAiContextFocus",
		"include_world": false,
		"payload": payload,
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		false
	)
	if not bool(remote_result.get("ok", false)):
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": remote_result,
			"world_action_intent": world_action_intent,
		}
	var response_data: Dictionary = remote_result.get("data", {}) as Dictionary
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"civil_memory_entries": response_data.get("civilMemoryEntries", []),
		"world_action_intent": world_action_intent,
	}

func request_ai_agenda_execution(action_id: String) -> Dictionary:
	var world_action_intent := _build_ai_agenda_intent(action_id)
	if world_action_intent.is_empty():
		return {
			"ok": false,
			"world_action_intent": _build_local_only_intent("ai_agenda_execution", {"reason": "missing_unit_or_target", "action_id": action_id}),
		}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		true
	)
	if not bool(remote_result.get("ok", false)):
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": remote_result,
			"world_action_intent": world_action_intent,
		}
	_state_adapter.clear_ai_agenda_preview(_target_faction_id)
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"requires_map_refresh": false,
		"world_action_intent": world_action_intent,
	}

func request_ai_player_runtime_refresh() -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	_ai_runtime_refresh_sequence += 1
	var refresh_sequence := _ai_runtime_refresh_sequence
	var governor_player_id := _resolve_governor_player_id_from_state()
	var players_response: Dictionary = await _api_client.get_ai_players(_target_faction_id, true, governor_player_id)
	if not bool(players_response.get("ok", false)):
		if refresh_sequence < _last_applied_ai_runtime_refresh_sequence:
			_last_rejected_ai_runtime_refresh_cache = _build_out_of_order_ai_runtime_refresh_rejection("", refresh_sequence)
			return {
				"ok": false,
				"error": "out_of_order_ai_runtime_refresh",
				"remote_attempted": true,
				"remote_applied": false,
				"rejected_cache": _last_rejected_ai_runtime_refresh_cache.duplicate(true),
			}
		_store_ai_player_runtime_error(players_response)
		return {
			"ok": false,
			"error": "ai_players_request_failed",
			"remote_result": players_response,
		}
	var response_data := _read_ai_players_response_payload(players_response)
	var runtime_items: Array = response_data.get("items", []) as Array
	var list_summary: Dictionary = response_data.get("listSummary", {}) as Dictionary
	var autonomy_guard := _read_ai_players_autonomy_guard(response_data, runtime_items)
	var primary_ai_player_id := _read_primary_ai_player_id(runtime_items)
	if not runtime_items.is_empty():
		if not _apply_ai_player_runtime_refresh_snapshot(runtime_items, [], [], primary_ai_player_id, [], {}, {}, {}, [], list_summary, autonomy_guard, {}, [], {}, {}, {}, {}, {}, [], refresh_sequence):
			return {
				"ok": false,
				"error": "out_of_order_ai_runtime_refresh",
				"remote_attempted": true,
				"remote_applied": false,
				"rejected_cache": _last_rejected_ai_runtime_refresh_cache.duplicate(true),
			}
	var faction_model_config: Dictionary = {}
	var faction_config_response: Dictionary = await _api_client.get_faction_config(_target_faction_id)
	if bool(faction_config_response.get("ok", false)):
		var faction_config_data: Dictionary = faction_config_response.get("data", {}) as Dictionary
		var raw_model_config: Variant = faction_config_data.get("modelConfig", {})
		if raw_model_config is Dictionary:
			faction_model_config = raw_model_config as Dictionary
	var action_catalog: Array = []
	var catalog_response: Dictionary = await _api_client.get_ai_player_action_catalog()
	if bool(catalog_response.get("ok", false)):
		var catalog_data: Dictionary = catalog_response.get("data", {}) as Dictionary
		action_catalog = catalog_data.get("catalog", []) as Array
	var receipt_items: Array = []
	var proposal_items: Array = []
	var development_plan: Dictionary = {}
	var battle_report_read_model: Dictionary = {}
	var battle_report_items: Array = []
	var execution_trace_read_model: Dictionary = {}
	var execution_trace_items: Array = []
	var autonomous_combat_player_report_read_model: Dictionary = {}
	var autonomous_combat_player_report_items: Array = []
	var autonomous_combat_daily_summary: Dictionary = {}
	var autonomous_combat_campaign_archive: Dictionary = {}
	var autonomous_combat_war_room_live_refresh: Dictionary = {}
	var autonomous_combat_war_room_ui_state: Dictionary = {}
	if primary_ai_player_id != "":
		var receipts_response: Dictionary = await _api_client.get_ai_player_receipts(primary_ai_player_id, 5)
		if bool(receipts_response.get("ok", false)):
			var receipts_data: Dictionary = receipts_response.get("data", {}) as Dictionary
			receipt_items = receipts_data.get("items", []) as Array
		var proposals_response: Dictionary = await _api_client.get_ai_player_proposals(primary_ai_player_id, "", 5)
		if bool(proposals_response.get("ok", false)):
			var proposals_data: Dictionary = proposals_response.get("data", {}) as Dictionary
			proposal_items = proposals_data.get("items", []) as Array
		var development_plan_response: Dictionary = await _api_client.get_ai_player_development_plan(primary_ai_player_id, 4000)
		if bool(development_plan_response.get("ok", false)):
			development_plan = development_plan_response.get("data", {}) as Dictionary
		var battle_reports_response: Dictionary = await _api_client.get_ai_player_battle_reports(primary_ai_player_id, 5)
		if bool(battle_reports_response.get("ok", false)):
			battle_report_read_model = battle_reports_response.get("data", {}) as Dictionary
			battle_report_items = battle_report_read_model.get("items", []) as Array
		var execution_trace_response: Dictionary = await _api_client.get_ai_player_execution_trace(primary_ai_player_id, 5)
		if bool(execution_trace_response.get("ok", false)):
			execution_trace_read_model = execution_trace_response.get("data", {}) as Dictionary
			execution_trace_items = execution_trace_read_model.get("items", []) as Array
		var autonomous_combat_player_reports_response: Dictionary = await _api_client.get_ai_player_autonomous_combat_player_reports(primary_ai_player_id, 5)
		if bool(autonomous_combat_player_reports_response.get("ok", false)):
			autonomous_combat_player_report_read_model = autonomous_combat_player_reports_response.get("data", {}) as Dictionary
			autonomous_combat_player_report_items = autonomous_combat_player_report_read_model.get("items", []) as Array
		var autonomous_combat_daily_summary_response: Dictionary = await _api_client.get_ai_player_autonomous_combat_daily_summary(primary_ai_player_id, 20)
		if bool(autonomous_combat_daily_summary_response.get("ok", false)):
			var daily_summary_data: Dictionary = autonomous_combat_daily_summary_response.get("data", {}) as Dictionary
			autonomous_combat_daily_summary = daily_summary_data.get("summary", {}) as Dictionary
		var autonomous_combat_campaign_archive_response: Dictionary = await _api_client.get_ai_player_autonomous_combat_campaign_archive(primary_ai_player_id, 20)
		if bool(autonomous_combat_campaign_archive_response.get("ok", false)):
			var campaign_archive_data: Dictionary = autonomous_combat_campaign_archive_response.get("data", {}) as Dictionary
			autonomous_combat_campaign_archive = campaign_archive_data.get("archive", {}) as Dictionary
		var autonomous_combat_war_room_live_refresh_response: Dictionary = await _api_client.get_ai_player_autonomous_combat_war_room_live_refresh(primary_ai_player_id, 20, 0)
		if bool(autonomous_combat_war_room_live_refresh_response.get("ok", false)):
			var war_room_live_refresh_data: Dictionary = autonomous_combat_war_room_live_refresh_response.get("data", {}) as Dictionary
			autonomous_combat_war_room_live_refresh = war_room_live_refresh_data.get("refresh", {}) as Dictionary
		var autonomous_combat_war_room_ui_state_response: Dictionary = await _api_client.get_ai_player_autonomous_combat_war_room_ui_state(primary_ai_player_id)
		if bool(autonomous_combat_war_room_ui_state_response.get("ok", false)):
			var war_room_ui_state_data: Dictionary = autonomous_combat_war_room_ui_state_response.get("data", {}) as Dictionary
			autonomous_combat_war_room_ui_state = war_room_ui_state_data.get("uiState", {}) as Dictionary
	if not _apply_ai_player_runtime_refresh_snapshot(
		runtime_items,
		receipt_items,
		proposal_items,
		primary_ai_player_id,
		action_catalog,
		faction_model_config,
		development_plan,
		battle_report_read_model,
		battle_report_items,
		list_summary,
		autonomy_guard,
		autonomous_combat_player_report_read_model,
		autonomous_combat_player_report_items,
		autonomous_combat_daily_summary,
		autonomous_combat_campaign_archive,
		autonomous_combat_war_room_live_refresh,
		autonomous_combat_war_room_ui_state,
		execution_trace_read_model,
		execution_trace_items,
		refresh_sequence
	):
		return {
			"ok": false,
			"error": "out_of_order_ai_runtime_refresh",
			"remote_attempted": true,
			"remote_applied": false,
			"rejected_cache": _last_rejected_ai_runtime_refresh_cache.duplicate(true),
		}
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": players_response,
		"requires_map_refresh": false,
	}

func request_ai_player_war_room_live_refresh(_action_id: String = "", _page_id: String = "") -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	var current_ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var previous_refresh: Dictionary = current_ai_state.get("playerRuntimeAutonomousCombatWarRoomLiveRefresh", {}) as Dictionary
	var since_tick := int(previous_refresh.get("latestTick", 0))
	var response: Dictionary = await _api_client.get_ai_player_autonomous_combat_war_room_live_refresh(ai_player_id, 20, since_tick)
	if not bool(response.get("ok", false)):
		_store_ai_player_runtime_error(response)
		return response
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	var next_ai_state := current_ai_state.duplicate(true)
	next_ai_state["playerRuntimeAutonomousCombatWarRoomLiveRefresh"] = (response_data.get("refresh", {}) as Dictionary).duplicate(true)
	next_ai_state["playerRuntimeUpdatedAt"] = Time.get_datetime_string_from_system(false, true)
	_state_adapter.set_ai_state(_target_faction_id, next_ai_state)
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"requires_map_refresh": false,
	}

func request_ai_player_war_room_ui_state_save(action_id: String = "", _page_id: String = "") -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	var parts := action_id.split("::")
	var selected_enemy_id := ""
	var enemy_history_page := 1
	if parts.size() >= 2:
		selected_enemy_id = str(parts[1]).strip_edges()
	if parts.size() >= 3:
		enemy_history_page = maxi(1, int(str(parts[2])))
	var response: Dictionary = await _api_client.upsert_ai_player_autonomous_combat_war_room_ui_state(ai_player_id, selected_enemy_id, enemy_history_page)
	if not bool(response.get("ok", false)):
		_store_ai_player_runtime_error(response)
		return response
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	var current_ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var next_ai_state := current_ai_state.duplicate(true)
	next_ai_state["playerRuntimeAutonomousCombatWarRoomUiState"] = (response_data.get("uiState", {}) as Dictionary).duplicate(true)
	next_ai_state["playerRuntimeUpdatedAt"] = Time.get_datetime_string_from_system(false, true)
	_state_adapter.set_ai_state(_target_faction_id, next_ai_state)
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"requires_map_refresh": false,
	}

func request_ai_player_home_city_candidates() -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	var governor_player_id := _resolve_governor_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	if governor_player_id == "":
		return {
			"ok": false,
			"error": "missing_governor_player_id",
		}
	var response: Dictionary = await _api_client.get_ai_player_home_city_candidates(ai_player_id, governor_player_id)
	if not bool(response.get("ok", false)):
		_store_ai_player_runtime_error(response)
		return {
			"ok": false,
			"error": str(response.get("error", "home_city_candidates_failed")),
			"remote_result": response,
		}
	_store_ai_player_home_city_candidates(response)
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"requires_map_refresh": false,
	}

func request_ai_player_home_city_bind(center_tile_id: String) -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	var governor_player_id := _resolve_governor_player_id_from_state()
	var normalized_center_tile_id := center_tile_id.strip_edges()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	if governor_player_id == "":
		return {
			"ok": false,
			"error": "missing_governor_player_id",
		}
	if normalized_center_tile_id == "":
		return {
			"ok": false,
			"error": "missing_center_tile_id",
		}
	var bind_response: Dictionary = await _api_client.bind_ai_player_home_city(ai_player_id, normalized_center_tile_id, governor_player_id)
	if not bool(bind_response.get("ok", false)):
		_store_ai_player_runtime_error(bind_response)
		return {
			"ok": false,
			"error": str(bind_response.get("error", "home_city_bind_failed")),
			"remote_result": bind_response,
		}
	await request_ai_player_runtime_refresh()
	var entry_response: Dictionary = await _api_client.get_main_city_facility_entry(ai_player_id, governor_player_id)
	if bool(entry_response.get("ok", false)):
		_store_ai_player_main_city_facility_entry(entry_response)
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": bind_response,
		"facility_entry_result": entry_response,
		"requires_map_refresh": false,
	}

func request_ai_player_home_city_open() -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	var governor_player_id := _resolve_governor_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	if governor_player_id == "":
		return {
			"ok": false,
			"error": "missing_governor_player_id",
		}
	var entry_response: Dictionary = await _api_client.get_main_city_facility_entry(ai_player_id, governor_player_id)
	if not bool(entry_response.get("ok", false)):
		_store_ai_player_runtime_error(entry_response)
		return {
			"ok": false,
			"error": str(entry_response.get("error", "home_city_entry_failed")),
			"remote_result": entry_response,
		}
	_store_ai_player_main_city_facility_entry(entry_response)
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": entry_response,
		"requires_map_refresh": false,
	}

func request_ai_player_display_name_update(next_display_name: String = "") -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	var current_name := _resolve_ai_player_display_name(ai_player_id)
	var next_name := next_display_name.strip_edges()
	if next_name == "":
		next_name = _build_next_ai_player_display_name(ai_player_id, current_name)
	var updated_by := _resolve_governor_player_id_from_state()
	if updated_by == "":
		updated_by = "godot_ai_panel"
	var response: Dictionary = await _api_client.update_ai_player_display_name(ai_player_id, next_name, updated_by)
	if not bool(response.get("ok", false)):
		_store_ai_player_runtime_error(response)
		return {
			"ok": false,
			"error": str(response.get("error", "display_name_update_failed")),
			"remote_result": response,
		}
	await request_ai_player_runtime_refresh()
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"display_name": next_name,
		"requires_map_refresh": false,
	}

func request_ai_player_avatar_update(avatar_id: String, avatar_image_path: String) -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	var normalized_avatar_id := avatar_id.strip_edges()
	var normalized_avatar_image_path := avatar_image_path.strip_edges()
	if normalized_avatar_id == "" or normalized_avatar_image_path == "":
		return {
			"ok": false,
			"error": "missing_avatar",
		}
	var updated_by := _resolve_governor_player_id_from_state()
	if updated_by == "":
		updated_by = "godot_ai_panel"
	var response: Dictionary = await _api_client.update_ai_player_profile(
		ai_player_id,
		"",
		normalized_avatar_id,
		normalized_avatar_image_path,
		updated_by
	)
	if not bool(response.get("ok", false)):
		_store_ai_player_runtime_error(response)
		return {
			"ok": false,
			"error": str(response.get("error", "avatar_update_failed")),
			"remote_result": response,
		}
	await request_ai_player_runtime_refresh()
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"avatar_id": normalized_avatar_id,
		"avatar_image_path": normalized_avatar_image_path,
		"requires_map_refresh": false,
	}

func request_ai_player_avatar_image_upload(file_path: String, content_type: String) -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	if not _api_client.has_method("upload_ai_player_avatar_image"):
		return {
			"ok": false,
			"error": "avatar_upload_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	var normalized_file_path := file_path.strip_edges()
	if normalized_file_path == "" or not FileAccess.file_exists(normalized_file_path):
		return {
			"ok": false,
			"error": "avatar_upload_file_missing",
		}
	var normalized_content_type := content_type.strip_edges()
	if normalized_content_type not in ["image/png", "image/jpeg", "image/webp"]:
		return {
			"ok": false,
			"error": "unsupported_avatar_upload_type",
		}
	var image_bytes := FileAccess.get_file_as_bytes(normalized_file_path)
	if FileAccess.get_open_error() != OK or image_bytes.is_empty():
		return {
			"ok": false,
			"error": "avatar_upload_read_failed",
		}
	if image_bytes.size() > AI_PLAYER_AVATAR_UPLOAD_MAX_BYTES:
		return {
			"ok": false,
			"error": "avatar_upload_too_large",
		}
	var updated_by := _resolve_governor_player_id_from_state()
	if updated_by == "":
		updated_by = "godot_ai_panel"
	var image_base64 := Marshalls.raw_to_base64(image_bytes)
	var response: Dictionary = await _api_client.upload_ai_player_avatar_image(
		ai_player_id,
		image_base64,
		normalized_content_type,
		normalized_file_path.get_file(),
		updated_by
	)
	if not bool(response.get("ok", false)):
		_store_ai_player_runtime_error(response)
		return {
			"ok": false,
			"error": str(response.get("error", "avatar_upload_failed")),
			"remote_result": response,
		}
	await request_ai_player_runtime_refresh()
	var asset: Dictionary = response.get("asset", {}) as Dictionary
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"asset_id": str(asset.get("assetId", "")).strip_edges(),
		"avatar_image_path": str(asset.get("avatarImagePath", "")).strip_edges(),
		"content_type": normalized_content_type,
		"byte_size": image_bytes.size(),
		"requires_map_refresh": false,
	}

func request_ai_player_context_document_add(kind: String, title: String, content: String, source_file_name: String = "") -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	var updated_by := _resolve_governor_player_id_from_state()
	if updated_by == "":
		updated_by = "godot_ai_panel"
	var response: Dictionary = await _api_client.upsert_ai_player_context_document(
		ai_player_id,
		title,
		content,
		kind,
		updated_by,
		source_file_name
	)
	if not bool(response.get("ok", false)):
		_store_ai_player_runtime_error(response)
		return {
			"ok": false,
			"error": str(response.get("error", "context_document_update_failed")),
			"remote_result": response,
		}
	await request_ai_player_runtime_refresh()
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"requires_map_refresh": false,
	}

func request_ai_player_transfer_proposal_create() -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	var transfer_resources := _resolve_transfer_resources_for_ai(ai_player_id)
	if transfer_resources.is_empty():
		return {
			"ok": false,
			"error": "missing_transferable_ai_resources",
		}
	var response: Dictionary = await _api_client.create_ai_player_proposal(
		ai_player_id,
		"resource_transfer_to_governor",
		{"resources": transfer_resources},
		"Godot AI panel requested governed resource transfer proposal.",
		"human"
	)
	if not bool(response.get("ok", false)):
		return {
			"ok": false,
			"error": str(response.get("error", "proposal_create_failed")),
			"remote_result": response,
		}
	_store_ai_player_proposal_result(response)
	await request_ai_player_runtime_refresh()
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"requires_map_refresh": false,
	}

func request_ai_player_battle_report_followup_proposal(followup_action: String) -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var normalized_action := followup_action.strip_edges()
	if normalized_action != "troop_heal" and normalized_action != "march_move" and normalized_action != "tile_occupy":
		return {
			"ok": false,
			"error": "unsupported_battle_report_followup",
			"followup_action": normalized_action,
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	var proposal_args := _resolve_battle_report_followup_args(normalized_action)
	if proposal_args.is_empty():
		return {
			"ok": false,
			"error": "missing_battle_report_followup_args",
			"followup_action": normalized_action,
		}
	var reason := _format_battle_report_followup_reason(normalized_action)
	var response: Dictionary = await _api_client.create_ai_player_proposal(
		ai_player_id,
		normalized_action,
		proposal_args,
		reason,
		"human"
	)
	if not bool(response.get("ok", false)):
		_store_ai_player_runtime_error(response)
		return {
			"ok": false,
			"error": str(response.get("error", "proposal_create_failed")),
			"remote_result": response,
		}
	_store_ai_player_proposal_result(response)
	await request_ai_player_runtime_refresh()
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"requires_map_refresh": false,
	}

func request_ai_player_model_proposals_create() -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var ai_player_id := _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		ai_player_id = _resolve_primary_ai_player_id_from_state()
	if ai_player_id == "":
		return {
			"ok": false,
			"error": "missing_ai_player",
		}
	var response: Dictionary = await _api_client.create_ai_player_model_proposals(ai_player_id)
	if not bool(response.get("ok", false)):
		var response_data: Dictionary = response.get("data", {}) as Dictionary
		var error_text := str(response_data.get("error", response.get("error", "model_proposal_create_failed"))).strip_edges()
		if error_text == "":
			error_text = "model_proposal_create_failed"
		_store_ai_player_runtime_error({"error": error_text})
		return {
			"ok": false,
			"error": error_text,
			"remote_result": response,
	}
	_store_ai_player_proposal_result(response)
	await request_ai_player_runtime_refresh()
	var model_response_data: Dictionary = response.get("data", {}) as Dictionary
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"proposal_count": int(model_response_data.get("proposalCount", 0)),
		"rejected_count": int(model_response_data.get("rejectedCount", 0)),
		"requires_map_refresh": false,
	}

func request_ai_player_latest_proposal_execute() -> Dictionary:
	if not AI_PANEL_DIRECT_PROPOSAL_EXECUTE_ENABLED:
		return {
			"ok": false,
			"error": "approval_only_ui_guard",
			"message": "请先查看待批提案，再由正式审批入口处理。",
			"remote_attempted": false,
			"remote_applied": false,
			"requires_map_refresh": false,
		}
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var proposal := _resolve_latest_actionable_proposal_from_state()
	if proposal.is_empty():
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if not bool(refresh_result.get("ok", false)):
			return refresh_result
		proposal = _resolve_latest_actionable_proposal_from_state()
	if proposal.is_empty():
		return {
			"ok": false,
			"error": "missing_actionable_proposal",
		}
	var proposal_id := str(proposal.get("proposalId", "")).strip_edges()
	if proposal_id == "":
		return {
			"ok": false,
			"error": "missing_proposal_id",
		}
	var status := str(proposal.get("status", "")).strip_edges()
	var approved_by := str(proposal.get("governorPlayerId", "")).strip_edges()
	if approved_by == "":
		approved_by = _resolve_governor_player_id_from_state()
	if approved_by == "":
		return {
			"ok": false,
			"error": "missing_governor_player_id",
		}
	var latest_response: Dictionary = {}
	if status == "pending_approval":
		var approve_response: Dictionary = await _api_client.approve_ai_player_proposal(proposal_id, approved_by)
		if not bool(approve_response.get("ok", false)):
			return {
				"ok": false,
				"error": str(approve_response.get("error", "proposal_approve_failed")),
				"remote_result": approve_response,
			}
		latest_response = approve_response
	var execute_response: Dictionary = await _api_client.execute_ai_player_proposal(proposal_id, approved_by, true)
	if not bool(execute_response.get("ok", false)):
		return {
			"ok": false,
			"error": str(execute_response.get("error", "proposal_execute_failed")),
			"remote_result": execute_response,
		}
	latest_response = execute_response
	_store_ai_player_proposal_result(latest_response)
	var response_data: Dictionary = latest_response.get("data", {}) as Dictionary
	var receipt: Dictionary = response_data.get("receipt", {}) as Dictionary
	var remote_world: Dictionary = response_data.get("world", {}) as Dictionary
	await request_ai_player_runtime_refresh()
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": bool(receipt.get("ok", false)),
		"remote_world": remote_world,
		"remote_result": latest_response,
		"requires_map_refresh": true,
	}

func request_ai_player_proposal_approve(proposal_id: String) -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var normalized_proposal_id := proposal_id.strip_edges()
	if normalized_proposal_id == "":
		return {
			"ok": false,
			"error": "missing_proposal_id",
		}
	var proposal := _resolve_proposal_by_id_from_state(normalized_proposal_id)
	if proposal.is_empty():
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if bool(refresh_result.get("ok", false)):
			proposal = _resolve_proposal_by_id_from_state(normalized_proposal_id)
	var approved_by := str(proposal.get("governorPlayerId", "")).strip_edges()
	if approved_by == "":
		approved_by = _resolve_governor_player_id_from_state()
	if approved_by == "":
		return {
			"ok": false,
			"error": "missing_governor_player_id",
		}
	var response: Dictionary = await _api_client.approve_ai_player_proposal(normalized_proposal_id, approved_by)
	if not bool(response.get("ok", false)):
		return {
			"ok": false,
			"error": str(response.get("error", "proposal_approve_failed")),
			"remote_result": response,
			"remote_attempted": true,
			"remote_applied": false,
			"record_state": "ai_proposal_approve_failed",
		}
	_store_ai_player_proposal_result(response)
	_store_ai_player_proposal_mutation_result("approve", response)
	await request_ai_player_runtime_refresh()
	_store_ai_player_proposal_mutation_result("approve", response)
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	var updated_proposal: Dictionary = response_data.get("proposal", {}) as Dictionary
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"proposal": updated_proposal,
		"proposal_status": str(updated_proposal.get("status", "")).strip_edges(),
		"mutation_kind": "approve",
		"record_state": "ai_proposal_approved",
		"requires_map_refresh": false,
	}

func request_ai_player_proposal_reject(proposal_id: String) -> Dictionary:
	if _api_client == null:
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var normalized_proposal_id := proposal_id.strip_edges()
	if normalized_proposal_id == "":
		return {
			"ok": false,
			"error": "missing_proposal_id",
		}
	var proposal := _resolve_proposal_by_id_from_state(normalized_proposal_id)
	if proposal.is_empty():
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if bool(refresh_result.get("ok", false)):
			proposal = _resolve_proposal_by_id_from_state(normalized_proposal_id)
	var rejected_by := str(proposal.get("governorPlayerId", "")).strip_edges()
	if rejected_by == "":
		rejected_by = _resolve_governor_player_id_from_state()
	if rejected_by == "":
		return {
			"ok": false,
			"error": "missing_governor_player_id",
		}
	var response: Dictionary = await _api_client.reject_ai_player_proposal(normalized_proposal_id, rejected_by, "玩家驳回")
	if not bool(response.get("ok", false)):
		return {
			"ok": false,
			"error": str(response.get("error", "proposal_reject_failed")),
			"remote_result": response,
			"remote_attempted": true,
			"remote_applied": false,
			"record_state": "ai_proposal_reject_failed",
		}
	_store_ai_player_proposal_result(response)
	_store_ai_player_proposal_mutation_result("reject", response)
	await request_ai_player_runtime_refresh()
	_store_ai_player_proposal_mutation_result("reject", response)
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	var updated_proposal: Dictionary = response_data.get("proposal", {}) as Dictionary
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_result": response,
		"proposal": updated_proposal,
		"proposal_status": str(updated_proposal.get("status", "")).strip_edges(),
		"mutation_kind": "reject",
		"record_state": "ai_proposal_rejected",
		"requires_map_refresh": false,
	}

func request_ai_player_pending_proposals_review() -> Dictionary:
	var proposal_count := _count_actionable_proposals_from_state()
	if proposal_count <= 0:
		var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
		if bool(refresh_result.get("ok", false)):
			proposal_count = _count_actionable_proposals_from_state()
	return {
		"ok": true,
		"remote_attempted": false,
		"remote_applied": false,
		"proposal_count": proposal_count,
		"requires_map_refresh": false,
	}

func request_ai_player_governor_inbox_claim() -> Dictionary:
	var pending_transfer := _resolve_first_pending_governor_transfer()
	if pending_transfer.is_empty():
		return {
			"ok": false,
			"error": "missing_pending_governor_inbox",
		}
	var world_action_intent := {
		"intent_id": "ai_player_governor_inbox_claim",
		"kind": "ai_player_governor_inbox_claim",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "claimGovernorResourceInbox",
		"include_world": true,
		"requires_map_refresh": false,
		"payload": {
			"factionId": _target_faction_id,
			"governorPlayerId": str(pending_transfer.get("governorPlayerId", "")).strip_edges(),
			"transferId": str(pending_transfer.get("transferId", "")).strip_edges(),
		},
	}
	var remote_result: Dictionary = await _run_remote_action(
		str(world_action_intent.get("action_name", "")),
		world_action_intent.get("payload", {}) as Dictionary,
		true
	)
	if not bool(remote_result.get("ok", false)):
		return {
			"ok": false,
			"remote_attempted": true,
			"remote_applied": false,
			"remote_result": remote_result,
			"world_action_intent": world_action_intent,
		}
	return {
		"ok": true,
		"remote_attempted": true,
		"remote_applied": true,
		"remote_world": remote_result.get("world", {}),
		"remote_result": remote_result,
		"requires_map_refresh": false,
		"world_action_intent": world_action_intent,
	}

func _decode_ai_panel_action_part(parts: PackedStringArray, index: int, fallback: String) -> String:
	if index < 0 or index >= parts.size():
		return fallback
	var value := str(parts[index]).strip_edges()
	if value == "":
		return fallback
	return value.uri_decode()

func request_ai_panel_action(action_id: String, tab_id: String) -> Dictionary:
	if action_id.begins_with("ai_player_proposal_approve:"):
		var proposal_id := action_id.trim_prefix("ai_player_proposal_approve:").uri_decode().strip_edges()
		var approve_result: Dictionary = await request_ai_player_proposal_approve(proposal_id)
		if not bool(approve_result.get("ok", false)):
			return {
				"ok": false,
				"record_path": "panel/ai_hub/%s/proposal_approve" % tab_id,
				"record_state": _resolve_ai_action_failure_state(approve_result, str(approve_result.get("error", "rejected"))),
				"runtime_label": "panel AI / %s / 批准 / failed" % tab_id,
				"action_result": approve_result,
			}
		return {
			"ok": true,
			"record_path": "panel/ai_hub/%s/proposal_approve" % tab_id,
			"record_state": "ai_proposal_approved",
			"runtime_label": "panel AI / %s / 批准" % tab_id,
			"action_result": approve_result,
		}
	if action_id.begins_with("ai_player_proposal_reject:"):
		var proposal_id := action_id.trim_prefix("ai_player_proposal_reject:").uri_decode().strip_edges()
		var reject_result: Dictionary = await request_ai_player_proposal_reject(proposal_id)
		if not bool(reject_result.get("ok", false)):
			return {
				"ok": false,
				"record_path": "panel/ai_hub/%s/proposal_reject" % tab_id,
				"record_state": _resolve_ai_action_failure_state(reject_result, str(reject_result.get("error", "rejected"))),
				"runtime_label": "panel AI / %s / 驳回 / failed" % tab_id,
				"action_result": reject_result,
			}
		return {
			"ok": true,
			"record_path": "panel/ai_hub/%s/proposal_reject" % tab_id,
			"record_state": "ai_proposal_rejected",
			"runtime_label": "panel AI / %s / 驳回" % tab_id,
			"action_result": reject_result,
		}
	if action_id.begins_with("ai_player_display_name_save:"):
		var encoded_name := action_id.trim_prefix("ai_player_display_name_save:")
		var rename_result: Dictionary = await request_ai_player_display_name_update(encoded_name.uri_decode())
		if not bool(rename_result.get("ok", false)):
			return {
				"ok": false,
				"record_path": "panel/ai_hub/%s/display_name_update" % tab_id,
				"record_state": _resolve_ai_action_failure_state(rename_result, str(rename_result.get("error", "rejected"))),
				"runtime_label": "panel AI / %s / AI名称编辑 / failed" % tab_id,
				"action_result": rename_result,
			}
		return {
			"ok": true,
			"record_path": "panel/ai_hub/%s/display_name_update" % tab_id,
			"record_state": "display_name_updated",
			"runtime_label": "panel AI / %s / AI名称编辑" % tab_id,
			"action_result": rename_result,
		}
	if action_id.begins_with("ai_player_avatar_save:"):
		var payload := action_id.trim_prefix("ai_player_avatar_save:")
		var parts := payload.split(":", false, 1)
		var avatar_id := _decode_ai_panel_action_part(parts, 0, "")
		var avatar_image_path := _decode_ai_panel_action_part(parts, 1, "")
		var avatar_result: Dictionary = await request_ai_player_avatar_update(avatar_id, avatar_image_path)
		if not bool(avatar_result.get("ok", false)):
			return {
				"ok": false,
				"record_path": "panel/ai_hub/%s/avatar_update" % tab_id,
				"record_state": _resolve_ai_action_failure_state(avatar_result, str(avatar_result.get("error", "rejected"))),
				"runtime_label": "panel AI / %s / 头像选择 / failed" % tab_id,
				"action_result": avatar_result,
			}
		return {
			"ok": true,
			"record_path": "panel/ai_hub/%s/avatar_update" % tab_id,
			"record_state": "avatar_updated",
			"runtime_label": "panel AI / %s / 头像选择" % tab_id,
			"action_result": avatar_result,
		}
	if action_id.begins_with("ai_player_avatar_upload:"):
		var payload := action_id.trim_prefix("ai_player_avatar_upload:")
		var parts := payload.split(":", false, 1)
		var file_path := _decode_ai_panel_action_part(parts, 0, "")
		var content_type := _decode_ai_panel_action_part(parts, 1, "")
		var upload_result: Dictionary = await request_ai_player_avatar_image_upload(file_path, content_type)
		if not bool(upload_result.get("ok", false)):
			return {
				"ok": false,
				"record_path": "panel/ai_hub/%s/avatar_upload" % tab_id,
				"record_state": _resolve_ai_action_failure_state(upload_result, str(upload_result.get("error", "rejected"))),
				"runtime_label": "panel AI / %s / 头像上传 / failed" % tab_id,
				"action_result": upload_result,
			}
		return {
			"ok": true,
			"record_path": "panel/ai_hub/%s/avatar_upload" % tab_id,
			"record_state": "avatar_uploaded",
			"runtime_label": "panel AI / %s / 头像上传" % tab_id,
			"action_result": upload_result,
		}
	if action_id.begins_with("ai_player_context_document_add:"):
		var payload := action_id.trim_prefix("ai_player_context_document_add:")
		var parts := payload.split(":", true, 3)
		var kind := _decode_ai_panel_action_part(parts, 0, "identity")
		var title := _decode_ai_panel_action_part(parts, 1, "")
		var source_file_name := _decode_ai_panel_action_part(parts, 2, "")
		var content := _decode_ai_panel_action_part(parts, 3, "")
		var context_result: Dictionary = await request_ai_player_context_document_add(kind, title, content, source_file_name)
		if not bool(context_result.get("ok", false)):
			return {
				"ok": false,
				"record_path": "panel/ai_hub/%s/context_document_add" % tab_id,
				"record_state": _resolve_ai_action_failure_state(context_result, str(context_result.get("error", "rejected"))),
				"runtime_label": "panel AI / %s / 添加身份文件 / failed" % tab_id,
				"action_result": context_result,
			}
		return {
			"ok": true,
			"record_path": "panel/ai_hub/%s/context_document_add" % tab_id,
			"record_state": "context_document_added",
			"runtime_label": "panel AI / %s / 添加身份文件" % tab_id,
			"action_result": context_result,
		}
	if action_id.begins_with("ai_player_home_city_bind:"):
		var encoded_center_tile_id := action_id.trim_prefix("ai_player_home_city_bind:")
		var bind_result: Dictionary = await request_ai_player_home_city_bind(encoded_center_tile_id.uri_decode())
		if not bool(bind_result.get("ok", false)):
			return {
				"ok": false,
				"record_path": "panel/ai_hub/%s/home_city_bind" % tab_id,
				"record_state": _resolve_ai_action_failure_state(bind_result, str(bind_result.get("error", "rejected"))),
				"runtime_label": "panel AI / %s / AI主城绑定 / failed" % tab_id,
				"action_result": bind_result,
			}
		var bind_entry_response: Dictionary = bind_result.get("facility_entry_result", {}) as Dictionary
		return {
			"ok": true,
			"record_path": "panel/ai_hub/%s/home_city_bind" % tab_id,
			"record_state": "home_city_bound",
			"runtime_label": "panel AI / %s / AI主城绑定" % tab_id,
			"action_result": bind_result,
			"post_open_ai_main_city_facility": true,
			"post_open_ai_main_city_facility_entry": bind_entry_response,
			"refresh_overlay": false,
		}
	match action_id:
		"autonomy_L1_assigned", "autonomy_L2_delegated", "autonomy_L3_negotiated":
			var level := action_id.trim_prefix("autonomy_")
			var action_result: Dictionary = await request_ai_autonomy(level)
			if not bool(action_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/%s" % [tab_id, level],
					"record_state": _resolve_ai_action_failure_state(action_result, "rejected"),
					"runtime_label": "panel AI / %s / %s / rejected" % [tab_id, level],
					"action_result": action_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/%s" % [tab_id, level],
				"record_state": "updated",
				"runtime_label": "panel AI / %s / %s" % [tab_id, level],
				"action_result": action_result,
			}
		"ai_player_open_chat_channel":
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/open_chat_channel" % tab_id,
				"record_state": "opened",
				"runtime_label": "panel AI / %s / 打开聊天频道" % tab_id,
				"post_open_main_chat_channel": true,
				"post_open_ai_player_id": _resolve_primary_ai_player_id_from_state(),
				"refresh_overlay": false,
			}
		"ai_players_refresh":
			var refresh_result: Dictionary = await request_ai_player_runtime_refresh()
			if not bool(refresh_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/ai_players_refresh" % tab_id,
					"record_state": _resolve_ai_action_failure_state(refresh_result, "request_failed"),
					"runtime_label": "panel AI / %s / AI玩家刷新 / failed" % tab_id,
					"action_result": refresh_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/ai_players_refresh" % tab_id,
				"record_state": "refreshed",
				"runtime_label": "panel AI / %s / AI玩家刷新" % tab_id,
				"action_result": refresh_result,
			}
		"ai_player_home_city_candidates_open":
			var candidate_result: Dictionary = await request_ai_player_home_city_candidates()
			if not bool(candidate_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/home_city_candidates" % tab_id,
					"record_state": _resolve_ai_action_failure_state(candidate_result, str(candidate_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / AI主城候选 / failed" % tab_id,
					"action_result": candidate_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/home_city_candidates" % tab_id,
				"record_state": "home_city_candidates_loaded",
				"runtime_label": "panel AI / %s / AI主城候选" % tab_id,
				"action_result": candidate_result,
			}
		"ai_player_home_city_open":
			var open_result: Dictionary = await request_ai_player_home_city_open()
			if not bool(open_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/home_city_open" % tab_id,
					"record_state": _resolve_ai_action_failure_state(open_result, str(open_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / 打开AI主城 / failed" % tab_id,
					"action_result": open_result,
				}
			var open_entry_response: Dictionary = open_result.get("remote_result", {}) as Dictionary
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/home_city_open" % tab_id,
				"record_state": "home_city_opened",
				"runtime_label": "panel AI / %s / 打开AI主城" % tab_id,
				"action_result": open_result,
				"post_open_ai_main_city_facility": true,
				"post_open_ai_main_city_facility_entry": open_entry_response,
				"refresh_overlay": false,
			}
		"ai_player_display_name_update":
			var rename_result: Dictionary = await request_ai_player_display_name_update()
			if not bool(rename_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/display_name_update" % tab_id,
					"record_state": _resolve_ai_action_failure_state(rename_result, str(rename_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / AI名称编辑 / failed" % tab_id,
					"action_result": rename_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/display_name_update" % tab_id,
				"record_state": "display_name_updated",
				"runtime_label": "panel AI / %s / AI名称编辑" % tab_id,
				"action_result": rename_result,
			}
		"ai_player_model_proposal_create":
			var model_result: Dictionary = await request_ai_player_model_proposals_create()
			if not bool(model_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/model_proposal_create" % tab_id,
					"record_state": _resolve_ai_action_failure_state(model_result, str(model_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / 模型生成提案 / failed" % tab_id,
					"action_result": model_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/model_proposal_create" % tab_id,
				"record_state": "model_proposed",
				"runtime_label": "panel AI / %s / 模型生成提案" % tab_id,
				"action_result": model_result,
			}
		"ai_player_transfer_proposal_create":
			var proposal_result: Dictionary = await request_ai_player_transfer_proposal_create()
			if not bool(proposal_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/transfer_proposal_create" % tab_id,
					"record_state": _resolve_ai_action_failure_state(proposal_result, str(proposal_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / 创建资源输送提案 / failed" % tab_id,
					"action_result": proposal_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/transfer_proposal_create" % tab_id,
				"record_state": "proposal_created",
				"runtime_label": "panel AI / %s / 创建资源输送提案" % tab_id,
				"action_result": proposal_result,
			}
		"ai_player_battle_report_troop_heal":
			var heal_result: Dictionary = await request_ai_player_battle_report_followup_proposal("troop_heal")
			if not bool(heal_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/battle_report_troop_heal" % tab_id,
					"record_state": _resolve_ai_action_failure_state(heal_result, str(heal_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / 战报建议补兵 / failed" % tab_id,
					"action_result": heal_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/battle_report_troop_heal" % tab_id,
				"record_state": "proposal_created",
				"runtime_label": "panel AI / %s / 战报建议补兵" % tab_id,
				"action_result": heal_result,
			}
		"ai_player_battle_report_march_move":
			var march_result: Dictionary = await request_ai_player_battle_report_followup_proposal("march_move")
			if not bool(march_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/battle_report_march_move" % tab_id,
					"record_state": _resolve_ai_action_failure_state(march_result, str(march_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / 战报建议行军 / failed" % tab_id,
					"action_result": march_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/battle_report_march_move" % tab_id,
				"record_state": "proposal_created",
				"runtime_label": "panel AI / %s / 战报建议行军" % tab_id,
				"action_result": march_result,
			}
		"ai_player_battle_report_tile_occupy":
			var occupy_result: Dictionary = await request_ai_player_battle_report_followup_proposal("tile_occupy")
			if not bool(occupy_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/battle_report_tile_occupy" % tab_id,
					"record_state": _resolve_ai_action_failure_state(occupy_result, str(occupy_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / 战报建议占地 / failed" % tab_id,
					"action_result": occupy_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/battle_report_tile_occupy" % tab_id,
				"record_state": "proposal_created",
				"runtime_label": "panel AI / %s / 战报建议占地" % tab_id,
				"action_result": occupy_result,
			}
		"ai_player_pending_proposals_review":
			var review_result: Dictionary = await request_ai_player_pending_proposals_review()
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/pending_proposals_review" % tab_id,
				"record_state": "proposal_review_opened",
				"runtime_label": "panel AI / %s / 查看待批提案" % tab_id,
				"action_result": review_result,
				"requires_finalize": true,
				"requires_map_refresh": false,
				"post_open_page_id": "agenda",
				"post_open_panel_id": "ai_hub",
			}
		"ai_player_latest_proposal_execute":
			var execute_result: Dictionary = await request_ai_player_latest_proposal_execute()
			if not bool(execute_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/latest_proposal_execute" % tab_id,
					"record_state": _resolve_ai_action_failure_state(execute_result, str(execute_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / 审批执行提案 / failed" % tab_id,
					"action_result": execute_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/latest_proposal_execute" % tab_id,
				"record_state": "proposal_executed",
				"runtime_label": "panel AI / %s / 审批执行提案" % tab_id,
				"action_result": execute_result,
				"requires_finalize": true,
				"requires_map_refresh": true,
			}
		"ai_player_governor_inbox_claim":
			var claim_result: Dictionary = await request_ai_player_governor_inbox_claim()
			if not bool(claim_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/governor_inbox_claim" % tab_id,
					"record_state": _resolve_ai_action_failure_state(claim_result, str(claim_result.get("error", "rejected"))),
					"runtime_label": "panel AI / %s / 领取待领资源 / failed" % tab_id,
					"action_result": claim_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/governor_inbox_claim" % tab_id,
				"record_state": "claimed",
				"runtime_label": "panel AI / %s / 领取待领资源" % tab_id,
				"action_result": claim_result,
				"requires_finalize": true,
			}
		"agenda_refresh":
			var agenda_result: Dictionary = await request_ai_agenda_preview()
			if not bool(agenda_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/agenda_refresh" % tab_id,
					"record_state": _resolve_ai_action_failure_state(agenda_result, "rejected"),
					"runtime_label": "panel AI / %s / agenda / rejected" % tab_id,
					"action_result": agenda_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/agenda_refresh" % tab_id,
				"record_state": "refreshed",
				"runtime_label": "panel AI / %s / agenda" % tab_id,
				"action_result": agenda_result,
			}
		"agenda_open_troop":
			var agenda_troop_id := _resolve_ai_agenda_target_unit_id()
			if agenda_troop_id == "":
				return {}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/open_troop/%s" % [tab_id, agenda_troop_id],
				"record_state": "opened",
				"runtime_label": "panel AI / %s / 查看部队 / %s" % [tab_id, agenda_troop_id],
				"post_open_panel_id": "troop",
				"post_open_runtime_state_patch": _build_troop_focus_runtime_patch(agenda_troop_id),
			}
		"agenda_open_alliance":
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/open_alliance" % tab_id,
				"record_state": "opened",
				"runtime_label": "panel AI / %s / 查看同盟" % tab_id,
				"post_open_page_id": "coordination",
				"post_open_panel_id": "alliance",
			}
		"agenda_open_interior":
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/open_interior" % tab_id,
				"record_state": "opened",
				"runtime_label": "panel AI / %s / 查看内政" % tab_id,
				"post_open_page_id": "affairs",
				"post_open_panel_id": "interior",
			}
		"focus_city", "focus_troop", "focus_alliance":
			var focus_result: Dictionary = await request_ai_context_focus(action_id)
			if not bool(focus_result.get("ok", false)):
				return {
					"ok": false,
					"record_path": "panel/ai_hub/%s/%s" % [tab_id, action_id],
					"record_state": _resolve_ai_action_failure_state(focus_result, "rejected"),
					"runtime_label": "panel AI / %s / %s / rejected" % [tab_id, action_id],
					"action_result": focus_result,
				}
			return {
				"ok": true,
				"record_path": "panel/ai_hub/%s/%s" % [tab_id, action_id],
				"record_state": "focused",
				"runtime_label": "panel AI / %s / %s" % [tab_id, action_id],
				"action_result": focus_result,
				"requires_finalize": true,
				"post_open_page_id": _resolve_ai_focus_tab_id(action_id),
				"post_open_panel_id": _resolve_ai_focus_panel_id(action_id),
				"post_open_runtime_state_patch": _resolve_ai_focus_runtime_state_patch(action_id, focus_result),
			}
		_:
			if _is_ai_agenda_execute_action(action_id):
				var execute_result: Dictionary = await request_ai_agenda_execution(action_id)
				if not bool(execute_result.get("ok", false)):
					return {
						"ok": false,
						"record_path": "panel/ai_hub/%s/%s" % [tab_id, action_id],
						"record_state": _resolve_ai_action_failure_state(execute_result, "rejected"),
						"runtime_label": "panel AI / %s / %s / rejected" % [tab_id, action_id],
						"action_result": execute_result,
					}
				return {
					"ok": true,
					"record_path": "panel/ai_hub/%s/%s" % [tab_id, action_id],
					"record_state": "queued",
					"runtime_label": "panel AI / %s / %s" % [tab_id, action_id],
					"action_result": execute_result,
					"requires_finalize": true,
				}
			return {}

func request_interior_building_panel_action(city_id: String, tab_id: String, building_id: String) -> Dictionary:
	var action_result: Dictionary = await request_city_building_upgrade(city_id, tab_id, building_id)
	if not bool(action_result.get("ok", false)):
		return {
			"ok": false,
			"record_path": "panel/interior/%s/building/%s" % [tab_id, building_id],
			"record_state": "upgrade-missed",
			"runtime_label": "panel 内政 / %s / 升级 / %s" % [tab_id, building_id],
		}
	var world_action_intent: Dictionary = action_result.get("world_action_intent", {}) as Dictionary
	return {
		"ok": true,
		"record_path": "panel/interior/%s/building/%s" % [tab_id, building_id],
		"record_state": "upgraded",
		"runtime_label": "panel 内政 / %s / 升级 / %s / %s" % [tab_id, building_id, str(world_action_intent.get("mode", "local_only"))],
		"action_result": action_result,
		"requires_finalize": true,
	}

func request_interior_affair_panel_action(city_id: String, affair_id: String) -> Dictionary:
	var action_result: Dictionary = await request_affair_enqueue(city_id, affair_id)
	if not bool(action_result.get("ok", false)):
		return {
			"ok": false,
			"record_path": "panel/interior/affairs/%s" % affair_id,
			"record_state": "enqueue-missed",
			"runtime_label": "panel 内政 / 政务 / %s" % affair_id,
		}
	var world_action_intent: Dictionary = action_result.get("world_action_intent", {}) as Dictionary
	return {
		"ok": true,
		"record_path": "panel/interior/affairs/%s" % affair_id,
		"record_state": "enqueued",
		"runtime_label": "panel 内政 / 政务 / %s / %s" % [affair_id, str(world_action_intent.get("mode", "local_only"))],
		"action_result": action_result,
		"requires_finalize": true,
	}

func request_interior_work_order_action(city_id: String, action_id: String, queue_item_id: String) -> Dictionary:
	var normalized_city_id := city_id.strip_edges()
	var normalized_action_id := action_id.strip_edges()
	var normalized_queue_item_id := queue_item_id.strip_edges()
	if normalized_action_id == "":
		normalized_action_id = "open_work_order"
	if normalized_queue_item_id == "":
		return {
			"ok": false,
			"record_path": "panel/interior/affairs/work_order",
			"record_state": "action-missed",
			"runtime_label": "panel 内政 / 政务 / 工单",
		}
	var action_label := "定位" if normalized_action_id == "focus_world_target" else "查看"
	var runtime_label := "政务 / %s工单" % action_label
	var world_action_intent := {
		"intent_id": "interior_work_order_action",
		"kind": "interior_work_order_action",
		"authority_strategy": "authoritative_first",
		"mode": "backend_main_city_interior_work_order_action",
		"channel": "backend_main_city_interior_read_model",
		"bridge_strategy": "direct_backend_interior_work_order_action",
		"backend_capable": true,
	}
	world_action_intent["action_name"] = "interiorWorkOrderAction"
	world_action_intent["payload"] = {
		"cityId": normalized_city_id,
		"actionId": normalized_action_id,
		"queueItemId": normalized_queue_item_id,
		"contextFocusId": "focus_interior_work_order",
		"relatedId": normalized_queue_item_id,
	}
	if _api_client == null:
		var unavailable_result := {
			"ok": false,
			"remote_attempted": false,
			"remote_applied": false,
			"requires_map_refresh": false,
			"error": "api_client_unavailable",
			"world_action_intent": world_action_intent,
		}
		return {
			"ok": false,
			"record_path": "panel/interior/affairs/work_order/%s/%s" % [normalized_queue_item_id, normalized_action_id],
			"record_state": "server-missed",
			"runtime_label": runtime_label,
			"action_result": unavailable_result,
			"requires_finalize": true,
			"refresh_overlay": false,
		}
	var player_id := _resolve_governor_player_id_from_state()
	var remote_result: Dictionary = await _api_client.post_main_city_interior_work_order_action(
		player_id,
		normalized_city_id,
		normalized_queue_item_id,
		normalized_action_id
	)
	var remote_payload: Dictionary = remote_result.get("data", {}) as Dictionary
	var remote_applied := bool(remote_result.get("ok", false)) and bool(remote_payload.get("ok", false))
	var readback_result: Dictionary = {}
	var readback_receipt: Dictionary = {}
	if remote_applied:
		readback_result = await _api_client.get_main_city_interior_read_model(player_id, normalized_city_id)
		var readback_payload: Dictionary = readback_result.get("data", {}) as Dictionary
		var readback_model: Dictionary = readback_payload.get("mainCityInterior", readback_payload) as Dictionary
		var receipts: Array = readback_model.get("work_order_action_receipts", []) as Array
		for receipt_variant in receipts:
			if not (receipt_variant is Dictionary):
				continue
			var receipt: Dictionary = receipt_variant as Dictionary
			if str(receipt.get("receipt_id", "")).strip_edges() == str(remote_payload.get("receiptId", "")).strip_edges():
				readback_receipt = receipt
				break
	var readback_ok := remote_applied and not readback_receipt.is_empty()
	var action_result := {
		"ok": remote_applied and readback_ok,
		"remote_attempted": true,
		"remote_applied": remote_applied,
		"requires_map_refresh": false,
		"remote_result": remote_result,
		"readback_result": readback_result,
		"readback_receipt": readback_receipt,
		"receiptSource": "server_interior_work_order_action",
		"readbackSchema": "main_city_interior_work_order_action_readback_v1",
		"readModelField": "work_order_action_receipts",
		"world_action_intent": world_action_intent,
	}
	return {
		"ok": bool(action_result.get("ok", false)),
		"record_path": "panel/interior/affairs/work_order/%s/%s" % [normalized_queue_item_id, normalized_action_id],
		"record_state": "server-confirmed" if bool(action_result.get("ok", false)) else "server-missed",
		"runtime_label": runtime_label,
		"action_result": action_result,
		"requires_finalize": true,
		"refresh_overlay": false,
	}

func request_troop_panel_upgrade_action(unit_id: String, facility_id: String, building_id: String) -> Dictionary:
	var action_result: Dictionary = await request_troop_facility_upgrade(unit_id, facility_id, building_id)
	if not bool(action_result.get("ok", false)):
		return {
			"ok": false,
			"record_path": "panel/troop/%s/upgrade/%s" % [unit_id, building_id],
			"record_state": "upgrade-missed",
			"runtime_label": "panel 部队 / 升级 / %s" % building_id,
		}
	var world_action_intent: Dictionary = action_result.get("world_action_intent", {}) as Dictionary
	return {
		"ok": true,
		"record_path": "panel/troop/%s/upgrade/%s" % [unit_id, building_id],
		"record_state": "upgraded",
		"runtime_label": "panel 部队 / 升级 / %s / %s" % [building_id, str(world_action_intent.get("mode", "local_only"))],
		"action_result": action_result,
		"requires_finalize": true,
	}

func finalize_world_action_result(action_result: Dictionary) -> Dictionary:
	var remote_world: Variant = action_result.get("remote_world", {})
	var authoritative_applied := false
	if bool(action_result.get("remote_applied", false)) and remote_world is Dictionary:
		authoritative_applied = _state_adapter.apply_remote_world(remote_world as Dictionary)
	return {
		"authoritative_applied": authoritative_applied,
		"requires_map_refresh": bool(action_result.get("requires_map_refresh", false)),
		"world_action_intent": action_result.get("world_action_intent", {}),
	}

func finalize_overlay_outcome(outcome: Dictionary) -> Dictionary:
	var requires_map_refresh := bool(outcome.get("force_map_refresh", false))
	var action_result: Dictionary = outcome.get("action_result", {}) as Dictionary
	if bool(outcome.get("requires_finalize", false)) and not action_result.is_empty():
		var finalize_result: Dictionary = finalize_world_action_result(action_result)
		requires_map_refresh = bool(finalize_result.get("requires_map_refresh", false)) or requires_map_refresh
	var focus_general_hero_id := str(outcome.get("post_focus_general_hero_id", "")).strip_edges()
	if focus_general_hero_id != "":
		var focus_result: Dictionary = await request_focus_general_hero(focus_general_hero_id)
		if bool(focus_result.get("ok", false)):
			var focus_finalize_result: Dictionary = finalize_world_action_result(focus_result)
			requires_map_refresh = bool(focus_finalize_result.get("requires_map_refresh", false)) or requires_map_refresh
	return {
		"requires_map_refresh": requires_map_refresh,
	}

func _build_local_only_intent(intent_id: String, payload: Dictionary) -> Dictionary:
	var intent := {
		"intent_id": intent_id,
		"kind": intent_id,
		"mode": "local_only",
		"channel": "local_domain_state",
		"backend_capable": false,
	}
	for key in payload.keys():
		intent[key] = payload[key]
	return intent

func _is_valid_hex_color(value: String) -> bool:
	var normalized := value.strip_edges().to_lower()
	if normalized.length() != 7 or not normalized.begins_with("#"):
		return false
	for index in range(1, 7):
		if "0123456789abcdef".find(normalized.substr(index, 1)) < 0:
			return false
	return true

func _translate_domain_agenda(agenda: Dictionary, updated_tick: int, updated_world_version: int) -> Dictionary:
	var options: Array = _normalize_domain_agenda_options(agenda)
	var target_tile_id := str(agenda.get("targetTileId", "")).strip_edges()
	var target_unit_ids: Array = agenda.get("targetUnitIds", []) as Array
	if target_tile_id == "" and not options.is_empty() and options[0] is Dictionary:
		target_tile_id = str((options[0] as Dictionary).get("targetTileId", "")).strip_edges()
	if target_unit_ids.is_empty() and not options.is_empty() and options[0] is Dictionary:
		target_unit_ids = ((options[0] as Dictionary).get("targetUnitIds", []) as Array).duplicate()
	return {
		"source": str(agenda.get("domainId", "domain")),
		"summary": str(agenda.get("summary", "当前议程已刷新。")),
		"options": options,
		"candidates": agenda.get("candidates", []) as Array,
		"targetTileId": target_tile_id,
		"targetUnitIds": target_unit_ids,
		"recommendedFollowups": agenda.get("recommendedFollowups", []) as Array,
		"updatedTick": updated_tick,
		"updatedWorldVersion": updated_world_version if updated_world_version >= 0 else int(agenda.get("generatedWorldVersion", -1)),
	}

func _normalize_domain_agenda_options(agenda: Dictionary) -> Array:
	var options: Array = agenda.get("options", []) as Array
	if not options.is_empty():
		return _normalize_domain_agenda_option_dicts(options, agenda.get("recommendedFollowups", []) as Array)
	return _build_domain_agenda_options_from_candidates(agenda)

func _normalize_domain_agenda_option_dicts(options: Array, fallback_followups: Array) -> Array:
	var normalized_options: Array = []
	for option_variant in options:
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		var supporting_ai_player_ids: Array = option.get("supportingAiPlayerIds", []) as Array
		var target_unit_ids: Array = option.get("targetUnitIds", []) as Array
		var evidence_refs: Array = option.get("evidenceRefs", []) as Array
		var support_count := int(option.get("supportCount", supporting_ai_player_ids.size()))
		normalized_options.append({
			"actionId": str(option.get("actionId", "")).strip_edges(),
			"intent": str(option.get("intent", option.get("actionId", ""))).strip_edges(),
			"label": str(option.get("label", option.get("summary", ""))).strip_edges(),
			"summary": str(option.get("summary", option.get("label", ""))).strip_edges(),
			"priority": str(option.get("priority", "P2")).strip_edges(),
			"targetTileId": str(option.get("targetTileId", "")).strip_edges(),
			"targetUnitIds": target_unit_ids,
			"supportingAiPlayerIds": supporting_ai_player_ids,
			"evidenceRefs": evidence_refs,
			"supportCount": support_count,
			"recommendedFollowups": option.get("recommendedFollowups", fallback_followups) as Array,
		})
	return normalized_options

func _build_domain_agenda_options_from_candidates(agenda: Dictionary) -> Array:
	var candidates: Array = agenda.get("candidates", []) as Array
	var fallback_followups: Array = agenda.get("recommendedFollowups", []) as Array
	var normalized_options: Array = []
	for candidate_variant in candidates:
		if not (candidate_variant is Dictionary):
			continue
		var candidate: Dictionary = candidate_variant as Dictionary
		var supporting_ai_player_ids: Array = candidate.get("supportingAiPlayerIds", []) as Array
		var target_unit_ids: Array = candidate.get("targetUnitIds", []) as Array
		var evidence_refs: Array = candidate.get("evidenceRefs", []) as Array
		normalized_options.append({
			"actionId": str(candidate.get("actionId", "")).strip_edges(),
			"intent": str(candidate.get("intent", candidate.get("actionId", ""))).strip_edges(),
			"label": str(candidate.get("summary", "")).strip_edges(),
			"summary": str(candidate.get("summary", "")).strip_edges(),
			"priority": str(candidate.get("priority", "P2")).strip_edges(),
			"targetTileId": str(candidate.get("targetTileId", "")).strip_edges(),
			"targetUnitIds": target_unit_ids,
			"supportingAiPlayerIds": supporting_ai_player_ids,
			"evidenceRefs": evidence_refs,
			"supportCount": supporting_ai_player_ids.size(),
			"recommendedFollowups": candidate.get("recommendedFollowups", fallback_followups) as Array,
		})
	return normalized_options

func _translate_civil_memory(entries: Array, focus_id: String) -> Dictionary:
	var summary_lines: Array[String] = []
	for entry_variant in entries.slice(0, min(entries.size(), 3)):
		if not (entry_variant is Dictionary):
			continue
		var entry: Dictionary = entry_variant as Dictionary
		var parts := [
			str(entry.get("type", "memory")).strip_edges(),
			str(entry.get("summary", entry.get("title", ""))).strip_edges(),
		]
		summary_lines.append(" / ".join(parts).strip_edges())
	if summary_lines.is_empty():
		summary_lines.append("暂无可用民生记忆。")
	return {
		"focusId": focus_id,
		"lines": summary_lines,
	}

func _build_ai_context_query_payload(focus_id: String) -> Dictionary:
	var payload: Dictionary = {
		"limit": 3,
		"factionId": _target_faction_id,
	}
	var related_id := _resolve_ai_context_related_id(focus_id)
	if related_id != "":
		payload["relatedId"] = related_id
	return payload

func _resolve_ai_context_related_id(focus_id: String) -> String:
	match focus_id:
		"focus_city":
			return _resolve_home_tile_id()
		"focus_troop":
			var unit: Dictionary = _find_primary_unit()
			return str(unit.get("id", "")).strip_edges()
		_:
			return ""

func _resolve_latest_recruit_hero_id() -> String:
	var faction_state := _read_target_faction_state()
	var hero_command: Dictionary = faction_state.get("heroCommand", {}) as Dictionary
	var recent_hero_id := str(hero_command.get("recentHeroId", "")).strip_edges()
	var recruit_state: Dictionary = _state_adapter.get_recruit_state(_target_faction_id)
	var last_results: Array = recruit_state.get("lastResults", []) as Array
	if recent_hero_id != "":
		for index in range(last_results.size() - 1, -1, -1):
			var entry_variant: Variant = last_results[index]
			if not (entry_variant is Dictionary):
				continue
			var entry: Dictionary = entry_variant as Dictionary
			if str(entry.get("heroId", "")).strip_edges() == recent_hero_id:
				return recent_hero_id
	for index in range(last_results.size() - 1, -1, -1):
		var fallback_variant: Variant = last_results[index]
		if fallback_variant is Dictionary:
			return str((fallback_variant as Dictionary).get("heroId", "")).strip_edges()
	return ""

func _extract_remote_response_data(action_result: Dictionary) -> Dictionary:
	var remote_result: Dictionary = action_result.get("remote_result", {}) as Dictionary
	return remote_result.get("data", {}) as Dictionary

func _extract_remote_unit_id(action_result: Dictionary, fallback_hero_id: String = "") -> String:
	var response_data := _extract_remote_response_data(action_result)
	var unit_id := str(response_data.get("unitId", "")).strip_edges()
	if unit_id != "":
		return unit_id
	var remote_world: Dictionary = action_result.get("remote_world", {}) as Dictionary
	var normalized_fallback_hero_id := fallback_hero_id.strip_edges()
	if normalized_fallback_hero_id == "":
		normalized_fallback_hero_id = str(response_data.get("heroId", "")).strip_edges()
	if normalized_fallback_hero_id == "":
		return ""
	if remote_world.is_empty():
		return _find_unit_id_for_hero(normalized_fallback_hero_id)
	return _find_unit_id_for_hero_in_world(remote_world, normalized_fallback_hero_id)

func _build_troop_focus_runtime_patch(unit_id: String) -> Dictionary:
	var normalized_unit_id := unit_id.strip_edges()
	if normalized_unit_id == "":
		return {}
	return {
		"active_troop_panel_unit_id": normalized_unit_id,
		"active_troop_panel_facility_id": "",
	}

func _resolve_home_tile_id() -> String:
	var faction_state := _read_target_faction_state()
	var hero_command: Dictionary = faction_state.get("heroCommand", {}) as Dictionary
	return str(hero_command.get("homeTileId", "")).strip_edges()


func _estimate_available_recruit_draw_count() -> int:
	var faction_state := _read_target_faction_state()
	var hero_command: Dictionary = faction_state.get("heroCommand", {}) as Dictionary
	var remaining_points := maxi(0, int(hero_command.get("developmentPoints", 0)))
	var next_threshold := maxi(1, int(hero_command.get("acquisitionThreshold", 0)))
	var remaining_prospect_count := maxi(0, (hero_command.get("prospectHeroIds", []) as Array).size())
	var count := 0
	while remaining_prospect_count > 0 and remaining_points >= next_threshold:
		remaining_points -= next_threshold
		next_threshold = mini(36, next_threshold + 2)
		remaining_prospect_count -= 1
		count += 1
	return count

func _find_unit_id_for_hero(hero_id: String) -> String:
	var normalized_hero_id := hero_id.strip_edges()
	if normalized_hero_id == "":
		return ""
	var raw_units: Variant = WorldStore.world.get("units", [])
	if not (raw_units is Array):
		return ""
	for unit_variant in raw_units as Array:
		if not (unit_variant is Dictionary):
			continue
		var unit: Dictionary = unit_variant as Dictionary
		if str(unit.get("faction", "")).strip_edges() != _target_faction_id:
			continue
		var primary_hero: Dictionary = unit.get("hero", {}) as Dictionary
		if str(primary_hero.get("id", "")).strip_edges() == normalized_hero_id:
			return str(unit.get("id", "")).strip_edges()
		var co_heroes_variant: Variant = unit.get("coHeroes", [])
		if not (co_heroes_variant is Array):
			continue
		for co_hero_variant in co_heroes_variant as Array:
			if not (co_hero_variant is Dictionary):
				continue
			var co_hero: Dictionary = co_hero_variant as Dictionary
			if str(co_hero.get("id", "")).strip_edges() == normalized_hero_id:
				return str(unit.get("id", "")).strip_edges()
	return ""


func _find_unit_id_for_hero_in_world(world_data: Dictionary, hero_id: String) -> String:
	var normalized_hero_id := hero_id.strip_edges()
	if normalized_hero_id == "":
		return ""
	var raw_units: Variant = world_data.get("units", [])
	if not (raw_units is Array):
		return ""
	for unit_variant in raw_units as Array:
		if not (unit_variant is Dictionary):
			continue
		var unit: Dictionary = unit_variant as Dictionary
		if str(unit.get("faction", "")).strip_edges() != _target_faction_id:
			continue
		var primary_hero: Dictionary = unit.get("hero", {}) as Dictionary
		if str(primary_hero.get("id", "")).strip_edges() == normalized_hero_id:
			return str(unit.get("id", "")).strip_edges()
		var co_heroes_variant: Variant = unit.get("coHeroes", [])
		if not (co_heroes_variant is Array):
			continue
		for co_hero_variant in co_heroes_variant as Array:
			if not (co_hero_variant is Dictionary):
				continue
			var co_hero: Dictionary = co_hero_variant as Dictionary
			if str(co_hero.get("id", "")).strip_edges() == normalized_hero_id:
				return str(unit.get("id", "")).strip_edges()
	return ""

func _read_current_ai_agenda() -> Dictionary:
	return _state_adapter.get_resolved_ai_agenda(_target_faction_id)

func _read_ai_players_response_payload(players_response: Dictionary) -> Dictionary:
	if players_response.has("items") or players_response.has("count"):
		return players_response
	var data_variant: Variant = players_response.get("data", {})
	if data_variant is Dictionary:
		return data_variant as Dictionary
	return {}

func _read_ai_players_autonomy_guard(response_data: Dictionary, runtime_items: Array) -> Dictionary:
	var direct_guard_variant: Variant = response_data.get("autonomyGuard", {})
	if direct_guard_variant is Dictionary and not (direct_guard_variant as Dictionary).is_empty():
		return (direct_guard_variant as Dictionary).duplicate(true)
	for runtime_variant in runtime_items:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var guard_variant: Variant = runtime.get("autonomyGuard", {})
		if guard_variant is Dictionary and not (guard_variant as Dictionary).is_empty():
			return (guard_variant as Dictionary).duplicate(true)
	return {}

func _is_ai_agenda_execute_action(action_id: String) -> bool:
	var normalized_action_id := action_id.strip_edges()
	if normalized_action_id == "" or normalized_action_id == "agenda_refresh" or normalized_action_id.begins_with("agenda_open_"):
		return false
	var agenda: Dictionary = _read_current_ai_agenda()
	var agenda_options: Array = agenda.get("options", []) as Array
	for option_variant in agenda_options:
		if not (option_variant is Dictionary):
			continue
		if str((option_variant as Dictionary).get("actionId", "")).strip_edges() == normalized_action_id:
			return true
	return ["agenda_expand", "agenda_support", "agenda_stabilize", "agenda_recover", "agenda_redeploy"].has(normalized_action_id)


func _resolve_ai_agenda_target_unit_id(agenda_override: Dictionary = {}) -> String:
	var agenda := agenda_override if not agenda_override.is_empty() else _read_current_ai_agenda()
	var direct_target := _read_first_target_unit_id(agenda.get("targetUnitIds", []) as Array)
	if direct_target != "":
		return direct_target
	var options: Array = agenda.get("options", []) as Array
	for option_variant in options:
		if not (option_variant is Dictionary):
			continue
		var option: Dictionary = option_variant as Dictionary
		var option_target := _read_first_target_unit_id(option.get("targetUnitIds", []) as Array)
		if option_target != "":
			return option_target
	return ""


func _read_first_target_unit_id(target_unit_ids: Array) -> String:
	for target_unit_id in target_unit_ids:
		var normalized_target_unit_id := str(target_unit_id).strip_edges()
		if normalized_target_unit_id != "":
			return normalized_target_unit_id
	return ""

func _resolve_ai_focus_panel_id(focus_id: String) -> String:
	match focus_id:
		"focus_city":
			return "interior"
		"focus_troop":
			return "troop"
		"focus_alliance":
			return "alliance"
		_:
			return ""

func _resolve_ai_focus_tab_id(focus_id: String) -> String:
	match focus_id:
		"focus_city":
			return "affairs"
		"focus_alliance":
			return "coordination"
		_:
			return ""

func _resolve_ai_focus_runtime_state_patch(focus_id: String, focus_result: Dictionary = {}) -> Dictionary:
	if focus_id != "focus_troop":
		return {}
	return _build_troop_focus_runtime_patch(_resolve_ai_focus_related_unit_id(focus_result))


func _resolve_ai_focus_related_unit_id(focus_result: Dictionary) -> String:
	var remote_world: Dictionary = focus_result.get("remote_world", {}) as Dictionary
	if not remote_world.is_empty():
		var slg_domain_state: Dictionary = remote_world.get("slgDomainState", {}) as Dictionary
		var ai_state_by_faction: Dictionary = slg_domain_state.get("aiStateByFaction", {}) as Dictionary
		var ai_state: Dictionary = ai_state_by_faction.get(_target_faction_id, {}) as Dictionary
		var context_memory_summary: Dictionary = ai_state.get("contextMemorySummary", {}) as Dictionary
		var related_id := str(context_memory_summary.get("relatedId", "")).strip_edges()
		if related_id != "":
			return related_id
	var current_ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var current_context_memory: Dictionary = current_ai_state.get("contextMemorySummary", {}) as Dictionary
	var current_related_id := str(current_context_memory.get("relatedId", "")).strip_edges()
	if current_related_id != "":
		return current_related_id
	return _resolve_ai_agenda_target_unit_id()

func _apply_ai_player_runtime_refresh_snapshot(
	runtime_items: Array,
	receipt_items: Array,
	proposal_items: Array,
	primary_ai_player_id: String,
	action_catalog: Array = [],
	faction_model_config: Dictionary = {},
	development_plan: Dictionary = {},
	battle_report_read_model: Dictionary = {},
	battle_report_items: Array = [],
	list_summary: Dictionary = {},
	autonomy_guard: Dictionary = {},
	autonomous_combat_player_report_read_model: Dictionary = {},
	autonomous_combat_player_report_items: Array = [],
	autonomous_combat_daily_summary: Dictionary = {},
	autonomous_combat_campaign_archive: Dictionary = {},
	autonomous_combat_war_room_live_refresh: Dictionary = {},
	autonomous_combat_war_room_ui_state: Dictionary = {},
	execution_trace_read_model: Dictionary = {},
	execution_trace_items: Array = [],
	request_sequence: int = 0
) -> bool:
	if request_sequence < _last_applied_ai_runtime_refresh_sequence:
		_last_rejected_ai_runtime_refresh_cache = _build_out_of_order_ai_runtime_refresh_rejection(primary_ai_player_id, request_sequence)
		return false
	_last_applied_ai_runtime_refresh_sequence = request_sequence
	_last_rejected_ai_runtime_refresh_cache = {}
	_store_ai_player_runtime_snapshot(
		runtime_items,
		receipt_items,
		proposal_items,
		primary_ai_player_id,
		action_catalog,
		faction_model_config,
		development_plan,
		battle_report_read_model,
		battle_report_items,
		list_summary,
		autonomy_guard,
		autonomous_combat_player_report_read_model,
		autonomous_combat_player_report_items,
		autonomous_combat_daily_summary,
		autonomous_combat_campaign_archive,
		autonomous_combat_war_room_live_refresh,
		autonomous_combat_war_room_ui_state,
		execution_trace_read_model,
		execution_trace_items
	)
	return true

func _build_out_of_order_ai_runtime_refresh_rejection(primary_ai_player_id: String, request_sequence: int) -> Dictionary:
	return {
		"reason": "out_of_order_ai_runtime_refresh",
		"incomingRefreshSequence": request_sequence,
		"lastAppliedRefreshSequence": _last_applied_ai_runtime_refresh_sequence,
		"readPacketKind": "ai_player_runtime_read_packet",
		"cacheRole": "presentation_snapshot_cache",
		"serverTruthOwner": "server",
		"rejectionBasis": "client_refresh_order_only_not_server_version",
		"primaryAiPlayerId": primary_ai_player_id.strip_edges(),
	}

func _store_ai_player_runtime_snapshot(
	runtime_items: Array,
	receipt_items: Array,
	proposal_items: Array,
	primary_ai_player_id: String,
	action_catalog: Array = [],
	faction_model_config: Dictionary = {},
	development_plan: Dictionary = {},
	battle_report_read_model: Dictionary = {},
	battle_report_items: Array = [],
	list_summary: Dictionary = {},
	autonomy_guard: Dictionary = {},
	autonomous_combat_player_report_read_model: Dictionary = {},
	autonomous_combat_player_report_items: Array = [],
	autonomous_combat_daily_summary: Dictionary = {},
	autonomous_combat_campaign_archive: Dictionary = {},
	autonomous_combat_war_room_live_refresh: Dictionary = {},
	autonomous_combat_war_room_ui_state: Dictionary = {},
	execution_trace_read_model: Dictionary = {},
	execution_trace_items: Array = []
) -> void:
	var current_ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var next_ai_state := current_ai_state.duplicate(true)
	next_ai_state["playerRuntimeList"] = runtime_items.duplicate(true)
	next_ai_state["playerRuntimeReceiptItems"] = receipt_items.duplicate(true)
	next_ai_state["playerRuntimeProposalItems"] = proposal_items.duplicate(true)
	next_ai_state["playerRuntimeActionCatalog"] = action_catalog.duplicate(true)
	next_ai_state["playerRuntimeFactionModelConfig"] = faction_model_config.duplicate(true)
	next_ai_state["playerRuntimeDevelopmentPlan"] = development_plan.duplicate(true)
	next_ai_state["playerRuntimeBattleReportReadModel"] = battle_report_read_model.duplicate(true)
	next_ai_state["playerRuntimeBattleReportItems"] = battle_report_items.duplicate(true)
	next_ai_state["playerRuntimeExecutionTraceReadModel"] = execution_trace_read_model.duplicate(true)
	next_ai_state["playerRuntimeExecutionTraceItems"] = execution_trace_items.duplicate(true)
	next_ai_state["playerRuntimeAutonomousCombatPlayerReportReadModel"] = autonomous_combat_player_report_read_model.duplicate(true)
	next_ai_state["playerRuntimeAutonomousCombatPlayerReportItems"] = autonomous_combat_player_report_items.duplicate(true)
	next_ai_state["playerRuntimeAutonomousCombatDailySummary"] = autonomous_combat_daily_summary.duplicate(true)
	next_ai_state["playerRuntimeAutonomousCombatCampaignArchive"] = autonomous_combat_campaign_archive.duplicate(true)
	next_ai_state["playerRuntimeAutonomousCombatWarRoomLiveRefresh"] = autonomous_combat_war_room_live_refresh.duplicate(true)
	next_ai_state["playerRuntimeAutonomousCombatWarRoomUiState"] = autonomous_combat_war_room_ui_state.duplicate(true)
	next_ai_state["playerRuntimeListSummary"] = list_summary.duplicate(true)
	next_ai_state["playerRuntimeAutonomyGuard"] = autonomy_guard.duplicate(true)
	next_ai_state["playerRuntimePrimaryAiPlayerId"] = primary_ai_player_id
	next_ai_state["playerRuntimeLastError"] = ""
	next_ai_state["playerRuntimeUpdatedAt"] = Time.get_datetime_string_from_system(false, true)
	_state_adapter.set_ai_state(_target_faction_id, next_ai_state)

func _store_ai_player_proposal_result(response: Dictionary) -> void:
	var current_ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var next_ai_state := current_ai_state.duplicate(true)
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	var proposal_items: Array = next_ai_state.get("playerRuntimeProposalItems", []) as Array
	var proposal: Dictionary = response_data.get("proposal", {}) as Dictionary
	if not proposal.is_empty():
		proposal_items.push_front(proposal.duplicate(true))
	var proposals: Array = response_data.get("proposals", []) as Array
	for proposal_variant in proposals:
		if proposal_variant is Dictionary:
			proposal_items.push_front((proposal_variant as Dictionary).duplicate(true))
	next_ai_state["playerRuntimeProposalItems"] = proposal_items.slice(0, min(proposal_items.size(), 5))
	var receipt: Dictionary = response_data.get("receipt", {}) as Dictionary
	if not receipt.is_empty():
		var receipt_items: Array = next_ai_state.get("playerRuntimeReceiptItems", []) as Array
		receipt_items.push_front(receipt.duplicate(true))
		next_ai_state["playerRuntimeReceiptItems"] = receipt_items.slice(0, min(receipt_items.size(), 5))
	next_ai_state["playerRuntimeLastError"] = ""
	next_ai_state["playerRuntimeUpdatedAt"] = Time.get_datetime_string_from_system(false, true)
	_state_adapter.set_ai_state(_target_faction_id, next_ai_state)

func _store_ai_player_proposal_mutation_result(kind: String, response: Dictionary) -> void:
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	var proposal: Dictionary = response_data.get("proposal", {}) as Dictionary
	var normalized_kind := kind.strip_edges()
	var status := str(proposal.get("status", "")).strip_edges()
	var title := "已批准" if normalized_kind == "approve" else "已驳回"
	var result_text := "AI 可以继续执行这件事。" if normalized_kind == "approve" else "这件事不会执行。"
	var next_step := "下一步看执行结果。" if normalized_kind == "approve" else "等 AI 提新方案。"
	var current_ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var next_ai_state := current_ai_state.duplicate(true)
	next_ai_state["playerRuntimeProposalMutationResult"] = {
		"contract": "ai_proposal_mutation_result_visual_smoke_v1",
		"kind": normalized_kind,
		"status": status,
		"title": title,
		"resultText": result_text,
		"nextStep": next_step,
		"proposal": proposal.duplicate(true),
		"updatedAt": Time.get_datetime_string_from_system(false, true),
	}
	next_ai_state["playerRuntimeLastError"] = ""
	next_ai_state["playerRuntimeUpdatedAt"] = Time.get_datetime_string_from_system(false, true)
	_state_adapter.set_ai_state(_target_faction_id, next_ai_state)

func _store_ai_player_home_city_candidates(response: Dictionary) -> void:
	var current_ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var next_ai_state := current_ai_state.duplicate(true)
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	next_ai_state["playerRuntimeHomeCityCandidates"] = response_data.duplicate(true)
	next_ai_state["playerRuntimeLastError"] = ""
	next_ai_state["playerRuntimeUpdatedAt"] = Time.get_datetime_string_from_system(false, true)
	_state_adapter.set_ai_state(_target_faction_id, next_ai_state)

func _store_ai_player_main_city_facility_entry(response: Dictionary) -> void:
	var current_ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var next_ai_state := current_ai_state.duplicate(true)
	var response_data: Dictionary = response.get("data", {}) as Dictionary
	next_ai_state["playerRuntimeMainCityFacilityEntry"] = response_data.duplicate(true)
	next_ai_state["playerRuntimeLastError"] = ""
	next_ai_state["playerRuntimeUpdatedAt"] = Time.get_datetime_string_from_system(false, true)
	_state_adapter.set_ai_state(_target_faction_id, next_ai_state)

func _store_ai_player_runtime_error(response: Dictionary) -> void:
	var current_ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var next_ai_state := current_ai_state.duplicate(true)
	next_ai_state["playerRuntimeLastError"] = str(response.get("error", response.get("message", "request_failed")))
	next_ai_state["playerRuntimeUpdatedAt"] = Time.get_datetime_string_from_system(false, true)
	_state_adapter.set_ai_state(_target_faction_id, next_ai_state)

func _resolve_ai_player_display_name(ai_player_id: String) -> String:
	var ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var runtime_items: Array = ai_state.get("playerRuntimeList", []) as Array
	for runtime_variant in runtime_items:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		if str(runtime.get("aiPlayerId", runtime.get("id", ""))).strip_edges() != ai_player_id:
			continue
		return str(runtime.get("displayName", runtime.get("name", ai_player_id))).strip_edges()
	return ai_player_id

func _build_next_ai_player_display_name(ai_player_id: String, current_name: String) -> String:
	var normalized_name := current_name.strip_edges()
	if normalized_name == "" or normalized_name == ai_player_id:
		return "青州 AI 参谋"
	if normalized_name.ends_with("（管理）"):
		return normalized_name.trim_suffix("（管理）")
	return "%s（管理）" % normalized_name

func _read_primary_ai_player_id(runtime_items: Array) -> String:
	for item_variant in runtime_items:
		if not (item_variant is Dictionary):
			continue
		var item: Dictionary = item_variant as Dictionary
		var ai_player_id := str(item.get("aiPlayerId", item.get("id", ""))).strip_edges()
		if ai_player_id != "":
			return ai_player_id
	return ""

func _resolve_primary_ai_player_id_from_state() -> String:
	var ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var primary_ai_player_id := str(ai_state.get("playerRuntimePrimaryAiPlayerId", "")).strip_edges()
	if primary_ai_player_id != "":
		return primary_ai_player_id
	var runtime_items: Array = ai_state.get("playerRuntimeList", []) as Array
	primary_ai_player_id = _read_primary_ai_player_id(runtime_items)
	if primary_ai_player_id != "":
		return primary_ai_player_id
	var faction_state := _read_target_faction_state()
	var ai_players: Array = faction_state.get("aiPlayers", []) as Array
	for ai_player_variant in ai_players:
		if not (ai_player_variant is Dictionary):
			continue
		var ai_player: Dictionary = ai_player_variant as Dictionary
		var ai_player_id := str(ai_player.get("id", ai_player.get("aiPlayerId", ""))).strip_edges()
		if ai_player_id != "":
			return ai_player_id
	return ""

func _resolve_governor_player_id_from_state() -> String:
	var ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var runtime_items: Array = ai_state.get("playerRuntimeList", []) as Array
	for runtime_variant in runtime_items:
		if not (runtime_variant is Dictionary):
			continue
		var runtime: Dictionary = runtime_variant as Dictionary
		var governor_player_id := str(runtime.get("governorPlayerId", "")).strip_edges()
		if governor_player_id != "":
			return governor_player_id
	var faction_state := _read_target_faction_state()
	var ai_players: Array = faction_state.get("aiPlayers", []) as Array
	for ai_player_variant in ai_players:
		if not (ai_player_variant is Dictionary):
			continue
		var ai_player: Dictionary = ai_player_variant as Dictionary
		var governor_player_id := str(ai_player.get("governorPlayerId", "")).strip_edges()
		if governor_player_id != "":
			return governor_player_id
	return ""

func _resolve_transfer_resources_for_ai(ai_player_id: String) -> Dictionary:
	var faction_state := _read_target_faction_state()
	var ai_resource_accounts: Dictionary = faction_state.get("aiResourceAccounts", {}) as Dictionary
	var account: Dictionary = ai_resource_accounts.get(ai_player_id, {}) as Dictionary
	var resources: Dictionary = account.get("resources", {}) as Dictionary
	for kind in ["wood", "food", "stone", "iron"]:
		var available := int(resources.get(kind, 0))
		var amount := mini(11, available - 10)
		if amount > 0:
			return {kind: amount}
	return {}

func _resolve_latest_actionable_proposal_from_state() -> Dictionary:
	var ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var proposal_items: Array = ai_state.get("playerRuntimeProposalItems", []) as Array
	for proposal_variant in proposal_items:
		if not (proposal_variant is Dictionary):
			continue
		var proposal: Dictionary = proposal_variant as Dictionary
		var status := str(proposal.get("status", "")).strip_edges()
		if status == "pending_approval" or status == "approved":
			return proposal
	return {}

func _resolve_proposal_by_id_from_state(proposal_id: String) -> Dictionary:
	var normalized_proposal_id := proposal_id.strip_edges()
	if normalized_proposal_id == "":
		return {}
	var ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var proposal_items: Array = ai_state.get("playerRuntimeProposalItems", []) as Array
	for proposal_variant in proposal_items:
		if not (proposal_variant is Dictionary):
			continue
		var proposal: Dictionary = proposal_variant as Dictionary
		var candidate_id := str(proposal.get("proposalId", proposal.get("id", ""))).strip_edges()
		if candidate_id == normalized_proposal_id:
			return proposal
	return {}

func _count_actionable_proposals_from_state() -> int:
	var ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var proposal_items: Array = ai_state.get("playerRuntimeProposalItems", []) as Array
	var count := 0
	for proposal_variant in proposal_items:
		if not (proposal_variant is Dictionary):
			continue
		var proposal: Dictionary = proposal_variant as Dictionary
		var status := str(proposal.get("status", "")).strip_edges()
		if status == "pending_approval" or status == "approved":
			count += 1
	return count

func _resolve_battle_report_followup_args(followup_action: String) -> Dictionary:
	var candidate := _resolve_development_candidate_action(followup_action)
	var proposal_args_variant: Variant = candidate.get("proposalArgs", {})
	if proposal_args_variant is Dictionary and not (proposal_args_variant as Dictionary).is_empty():
		return (proposal_args_variant as Dictionary).duplicate(true)
	var args_variant: Variant = candidate.get("args", {})
	if args_variant is Dictionary and not (args_variant as Dictionary).is_empty():
		return (args_variant as Dictionary).duplicate(true)
	if followup_action == "troop_heal":
		var latest_report := _resolve_latest_battle_report_from_state()
		if bool(latest_report.get("assignedUnitInvolved", false)):
			var unit_id := str(latest_report.get("attackerUnitId", "")).strip_edges()
			if unit_id != "":
				return {"unitId": unit_id}
	return {}

func _resolve_development_candidate_action(action_id: String) -> Dictionary:
	var ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var development_plan: Dictionary = ai_state.get("playerRuntimeDevelopmentPlan", {}) as Dictionary
	var candidate_actions: Array = development_plan.get("candidateActions", []) as Array
	for candidate_variant in candidate_actions:
		if not (candidate_variant is Dictionary):
			continue
		var candidate: Dictionary = candidate_variant as Dictionary
		if str(candidate.get("action", "")).strip_edges() == action_id:
			return candidate
	return {}

func _resolve_latest_battle_report_from_state() -> Dictionary:
	var ai_state: Dictionary = _state_adapter.get_ai_state(_target_faction_id)
	var battle_report_items: Array = ai_state.get("playerRuntimeBattleReportItems", []) as Array
	for report_variant in battle_report_items:
		if report_variant is Dictionary:
			return report_variant as Dictionary
	return {}

func _format_battle_report_followup_reason(followup_action: String) -> String:
	var latest_report := _resolve_latest_battle_report_from_state()
	var report_id := str(latest_report.get("reportId", latest_report.get("id", "latest"))).strip_edges()
	if report_id == "":
		report_id = "latest"
	var suggestion := str(latest_report.get("nextStepSuggestion", "")).strip_edges()
	if suggestion == "":
		suggestion = "根据最近战报与发育计划选择下一步。"
	var action_label := followup_action
	match followup_action:
		"troop_heal":
			action_label = "补兵整备"
		"march_move":
			action_label = "行军靠近目标格"
		"tile_occupy":
			action_label = "占领当前目标地块"
	return "根据战报 %s 生成%s提案：%s" % [report_id, action_label, suggestion]

func _resolve_first_pending_governor_transfer() -> Dictionary:
	var faction_state := _read_target_faction_state()
	var governor_resource_inboxes: Dictionary = faction_state.get("governorResourceInboxes", {}) as Dictionary
	for governor_id_variant in governor_resource_inboxes.keys():
		var governor_player_id := str(governor_id_variant).strip_edges()
		if governor_player_id == "":
			continue
		var inbox_variant: Variant = governor_resource_inboxes.get(governor_player_id, {})
		if not (inbox_variant is Dictionary):
			continue
		var inbox: Dictionary = inbox_variant as Dictionary
		var pending_transfers: Array = inbox.get("pendingTransfers", []) as Array
		for transfer_variant in pending_transfers:
			if not (transfer_variant is Dictionary):
				continue
			var transfer: Dictionary = transfer_variant as Dictionary
			var transfer_id := str(transfer.get("transferId", transfer.get("id", ""))).strip_edges()
			if transfer_id == "":
				continue
			return {
				"governorPlayerId": governor_player_id,
				"transferId": transfer_id,
			}
	return {}

func _resolve_ai_action_failure_state(action_result: Dictionary, fallback: String) -> String:
	var remote_result: Dictionary = action_result.get("remote_result", {}) as Dictionary
	if remote_result.is_empty():
		return fallback
	var response_data: Dictionary = remote_result.get("data", {}) as Dictionary
	var failure_code := str(response_data.get("failureCode", "")).strip_edges()
	if failure_code != "":
		return failure_code
	var error_code := str(response_data.get("errorCode", "")).strip_edges()
	if error_code != "":
		return error_code
	return fallback

func _read_target_faction_state() -> Dictionary:
	var raw_factions: Variant = WorldStore.world.get("factions", {})
	if raw_factions is Dictionary and _target_faction_id != "":
		var faction_state: Variant = (raw_factions as Dictionary).get(_target_faction_id, {})
		if faction_state is Dictionary:
			return faction_state
	return {}

func _build_ai_agenda_intent(action_id: String) -> Dictionary:
	var normalized_action_id := action_id.strip_edges()
	if not _is_ai_agenda_execute_action(normalized_action_id):
		return {}
	return {
		"intent_id": "ai_agenda_execution",
		"kind": "ai_agenda_execution",
		"authority_strategy": "authoritative_first",
		"mode": "backend_world_action",
		"channel": "backend_world_action",
		"bridge_strategy": "direct_backend_action",
		"backend_capable": true,
		"action_name": "queueAiAgendaAction",
		"include_world": true,
		"requires_map_refresh": false,
		"payload": {
			"factionId": _target_faction_id,
			"agendaActionId": normalized_action_id,
		},
	}

func _find_primary_unit() -> Dictionary:
	var raw_units: Variant = WorldStore.world.get("units", [])
	if not (raw_units is Array):
		return {}
	for unit_variant in raw_units as Array:
		if not (unit_variant is Dictionary):
			continue
		var unit: Dictionary = unit_variant as Dictionary
		if str(unit.get("faction", "")).strip_edges() == _target_faction_id:
			return unit
	return {}

func _run_remote_action(action_name: String, payload: Dictionary, include_world: bool) -> Dictionary:
	if _api_client == null or action_name.strip_edges() == "":
		return {
			"ok": false,
			"error": "api_client_unavailable",
		}
	var response: Dictionary = await _api_client.post_world_action(action_name, payload, include_world)
	if not bool(response.get("ok", false)):
		return {
			"ok": false,
			"error": str(response.get("error", "request_failed")),
			"response": response,
		}
	var data: Dictionary = response.get("data", {}) as Dictionary
	if not bool(data.get("ok", false)):
		return {
			"ok": false,
			"error": "action_rejected",
			"response": response,
			"data": data,
		}
	return {
		"ok": true,
		"response": response,
		"data": data,
		"world": data.get("world", {}),
	}

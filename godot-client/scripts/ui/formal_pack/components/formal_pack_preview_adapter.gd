extends RefCounted
class_name FormalPackPreviewAdapter

const ENV_EMPTY_POOLS := "FORMAL_PACK_EMPTY_POOLS"
const ENV_EMPTY_ROSTER := "FORMAL_PACK_EMPTY_ROSTER"
const ENV_EMPTY_DRAW_RESULTS := "FORMAL_PACK_EMPTY_DRAW_RESULTS"
const ENV_DRAW_MODE := "FORMAL_PACK_DRAW_MODE"

const DRAW_MODE_SINGLE := "single"
const DRAW_MODE_FIVE := "five"

const FUTURE_ADAPTER_CONTRACT := {
	"recruit": {
		"field": "visiblePools",
		"source": "RecruitPoolCatalog[]",
		"empty_preview_env": ENV_EMPTY_POOLS,
	},
	"general_roster": {
		"field": "ownedHeroes",
		"source": "OwnedHeroState[] + HeroTemplateCatalog",
		"empty_preview_env": ENV_EMPTY_ROSTER,
	},
	"draw_result": {
		"fields": ["drawMode", "drawCount", "results", "receipt"],
		"source": "backend draw receipt + HeroTemplateCatalog",
		"empty_preview_env": ENV_EMPTY_DRAW_RESULTS,
	},
}

static func recruit_read_model(default_pools: Array) -> Dictionary:
	return {
		"visiblePools": [] if _env_flag(ENV_EMPTY_POOLS) else _duplicate_items(default_pools),
		"source": "preview_only",
	}

static func general_read_model(default_owned_heroes: Array) -> Dictionary:
	return {
		"ownedHeroes": [] if _env_flag(ENV_EMPTY_ROSTER) else _duplicate_items(default_owned_heroes),
		"source": "preview_only",
	}

static func draw_result_read_model(default_results: Array, default_mode: String = DRAW_MODE_FIVE) -> Dictionary:
	var mode := draw_mode(default_mode)
	var draw_count := draw_count_for_mode(mode)
	var results := [] if _env_flag(ENV_EMPTY_DRAW_RESULTS) else _first_items(default_results, draw_count)
	return {
		"drawMode": mode,
		"drawCount": draw_count,
		"results": results,
		"receipt": {
			"receiptId": "receipt_preview_pending",
			"poolId": "preview_pool",
			"drawCount": draw_count,
			"results": results,
		},
		"source": "preview_only",
	}

static func visible_pools(default_pools: Array) -> Array:
	var read_model := recruit_read_model(default_pools)
	return read_model.get("visiblePools", []) as Array

static func owned_heroes(default_owned_heroes: Array) -> Array:
	var read_model := general_read_model(default_owned_heroes)
	return read_model.get("ownedHeroes", []) as Array

static func draw_results(default_results: Array, default_mode: String = DRAW_MODE_FIVE) -> Array:
	var read_model := draw_result_read_model(default_results, default_mode)
	return read_model.get("results", []) as Array

static func draw_mode(default_mode: String = DRAW_MODE_FIVE) -> String:
	var env_mode := OS.get_environment(ENV_DRAW_MODE).strip_edges().to_lower()
	var requested_mode := env_mode if env_mode != "" else default_mode.strip_edges().to_lower()
	return DRAW_MODE_SINGLE if requested_mode == DRAW_MODE_SINGLE or requested_mode == "1" else DRAW_MODE_FIVE

static func draw_count_for_mode(mode: String) -> int:
	return 1 if mode == DRAW_MODE_SINGLE else 5

static func repeat_action_label(mode: String) -> String:
	return "再招募 1 次" if mode == DRAW_MODE_SINGLE else "再招募 5 次"

static func contract() -> Dictionary:
	return FUTURE_ADAPTER_CONTRACT.duplicate(true)

static func _env_flag(name: String) -> bool:
	var value := OS.get_environment(name).strip_edges().to_lower()
	return value == "1" or value == "true" or value == "yes"

static func _first_items(items: Array, count: int) -> Array:
	var result: Array = []
	for index in range(mini(count, items.size())):
		result.append(_duplicate_value(items[index]))
	return result

static func _duplicate_items(items: Array) -> Array:
	var result: Array = []
	for item in items:
		result.append(_duplicate_value(item))
	return result

static func _duplicate_value(value: Variant) -> Variant:
	if typeof(value) == TYPE_DICTIONARY:
		return (value as Dictionary).duplicate(true)
	if typeof(value) == TYPE_ARRAY:
		return (value as Array).duplicate(true)
	return value

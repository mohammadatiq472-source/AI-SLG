extends RefCounted
class_name HeroCardView

const MODE_POOL_PREVIEW := "pool_preview"
const MODE_OWNED_ROSTER := "owned_roster"
const MODE_DRAW_RESULT := "draw_result"
const FormalPackAssetRegistryScript := preload("res://scripts/ui/formal_pack/components/formal_pack_asset_registry.gd")
const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")
const LAYOUT_PRESET_FULL_CARD := "hero_full_card_340x510_v1"
const LAYOUT_PRESET_DEFAULT_CARD := "hero_default_card_224x336_v1"
const FULL_CARD_WIDTH := 340.0
const FULL_CARD_HEIGHT := 510.0
const FULL_CARD_GAP := 22

const HERO_CARD_INPUT_CONTRACT := {
	"identity": ["name", "displayName", "display_name", "faction", "campName", "camp_name", "camp"],
	"identity_display_rule": "name/displayName 由真实数据直接传入；faction/campName 会归一显示为曹魏/季汉/东吴/群雄，不自动生成武将序号。",
	"hero_template": ["heroTemplateId", "template_id", "templateId", "rarity", "quality", "stars", "starText", "levelPreview", "troopType", "portraitAssetKey"],
	"owned_instance": ["heroInstanceId", "instanceId", "instance_id", "heroCardInstanceId", "level", "soldierCount", "team", "owner", "status"],
	"draw_receipt": ["receiptId", "poolId", "drawCount", "resultId", "heroTemplateId", "templateId", "heroInstanceId", "instanceId", "portraitAssetKey", "rarity"],
	"skill_detail": ["skill_detail", "skillDetail", "read_model", "readModel", "trigger", "target", "effect", "compatible_troops", "source"],
	"visual": ["tone", "preview_kind", "asset_ref", "portraitAssetKey", "asset_key"],
}

const HERO_CARD_MODE_CONTRACT := {
	MODE_POOL_PREVIEW: {
		"source": "HeroTemplateCatalog / RecruitPoolCatalog.candidateHeroTemplateIds",
		"shows": ["rarity", "stars", "levelPreview", "troopType"],
		"hides": ["name", "displayName", "team", "owner", "soldierCount"],
	},
	MODE_OWNED_ROSTER: {
		"source": "OwnedHeroState + HeroTemplateCatalog",
		"shows": ["name", "campName", "rarity", "level", "soldierCount", "troopType", "owner", "status"],
		"action": "open_hero_profile:<heroInstanceId>",
	},
	MODE_DRAW_RESULT: {
		"source": "backend draw receipt + HeroTemplateCatalog",
		"shows": ["name", "campName", "rarity", "level", "troopType", "result"],
		"hides": ["owner"],
		"action": "continue same draw count",
	},
}
const HERO_CARD_SKILL_PLATE_VISUAL_MODE := "full_card_skill_plate_v2"

static func build_card(entry: Dictionary, mode: String, config: Dictionary = {}) -> Button:
	var card_entry := normalize_entry(entry, mode)
	var compact := bool(config.get("compact", false))
	var card_width := _hero_card_metric(config, "width", "width", compact)
	var card_height := _hero_card_metric(config, "height", "height", compact)
	var clickable := bool(config.get("clickable", true))
	var card_id := str(card_entry.get("id", "hero_card"))

	var button := Button.new()
	button.name = "HeroCardView_%s_%s" % [mode, card_id]
	button.text = ""
	button.flat = true
	button.focus_mode = Control.FOCUS_NONE
	button.mouse_filter = Control.MOUSE_FILTER_STOP if clickable else Control.MOUSE_FILTER_IGNORE
	button.custom_minimum_size = Vector2(card_width, card_height)
	button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	button.add_theme_stylebox_override("normal", _style(_hero_card_color("button_normal_bg"), _tone_border(card_entry, 0.72), 2))
	button.add_theme_stylebox_override("hover", _style(_hero_card_color("button_hot_bg"), _hero_card_color("button_hot_border"), 2))
	button.add_theme_stylebox_override("pressed", _style(_hero_card_color("button_hot_bg"), _hero_card_color("button_hot_border"), 2))
	button.add_theme_stylebox_override("disabled", _style(_hero_card_color("button_normal_bg"), _tone_border(card_entry, 0.72), 2))

	var outer_margin := int(_hero_card_metric(config, "outer_margin", "outer_margin", compact))
	var margin := _margin(outer_margin, outer_margin, outer_margin, outer_margin)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	button.add_child(margin)

	var portrait := _panel(_hero_card_color("portrait_bg"), _hero_card_color("portrait_border"), 2)
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait.custom_minimum_size = Vector2(0, card_height - float(outer_margin * 2))
	portrait.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(portrait)

	var portrait_margin_value := int(_hero_card_metric(config, "inner_margin", "inner_margin", compact))
	var portrait_margin := _margin(portrait_margin_value, portrait_margin_value, portrait_margin_value, portrait_margin_value)
	portrait_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait.add_child(portrait_margin)
	var visual_config := config.duplicate()
	visual_config["_card_height"] = card_height
	visual_config["_outer_margin"] = outer_margin
	visual_config["_inner_margin"] = portrait_margin_value
	portrait_margin.add_child(_build_portrait_visual(card_entry, mode, compact, visual_config))
	if _is_skill_card(card_entry) and bool(config.get("skill_flip_enabled", true)):
		button.set_meta("hero_card_skill_flip_mode", "click_front_back")
		button.set_meta("hero_card_skill_face", "front")
		button.pressed.connect(_toggle_skill_card_face.bind(button))
	return button

static func build_card_from_receipt(receipt_entry: Dictionary, config: Dictionary = {}) -> Button:
	return build_card(receipt_entry, MODE_DRAW_RESULT, config)

static func full_card_config(mode: String, overrides: Dictionary = {}) -> Dictionary:
	var config := {
		"layout_preset_id": LAYOUT_PRESET_FULL_CARD,
		"layout_preset_version": "v1",
		"width": FULL_CARD_WIDTH,
		"height": FULL_CARD_HEIGHT,
		"compact": false,
		"top_height": 20.0,
		"top_alpha": 0.18,
		"top_left_width": 72.0,
		"left_strip_width": 46.0,
		"left_strip_alpha": 0.20,
		"identity_strip_height": 184.0,
		"identity_faction_font_size": 12,
		"identity_name_font_size": 15,
		"overlay_alpha": 0.20,
		"overlay_height": 56.0,
		"bottom_height": 32.0,
		"bottom_alpha": 0.34,
		"owner_slot_mode": "none" if mode == MODE_DRAW_RESULT else "owner_display_name",
		"owner_slot_fallback": "主公",
	}
	for key in overrides.keys():
		config[key] = overrides[key]
	return config

static func input_contract() -> Dictionary:
	return HERO_CARD_INPUT_CONTRACT.duplicate(true)

static func mode_contract() -> Dictionary:
	return HERO_CARD_MODE_CONTRACT.duplicate(true)


static func visual_token_summary() -> Dictionary:
	return UI_COMPONENT_FACTORY.hero_card_token_summary()


static func append_smoke_summary(
	summary: Dictionary,
	mode: String,
	compact: bool = false,
	sample_count: int = 0,
	identity_strip_visible: bool = true,
	sample_entries: Array = [],
	layout_config: Dictionary = {}
) -> void:
	UI_COMPONENT_FACTORY.apply_hero_card_summary(summary, mode, compact, sample_count, identity_strip_visible)
	_append_layout_preset_summary(summary, mode, compact, layout_config)
	_append_portrait_resolution_summary(summary, mode, sample_entries)
	_append_portrait_stage_fill_summary(summary, mode, compact, sample_entries)
	_append_skill_card_visual_summary(summary, mode, sample_entries)


static func normalize_entry(raw: Dictionary, mode: String = MODE_OWNED_ROSTER) -> Dictionary:
	var entry := raw.duplicate(true)
	var identity_name := str(_first_value(raw, ["name", "displayName", "display_name", "heroName", "hero_name"], ""))
	var identity_faction := _normalize_faction_label(str(_first_value(raw, ["faction", "campName", "camp_name", "camp", "forceName", "force_name"], "")))
	var rarity := str(_first_value(raw, ["rarity", "quality"], str(entry.get("quality", "")))).strip_edges()
	var stars := str(_first_value(raw, ["stars", "starText", "star_text"], "")).strip_edges()
	if stars == "" and (rarity == "S" or rarity == "S级"):
		stars = "★★★★★"
	elif stars == "" and rarity != "":
		stars = rarity

	entry["id"] = str(_first_value(raw, ["id", "heroInstanceId", "instanceId", "instance_id", "heroCardInstanceId", "cardInstanceId", "heroTemplateId", "template_id"], "hero_card"))
	entry["name"] = identity_name
	entry["display_name"] = identity_name
	entry["faction"] = identity_faction
	entry["camp"] = identity_faction
	entry["tone"] = _faction_tone_key(identity_faction, str(_first_value(raw, ["tone", "toneKey", "visualTone", "visual_tone"], entry.get("tone", ""))))
	entry["quality"] = rarity
	entry["rarity"] = rarity
	entry["stars"] = stars
	entry["level"] = _first_value(raw, ["level", "heroLevel", "hero_level", "levelPreview"], entry.get("level", ""))
	entry["troop"] = _first_value(raw, ["troop", "troopType", "troop_type", "soldierType", "soldier_type"], entry.get("troop", ""))
	entry["power"] = _first_value(raw, ["power", "soldierCount", "soldier_count", "strength"], entry.get("power", ""))
	entry["team"] = _first_value(raw, ["team", "teamName", "team_name", "armyName", "army_name"], entry.get("team", ""))
	entry["owner"] = _first_value(raw, ["owner", "ownerLabel", "owner_label", "ownerDisplayName", "owner_display_name", "controller", "controllerDisplayName", "controller_display_name", "playerName", "player_name", "playerDisplayName", "player_display_name", "aiPlayerName", "ai_player_name"], entry.get("owner", ""))
	entry["status"] = _first_value(raw, ["status", "stateLabel", "state_label"], entry.get("status", ""))
	entry["template_id"] = str(_first_value(raw, ["template_id", "heroTemplateId", "templateId"], entry.get("template_id", "")))
	entry["instance_id"] = str(_first_value(raw, ["instance_id", "heroInstanceId", "instanceId", "heroCardInstanceId", "cardInstanceId"], entry.get("instance_id", "")))
	entry["hero_id"] = str(_first_value(raw, ["heroId", "hero_id"], ""))
	var raw_asset_ref: Variant = _first_value(raw, ["asset_ref", "assetRef"], {})
	if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():
		entry["asset_ref"] = (raw_asset_ref as Dictionary).duplicate(true)
	entry["asset_key"] = str(_first_value(raw, ["asset_key", "portraitAssetKey", "portrait_asset_key", "assetKey"], entry.get("asset_key", "")))
	if mode == MODE_DRAW_RESULT:
		entry["result_label"] = str(_first_value(raw, ["result_label", "resultLabel", "rarityLabel"], rarity if rarity != "" else "获得"))
		entry["draw_label"] = str(_first_value(raw, ["draw_label", "drawLabel", "receiptLabel", "status"], entry.get("status", "")))
	return entry

static func _append_layout_preset_summary(summary: Dictionary, mode: String, compact: bool, layout_config: Dictionary) -> void:
	var config := layout_config
	if config.is_empty():
		config = {
			"layout_preset_id": LAYOUT_PRESET_DEFAULT_CARD,
			"layout_preset_version": "v1",
			"width": UI_COMPONENT_FACTORY.hero_card_metric("width", compact),
			"height": UI_COMPONENT_FACTORY.hero_card_metric("height", compact),
			"top_height": UI_COMPONENT_FACTORY.hero_card_metric("top_height", compact),
			"left_strip_width": UI_COMPONENT_FACTORY.hero_card_metric("left_strip_width", compact),
			"identity_strip_height": UI_COMPONENT_FACTORY.hero_card_metric("identity_min_height", compact),
			"overlay_height": UI_COMPONENT_FACTORY.hero_card_metric("roster_overlay_height" if mode == MODE_OWNED_ROSTER else "draw_overlay_height", compact),
			"bottom_height": UI_COMPONENT_FACTORY.hero_card_metric("bottom_height", compact),
			"owner_slot_mode": "none",
		}
	summary["heroCardLayoutPresetId"] = str(config.get("layout_preset_id", LAYOUT_PRESET_DEFAULT_CARD))
	summary["heroCardLayoutPresetVersion"] = str(config.get("layout_preset_version", "v1"))
	summary["heroCardWidth"] = float(config.get("width", UI_COMPONENT_FACTORY.hero_card_metric("width", compact)))
	summary["heroCardHeight"] = float(config.get("height", UI_COMPONENT_FACTORY.hero_card_metric("height", compact)))
	summary["heroCardTopHeight"] = float(config.get("top_height", UI_COMPONENT_FACTORY.hero_card_metric("top_height", compact)))
	summary["heroCardLeftStripWidth"] = float(config.get("left_strip_width", UI_COMPONENT_FACTORY.hero_card_metric("left_strip_width", compact)))
	summary["heroCardIdentityStripHeight"] = float(config.get("identity_strip_height", UI_COMPONENT_FACTORY.hero_card_metric("identity_min_height", compact)))
	summary["heroCardOverlayHeight"] = float(config.get("overlay_height", UI_COMPONENT_FACTORY.hero_card_metric("roster_overlay_height" if mode == MODE_OWNED_ROSTER else "draw_overlay_height", compact)))
	summary["heroCardBottomHeight"] = float(config.get("bottom_height", UI_COMPONENT_FACTORY.hero_card_metric("bottom_height", compact)))
	summary["heroCardOwnerSlotMode"] = str(config.get("owner_slot_mode", "none"))

static func _normalize_faction_label(raw_faction: String) -> String:
	var faction := raw_faction.strip_edges()
	match faction:
		"魏", "曹魏":
			return "曹魏"
		"蜀", "汉", "季汉", "纪汉":
			return "季汉"
		"吴", "东吴", "孙吴":
			return "东吴"
		"群", "群雄":
			return "群雄"
		"晋", "晋国":
			return "晋国"
		"东汉":
			return "东汉"
		_:
			return faction

static func _faction_tone_key(faction_label: String, fallback: String = "") -> String:
	match _normalize_faction_label(faction_label):
		"曹魏":
			return "cao_wei"
		"季汉":
			return "ji_han"
		"东吴":
			return "dong_wu"
		"群雄":
			return "qun_xiong"
		"东汉":
			return "dong_han"
		"晋国":
			return "jin"
		_:
			return fallback.strip_edges()

static func _first_value(raw: Dictionary, keys: Array, fallback: Variant = "") -> Variant:
	for key_variant in keys:
		var key := str(key_variant)
		if not raw.has(key):
			continue
		var value: Variant = raw.get(key)
		if value == null:
			continue
		if value is String and value.strip_edges() == "":
			continue
		return value
	return fallback

static func _portrait_texture(entry: Dictionary) -> Texture2D:
	var registered_texture: Texture2D = FormalPackAssetRegistryScript.portrait_texture_from_ref(_portrait_payload(entry))
	if registered_texture != null:
		return registered_texture
	return null

static func _append_portrait_resolution_summary(summary: Dictionary, mode: String, sample_entries: Array) -> void:
	var checked_count := 0
	var identity_count := 0
	var registry_count := 0
	var fallback_count := 0
	var source_miss_count := 0
	var first_identity_key := ""
	for raw_entry_variant in sample_entries:
		if not (raw_entry_variant is Dictionary):
			continue
		var entry := normalize_entry(raw_entry_variant as Dictionary, mode)
		var payload := _portrait_payload(entry)
		var source := ""
		if _portrait_payload_has_identity(payload):
			identity_count += 1
			if first_identity_key == "":
				first_identity_key = _portrait_payload_identity_key(payload)
			source = FormalPackAssetRegistryScript.portrait_resolution_source(payload)
			if source != "":
				checked_count += 1
				if source == UI_COMPONENT_FACTORY.PORTRAIT_FRAME_REGISTRY_ID:
					registry_count += 1
				else:
					fallback_count += 1
			else:
				source_miss_count += 1
	summary["heroCardPortraitResolveMode"] = "registry_first"
	summary["heroCardPortraitSampleIdentityCount"] = identity_count
	summary["heroCardPortraitFirstIdentityKey"] = first_identity_key
	summary["heroCardPortraitSampleCheckedCount"] = checked_count
	summary["heroCardPortraitSourceMissCount"] = source_miss_count
	summary["heroCardPortraitFallbackCount"] = fallback_count
	if checked_count > 0 and fallback_count == 0 and registry_count == checked_count:
		summary["heroCardPortraitResolvedBy"] = UI_COMPONENT_FACTORY.PORTRAIT_FRAME_REGISTRY_ID
	elif checked_count > 0:
		summary["heroCardPortraitResolvedBy"] = "mixed_or_fallback"
	else:
		summary["heroCardPortraitResolvedBy"] = ""

static func _append_skill_card_visual_summary(summary: Dictionary, mode: String, sample_entries: Array) -> void:
	var skill_count := 0
	var trigger_text_count := 0
	var target_text_count := 0
	var effect_text_count := 0
	var troops_text_count := 0
	var source_text_count := 0
	var asset_ref_slot_count := 0
	var asset_ref_texture_count := 0
	var no_crop_asset_count := 0
	var first_asset_fit_mode := ""
	var first_asset_safe_margin := ""
	var first_asset_preprocess := ""
	var bottom_status_count := 0
	var front_level_text_count := 0
	var equipped_status_text_count := 0
	var equipped_level_text_count := 0
	var unequipped_level_text_count := 0
	var equipped_missing_level_count := 0
	var type_label_text_count := 0
	var type_label_values: Array[String] = []
	var controller_status_text_count := 0
	var controller_level_text_count := 0
	var level_read_model_count := 0
	var level_range_invalid_count := 0
	var level_min := 0
	var level_max := 0
	for raw_entry_variant in sample_entries:
		if not (raw_entry_variant is Dictionary):
			continue
		var entry := normalize_entry(raw_entry_variant as Dictionary, mode)
		if _is_skill_card(entry):
			skill_count += 1
			var asset_ref := _skill_card_asset_ref(entry)
			if not asset_ref.is_empty():
				asset_ref_slot_count += 1
				var asset_fit_mode := _skill_card_asset_fit_mode_from_ref(asset_ref)
				if first_asset_fit_mode == "":
					first_asset_fit_mode = asset_fit_mode
				if asset_fit_mode == "contain_no_crop":
					no_crop_asset_count += 1
				var asset_safe_margin := _skill_card_asset_safe_margin_from_ref(asset_ref)
				if first_asset_safe_margin == "":
					first_asset_safe_margin = asset_safe_margin
				var asset_preprocess := _skill_card_asset_preprocess_from_ref(asset_ref)
				if first_asset_preprocess == "":
					first_asset_preprocess = asset_preprocess
			if _skill_card_asset_texture(entry) != null:
				asset_ref_texture_count += 1
			if _skill_card_status_text(entry) != "":
				bottom_status_count += 1
			var skill_card_type_text := _skill_card_type_text(entry)
			if skill_card_type_text != "":
				type_label_text_count += 1
				if not type_label_values.has(skill_card_type_text):
					type_label_values.append(skill_card_type_text)
			var equipped_hero_name := _skill_card_equipped_hero_name(entry)
			var controller_display_name := _skill_card_controller_display_name(entry)
			var skill_level_text := _skill_card_level_text(entry)
			var has_skill_level := _skill_card_has_level_read_model(entry)
			var skill_level_value := _skill_card_level_int(entry)
			if has_skill_level:
				level_read_model_count += 1
				if skill_level_value < 1 or skill_level_value > 10:
					level_range_invalid_count += 1
				else:
					if level_min == 0 or skill_level_value < level_min:
						level_min = skill_level_value
					if skill_level_value > level_max:
						level_max = skill_level_value
			if equipped_hero_name != "" and skill_level_value < 1:
				equipped_missing_level_count += 1
			if equipped_hero_name != "" and _skill_card_status_text(entry) != "":
				equipped_status_text_count += 1
			if controller_display_name != "" and _skill_card_status_text(entry) != "":
				controller_status_text_count += 1
			if skill_level_text != "":
				front_level_text_count += 1
				if equipped_hero_name != "":
					equipped_level_text_count += 1
				else:
					unequipped_level_text_count += 1
				if controller_display_name != "":
					controller_level_text_count += 1
			if _skill_card_back_field_text(entry, "trigger") != "":
				trigger_text_count += 1
			if _skill_card_back_field_text(entry, "target") != "":
				target_text_count += 1
			if _skill_card_back_field_text(entry, "effect") != "":
				effect_text_count += 1
			if _skill_card_back_field_text(entry, "troops") != "":
				troops_text_count += 1
			if _skill_card_back_field_text(entry, "source") != "":
				source_text_count += 1
	summary["heroCardSkillCardCount"] = skill_count
	summary["heroCardSkillCardVisualMode"] = HERO_CARD_SKILL_PLATE_VISUAL_MODE if skill_count > 0 else ""
	summary["heroCardSkillCardCenterTextVisible"] = false
	summary["heroCardSkillCardFrontTextMode"] = "hero_card_skill_front_asset_ref_status_only_v1" if skill_count > 0 else ""
	summary["heroCardSkillCardFrontNameTextCount"] = 0
	summary["heroCardSkillCardFrontGradeTextCount"] = 0
	summary["heroCardSkillCardFrontLevelTextCount"] = front_level_text_count
	summary["heroCardSkillCardAssetRefSlotMode"] = "skill_detail_asset_ref_png_v1" if skill_count > 0 else ""
	summary["heroCardSkillCardAssetRefSlotCount"] = asset_ref_slot_count
	summary["heroCardSkillCardAssetRefTextureCount"] = asset_ref_texture_count
	summary["heroCardSkillCardAssetFitMode"] = first_asset_fit_mode if skill_count > 0 else ""
	summary["heroCardSkillCardNoCropAssetCount"] = no_crop_asset_count
	summary["heroCardSkillCardAssetSafeMargin"] = first_asset_safe_margin if skill_count > 0 else ""
	summary["heroCardSkillCardAssetPreprocess"] = first_asset_preprocess if skill_count > 0 else ""
	summary["heroCardSkillCardTopStarsVisible"] = false
	summary["heroCardSkillCardDrawOverlayTextCount"] = 0
	summary["heroCardSkillCardBottomStatusTextCount"] = bottom_status_count
	summary["heroCardSkillCardBottomStatusMode"] = "skill_type_left_controller_level_right_v1" if skill_count > 0 else ""
	summary["heroCardSkillCardTypeLabelTextCount"] = type_label_text_count
	summary["heroCardSkillCardTypeLabelValues"] = " / ".join(type_label_values)
	summary["heroCardSkillCardTypeLabelFontSize"] = maxi(UI_COMPONENT_FACTORY.hero_card_font_size("bottom", false) + 4, 17) if skill_count > 0 else 0
	summary["heroCardSkillCardEquipStatusMode"] = "single_bottom_status_read_model_v1" if skill_count > 0 else ""
	summary["heroCardSkillCardEquipReadModelSource"] = "controller_display_name/equipped_hero_name/skill_level" if skill_count > 0 else ""
	summary["heroCardSkillCardLevelReadModelSource"] = "skill_level/skillLevel" if skill_count > 0 else ""
	summary["heroCardSkillCardLevelRangeMode"] = "skill_level_1_10_v1" if skill_count > 0 else ""
	summary["heroCardSkillCardLevelReadModelCount"] = level_read_model_count
	summary["heroCardSkillCardLevelRangeInvalidCount"] = level_range_invalid_count
	summary["heroCardSkillCardLevelMin"] = level_min
	summary["heroCardSkillCardLevelMax"] = level_max
	summary["heroCardSkillCardDefaultLevelFallbackCount"] = 0
	summary["heroCardSkillCardEquippedMissingLevelCount"] = equipped_missing_level_count
	summary["heroCardSkillCardControllerStatusTextCount"] = controller_status_text_count
	summary["heroCardSkillCardControllerLevelTextCount"] = controller_level_text_count
	summary["heroCardSkillCardEquippedStatusTextCount"] = equipped_status_text_count
	summary["heroCardSkillCardEquippedLevelTextCount"] = equipped_level_text_count
	summary["heroCardSkillCardUnequippedLevelTextCount"] = unequipped_level_text_count
	summary["heroCardSkillCardDetailTextVisible"] = false
	summary["heroCardSkillCardDetailTextCount"] = 0
	summary["heroCardSkillCardFlipEnabled"] = skill_count > 0
	summary["heroCardSkillCardFlipMode"] = "click_front_back" if skill_count > 0 else ""
	summary["heroCardSkillBackFaceAvailable"] = skill_count > 0
	summary["heroCardSkillBackFaceReadModelSource"] = "skill_detail/read_model" if skill_count > 0 else ""
	summary["heroCardSkillBackFaceFieldFontSize"] = maxi(UI_COMPONENT_FACTORY.hero_card_font_size("skill_meta", false) + 2, 16)
	summary["heroCardSkillBackFaceFieldMaxLines"] = 3
	summary["heroCardSkillBackFaceTriggerTextCount"] = trigger_text_count
	summary["heroCardSkillBackFaceTargetTextCount"] = target_text_count
	summary["heroCardSkillBackFaceEffectTextCount"] = effect_text_count
	summary["heroCardSkillBackFaceTroopsTextCount"] = troops_text_count
	summary["heroCardSkillBackFaceSourceTextCount"] = source_text_count
	summary["heroCardSkillCardEmptyStageAllowed"] = skill_count == 0


static func _append_portrait_stage_fill_summary(summary: Dictionary, mode: String, compact: bool, sample_entries: Array) -> void:
	var portrait_count := 0
	for raw_entry_variant in sample_entries:
		if not (raw_entry_variant is Dictionary):
			continue
		var entry := normalize_entry(raw_entry_variant as Dictionary, mode)
		if _portrait_payload_has_identity(_portrait_payload(entry)):
			portrait_count += 1
	if portrait_count > 0:
		summary["heroCardPortraitStageFillMode"] = "full_card_underlay_v1"
		summary["heroCardPortraitStageMinFillRatio"] = _hero_card_metric({}, "portrait_stage_fill_ratio", "portrait_stage_fill_ratio", compact)
		summary["heroCardPortraitStageUsesContentCrop"] = false
	else:
		summary["heroCardPortraitStageFillMode"] = ""
		summary["heroCardPortraitStageMinFillRatio"] = 0.0
		summary["heroCardPortraitStageUsesContentCrop"] = false

static func _portrait_payload(entry: Dictionary) -> Dictionary:
	return UI_COMPONENT_FACTORY.hero_portrait_payload_from_entry(entry)

static func _portrait_payload_has_identity(payload: Dictionary) -> bool:
	for field_variant in ["portraitAssetKey", "portrait_asset_key", "heroId", "hero_id", "portraitKey", "portrait_key", "avatarKey", "avatar_key"]:
		if str(payload.get(str(field_variant), "")).strip_edges() != "":
			return true
	return false

static func _portrait_payload_identity_key(payload: Dictionary) -> String:
	for field_variant in ["portraitAssetKey", "portrait_asset_key", "heroId", "hero_id", "portraitKey", "portrait_key", "avatarKey", "avatar_key"]:
		var field := str(field_variant)
		var value := str(payload.get(field, "")).strip_edges()
		if value != "":
			return "%s:%s" % [field, value]
	return ""

static func _is_skill_card(entry: Dictionary) -> bool:
	var kind := str(entry.get("preview_kind", entry.get("previewKind", ""))).strip_edges()
	if kind == "skill":
		return true
	var title := str(entry.get("title", "")).strip_edges()
	if kind == "" and title.find("战法") >= 0 and not _portrait_payload_has_identity(_portrait_payload(entry)):
		return true
	var faction := str(entry.get("faction", entry.get("camp", ""))).strip_edges()
	var troop_type := str(entry.get("troopType", entry.get("troop", ""))).strip_edges()
	return kind == "" and (faction == "战法" or troop_type == "战法") and not _portrait_payload_has_identity(_portrait_payload(entry))

static func _skill_card_grade_text(entry: Dictionary) -> String:
	var value := str(entry.get("value", "")).strip_edges()
	var split_at := value.find("·")
	var grade := value.substr(0, split_at).strip_edges() if split_at > 0 else str(entry.get("result_label", "")).strip_edges()
	if grade == "":
		grade = str(entry.get("quality", entry.get("rarity", "战法"))).strip_edges()
	if grade == "":
		grade = "战法"
	return "%s级" % grade if grade.length() == 1 else grade

static func _skill_card_type_text(entry: Dictionary) -> String:
	var detail := _skill_detail_read_model(entry)
	var skill_type := str(_first_value(detail, ["type", "skill_type", "skillType", "category"], "")).strip_edges()
	if skill_type == "":
		skill_type = str(_first_value(entry, ["type", "skill_type", "skillType", "category"], "")).strip_edges()
	match skill_type:
		"指挥":
			return "指挥"
		"主动", "恢复":
			return "主动"
		"被动":
			return "被动"
		"追击", "突击":
			return "追击"
	if skill_type == "" or skill_type == "战法":
		return "战法"
	return skill_type

static func _skill_card_level_text(entry: Dictionary) -> String:
	var detail := _skill_detail_read_model(entry)
	var equipped_hero := _skill_card_equipped_hero_name(entry)
	var controller := _skill_card_controller_display_name(entry)
	var show_level := bool(detail.get("show_level", entry.get("show_level", false)))
	if equipped_hero == "" and controller == "" and not show_level:
		return ""
	if not _skill_card_has_level_read_model(entry):
		return ""
	var level_value := _skill_card_level_int(entry)
	if level_value < 1 or level_value > 10:
		return ""
	var level_text := str(level_value)
	return "Lv.%s" % level_text

static func _skill_card_status_text(entry: Dictionary) -> String:
	var detail := _skill_detail_read_model(entry)
	var level_text := _skill_card_level_text(entry)
	var controller := _skill_card_controller_display_name(entry)
	if controller != "":
		return "%s · %s" % [controller, level_text] if level_text != "" else controller
	var equipped_hero := _skill_card_equipped_hero_name(entry)
	if equipped_hero != "":
		return "%s携带 · %s" % [equipped_hero, level_text] if level_text != "" else "%s携带" % equipped_hero
	var explicit_status := str(detail.get("status", entry.get("status", ""))).strip_edges()
	if explicit_status != "":
		return explicit_status
	return "可装配"

static func _skill_card_equipped_hero_name(entry: Dictionary) -> String:
	var detail := _skill_detail_read_model(entry)
	for key in ["equipped_hero_name", "equippedHeroName", "equipped_by", "equippedBy"]:
		if not detail.has(key) and entry.has(key):
			detail[key] = entry.get(key)
	return str(_first_value(detail, ["equipped_hero_name", "equippedHeroName", "equipped_by", "equippedBy"], "")).strip_edges()

static func _skill_card_controller_display_name(entry: Dictionary) -> String:
	var detail := _skill_detail_read_model(entry)
	var controller_keys := [
		"controller_display_name",
		"controllerDisplayName",
		"controller_name",
		"controllerName",
		"owner_display_name",
		"ownerDisplayName",
		"owner_name",
		"ownerName",
		"player_display_name",
		"playerDisplayName",
		"player_name",
		"playerName",
		"equipped_owner_name",
		"equippedOwnerName",
		"owner",
	]
	for key_variant in controller_keys:
		var key := str(key_variant)
		if not detail.has(key) and entry.has(key):
			detail[key] = entry.get(key)
	return str(_first_value(detail, controller_keys, "")).strip_edges()

static func _skill_card_has_level_read_model(entry: Dictionary) -> bool:
	var raw_level: Variant = _skill_card_level_raw_value(entry)
	if raw_level == null:
		return false
	return str(raw_level).strip_edges() != ""

static func _skill_card_level_int(entry: Dictionary) -> int:
	var raw_level: Variant = _skill_card_level_raw_value(entry)
	if raw_level == null:
		return -1
	return _skill_card_level_value_int(raw_level)

static func _skill_card_level_raw_value(entry: Dictionary) -> Variant:
	var detail := _skill_detail_read_model(entry)
	if detail.has("skill_level"):
		return detail.get("skill_level")
	if detail.has("skillLevel"):
		return detail.get("skillLevel")
	return null

static func _skill_card_level_value_int(raw_level: Variant) -> int:
	if raw_level == null:
		return -1
	if raw_level is int:
		return int(raw_level)
	if raw_level is float:
		var level_float := float(raw_level)
		var rounded_level := int(round(level_float))
		if abs(level_float - float(rounded_level)) < 0.001:
			return rounded_level
		return -1
	var text := str(raw_level).strip_edges()
	if text.begins_with("Lv."):
		text = text.substr(3).strip_edges()
	elif text.begins_with("Lv"):
		text = text.substr(2).strip_edges()
	if text.ends_with("级"):
		text = text.substr(0, text.length() - 1).strip_edges()
	if text == "" or not text.is_valid_int():
		return -1
	return int(text)

static func _skill_card_level_value_text(raw_level: Variant) -> String:
	var level_value := _skill_card_level_value_int(raw_level)
	if level_value < 1 or level_value > 10:
		return ""
	return str(level_value)

static func _skill_card_name_text(entry: Dictionary) -> String:
	var value := str(entry.get("value", entry.get("name", ""))).strip_edges()
	var split_at := value.find("·")
	if split_at >= 0 and split_at + 1 < value.length():
		return value.substr(split_at + 1).strip_edges()
	if value != "":
		return value
	return str(entry.get("title", "战法")).strip_edges()

static func _skill_card_meta_text(entry: Dictionary) -> String:
	var meta := str(entry.get("meta", "")).strip_edges()
	var split_at := meta.find("/")
	if split_at > 0:
		meta = meta.substr(0, split_at).strip_edges()
	if meta == "":
		meta = "可装配"
	return meta

static func _skill_card_detail_text(entry: Dictionary) -> String:
	return ""

static func _skill_detail_read_model(entry: Dictionary) -> Dictionary:
	var raw_detail: Variant = entry.get("skill_detail", entry.get("skillDetail", entry.get("read_model", entry.get("readModel", {}))))
	var detail := (raw_detail as Dictionary).duplicate(true) if raw_detail is Dictionary else {}
	var nested_read_model: Variant = detail.get("read_model", detail.get("readModel", {}))
	if nested_read_model is Dictionary:
		detail = (nested_read_model as Dictionary).duplicate(true)
	for key in ["description", "trigger", "target", "effect", "source", "unlock_hint", "type", "skill_type", "skillType", "category", "grade", "level", "skill_level", "skillLevel", "status", "equipped_hero_name", "equippedHeroName", "equipped_by", "equippedBy", "controller_display_name", "controllerDisplayName", "controller_name", "controllerName", "owner_display_name", "ownerDisplayName", "owner_name", "ownerName", "player_display_name", "playerDisplayName", "player_name", "playerName", "equipped_owner_name", "equippedOwnerName", "owner"]:
		if not detail.has(key) and entry.has(key):
			detail[key] = entry.get(key)
	if not detail.has("asset_ref"):
		var raw_asset_ref: Variant = entry.get("asset_ref", entry.get("assetRef", {}))
		if raw_asset_ref is Dictionary:
			detail["asset_ref"] = (raw_asset_ref as Dictionary).duplicate(true)
	if not detail.has("assetRef") and detail.has("asset_ref"):
		detail["assetRef"] = detail.get("asset_ref")
	if not detail.has("compatible_troops"):
		if entry.has("compatible_troops"):
			detail["compatible_troops"] = entry.get("compatible_troops")
		elif entry.has("compatibleTroops"):
			detail["compatible_troops"] = entry.get("compatibleTroops")
	if not detail.has("attribute_effects") and entry.has("attribute_effects"):
		detail["attribute_effects"] = entry.get("attribute_effects")
	return detail

static func _skill_card_back_field_text(entry: Dictionary, field: String) -> String:
	var detail := _skill_detail_read_model(entry)
	match field:
		"trigger":
			return _trim_text(str(detail.get("trigger", "")).strip_edges(), 72)
		"target":
			return _trim_text(str(detail.get("target", "")).strip_edges(), 72)
		"effect":
			var effect := str(detail.get("effect", "")).strip_edges()
			var attribute_text := _skill_attribute_effects_text(detail.get("attribute_effects", {}))
			if attribute_text != "":
				effect = "%s / %s" % [effect, attribute_text] if effect != "" else attribute_text
			return _trim_text(effect, 82)
		"troops":
			var troops := _string_array(detail.get("compatible_troops", detail.get("compatibleTroops", [])))
			if not troops.is_empty():
				return _trim_text(" / ".join(troops), 58)
			return _trim_text(_skill_card_meta_text(entry), 58)
		"source":
			return _trim_text(_skill_source_text(detail.get("source", entry.get("source", "")), detail), 72)
	return ""

static func _skill_card_asset_ref(entry: Dictionary) -> Dictionary:
	var detail := _skill_detail_read_model(entry)
	var raw_asset_ref: Variant = detail.get("asset_ref", detail.get("assetRef", entry.get("asset_ref", entry.get("assetRef", {}))))
	if raw_asset_ref is Dictionary:
		return (raw_asset_ref as Dictionary).duplicate(true)
	return {}

static func _skill_card_asset_texture(entry: Dictionary) -> Texture2D:
	var asset_ref := _skill_card_asset_ref(entry)
	var res_path := _asset_ref_res_path(asset_ref)
	if res_path == "":
		return null
	var resource := load(res_path)
	if resource is Texture2D:
		return resource as Texture2D
	if FileAccess.file_exists(res_path):
		var image := Image.new()
		if image.load(res_path) == OK:
			return ImageTexture.create_from_image(image)
	return null

static func _skill_card_asset_strategy_payload(asset_ref: Dictionary) -> Dictionary:
	var camel_key := "display" + "Strategy"
	var snake_key := "display_" + "strategy"
	var raw_strategy: Variant = asset_ref.get(camel_key, asset_ref.get(snake_key, {}))
	if raw_strategy is Dictionary:
		return (raw_strategy as Dictionary)
	return {}

static func _skill_card_asset_fit_mode_from_ref(asset_ref: Dictionary) -> String:
	return str(_skill_card_asset_strategy_payload(asset_ref).get("fit", "")).strip_edges()

static func _skill_card_asset_safe_margin_from_ref(asset_ref: Dictionary) -> String:
	return str(_skill_card_asset_strategy_payload(asset_ref).get("safeMargin", "")).strip_edges()

static func _skill_card_asset_preprocess_from_ref(asset_ref: Dictionary) -> String:
	return str(_skill_card_asset_strategy_payload(asset_ref).get("preprocess", "")).strip_edges()

static func _asset_ref_res_path(asset_ref: Dictionary) -> String:
	for field_variant in ["resPath", "res_path", "godotResourcePath", "godot_resource_path", "pngPath", "png_path", "path"]:
		var field := str(field_variant)
		var raw_path := str(asset_ref.get(field, "")).strip_edges()
		if raw_path == "":
			continue
		return raw_path if raw_path.begins_with("res://") else raw_path.replace("\\", "/")
	return ""

static func _skill_attribute_effects_text(raw_value: Variant) -> String:
	if not (raw_value is Dictionary):
		return ""
	var parts: Array[String] = []
	for key_variant in (raw_value as Dictionary).keys():
		var key := str(key_variant).strip_edges()
		var value := str((raw_value as Dictionary).get(key_variant, "")).strip_edges()
		if key != "" and value != "":
			parts.append("%s %s" % [key, value])
	return " / ".join(parts)

static func _skill_source_text(raw_source: Variant, detail: Dictionary) -> String:
	if raw_source is Dictionary:
		var source := raw_source as Dictionary
		var parts: Array[String] = []
		for key in ["pool", "unlock_method", "kind"]:
			var value := str(source.get(key, "")).strip_edges()
			if value != "":
				parts.append(value)
		if not parts.is_empty():
			return " / ".join(parts)
	var source_text := str(raw_source).strip_edges()
	if source_text != "":
		return source_text
	return str(detail.get("unlock_hint", "")).strip_edges()

static func _build_portrait_visual(entry: Dictionary, mode: String, compact: bool, config: Dictionary) -> Control:
	var root := Control.new()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var stage := _panel(_portrait_tone(entry), _hero_card_color("stage_border"), 1)
	stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(stage)

	var is_skill_card := _is_skill_card(entry)
	var portrait_texture: Texture2D = null
	if not is_skill_card:
		portrait_texture = _portrait_texture(entry)
	if portrait_texture != null:
		_add_portrait_underlay(stage, portrait_texture, entry, compact, config)

	var stage_margin_value := int(_hero_card_metric(config, "stage_margin", "stage_margin", compact))
	var stage_margin := _margin(stage_margin_value, stage_margin_value, stage_margin_value, stage_margin_value)
	stage_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.add_child(stage_margin)

	var stage_col := VBoxContainer.new()
	stage_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage_col.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage_col.add_theme_constant_override("separation", 0)
	stage_margin.add_child(stage_col)

	_add_top_strip(stage_col, entry, mode, compact, config)

	var asset_slot: Control = null
	if is_skill_card:
		var skill_slot := _add_skill_card_visual(entry, compact, config)
		skill_slot.name = "HeroCardAssetSlot"
		stage_col.add_child(skill_slot)
	else:
		asset_slot = Control.new()
		asset_slot.name = "HeroCardAssetSlot"
		asset_slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		UI_COMPONENT_FACTORY.apply_portrait_frame_stage(asset_slot)
		asset_slot.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		asset_slot.size_flags_vertical = Control.SIZE_EXPAND_FILL
		stage_col.add_child(asset_slot)

	if mode == MODE_OWNED_ROSTER:
		_add_roster_overlay(stage_col, entry, compact, config)
	elif mode == MODE_DRAW_RESULT:
		_add_draw_result_overlay(stage_col, entry, compact, config)

	_add_bottom_strip(stage_col, entry, mode, compact, config)
	var show_identity_strip := bool(config.get("show_identity_strip", mode != MODE_POOL_PREVIEW))
	if show_identity_strip:
		var identity_strip := _build_identity_strip(entry, mode, compact, config)
		root.add_child(identity_strip)
	return root


static func _add_portrait_underlay(stage: Control, portrait_texture: Texture2D, entry: Dictionary, compact: bool, config: Dictionary) -> void:
	var underlay := Control.new()
	underlay.name = "HeroCardPortraitUnderlay"
	underlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	underlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	UI_COMPONENT_FACTORY.apply_portrait_frame_stage(underlay)
	stage.add_child(underlay)

	var portrait_image := TextureRect.new()
	portrait_image.name = "HeroCardPortraitUnderlayTexture"
	portrait_image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait_image.texture = portrait_texture
	UI_COMPONENT_FACTORY.apply_portrait_frame_texture(portrait_image)
	underlay.add_child(portrait_image)

	var shade := ColorRect.new()
	shade.name = "HeroCardPortraitUnderlayShade"
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shade.color = _hero_card_color("portrait_shade", _hero_card_metric(config, "portrait_shade_alpha", "portrait_shade_alpha", compact))
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	underlay.add_child(shade)

static func _add_skill_card_visual(entry: Dictionary, compact: bool, config: Dictionary) -> Control:
	var plate := Control.new()
	plate.name = "HeroCardSkillVisualPlate"
	plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	plate.clip_contents = true
	plate.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	plate.size_flags_vertical = Control.SIZE_EXPAND_FILL
	plate.custom_minimum_size = Vector2(0, _hero_card_metric(config, "skill_plate_min_height", "skill_plate_min_height", compact))
	plate.set_anchors_preset(Control.PRESET_FULL_RECT)

	var bg := _panel(_hero_card_color("skill_plate_bg"), _tone_border(entry, 0.44), 1)
	bg.name = "HeroCardSkillPlateBg"
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	plate.add_child(bg)

	var asset_texture := _skill_card_asset_texture(entry)
	if asset_texture != null:
		var texture_rect := TextureRect.new()
		texture_rect.name = "HeroCardSkillAssetTexture"
		texture_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		texture_rect.texture = asset_texture
		texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		var asset_fit_mode := _skill_card_asset_fit_mode_from_ref(_skill_card_asset_ref(entry))
		texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED if asset_fit_mode == "contain_no_crop" else TextureRect.STRETCH_KEEP_ASPECT_COVERED
		texture_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
		plate.add_child(texture_rect)
		var shade := ColorRect.new()
		shade.name = "HeroCardSkillAssetShade"
		shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
		shade.color = Color(0.0, 0.0, 0.0, 0.18)
		shade.set_anchors_preset(Control.PRESET_FULL_RECT)
		plate.add_child(shade)

	var margin_size := int(_hero_card_metric(config, "skill_plate_margin", "skill_plate_margin", compact))
	var left_reserved := int(_hero_card_metric(config, "left_strip_width", "left_strip_width", compact)) + margin_size
	var front_face := Control.new()
	front_face.name = "HeroCardSkillFrontFace"
	front_face.mouse_filter = Control.MOUSE_FILTER_IGNORE
	front_face.set_anchors_preset(Control.PRESET_FULL_RECT)
	plate.add_child(front_face)

	plate.add_child(_build_skill_card_back_face(entry, compact, config, left_reserved, margin_size))
	return plate

static func _build_skill_card_back_face(entry: Dictionary, compact: bool, config: Dictionary, left_reserved: int, margin_size: int) -> Control:
	var back_face := Control.new()
	back_face.name = "HeroCardSkillBackFace"
	back_face.mouse_filter = Control.MOUSE_FILTER_IGNORE
	back_face.visible = false
	back_face.set_anchors_preset(Control.PRESET_FULL_RECT)

	var bg := _panel(_hero_card_color("skill_plate_bg", 0.96), _tone_border(entry, 0.72), 1)
	bg.name = "HeroCardSkillBackFaceBg"
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	back_face.add_child(bg)

	var content_margin := _margin(left_reserved + 8, margin_size + 12, margin_size + 10, margin_size + 12)
	content_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	back_face.add_child(content_margin)

	var column := VBoxContainer.new()
	column.name = "HeroCardSkillBackFaceContent"
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 7 if not compact else 4)
	content_margin.add_child(column)

	var title := _compact_label("战法属性", _hero_card_font_size(config, "skill_name_font_size", "skill_name", compact), _hero_card_color("text_gold"), HORIZONTAL_ALIGNMENT_CENTER)
	title.name = "HeroCardSkillBackTitleText"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.custom_minimum_size = Vector2(0, float(_hero_card_font_size(config, "skill_name_font_size", "skill_name", compact) + 10))
	column.add_child(title)

	_add_skill_back_field(column, "触发", _skill_card_back_field_text(entry, "trigger"), "HeroCardSkillBackTriggerText", compact, config)
	_add_skill_back_field(column, "目标", _skill_card_back_field_text(entry, "target"), "HeroCardSkillBackTargetText", compact, config)
	_add_skill_back_field(column, "效果", _skill_card_back_field_text(entry, "effect"), "HeroCardSkillBackEffectText", compact, config)
	_add_skill_back_field(column, "适用", _skill_card_back_field_text(entry, "troops"), "HeroCardSkillBackTroopsText", compact, config)
	_add_skill_back_field(column, "来源", _skill_card_back_field_text(entry, "source"), "HeroCardSkillBackSourceText", compact, config)
	return back_face

static func _add_skill_back_field(parent: VBoxContainer, label_text: String, value_text: String, node_name: String, compact: bool, config: Dictionary) -> void:
	var value := value_text.strip_edges()
	if value == "":
		value = "未配置"
	var font_size := maxi(_hero_card_font_size(config, "skill_back_field_font_size", "skill_meta", compact) + (2 if not compact else 1), 16 if not compact else 12)
	var line := _label("%s  %s" % [label_text, value], font_size, _hero_card_color("text_main"))
	line.name = node_name
	line.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	line.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	line.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	line.clip_text = true
	line.max_lines_visible = 3
	line.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	line.custom_minimum_size = Vector2(0, float(font_size * 3 + 10))
	parent.add_child(line)

static func _toggle_skill_card_face(button: Button) -> void:
	if button == null or not is_instance_valid(button):
		return
	var front := button.find_child("HeroCardSkillFrontFace", true, false)
	var back := button.find_child("HeroCardSkillBackFace", true, false)
	if front == null or back == null:
		return
	var show_back: bool = not bool(back.visible)
	front.visible = not show_back
	back.visible = show_back
	button.set_meta("hero_card_skill_face", "back" if show_back else "front")

static func _build_identity_strip(entry: Dictionary, mode: String, compact: bool, config: Dictionary) -> Control:
	var left_width := _hero_card_metric(config, "left_strip_width", "left_strip_width", compact)
	var left_alpha_token := "left_strip_alpha_owned" if mode == MODE_OWNED_ROSTER else "left_strip_alpha_other"
	var left_alpha := _hero_card_metric(config, "left_strip_alpha", left_alpha_token, compact)
	var card_height := float(config.get("_card_height", 336.0))
	var outer_margin := float(config.get("_outer_margin", 4.0))
	var inner_margin := float(config.get("_inner_margin", 5.0))
	var usable_height := maxf(72.0, card_height - (outer_margin + inner_margin) * 2.0)
	var strip_height := float(config.get("identity_strip_height", usable_height * 0.50))
	if compact:
		strip_height = float(config.get("identity_strip_height", usable_height * 0.48))
	strip_height = clampf(strip_height, _hero_card_metric(config, "identity_min_height", "identity_min_height", compact), usable_height * 0.58)

	var strip := _panel(_identity_strip_bg(entry, left_alpha), _tone_border(entry, 0.72), 1)
	strip.name = "HeroCardIdentityStrip"
	strip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	strip.custom_minimum_size = Vector2(left_width, strip_height)
	strip.size = Vector2(left_width, strip_height)
	strip.position = Vector2.ZERO

	var margin := _margin(2, 6 if not compact else 3, 2, 6 if not compact else 3)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	strip.add_child(margin)
	var text_col := VBoxContainer.new()
	text_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	text_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text_col.size_flags_vertical = Control.SIZE_EXPAND_FILL
	text_col.add_theme_constant_override("separation", 4 if not compact else 2)
	margin.add_child(text_col)

	var faction := str(entry.get("faction", entry.get("camp", config.get("identity_faction_placeholder", "阵营")))).strip_edges()
	var hero_name := str(entry.get("name", entry.get("display_name", config.get("identity_name_placeholder", "待定")))).strip_edges()
	if faction == "":
		faction = str(config.get("identity_faction_placeholder", "阵营"))
	if hero_name == "":
		hero_name = str(config.get("identity_name_placeholder", "待定"))
	var faction_font := _hero_card_font_size(config, "identity_faction_font_size", "identity_faction", compact)
	var name_font := _hero_card_font_size(config, "identity_name_font_size", "identity_name", compact)
	var faction_label := _compact_label(_vertical_text(faction), faction_font, _hero_card_color("text_muted"), HORIZONTAL_ALIGNMENT_CENTER)
	faction_label.custom_minimum_size = Vector2(maxf(10.0, left_width - 4.0), float(faction_font * 4))
	text_col.add_child(faction_label)
	var name_label := _compact_label(_vertical_text(hero_name), name_font, _hero_card_color("text_main"), HORIZONTAL_ALIGNMENT_CENTER)
	name_label.custom_minimum_size = Vector2(maxf(10.0, left_width - 4.0), float(name_font * 6))
	text_col.add_child(name_label)
	text_col.add_spacer(false)
	return strip

static func _add_top_strip(parent: VBoxContainer, entry: Dictionary, mode: String, compact: bool, config: Dictionary) -> void:
	var top_height := _hero_card_metric(config, "top_height", "top_height", compact)
	var top_alpha_token := "top_alpha_owned" if mode == MODE_OWNED_ROSTER else "top_alpha_other"
	var top_alpha := _hero_card_metric(config, "top_alpha", top_alpha_token, compact)
	var top := _panel(_hero_card_color("top_bg", top_alpha), _hero_card_color("top_border"), 1)
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.custom_minimum_size = Vector2(0, top_height)
	parent.add_child(top)

	var left_width := _hero_card_metric(config, "left_strip_width", "left_strip_width", compact)
	var top_margin_left := int(config.get("top_margin_left", left_width + _hero_card_metric(config, "top_margin_offset", "top_margin_offset", compact)))
	var top_margin := _margin(top_margin_left, 1, 5, 1)
	top_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(top_margin)

	var top_row := HBoxContainer.new()
	top_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top_margin.add_child(top_row)

	var left_text := "兵力%s" % str(entry.get("power", ""))
	if mode == MODE_POOL_PREVIEW:
		left_text = "Lv.%s" % str(entry.get("level", ""))
	elif mode == MODE_DRAW_RESULT:
		left_text = str(entry.get("result_label", "获得"))
		if _is_skill_card(entry):
			left_text = ""

	var top_font := _hero_card_font_size(config, "top_font_size", "top", compact)
	var left_label := _compact_label(left_text, top_font, _hero_card_color("text_main"))
	left_label.custom_minimum_size = Vector2(_hero_card_metric(config, "top_left_width", "top_left_width", compact), 0)
	top_row.add_child(left_label)
	top_row.add_spacer(false)
	var top_stars := _compact_label(str(entry.get("stars", "")), top_font, _hero_card_color("text_gold"), HORIZONTAL_ALIGNMENT_RIGHT)
	if _is_skill_card(entry):
		top_stars.text = ""
	top_stars.custom_minimum_size = Vector2(_hero_card_metric(config, "top_stars_width", "top_stars_width", compact), 0)
	top_row.add_child(top_stars)

static func _add_roster_overlay(parent: VBoxContainer, entry: Dictionary, compact: bool, config: Dictionary) -> void:
	var overlay_height := _hero_card_metric(config, "overlay_height", "roster_overlay_height", compact)
	var overlay_alpha := _hero_card_metric(config, "overlay_alpha", "overlay_alpha", compact)
	var overlay := _panel(_hero_card_color("overlay_bg", overlay_alpha), _hero_card_color("overlay_border"), 1)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.custom_minimum_size = Vector2(0, overlay_height)
	parent.add_child(overlay)

	var overlay_margin := _margin(6, 5, 6, 5)
	overlay_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.add_child(overlay_margin)
	var overlay_col := VBoxContainer.new()
	overlay_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay_col.add_theme_constant_override("separation", 0)
	overlay_margin.add_child(overlay_col)
	var owner_text := _roster_owner_slot_text(entry, config)
	overlay_col.add_spacer(false)
	overlay_col.add_child(_compact_label(owner_text, _hero_card_font_size(config, "team_font_size", "team", compact), _hero_card_color("text_green"), HORIZONTAL_ALIGNMENT_CENTER))
	overlay_col.add_spacer(false)

static func _roster_owner_slot_text(entry: Dictionary, config: Dictionary) -> String:
	var owner_slot_mode := str(config.get("owner_slot_mode", "name")).strip_edges()
	if owner_slot_mode == "owner_display_name":
		var owner_text := str(entry.get("owner", "")).strip_edges()
		if owner_text == "":
			owner_text = str(config.get("owner_slot_fallback", "主公")).strip_edges()
		return owner_text
	return str(entry.get("name", entry.get("display_name", ""))).strip_edges()

static func _add_draw_result_overlay(parent: VBoxContainer, entry: Dictionary, compact: bool, config: Dictionary) -> void:
	if _is_skill_card(entry):
		return
	var overlay_alpha := _hero_card_metric(config, "overlay_alpha", "overlay_alpha", compact)
	var overlay := _panel(_hero_card_color("overlay_bg", overlay_alpha), _hero_card_color("overlay_border"), 1)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.custom_minimum_size = Vector2(0, _hero_card_metric(config, "overlay_height", "draw_overlay_height", compact))
	parent.add_child(overlay)
	var overlay_margin := _margin(6, 5, 6, 5)
	overlay_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.add_child(overlay_margin)
	overlay_margin.add_child(_compact_label(str(entry.get("draw_label", "招募获得")), _hero_card_font_size(config, "draw_label_font_size", "draw_label", compact), _hero_card_color("text_gold"), HORIZONTAL_ALIGNMENT_CENTER))

static func _add_bottom_strip(parent: VBoxContainer, entry: Dictionary, mode: String, compact: bool, config: Dictionary) -> void:
	var bottom_height := _hero_card_metric(config, "bottom_height", "bottom_height", compact)
	var bottom_alpha_token := "bottom_alpha_owned" if mode == MODE_OWNED_ROSTER else "bottom_alpha_other"
	var bottom_alpha := _hero_card_metric(config, "bottom_alpha", bottom_alpha_token, compact)
	var bottom := _panel(_hero_card_color("bottom_bg", bottom_alpha), _hero_card_color("bottom_border"), 1)
	bottom.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.custom_minimum_size = Vector2(0, bottom_height)
	parent.add_child(bottom)

	var bottom_margin := _margin(5, 2, 5, 2)
	bottom_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(bottom_margin)

	var bottom_row := HBoxContainer.new()
	bottom_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom_margin.add_child(bottom_row)

	var is_skill_card := _is_skill_card(entry)
	var left_text := "Lv.%s / %s" % [str(entry.get("level", "")), str(entry.get("troop", ""))]
	if is_skill_card:
		left_text = _skill_card_type_text(entry)
	if mode == MODE_POOL_PREVIEW:
		left_text = "Lv.%s / %s" % [str(entry.get("level", "")), str(entry.get("quality", "S"))]
	var bottom_font := _hero_card_font_size(config, "bottom_font_size", "bottom", compact)
	var left_font := maxi(bottom_font + 4, 17) if is_skill_card else bottom_font
	bottom_row.add_child(_compact_label(left_text, left_font, _hero_card_color("text_main")))
	bottom_row.add_spacer(false)
	if mode == MODE_OWNED_ROSTER:
		bottom_row.add_child(_compact_label(str(entry.get("status", "")), _hero_card_font_size(config, "status_font_size", "status", compact), _hero_card_color("text_gold"), HORIZONTAL_ALIGNMENT_RIGHT))
	elif mode == MODE_DRAW_RESULT:
		var status_text := _skill_card_status_text(entry) if is_skill_card else str(entry.get("status", ""))
		bottom_row.add_child(_compact_label(status_text, _hero_card_font_size(config, "status_font_size", "status", compact), _hero_card_color("text_gold"), HORIZONTAL_ALIGNMENT_RIGHT))

static func _compact_label(text: String, font_size: int, color: Color, alignment: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var label := _label(text, font_size, color)
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	label.horizontal_alignment = alignment
	label.clip_text = true
	return label

static func _vertical_text(text: String) -> String:
	var chars: Array[String] = []
	for index in range(text.length()):
		chars.append(text.substr(index, 1))
	return "\n".join(chars)

static func _hero_card_color(token_name: String, alpha: float = -1.0) -> Color:
	return UI_COMPONENT_FACTORY.hero_card_color(token_name, alpha)

static func _hero_card_font_size(config: Dictionary, config_key: String, token_name: String, compact: bool) -> int:
	return int(config.get(config_key, UI_COMPONENT_FACTORY.hero_card_font_size(token_name, compact)))

static func _hero_card_metric(config: Dictionary, config_key: String, token_name: String, compact: bool) -> float:
	return float(config.get(config_key, UI_COMPONENT_FACTORY.hero_card_metric(token_name, compact)))

static func _label(text: String, font_size: int, color: Color) -> Label:
	var label := UI_COMPONENT_FACTORY.make_label(text, font_size, color)
	label.custom_minimum_size = Vector2(_estimated_label_width(text, font_size), float(font_size + 6))
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label

static func _estimated_label_width(text: String, font_size: int) -> float:
	if text.strip_edges() == "":
		return 0.0
	return clampf(float(text.length()) * float(font_size) * 0.58 + 8.0, float(font_size * 2), 300.0)

static func _trim_text(text: String, limit: int) -> String:
	var value := text.strip_edges()
	if limit <= 0 or value.length() <= limit:
		return value
	return value.left(limit - 1) + "…"

static func _string_array(raw_value: Variant) -> Array[String]:
	var result: Array[String] = []
	if raw_value is Array:
		for item_variant in raw_value as Array:
			var item := str(item_variant).strip_edges()
			if item != "":
				result.append(item)
	elif str(raw_value).strip_edges() != "":
		result.append(str(raw_value).strip_edges())
	return result

static func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	return UI_COMPONENT_FACTORY.make_margin(left, top, right, bottom)

static func _panel(bg: Color, border: Color, radius: int) -> PanelContainer:
	return UI_COMPONENT_FACTORY.make_hero_card_panel(bg, border, radius)

static func _style(bg: Color, border: Color, radius: int) -> StyleBoxFlat:
	return UI_COMPONENT_FACTORY.make_hero_card_style(bg, border, radius)

static func _tone_border(entry: Dictionary, alpha: float = 0.84) -> Color:
	return UI_COMPONENT_FACTORY.hero_card_tone_border(str(entry.get("tone", "")), alpha)

static func _identity_strip_bg(entry: Dictionary, alpha: float) -> Color:
	return UI_COMPONENT_FACTORY.hero_card_identity_strip_bg(str(entry.get("tone", "")), alpha)

static func _portrait_tone(entry: Dictionary) -> Color:
	return UI_COMPONENT_FACTORY.hero_card_portrait_tone(str(entry.get("tone", "")))

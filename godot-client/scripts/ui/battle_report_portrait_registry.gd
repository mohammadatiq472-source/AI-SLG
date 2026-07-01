extends RefCounted
class_name BattleReportPortraitRegistry

const PortraitAssetRegistryScript := preload("res://scripts/ui/portrait_asset_registry.gd")


static func portrait_texture(slot_payload: Dictionary) -> Texture2D:
	return PortraitAssetRegistryScript.portrait_texture(_portrait_payload(slot_payload))


static func portrait_res_path(slot_payload: Dictionary) -> String:
	return PortraitAssetRegistryScript.portrait_res_path(_portrait_payload(slot_payload))


static func portrait_asset_source(slot_payload: Dictionary) -> String:
	return PortraitAssetRegistryScript.portrait_asset_source(_portrait_payload(slot_payload))


static func _portrait_payload(slot_payload: Dictionary) -> Dictionary:
	var raw_asset_ref: Variant = slot_payload.get("asset_ref", slot_payload.get("assetRef", {}))
	if raw_asset_ref is Dictionary and not (raw_asset_ref as Dictionary).is_empty():
		return (raw_asset_ref as Dictionary).duplicate(true)
	return {}

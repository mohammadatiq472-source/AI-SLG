@tool
extends EditorPlugin

const DOCK_TITLE := "语言切换 / Editor Locale"
const DOCK_SCRIPT := preload("res://addons/editor_locale_helper/editor_locale_helper_dock.gd")
const MENU_SWITCH_ZH := "切到简体中文 / Switch to zh_CN"
const MENU_SWITCH_EN := "切到 English / Switch to en"
const MENU_SWITCH_AUTO := "切到自动 / Switch to auto"

var _dock: EditorLocaleHelperDock


func _enter_tree() -> void:
	_dock = DOCK_SCRIPT.new()
	_dock.name = DOCK_TITLE
	_dock.set_editor_interface(get_editor_interface())
	add_control_to_dock(DOCK_SLOT_RIGHT_BL, _dock)
	add_tool_menu_item(MENU_SWITCH_ZH, _on_switch_locale.bind("zh_CN"))
	add_tool_menu_item(MENU_SWITCH_EN, _on_switch_locale.bind("en"))
	add_tool_menu_item(MENU_SWITCH_AUTO, _on_switch_locale.bind("auto"))


func _exit_tree() -> void:
	remove_tool_menu_item(MENU_SWITCH_ZH)
	remove_tool_menu_item(MENU_SWITCH_EN)
	remove_tool_menu_item(MENU_SWITCH_AUTO)
	if _dock != null:
		remove_control_from_docks(_dock)
		_dock.queue_free()
		_dock = null


func _on_switch_locale(locale_code: String) -> void:
	if _dock != null:
		_dock.apply_locale(locale_code)

@tool
extends PanelContainer
class_name EditorLocaleHelperDock

const SETTING_EDITOR_LANGUAGE := "interface/editor/editor_language"
const SETTING_LOCALIZE_SETTINGS := "interface/editor/localize_settings"
const LOCALE_ZH := "zh_CN"
const LOCALE_EN := "en"
const LOCALE_AUTO := "auto"
const TERM_PAIRS := [
	["Scene Tree", "场景树"],
	["Inspector", "检查器"],
	["FileSystem", "文件系统"],
	["Project Settings", "项目设置"],
	["Editor Settings", "编辑器设置"],
	["Plugins", "插件"],
	["AssetLib", "资源库"],
	["Script", "脚本"],
	["Node", "节点"],
	["Output", "输出"],
	["Debugger", "调试器"],
	["Animation", "动画"],
]

var _editor_interface: EditorInterface
var _current_locale_label: Label
var _status_label: Label
var _localize_settings_checkbox: CheckBox


func set_editor_interface(editor_interface: EditorInterface) -> void:
	_editor_interface = editor_interface


func _ready() -> void:
	_build_ui()
	_refresh_state()


func _build_ui() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	custom_minimum_size = Vector2(360, 0)

	var root := VBoxContainer.new()
	root.name = "Root"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 10)
	add_child(root)

	var title := Label.new()
	title.text = "语言切换 / Editor Locale"
	title.add_theme_font_size_override("font_size", 18)
	root.add_child(title)

	_current_locale_label = Label.new()
	_current_locale_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(_current_locale_label)

	_status_label = Label.new()
	_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_status_label.text = "点按钮后会保存场景并重启编辑器。 / Clicking a button saves scenes and restarts the editor."
	root.add_child(_status_label)

	var locale_row := HBoxContainer.new()
	locale_row.add_theme_constant_override("separation", 8)
	root.add_child(locale_row)

	locale_row.add_child(_build_locale_button("简体中文 / Simplified Chinese", LOCALE_ZH))
	locale_row.add_child(_build_locale_button("English / 英文", LOCALE_EN))
	locale_row.add_child(_build_locale_button("自动 / Auto", LOCALE_AUTO))

	_localize_settings_checkbox = CheckBox.new()
	_localize_settings_checkbox.text = "设置面板也尽量中文化 / Localize settings panels when possible"
	_localize_settings_checkbox.toggled.connect(_on_localize_settings_toggled)
	root.add_child(_localize_settings_checkbox)

	var refresh_button := Button.new()
	refresh_button.text = "刷新状态 / Refresh State"
	refresh_button.pressed.connect(_refresh_state)
	root.add_child(refresh_button)

	var hint := Label.new()
	hint.text = "注意：内置编辑器语言可切换，但第三方插件如果硬编码英文，无法靠本插件强制全覆盖。 / Built-in editor UI can switch, but third-party plugins with hardcoded English cannot be fully overridden by this plugin."
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(hint)

	var glossary_title := Label.new()
	glossary_title.text = "常用术语对照 / Common Terms"
	glossary_title.add_theme_font_size_override("font_size", 16)
	root.add_child(glossary_title)

	var glossary := RichTextLabel.new()
	glossary.bbcode_enabled = true
	glossary.fit_content = true
	glossary.scroll_active = false
	glossary.size_flags_vertical = Control.SIZE_EXPAND_FILL
	glossary.text = _build_term_glossary()
	root.add_child(glossary)


func _build_locale_button(title: String, locale_code: String) -> Button:
	var button := Button.new()
	button.text = title
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.pressed.connect(apply_locale.bind(locale_code))
	return button


func _build_term_glossary() -> String:
	var lines: PackedStringArray = []
	for pair in TERM_PAIRS:
		lines.append("[b]%s[/b]  ->  %s" % [str(pair[0]), str(pair[1])])
	return "\n".join(lines)


func _refresh_state() -> void:
	var settings := _get_editor_settings()
	if settings == null:
		_current_locale_label.text = "当前语言 / Current: unavailable"
		return
	var locale_code := LOCALE_AUTO
	if settings.has_setting(SETTING_EDITOR_LANGUAGE):
		locale_code = str(settings.get_setting(SETTING_EDITOR_LANGUAGE)).strip_edges()
	if locale_code == "":
		locale_code = LOCALE_AUTO
	var localize_settings := true
	if settings.has_setting(SETTING_LOCALIZE_SETTINGS):
		localize_settings = bool(settings.get_setting(SETTING_LOCALIZE_SETTINGS))
	_localize_settings_checkbox.set_block_signals(true)
	_localize_settings_checkbox.button_pressed = localize_settings
	_localize_settings_checkbox.set_block_signals(false)
	_current_locale_label.text = "当前语言 / Current: %s | 设置本地化 / Localize Settings: %s" % [locale_code, "ON" if localize_settings else "OFF"]


func apply_locale(locale_code: String) -> void:
	var settings := _get_editor_settings()
	if settings == null or _editor_interface == null:
		_status_label.text = "编辑器接口不可用。 / Editor interface unavailable."
		return
	var normalized_locale := locale_code.strip_edges()
	if normalized_locale == "":
		normalized_locale = LOCALE_AUTO
	settings.set_setting(SETTING_EDITOR_LANGUAGE, normalized_locale)
	settings.set_setting(SETTING_LOCALIZE_SETTINGS, _localize_settings_checkbox.button_pressed)
	_status_label.text = "已切到 %s，准备重启编辑器。 / Switched to %s, restarting editor." % [normalized_locale, normalized_locale]
	_editor_interface.save_all_scenes()
	_editor_interface.restart_editor(true)


func _on_localize_settings_toggled(enabled: bool) -> void:
	var settings := _get_editor_settings()
	if settings == null:
		return
	settings.set_setting(SETTING_LOCALIZE_SETTINGS, enabled)
	_refresh_state()


func _get_editor_settings() -> EditorSettings:
	if _editor_interface == null:
		return null
	return _editor_interface.get_editor_settings()

extends Node
class_name MainMapOwnerDeltaWsBridge

signal owner_delta_invalidated(message: Dictionary)
signal war_room_live_refresh_received(message: Dictionary)

@export var reconnect_interval_sec: float = 2.0
@export var ping_interval_sec: float = 5.0

var _base_url: String = ""
var _ws_url: String = ""
var _faction_id: String = ""
var _token: String = ""
var _enabled: bool = false
var _ws_peer: WebSocketPeer = null
var _subscribe_sent: bool = false
var _reconnect_elapsed: float = 0.0
var _ping_elapsed: float = 0.0
var _stats: Dictionary = {
	"wsState": "idle",
	"subscribed": false,
	"messageCount": 0,
	"ownerDeltaInvalidationCount": 0,
	"warRoomLiveRefreshCount": 0,
	"errorCount": 0,
	"lastType": "none",
	"lastError": "none",
	"lastOverrideVersion": -1,
}


func configure(base_url: String) -> void:
	_base_url = base_url.strip_edges().rstrip("/")
	_ws_url = _to_ws_url(_base_url)


func bind_session(faction_id: String, token: String) -> void:
	_faction_id = faction_id.strip_edges()
	_token = token.strip_edges()
	_subscribe_sent = false
	_stats["subscribed"] = false


func start() -> void:
	_enabled = true
	set_process(true)
	_connect_ws_now()


func stop() -> void:
	_enabled = false
	set_process(false)
	_subscribe_sent = false
	_stats["wsState"] = "stopped"
	_stats["subscribed"] = false
	if _ws_peer != null:
		_ws_peer.close()
	_ws_peer = null


func get_stats() -> Dictionary:
	return _stats.duplicate(true)


func _process(delta: float) -> void:
	if not _enabled:
		return
	_poll_ws(delta)


func _poll_ws(delta: float) -> void:
	if _ws_peer == null:
		_reconnect_elapsed += delta
		if _reconnect_elapsed >= reconnect_interval_sec:
			_reconnect_elapsed = 0.0
			_connect_ws_now()
		return

	_ws_peer.poll()
	var state: int = _ws_peer.get_ready_state()
	match state:
		WebSocketPeer.STATE_CONNECTING:
			_stats["wsState"] = "connecting"
		WebSocketPeer.STATE_OPEN:
			_stats["wsState"] = "open"
			_ensure_subscribed()
			_ping_elapsed += delta
			if _ping_elapsed >= ping_interval_sec:
				_ping_elapsed = 0.0
				_send_json({"type": "ping"})
			_drain_packets()
		WebSocketPeer.STATE_CLOSING:
			_stats["wsState"] = "closing"
		WebSocketPeer.STATE_CLOSED:
			_stats["wsState"] = "closed"
			_stats["subscribed"] = false
			_subscribe_sent = false
			_ws_peer = null


func _connect_ws_now() -> void:
	if _ws_url == "":
		_stats["wsState"] = "missing_ws_url"
		return
	_ws_peer = WebSocketPeer.new()
	_subscribe_sent = false
	_stats["subscribed"] = false
	var err: int = _ws_peer.connect_to_url(_ws_url)
	if err != OK:
		_stats["wsState"] = "connect_failed:%d" % err
		_ws_peer = null
		return
	_stats["wsState"] = "connecting"
	_reconnect_elapsed = 0.0
	_ping_elapsed = 0.0


func _ensure_subscribed() -> void:
	if _subscribe_sent:
		return
	if _faction_id == "":
		return
	var payload: Dictionary = {
		"type": "subscribe",
		"factionId": _faction_id,
	}
	if _token != "":
		payload["token"] = _token
	_send_json(payload)
	_subscribe_sent = true


func _drain_packets() -> void:
	while _ws_peer != null and _ws_peer.get_available_packet_count() > 0:
		var raw_packet: PackedByteArray = _ws_peer.get_packet()
		var message_text: String = raw_packet.get_string_from_utf8()
		var parser := JSON.new()
		var parse_err: int = parser.parse(message_text)
		if parse_err != OK or not (parser.data is Dictionary):
			continue

		var message: Dictionary = parser.data as Dictionary
		var message_type: String = str(message.get("type", "unknown"))
		_stats["messageCount"] = int(_stats.get("messageCount", 0)) + 1
		_stats["lastType"] = message_type
		match message_type:
			"subscribed":
				_stats["subscribed"] = true
			"main_map_owner_delta":
				_stats["ownerDeltaInvalidationCount"] = int(_stats.get("ownerDeltaInvalidationCount", 0)) + 1
				_stats["lastOverrideVersion"] = int(message.get("overrideVersion", -1))
				owner_delta_invalidated.emit(message.duplicate(true))
			"war_room_live_refresh":
				_stats["warRoomLiveRefreshCount"] = int(_stats.get("warRoomLiveRefreshCount", 0)) + 1
				war_room_live_refresh_received.emit(message.duplicate(true))
			"error":
				_stats["errorCount"] = int(_stats.get("errorCount", 0)) + 1
				_stats["lastError"] = str(message.get("message", "unknown"))
			_:
				pass


func _send_json(payload: Dictionary) -> void:
	if _ws_peer == null:
		return
	if _ws_peer.get_ready_state() != WebSocketPeer.STATE_OPEN:
		return
	_ws_peer.send_text(JSON.stringify(payload))


func _to_ws_url(http_base_url: String) -> String:
	var normalized: String = http_base_url.strip_edges().rstrip("/")
	if normalized.begins_with("https://"):
		return "wss://%s/ws" % normalized.trim_prefix("https://")
	if normalized.begins_with("http://"):
		return "ws://%s/ws" % normalized.trim_prefix("http://")
	return "ws://%s/ws" % normalized

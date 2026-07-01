#!/usr/bin/env python3
"""MiniMax Music free API helper script.

Provides a CLI to request BGM generation from MiniMax music-2.6-free and persist the
result to a local file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import shutil
import tempfile
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4

import requests

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - fallback keeps dry-run usable before pip install.
    load_dotenv = None


API_URL = "https://api.minimax.io/v1/music_generation"
MODEL = "music-2.6-free"
MAX_RPM = 3
MAX_CONCURRENT = 3
WINDOW_SECONDS = 60
STATE_TTL_SECONDS = 60 * 20
REQUEST_TIMEOUT_SECONDS = 120


class MiniMaxClientError(RuntimeError):
    """Raised for MiniMax business/transport errors."""


def _to_utc_datetime(iso_ts: float) -> str:
    return datetime.fromtimestamp(iso_ts, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def _resolve_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_prompt_library() -> list[dict[str, str]]:
    path = _resolve_root() / "prompts" / "slg_bgm_prompts.json"
    if not path.exists():
        return [
            {
                "id": "default",
                "text": "为三国历史背景的策略战棋游戏生成一段中文古典风雅的背景音乐，"
                        "使用古琴、古筝、箫为主，弦乐与笛箫轻轻点缀，节奏低密度、留白感明显，"
                        "强调宫廷谋略的张弛感。要求纯器乐、不出现流行鼓点与电子音色，"
                        "不使用大规模合唱，音色克制、雅致、情绪从容。",
            }
        ]

    data = json.loads(path.read_text(encoding="utf-8"))
    prompts = data.get("prompts")
    return prompts if isinstance(prompts, list) else [data]


def _default_prompt() -> str:
    prompts = _load_prompt_library()
    for item in prompts:
        if item.get("id") == "default":
            return item.get("text", "").strip()
    if prompts:
        return prompts[0].get("text", "").strip()
    return (
        "为三国历史背景的策略战棋游戏生成一段中文古典风雅的背景音乐，使用古琴、古筝、箫为主，"
        "弦乐与笛箫轻轻点缀，节奏低密度、留白感明显，强调宫廷谋略的张弛感。要求纯器乐、无流行鼓点、无电音、无大合唱。"
    )


def _read_configured_api_key() -> str:
    _load_env_file()
    key = os.getenv("MINIMAX_API_KEY", "").strip()
    if not key:
        raise MiniMaxClientError("未找到 MINIMAX_API_KEY，请在 .env 中设置后重试。")
    return key


def _load_env_file() -> None:
    env_path = _resolve_root() / ".env"
    if load_dotenv is not None:
        load_dotenv(env_path)
        return

    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue
        os.environ[key] = value.strip().strip('"').strip("'")


def _raw_output_dir() -> Path:
    return _resolve_root() / "outputs" / "music" / "raw"


def _is_inside(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def _default_output_filename(fmt: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"slg_bgm_{timestamp}_{random.randint(1000, 9999)}.{fmt}"


def _ensure_output_path(target: str | None, fmt: str, create_parent: bool = True) -> Path:
    base_dir = _raw_output_dir()
    target_text = (target or "").strip()

    if not target_text:
        p = base_dir / _default_output_filename(fmt)
    else:
        requested = Path(target_text).expanduser()
        if requested.is_absolute():
            candidate = requested
        else:
            candidate = (_resolve_root() / requested).resolve()

        if candidate == base_dir.resolve() or target_text.endswith(("/", "\\")):
            p = base_dir / _default_output_filename(fmt)
        elif _is_inside(candidate, base_dir):
            p = candidate
        elif len(requested.parts) == 1:
            p = base_dir / requested.name
        else:
            raise MiniMaxClientError("输出路径必须位于 outputs/music/raw/，或仅传入输出文件名。")

        if p.suffix.lower() not in {".mp3", ".wav"}:
            p = p.with_suffix(f".{fmt}")
        elif p.suffix.lower() != f".{fmt}":
            p = p.with_suffix(f".{fmt}")

    if create_parent:
        p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        fingerprint = hashlib.sha1(f"{time.time()}".encode("utf-8")).hexdigest()[:8]
        p = p.with_name(f"{p.stem}_{fingerprint}{p.suffix}")
    return p


def _state_paths() -> tuple[Path, Path]:
    base = Path(tempfile.gettempdir()) / "minimax_music_free"
    base.mkdir(parents=True, exist_ok=True)
    lock_dir = base / "state.lock"
    state_file = base / "state.json"
    return lock_dir, state_file


def _read_state(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {"active": {}, "recent": []}
    raw = path.read_text(encoding="utf-8")
    if not raw.strip():
        return {"active": {}, "recent": []}
    data = json.loads(raw)
    active = data.get("active", {})
    recent = data.get("recent", [])
    return {
        "active": active if isinstance(active, dict) else {},
        "recent": recent if isinstance(recent, list) else [],
    }


def _write_state(path: Path, state: Dict[str, Any]) -> None:
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def _cleanup_state(state: Dict[str, Any], now: float) -> None:
    state["active"] = {
        k: float(v) for k, v in state.get("active", {}).items()
        if now - float(v) <= STATE_TTL_SECONDS
    }
    state["recent"] = [
        float(x) for x in state.get("recent", []) if now - float(x) <= WINDOW_SECONDS
    ]


@contextmanager
def _acquire_slot() -> Any:
    lock_dir, state_file = _state_paths()
    token = uuid4().hex

    def acquire_state_lock() -> None:
        while True:
            if lock_dir.exists() and (time.time() - lock_dir.stat().st_mtime) > STATE_TTL_SECONDS:
                try:
                    shutil.rmtree(lock_dir)
                except Exception:
                    pass

            if lock_dir.exists():
                time.sleep(0.2)
                continue
            try:
                lock_dir.mkdir()
                return
            except FileExistsError:
                continue

    def release_state_lock() -> None:
        try:
            lock_dir.rmdir()
        except Exception:
            pass

    while True:
        acquire_state_lock()
        try:
            now = time.time()
            state = _read_state(state_file)
            _cleanup_state(state, now)
            active = state["active"]
            recent = state["recent"]

            wait_seconds = 0.0
            if len(active) >= MAX_CONCURRENT:
                oldest_active = min(active.values()) if active else now
                wait_seconds = max(wait_seconds, min(5.0, max(0.3, STATE_TTL_SECONDS - (now - oldest_active))))
            if len(recent) >= MAX_RPM:
                wait_seconds = max(wait_seconds, WINDOW_SECONDS - (now - recent[0]) + 0.05)

            if wait_seconds <= 0:
                active[token] = now
                recent.append(now)
                state["active"] = active
                state["recent"] = sorted(set(recent), reverse=False)
                _write_state(state_file, state)
                break
        finally:
            release_state_lock()

        time.sleep(max(0.2, wait_seconds))

    try:
        yield token
    finally:
        acquire_state_lock()
        try:
            now = time.time()
            state = _read_state(state_file)
            _cleanup_state(state, now)
            active = state.get("active", {})
            active.pop(token, None)
            state["active"] = active
            _write_state(state_file, state)
        finally:
            release_state_lock()


def _api_error_message(resp: requests.Response, payload: Dict[str, Any]) -> str:
    code, msg = _response_error_code_and_message(payload or {})

    if resp.status_code == 401:
        return "401 未授权：请检查 MINIMAX_API_KEY 是否有效。"
    if resp.status_code == 429:
        return "429 频率限制：已触发 MiniMax 请求频控（推荐等待后重试）。"
    if str(code) == "1002" or "rate limit" in msg.lower():
        return "1002 RPM 速率限制：当前请求频率过高，请降速后重试。"
    if str(code) in {"1004", "2049"}:
        return f"鉴权异常 code={code}：请检查 MINIMAX_API_KEY 与 API 权限。"
    if str(code) == "1008" or "insufficient balance" in msg.lower():
        return "1008 余额不足：请检查 MiniMax 账户余额与可用额度。"
    if str(code) == "1041" or "conn limit" in msg.lower():
        return "1041 连接限制：并发连接已达上限（CONN=3）。"
    if str(code) == "2056" or "usage limit" in msg.lower():
        return "2056 用量上限：当前账号/活动额度已达上限。"

    if resp.status_code >= 400:
        return f"{resp.status_code} 请求失败，响应：{msg or resp.text[:200]}"
    if code:
        return f"MiniMax 返回 code={code}，信息：{msg or '无内容'}。"
    return f"请求失败，状态码={resp.status_code}，响应={msg or resp.text[:200]}。"


def _parse_response(payload: Dict[str, Any]) -> tuple[str, str]:
    data = payload.get("data") if isinstance(payload, dict) else None
    if data is None:
        data = payload
    if not isinstance(data, dict):
        raise MiniMaxClientError("响应结构异常：缺少可解析的 data 字段。")

    candidates = [
        data.get("audio_url"),
        data.get("url"),
        data.get("audio"),
        data.get("audio_file"),
        payload.get("audio"),
        payload.get("url"),
    ]
    for value in candidates:
        if not isinstance(value, str):
            continue
        value = value.strip()
        if not value:
            continue
        if value.startswith("http://") or value.startswith("https://"):
            return "url", value
        if len(value) > 120 and re.fullmatch(r"[0-9a-fA-F]+", value):
            return "hex", value

    text_candidates = [
        data.get("text"),
        payload.get("text"),
    ]
    for value in text_candidates:
        if not isinstance(value, str):
            continue
        if len(value) > 120 and re.fullmatch(r"[0-9a-fA-F]+", value.strip()):
            return "hex", value.strip()

    raise MiniMaxClientError("响应格式异常：未识别到 url 或 hex 音频内容。")


def _download_url(url: str, output_path: Path) -> Path:
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS, stream=True)
    except requests.RequestException as exc:
        raise MiniMaxClientError(f"下载音频失败（网络错误）：{exc}") from exc

    if response.status_code == 404:
        raise MiniMaxClientError("下载失败：音乐 URL 可能已过期（24 小时有效期已过）。")
    if response.status_code == 410:
        raise MiniMaxClientError("下载失败：音频 URL 不可访问（可能已过期或被撤回）。")
    if response.status_code == 403:
        raise MiniMaxClientError("下载失败：无权限访问该音频链接，通常为链接过期或已失效。")
    if response.status_code >= 400:
        raise MiniMaxClientError(f"下载失败：HTTP {response.status_code}。")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(response.content)
    return output_path


def _decode_hex(raw_hex: str, output_path: Path) -> Path:
    try:
        binary = bytes.fromhex(raw_hex)
    except ValueError as exc:
        raise MiniMaxClientError(f"hex 解码失败：{exc}") from exc
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(binary)
    return output_path


def _build_request_payload(prompt: str, fmt: str) -> Dict[str, Any]:
    return {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "output_format": "url",
        "is_instrumental": True,
        "lyrics_optimizer": False,
        "audio_setting": {
            "sample_rate": 44100,
            "bitrate": 256000,
            "format": fmt,
            "is_instrumental": True,
        },
    }


def _print_payload(payload: Dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def _validate_format(value: str) -> str:
    value = value.lower()
    if value not in {"mp3", "wav"}:
        raise argparse.ArgumentTypeError("format 只支持 mp3 或 wav")
    return value


def _run_request(api_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        API_URL,
        headers=headers,
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    try:
        response_data = response.json()
    except ValueError:
        response_data = {}

    if response.status_code != 200 or isinstance(response_data, dict) and _response_is_error(response_data):
        raise MiniMaxClientError(_api_error_message(response, response_data))

    return response_data


def _response_error_code_and_message(payload: Dict[str, Any]) -> tuple[Any, str]:
    if not isinstance(payload, dict):
        return None, ""

    code = payload.get("code")
    msg = payload.get("message", "") or payload.get("msg", "")
    if not msg and isinstance(payload.get("base_resp"), dict):
        base_resp = payload["base_resp"]
        if isinstance(base_resp, dict):
            code = base_resp.get("status_code", code)
            msg = base_resp.get("status_msg", msg)

    if isinstance(code, str):
        code = code.strip()
    return code, str(msg)


def _response_is_error(payload: Dict[str, Any]) -> bool:
    code, _ = _response_error_code_and_message(payload)
    if code in {None, "", 0, "0", 200, "200"}:
        return False
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="MiniMax Music 免费模型 BGM 生成工具（music-2.6-free）",
    )
    parser.add_argument(
        "--prompt",
        default=_default_prompt(),
        help="用于生成音乐的中文 prompt",
    )
    parser.add_argument(
        "--output",
        "-o",
        default=None,
        help="输出文件名或 outputs/music/raw/ 内路径；未带后缀则按 format 生成",
    )
    parser.add_argument(
        "--format",
        "-f",
        default="mp3",
        type=_validate_format,
        help="输出音频格式（mp3 或 wav）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="仅输出待请求 payload 与输出路径，不发起网络请求",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_path = _ensure_output_path(args.output, args.format, create_parent=False)
    payload = _build_request_payload(args.prompt, args.format)

    if args.dry_run:
        print("模式：dry-run（仅本地验证）")
        print("请求地址：", API_URL)
        print("模型：", MODEL)
        print("输出路径：", output_path.as_posix())
        print("请求 payload：")
        _print_payload(payload)
        return 0

    api_key = _read_configured_api_key()

    with _acquire_slot():
        response_data = _run_request(api_key, payload)

    media_type, media_value = _parse_response(response_data)
    print(f"MiniMax 返回类型：{media_type}")
    print(f"输出文件：{output_path}")

    if media_type == "url":
        downloaded = _download_url(media_value, output_path)
        print("已下载到：", downloaded.as_posix())
    else:
        decoded = _decode_hex(media_value, output_path)
        print("已解码保存：", decoded.as_posix())

    rate_info = {
        "model": MODEL,
        "output_format": "url",
        "audio_setting": payload["audio_setting"],
        "requested_format": args.format,
        "output": output_path.as_posix(),
        "timestamp_utc": _to_utc_datetime(time.time()),
    }
    print("请求摘要：", json.dumps(rate_info, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except MiniMaxClientError as exc:
        print(f"MiniMax 调用失败：{exc}")
        raise SystemExit(1)
    except KeyboardInterrupt:
        print("已中断。")
        raise SystemExit(1)

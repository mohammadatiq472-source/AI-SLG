# AI Native Alliance War Mainline

This repository uses a Node.js authoritative backend + Godot client.
Legacy compatibility routes and legacy client artifacts have been removed.

## Current Mainline

This repository now defaults to the `原生 SLG 主壳 + AI 变量` mainline.

- Formal frontend entry: `godot-client/project.godot -> scenes/app/main.tscn`
- Current first-cut target: `主城常驻壳层 / 大地图入口 / AI中枢 / Observability`
- `UI Preview Sandbox` remains available as a bridge/reference lane, but it is not the default product path

## Key Integration Docs

- Current execution baseline: [docs/AGENTS_EXECUTION_CURRENT_2026_04.md](docs/AGENTS_EXECUTION_CURRENT_2026_04.md)
- Native SLG formal mainline: [docs/NATIVE_SLG_MAINLINE_INDEX.md](docs/NATIVE_SLG_MAINLINE_INDEX.md)
- Native SLG formal component architecture: [docs/NATIVE_SLG_COMPONENT_ARCHITECTURE.md](docs/NATIVE_SLG_COMPONENT_ARCHITECTURE.md)
- USB migration audit: [docs/USB_MIGRATION_AUDIT_2026_04_17.md](docs/USB_MIGRATION_AUDIT_2026_04_17.md)
- USB migration execution: [docs/USB_MIGRATION_EXECUTION_2026_04_17.md](docs/USB_MIGRATION_EXECUTION_2026_04_17.md)
- USB migration path rewrite notes: [docs/USB_MIGRATION_PATH_REWRITE_2026_04_17.md](docs/USB_MIGRATION_PATH_REWRITE_2026_04_17.md)
- AI quick navigation index: [docs/AI_QUICK_NAV_INDEX_2026_04_10.md](docs/AI_QUICK_NAV_INDEX_2026_04_10.md)
- Godot client runtime chain: [godot-client/README.md](godot-client/README.md)
- Codex memory anchor: [CODEX.md](CODEX.md)
- Historical appendices stay in [docs/NATIVE_SLG_MAINLINE_INDEX_2026_04_16.md](docs/NATIVE_SLG_MAINLINE_INDEX_2026_04_16.md), [docs/NATIVE_SLG_RESET_PLAN_2026_04_16.md](docs/NATIVE_SLG_RESET_PLAN_2026_04_16.md), [docs/NATIVE_SLG_PAGE_STRUCTURE_2026_04_16.md](docs/NATIVE_SLG_PAGE_STRUCTURE_2026_04_16.md), [docs/AI_PHASE1_INSERTION_POINTS_2026_04_16.md](docs/AI_PHASE1_INSERTION_POINTS_2026_04_16.md), [docs/CODE_MAINLINE_KEEP_FREEZE_BRIDGE_2026_04_16.md](docs/CODE_MAINLINE_KEEP_FREEZE_BRIDGE_2026_04_16.md) and should not replace the formal docs above
- Backend runtime routes: [server/src/app.ts](server/src/app.ts)

## Runtime Commands

- Start backend: `npm run start`
- Start backend with auto game clock: `npm run start:clock`
- Dev watch mode: `npm run server:dev`
- Open Godot editor for this repo: `npm run godot:editor`
- Run the Godot mainline client window: `npm run godot:mainline:runtime`
- Run Godot headless smoke: `npm run godot:headless:smoke`
- Lint: `npm run lint`
- Type-check build: `npm run build`
- Session manager test: `npm run test:session:manager`
- World mutation lock test: `npm run test:world:mutation-lock`

Godot usage rule:

- Repository root is `8989/`, but the actual Godot project root is `8989/godot-client/`.
- If you see `SLG Commander Godot Client (DEBUG)`, that is the runtime window, not the editor.
- Fixed Godot open/run flow: [docs/GODOT_EDITOR_OPEN_FLOW_2026_04_17.md](docs/GODOT_EDITOR_OPEN_FLOW_2026_04_17.md)

## Primary API Surface

Short-term control policy:

- Only faction `player` can be human-controlled.
- All other factions are AI-controlled.

## MiniMax Music 免费接口（music-2.6-free）

本仓库新增 `scripts/minimax_music_free.py`，用于三国 SLG BGM 的 MiniMax 免费模型音频生成：

- 默认模型：`music-2.6-free`
- 默认器乐设置：纯器乐（`is_instrumental=true`）
- 输出默认目录：`outputs/music/raw/`
- 接口地址：`https://api.minimax.io/v1/music_generation`
- 接口参数默认：`output_format=url`，`stream=false`

### 安装依赖

```bash
pip install -r requirements.txt
```

### 配置环境变量

在仓库根目录创建 `.env`（或系统环境变量）：

```env
MINIMAX_API_KEY=你的 MiniMax API Key
```

### 运行示例

```bash
python scripts/minimax_music_free.py
python scripts/minimax_music_free.py --prompt "为三国谋略场景生成古典风雅 BGM" -o scene.wav --format wav
python scripts/minimax_music_free.py --dry-run --output test_slg_bgm -f mp3
```

### 使用限制

- 免费额度默认约束：RPM 3
- 最大并发 `CONN=3`
- 脚本会在本地做最小速率与并发保护（1 分钟 3 次、并发 3）以尽量避开 API 限制
- 不支持上传 cover / 版权歌曲改造，仅做文本到音频生成
- URL 返回会尝试立即下载；返回 hex 时会自动 hex decode 到文件
- 典型错误会输出更明确提示（授权、速率、余额、并发限制、使用量限制、URL 过期等）

## GitHub Auth Hardening (A/B Machines)

- Run posture check: `npm run security:auth:validate`
- Apply repo hardening: `npm run security:auth:harden`
- Configure branch protection: `npm run security:branch:protect`
- Dual-maintainer gate accounts: `mohammadatiq472-source` (A), `rltsgxol4437` (B)
- Full guide: `docs/GITHUB_AUTH_DUAL_MACHINE_2026_04_04.md`

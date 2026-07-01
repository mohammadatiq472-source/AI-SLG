# Window 4 UI Entry Contract - 2026-04

This file is for AI-visible handoff only. Current implementation is still display-template only.

## Entry Split

The four hub entries must stay independent:

- `panel-id=activity` -> `page-id=activities`
- `panel-id=world_affairs` -> `page-id=world_affairs`
- `panel-id=tasks` -> `page-id=tasks`
- `panel-id=faction_status` -> `page-id=faction_status`

Do not collapse these back into one product tab. The current shared presenter is only a renderer/data convenience.

## 天下大势 Scenario Storage

`world_event_activity_template_fixture.json.world_affairs` now carries:

- `active_scenario_id`: current fixture-selected scenario.
- `scenario_storage_contract.selection_key`: future runtime key, currently `runtime_context.world_affairs_scenario_id`.
- `scenario_catalog[]`: per-script/per-season scenario definitions.
- `scenario_catalog[].timeline[]`: per-scenario node names, state text, progress copy, reward placeholder, and node asset slots.

Future real entry should select one scenario by `scenario_id`, then render only that scenario's timeline and assets. Node rewards remain placeholders until a later authority/reward lane owns settlement.

## 任务 Chapter Storage

`tasks.chapter_contract.max_chapters = 15`.

Current fixture keeps `chapters[]` from `chapter_01` to `chapter_15`, but only the current chapter's task list is rendered as template rows. Future real entry should use `runtime_context.task_chapter_id` or backend task read model to choose the active chapter and task items.

No inventory writes, reward settlement, quest completion, map jump, or backend authority is owned by this window.

## Asset Slots

Use stable slots and replace paths later:

- `world_affairs_scene`
- `world_affairs_node_01` to `world_affairs_node_10`
- scenario-specific future nodes may use `world_affairs_node_<scenario>_<index>`
- `task_chapter_scene`
- activity card slots stay in `entry_configs.activities.asset_slots`

Missing assets should keep the template placeholder instead of blocking the page.

Activity-card cover assets:

- allowed root: `res://data/ui/world_event_activity_asset_drop/`
- recommended size: `1280x720`
- minimum size: `640x360`
- aspect ratio: `16:9`
- layout mode: original showcase
- real cover mode: `asset_drop_cover`
- missing or non-whitelisted assets must keep the reusable placeholder shell and must not fall back to `res://assets/themes/**`

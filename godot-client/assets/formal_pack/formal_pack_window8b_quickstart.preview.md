# Formal Pack Window 8B Quickstart Preview

Generated at: `2026-04-29T22:35:45Z`

## Read This First

Use this file as the short integration entry for Window 8B. The full machine-readable entry is:

- `godot-client/assets/formal_pack/formal_pack_asset_runtime_lookup.preview.json`

For asset review and audit, use:

- `godot-client/assets/formal_pack/formal_pack_asset_handoff_index.preview.json`
- `godot-client/assets/formal_pack/formal_pack_asset_acceptance_report.preview.json`
- `godot-client/assets/formal_pack/formal_pack_asset_integrity.preview.json`

## Cover Wiring

For recruit pool rows, read:

- `coverByAssetKey[coverAssetKey].resPath`

Direct-ready `coverAssetKey` values:

- `formal_pack.cover.wangzuo_fengyan` -> `res://assets/formal_pack/recruit_packs/postprocessed/wangzuo_fengyan_cover_film_matte_v1.png` (1023x1537)
- `formal_pack.cover.jiangdong_zhangu` -> `res://assets/formal_pack/recruit_packs/postprocessed/jiangdong_zhangu_cover_film_matte_v1.png` (1023x1537)
- `formal_pack.cover.xiliang_tieqi` -> `res://assets/formal_pack/recruit_packs/postprocessed/xiliang_tieqi_cover_film_matte_v1.png` (1024x1536)
- `formal_pack.cover.mouchen_yeyi` -> `res://assets/formal_pack/recruit_packs/postprocessed/mouchen_yeyi_cover_film_matte_v1.png` (1024x1536)

## HeroCardView Wiring

For HeroCardView rows, read:

- `portraitByAssetKey[portraitAssetKey].resPath`

The PNGs are already `512x704`, tight upper-body crop, with non-generative `film_matte_v1` postprocess. Keep UI text outside the image.

HeroCardView fields covered by the sample payload:

- `name` / `displayName`
- `campName` / `faction`
- `rarity`
- `portraitAssetKey`
- `heroTemplateId`
- `heroInstanceId` / `instanceId`
- `coverAssetKey`

## Direct Portrait Keys

- `formal_pack.portrait.cai_wenji_fate_frontier_qin_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/cai_wenji_fate_frontier_qin_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.cao_cao_fate_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/cao_cao_fate_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.cao_pi_mature_shanrang_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/cao_pi_mature_shanrang_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.dian_wei_mature_huzhu_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/dian_wei_mature_huzhu_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.dong_zhuo_early_xiliang_campaign_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/dong_zhuo_early_xiliang_campaign_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.gan_ning_mature_jinfan_raid_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/gan_ning_mature_jinfan_raid_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.guan_yu_mature_mounted_jingzhou_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/guan_yu_mature_mounted_jingzhou_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.guo_jia_mature_fate_liaodong_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/guo_jia_mature_fate_liaodong_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.han_xiandi_disempowered_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/han_xiandi_disempowered_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.jia_xu_mature_duoshi_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/jia_xu_mature_duoshi_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.liu_bei_mature_hanzhong_sworddance_face_smile_v2` -> `res://assets/formal_pack/portraits/card/postprocessed/liu_bei_mature_hanzhong_sworddance_face_smile_v2_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.lu_bu_mature_wenhou_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/lu_bu_mature_wenhou_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.ma_chao_mature_xiliang_retreat_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/ma_chao_mature_xiliang_retreat_v1_card_film_matte_v1.png` [watch]
- `formal_pack.portrait.sima_yi_fate_gaopingling_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/sima_yi_fate_gaopingling_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.sun_ce_young_founder_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/sun_ce_young_founder_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.sun_quan_mature_successor_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/sun_quan_mature_successor_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.tai_shi_ci_mature_yishi_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/tai_shi_ci_mature_yishi_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.xiahou_dun_mature_duyan_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/xiahou_dun_mature_duyan_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.xun_yu_youth_wangzuo_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/xun_yu_youth_wangzuo_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.yuan_shao_mature_coalition_oath_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/yuan_shao_mature_coalition_oath_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.zhang_fei_mature_baxi_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/zhang_fei_mature_baxi_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.zhang_liao_mature_hefei_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/zhang_liao_mature_hefei_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.zhao_yun_youth_changban_rescue_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/zhao_yun_youth_changban_rescue_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.zhou_tai_mature_victory_shout_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/zhou_tai_mature_victory_shout_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.zhou_yu_mature_chibi_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/zhou_yu_mature_chibi_v1_card_film_matte_v1.png` [ready]
- `formal_pack.portrait.zhuge_liang_mature_beifa_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/zhuge_liang_mature_beifa_v1_card_film_matte_v1.png` [watch]

## Review Before Primary Use

- `formal_pack.portrait.sun_quan_succession_entrustment_v1` -> `res://assets/formal_pack/portraits/card/postprocessed/sun_quan_succession_entrustment_v1_card_film_matte_v1.png` [review]: Back/side-facing source has lower face readability than the face-forward Sun Quan portrait; keep as available asset but avoid as the primary HeroCardView portrait if the mature successor version is enough.

## Sample Payload

Use this file only as preview wiring data, not authority data:

- `godot-client/assets/formal_pack/formal_pack_window8b_sample_payload.preview.json`

It contains:

- `recruitPools`: preview pool rows with `coverAssetKey`.
- `heroPreviewCards`: unowned/card-library rows with `portraitAssetKey`.
- `ownedHeroPreviewCards`: preview instance rows with `heroInstanceId` / `instanceId`.

Do not treat `preview_instance_*` ids, prices, probabilities, ownership, or inventory as real game state.

## Review Sheets

- `tmp/screenshots/formal_pack/assets_review/recruit_pack_cover_contact_sheet.png`
- `tmp/screenshots/formal_pack/assets_review/recruit_pack_cover_filter_compare_contact_sheet.png`
- `tmp/screenshots/formal_pack/assets_review/hero_portrait_contact_sheet.png`
- `tmp/screenshots/formal_pack/assets_review/hero_portrait_crop_compare_contact_sheet.png`
- `tmp/screenshots/formal_pack/assets_review/hero_portrait_filter_compare_contact_sheet.png`

## Boundary Notes

- Original source portraits under `portrait_assets/` were not overwritten.
- `coverPath` and `cardPortraitPath` point to postprocessed preview assets.
- Raw generated/cropped assets are preserved under `rawCoverPath` / `rawCardPortraitPath`.
- This package does not modify `godot-client/scripts/**` or `godot-client/scenes/**`.

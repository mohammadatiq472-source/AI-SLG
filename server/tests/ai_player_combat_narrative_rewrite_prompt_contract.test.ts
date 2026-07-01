import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(process.cwd(), 'server/src/application/ai/aiPlayerChatCommandService.ts'),
  'utf-8',
)

assert.match(source, /不要把自己的名字当标题/)
assert.match(source, /不要用“战情汇报：”“战况：”这类模板开头/)
assert.match(source, /像真人玩家在聊天频道里收到同伴消息/)
assert.match(source, /不使用“老兄”“哥们”这类过度口语称呼/)
assert.match(source, /先说发生了什么，再说我接下来会怎么盯/)
assert.match(source, /不要说“系统自己推断”“界面自己推断”/)
assert.match(source, /battleDigest/)
assert.match(source, /坐标\(x,y\)附近/)
assert.match(source, /不要把未知位置硬编成东线、西门、北侧/)

console.log('[ai_player_combat_narrative_rewrite_prompt_contract] ok')

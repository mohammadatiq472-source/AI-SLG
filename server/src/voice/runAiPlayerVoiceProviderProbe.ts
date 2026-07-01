import '../bootstrap/loadEnv'
import {
  probeAiPlayerDeepSeekApi,
  probeAiPlayerMimoTts,
  writeAiPlayerVoiceProbeAudioFile,
} from './aiPlayerVoiceProviderLiveProbe'

function hasArg(name: string) {
  return process.argv.includes(name)
}

function readArgValue(name: string) {
  const prefix = `${name}=`
  const matched = process.argv.find((arg) => arg.startsWith(prefix))
  return matched ? matched.slice(prefix.length).trim() : ''
}

function readProviderArg() {
  const provider = (readArgValue('--provider') || 'all').toLowerCase()
  if (provider === 'all' || provider === 'deepseek' || provider === 'mimo') {
    return provider
  }
  throw new Error(`unsupported provider probe target: ${provider}`)
}

async function run() {
  const provider = readProviderArg()
  const deepSeek = provider === 'all' || provider === 'deepseek'
    ? await probeAiPlayerDeepSeekApi()
    : undefined
  const mimo = provider === 'all' || provider === 'mimo'
    ? await probeAiPlayerMimoTts()
    : undefined
  const writeAudio = hasArg('--write-audio') || process.env.AI_PLAYER_VOICE_PROBE_WRITE_AUDIO === '1'
  if (writeAudio && mimo?.ok && mimo.audioAssetId) {
    const outputPath = writeAiPlayerVoiceProbeAudioFile({
      audioAssetId: mimo.audioAssetId,
      outputDir: readArgValue('--out-dir') || undefined,
    })
    if (outputPath) {
      mimo.outputPath = outputPath
    }
  }
  const results = [deepSeek, mimo].filter((result) => result !== undefined)
  const ok = results.every((result) => result.ok)
  console.log(JSON.stringify({
    ok,
    provider,
    deepSeek,
    mimo,
  }, null, 2))
  if (!ok) {
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error('[ai_player_voice_provider_probe] failed:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

import { SpeechEngine } from '@elevenlabs/elevenlabs-js'
import {
  buildAiPlayerSpeechEngineServerConfig,
  handleAiPlayerSpeechTranscript,
  postAiPlayerSpeechChatMessage,
} from './aiPlayerSpeechEngineBridge'

const config = buildAiPlayerSpeechEngineServerConfig()

const server = new SpeechEngine.Server({
  apiKey: config.apiKey,
  engineId: config.speechEngineId,
  port: config.port,
  debug: config.debug,
  onInit(conversationId) {
    console.log(`[ai-player-speech] session started: ${conversationId}`)
  },
  onTranscript(transcript, signal, session) {
    void (async () => {
      try {
        const reply = await handleAiPlayerSpeechTranscript({
          aiPlayerId: config.aiPlayerId,
          governorPlayerId: config.governorPlayerId,
          governorDisplayName: config.governorDisplayName,
          transcript,
          sendChatMessage: (aiPlayerId, request) => postAiPlayerSpeechChatMessage({
            backendBaseUrl: config.backendBaseUrl,
            aiPlayerId,
            request,
            signal,
          }),
        })

        if (!signal.aborted) {
          await session.sendResponse(reply)
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error('[ai-player-speech] transcript handling failed:', error)
          await session.sendResponse('语音命令处理失败，请稍后重试。')
        }
      }
    })()
  },
  onClose(session) {
    console.log(`[ai-player-speech] session closed: ${session.conversationId ?? 'unknown'}`)
  },
  onDisconnect(session) {
    console.warn(`[ai-player-speech] session disconnected: ${session.conversationId ?? 'unknown'}`)
  },
  onError(error, session) {
    console.error(`[ai-player-speech] session error ${session.conversationId ?? 'unknown'}:`, error)
  },
})

server.start()
console.log(
  `[ai-player-speech] listening on ws://127.0.0.1:${config.port}${config.path} `
  + `for speechEngine=${config.speechEngineId} aiPlayer=${config.aiPlayerId} backend=${config.backendBaseUrl}`,
)

const stop = async () => {
  await server.stop()
  process.exit(0)
}

process.once('SIGINT', () => {
  void stop()
})
process.once('SIGTERM', () => {
  void stop()
})

import { createServer } from 'node:http'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { buildAiPlayerSpeechEngineServerConfig } from './aiPlayerSpeechEngineBridge'

const config = buildAiPlayerSpeechEngineServerConfig()
const port = Number(process.env.AI_PLAYER_SPEECH_CONSOLE_PORT ?? 3002)
const elevenlabs = new ElevenLabsClient({ apiKey: config.apiKey })

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>8989 AI Player Voice Console</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
      background: #101214;
      color: #e8ecf1;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
      background: #101214;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 18px;
      border-bottom: 1px solid #29313a;
      background: #161a1f;
    }
    h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 650;
    }
    main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      min-height: 0;
    }
    .stage {
      display: grid;
      place-items: center;
      padding: 20px;
      background: #0d0f12;
    }
    .viewport {
      width: min(100%, 1180px);
      aspect-ratio: 16 / 9;
      border: 1px solid #2c3540;
      background: #14191f;
      display: grid;
      place-items: center;
      color: #9ba8b5;
    }
    aside {
      border-left: 1px solid #29313a;
      padding: 18px;
      background: #161a1f;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    button {
      min-height: 42px;
      border: 1px solid #415064;
      background: #233041;
      color: #f5f7fa;
      border-radius: 6px;
      font-size: 15px;
      cursor: pointer;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .danger {
      background: #4a2630;
      border-color: #714052;
    }
    .status {
      min-height: 22px;
      color: #b8c2cc;
      font-size: 13px;
    }
    .log {
      flex: 1;
      min-height: 240px;
      overflow: auto;
      white-space: pre-wrap;
      border: 1px solid #29313a;
      padding: 12px;
      background: #0f1318;
      font-size: 13px;
      line-height: 1.5;
    }
    @media (max-width: 900px) {
      main {
        grid-template-columns: 1fr;
      }
      aside {
        border-left: 0;
        border-top: 1px solid #29313a;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>8989 AI Player Voice Console</h1>
    <div id="summary">Speech Engine: ${config.speechEngineId}</div>
  </header>
  <main>
    <section class="stage">
      <div class="viewport">Godot / Web 游戏画面占位</div>
    </section>
    <aside>
      <button id="start">开始语音</button>
      <button id="stop" class="danger" disabled>结束语音</button>
      <div id="status" class="status">未连接</div>
      <div id="log" class="log"></div>
    </aside>
  </main>
  <script type="module">
    import { Conversation } from "https://esm.sh/@elevenlabs/client@1.8.1";

    let conversation = null;
    const startButton = document.getElementById("start");
    const stopButton = document.getElementById("stop");
    const status = document.getElementById("status");
    const log = document.getElementById("log");

    function append(line) {
      const now = new Date().toLocaleTimeString();
      log.textContent += "[" + now + "] " + line + "\\n";
      log.scrollTop = log.scrollHeight;
    }

    async function getToken() {
      const response = await fetch("/api/token");
      if (!response.ok) {
        throw new Error("token endpoint failed: " + response.status);
      }
      const data = await response.json();
      return data.token;
    }

    startButton.addEventListener("click", async () => {
      try {
        startButton.disabled = true;
        status.textContent = "正在请求麦克风和会话 token...";
        const token = await getToken();
        conversation = await Conversation.startSession({
          conversationToken: token,
          connectionType: "webrtc",
          overrides: {
            agent: {
              firstMessage: "主公，语音通道已经接入青州后勤官。"
            }
          },
          onConnect: ({ conversationId }) => {
            status.textContent = "已连接: " + conversationId;
            append("已连接 Speech Engine。");
          },
          onDisconnect: () => {
            status.textContent = "已断开";
            append("Speech Engine 已断开。");
            startButton.disabled = false;
            stopButton.disabled = true;
          },
          onMessage: (message) => append(JSON.stringify(message)),
          onError: (error) => append("错误: " + String(error))
        });
        stopButton.disabled = false;
      } catch (error) {
        status.textContent = "连接失败";
        append("连接失败: " + String(error));
        startButton.disabled = false;
      }
    });

    stopButton.addEventListener("click", async () => {
      if (conversation) {
        await conversation.endSession();
        conversation = null;
      }
      stopButton.disabled = true;
      startButton.disabled = false;
    });
  </script>
</body>
</html>`

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `127.0.0.1:${port}`}`)

  if (req.method === 'GET' && url.pathname === '/api/token') {
    try {
      const token = await elevenlabs.conversationalAi.conversations.getWebrtcToken({
        agentId: config.speechEngineId,
        participantName: config.governorDisplayName,
      })
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ token: token.token }))
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
    }
    return
  }

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(html)
    return
  }

  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: 'not_found' }))
})

server.listen(port, '127.0.0.1', () => {
  console.log(`[ai-player-speech-console] http://127.0.0.1:${port}`)
})

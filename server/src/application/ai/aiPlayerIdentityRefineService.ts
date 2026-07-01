import type {
  RefineAiPlayerContextDocumentRequest,
  RefinedAiPlayerContextDocumentPreview,
  UpsertAiPlayerContextDocumentRequest,
} from '../../../../shared/contracts/aiPlayer'

const MAX_REFINE_SOURCE_CHARS = 50_000
const MAX_REFINED_CONTENT_CHARS = 2_000

function clipText(input: string, maxChars: number) {
  return input.length > maxChars ? input.slice(0, maxChars) : input
}

function normalizeSourceContent(input: string) {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

function estimateTokens(input: string) {
  if (!input) {
    return 0
  }
  return Math.ceil(input.length / 2)
}

function extractSpeakerHints(source: string): string[] {
  const speakers = new Set<string>()
  for (const line of source.split('\n')) {
    const match = /^([^:：\s]{1,16})\s*(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}\s+\d{1,2}:\d{2})?\s*[:：]/.exec(line)
    const speaker = match?.[1]?.trim()
    if (speaker) {
      speakers.add(speaker)
    }
    if (speakers.size >= 4) {
      break
    }
  }
  return Array.from(speakers)
}

function extractRepresentativeLines(source: string): string[] {
  const preferred = source.split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 6)
  return preferred.slice(0, 6)
}

function buildRefinedContent(input: {
  source: string
  displayName: string
  sourceFileName?: string
}) {
  const speakers = extractSpeakerHints(input.source)
  const examples = extractRepresentativeLines(input.source)
  const sourceLabel = input.sourceFileName ? `来源文件：${input.sourceFileName}` : '来源文件：未命名聊天记录'
  const speakerText = speakers.length > 0 ? speakers.join('、') : input.displayName
  const exampleText = examples.length > 0
    ? examples.map((line) => `- ${clipText(line, 180)}`).join('\n')
    : '- 原始记录较短，暂按上传内容保留身份语气。'
  return clipText([
    `身份名称：${input.displayName}`,
    sourceLabel,
    `提炼对象：${speakerText}`,
    '',
    '说话风格：优先保留原始聊天里的自称、口头禅、语气强弱和行动偏好；回复时不要改成中性职业化语气。',
    '',
    '关键记忆与表达样本：',
    exampleText,
    '',
    '行动准则：先说明资源、目标、风险和批准后结果；涉及高风险行动时主动提醒总督确认。',
    '',
    '使用边界：这是身份文件提炼预览，必须由用户确认后再写入 contextDocuments。',
  ].join('\n'), MAX_REFINED_CONTENT_CHARS)
}

export function refineAiPlayerContextDocumentPreview(input: {
  aiPlayerId: string
  displayName: string
  request: RefineAiPlayerContextDocumentRequest
}): {
  refined: RefinedAiPlayerContextDocumentPreview
  suggestedUpsertRequest: UpsertAiPlayerContextDocumentRequest
} {
  const normalizedSource = normalizeSourceContent(input.request.sourceContent)
  const sourceChars = normalizedSource.length
  const usedSource = clipText(normalizedSource, MAX_REFINE_SOURCE_CHARS)
  const title = input.request.titleHint?.trim()
    || `${input.displayName}的微信身份提炼`
  const content = buildRefinedContent({
    source: usedSource,
    displayName: input.displayName,
    sourceFileName: input.request.sourceFileName,
  })
  const refined: RefinedAiPlayerContextDocumentPreview = {
    kind: 'identity',
    title,
    content,
    sourceFileName: input.request.sourceFileName?.trim() || undefined,
    contentBytes: Buffer.byteLength(content, 'utf8'),
    estimatedTokens: estimateTokens(content),
    sourceChars,
    usedSourceChars: usedSource.length,
    truncated: sourceChars > usedSource.length,
    maxSourceChars: MAX_REFINE_SOURCE_CHARS,
  }
  return {
    refined,
    suggestedUpsertRequest: {
      kind: 'identity',
      title: refined.title,
      content: refined.content,
      sourceFileName: refined.sourceFileName,
      updatedBy: input.request.updatedBy,
    },
  }
}

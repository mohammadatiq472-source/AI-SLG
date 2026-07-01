import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

type ProcessRow = {
  ProcessId: number
  ParentProcessId: number
  Name: string
  CreationDate: string
  CommandLine: string
}

const SERVER_APP_TOKEN = 'server/src/app.ts'

type Args = {
  cleanupOlder: boolean
  cleanupAll: boolean
  maxServerGroups: number
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    cleanupOlder: false,
    cleanupAll: false,
    maxServerGroups: 1,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--cleanup-older') {
      args.cleanupOlder = true
    } else if (arg === '--cleanup-all') {
      args.cleanupAll = true
    } else if (arg === '--max-server-groups') {
      const value = Number(argv[index + 1])
      if (!Number.isFinite(value) || value < 0) {
        throw new Error('--max-server-groups requires a non-negative number')
      }
      args.maxServerGroups = Math.trunc(value)
      index += 1
    }
  }
  return args
}

function runPowerShell(script: string): string {
  const result = spawnSync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script,
  ], {
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `PowerShell failed with ${result.status}`).trim())
  }
  return result.stdout.trim()
}

function readProcessRows(repoRoot: string): ProcessRow[] {
  const escapedRepo = repoRoot.replace(/'/g, "''")
  const script = `
$repo = '${escapedRepo}'
$rows = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and
  $_.CommandLine -like "*$repo*" -and
  $_.Name -ne 'node_repl.exe' -and
  $_.CommandLine -notmatch 'check_8989_service_processes' -and
  $_.CommandLine -notmatch 'Get-CimInstance Win32_Process' -and
  (
    $_.CommandLine -match 'server/src/app\\.ts' -or
    $_.CommandLine -match 'server:dev' -or
    $_.CommandLine -match 'tsx.*watch' -or
    $_.CommandLine -match 'watch.*server'
  )
} | Select-Object ProcessId,ParentProcessId,Name,CreationDate,CommandLine
if ($rows) { $rows | ConvertTo-Json -Depth 4 } else { '[]' }
`
  const stdout = runPowerShell(script)
  if (!stdout) {
    return []
  }
  const parsed = JSON.parse(stdout)
  return Array.isArray(parsed) ? parsed : [parsed]
}

function cleanupProcessIds(processIds: number[]): void {
  if (processIds.length === 0) {
    return
  }
  const ids = processIds.map((id) => String(id)).join(',')
  const script = `
$ids = @(${ids})
foreach ($id in $ids) {
  try { Stop-Process -Id $id -Force -ErrorAction Stop } catch { }
}
`
  runPowerShell(script)
}

function collectTmpCleanableItems(repoRoot: string): Array<{ path: string; bytes: number; fileCount: number }> {
  const tmpRoot = resolve(repoRoot, 'tmp')
  if (!existsSync(tmpRoot)) {
    return []
  }
  return readdirSync(tmpRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^stage\d+_|^stage\d/.test(entry.name))
    .slice(0, 30)
    .map((entry) => {
      const fullPath = resolve(tmpRoot, entry.name)
      let bytes = 0
      let fileCount = 0
      const stack = [fullPath]
      while (stack.length > 0) {
        const current = stack.pop()!
        for (const child of readdirSync(current, { withFileTypes: true })) {
          const childPath = resolve(current, child.name)
          if (child.isDirectory()) {
            stack.push(childPath)
          } else {
            fileCount += 1
            bytes += statSync(childPath).size
          }
        }
      }
      return { path: fullPath, bytes, fileCount }
    })
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = resolve(process.cwd())
  const before = readProcessRows(repoRoot).sort((a, b) => String(a.CreationDate).localeCompare(String(b.CreationDate)))
  const latest = before.at(-1)
  const latestKeptProcessIds = latest ? [Number(latest.ProcessId)] : []
  const cleanupIds = args.cleanupAll
    ? before.map((row) => Number(row.ProcessId))
    : args.cleanupOlder
      ? before.filter((row) => Number(row.ProcessId) !== Number(latest?.ProcessId)).map((row) => Number(row.ProcessId))
      : []

  cleanupProcessIds(cleanupIds)

  const after = readProcessRows(repoRoot).sort((a, b) => String(a.CreationDate).localeCompare(String(b.CreationDate)))
  const ok = after.length <= args.maxServerGroups
  const result = {
    ok,
    repoRoot,
    serverAppToken: SERVER_APP_TOKEN,
    maxServerGroups: args.maxServerGroups,
    cleanupOlder: args.cleanupOlder,
    cleanupAll: args.cleanupAll,
    processCountBefore: before.length,
    processCountAfter: after.length,
    cleanedProcessIds: cleanupIds,
    latestKeptProcessIds: args.cleanupAll ? [] : latestKeptProcessIds,
    processes: after,
    tmpCleanableItems: collectTmpCleanableItems(repoRoot),
  }

  console.log(JSON.stringify(result, null, 2))
  if (!ok) {
    process.exitCode = 1
  }
}

main()

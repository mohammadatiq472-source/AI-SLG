import { spawnSync } from 'node:child_process'

export function runServiceProcessPrestartGuard(context: string): void {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npmCommand, ['run', 'ops:service-process-prestart'], {
    cwd: process.cwd(),
    encoding: 'utf-8',
  })

  if (result.status === 0) {
    return
  }

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim()
  const detail = output ? `\n${output}` : ''
  throw new Error(`service process prestart guard failed before ${context}${detail}`)
}

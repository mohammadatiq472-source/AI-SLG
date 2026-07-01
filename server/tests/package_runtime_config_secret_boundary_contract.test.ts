import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const gitignoreSource = readFileSync('.gitignore', 'utf-8')
const packageJsonSource = readFileSync('package.json', 'utf-8')

function listFilesRecursive(root: string): string[] {
  if (!existsSync(root)) {
    return []
  }
  const result: string[] = []
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      result.push(...listFilesRecursive(fullPath))
    } else {
      result.push(fullPath.replaceAll('\\', '/'))
    }
  }
  return result
}

assert.match(gitignoreSource, /^\.env$/m, 'root .env must stay ignored')
assert.match(gitignoreSource, /^\.env\.\*$/m, 'root .env.* must stay ignored')
assert.match(gitignoreSource, /^!\.env\.example$/m, 'root .env.example must stay allowed as a placeholder only')

assert.ok(
  !packageJsonSource.includes('prepare_usb_migration_package.ps1'),
  'current npm package entrypoints must not invoke legacy USB migration packaging that listed real env files',
)

const runtimeConfigFiles = listFilesRecursive('runtime_config')
const forbiddenRuntimeConfigFiles = runtimeConfigFiles.filter((file) => {
  const normalized = file.toLowerCase()
  return normalized.endsWith('/.env') || normalized.endsWith('/.env.local') || /\/\.env\.[^.]+$/.test(normalized)
})

assert.deepEqual(
  forbiddenRuntimeConfigFiles,
  [],
  'source-root runtime_config must not contain real env files; only runtime_config/.env.example may be committed',
)

const nonExampleRuntimeConfigFiles = runtimeConfigFiles.filter(
  (file) => file.replaceAll('\\', '/') !== 'runtime_config/.env.example',
)
assert.deepEqual(
  nonExampleRuntimeConfigFiles,
  [],
  'source-root runtime_config must be absent or contain only runtime_config/.env.example',
)

console.log('[package_runtime_config_secret_boundary_contract] all checks passed')

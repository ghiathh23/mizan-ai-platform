import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(process.cwd(), 'src')
const forbidden = /service[_-]?role|supabase_service_role|serviceRoleKey/i
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'])
const violations = []

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(path)
      continue
    }
    if (!extensions.has(path.slice(path.lastIndexOf('.')))) continue
    const content = await readFile(path, 'utf8')
    if (forbidden.test(content)) violations.push(relative(process.cwd(), path))
  }
}

await walk(root)
if (violations.length > 0) {
  console.error('Forbidden service-role reference found in browser source:')
  for (const file of violations) console.error(`- ${file}`)
  process.exit(1)
}
console.log('Service-role browser-source guard passed.')

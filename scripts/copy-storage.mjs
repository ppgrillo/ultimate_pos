import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function parseEnv(p) {
  const out = {}
  for (const raw of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    const k = line.slice(0, i).trim()
    const v = line.slice(i + 1).trim()
    if (!(k in out)) out[k] = v
  }
  return out
}

const devEnv = parseEnv(resolve(root, 'apps/backend/.env'))
const prodEnv = parseEnv(resolve(root, 'apps/backend/.env.prod'))

const dev = createClient(devEnv.SUPABASE_URL, devEnv.SUPABASE_SERVICE_ROLE_KEY)
const prod = createClient(prodEnv.SUPABASE_URL, prodEnv.SUPABASE_SERVICE_ROLE_KEY)

const BUCKET = 'product-images'

async function main() {
  const { data: objects, error } = await dev.storage.from(BUCKET).list('', { limit: 1000 })
  if (error) throw new Error(`list dev: ${error.message}`)

  const paths = [...objects.filter((o) => o.id).map((o) => o.name)]
  const { data: logos, error: logosErr } = await dev.storage.from(BUCKET).list('logos')
  if (logosErr) throw new Error(`list logos dev: ${logosErr.message}`)
  paths.push(...logos.filter((o) => o.id).map((o) => `logos/${o.name}`))

  console.log(`Total archivos a copiar: ${paths.length}`)

  let ok = 0
  let failed = 0
  for (const name of paths) {
    try {
      const { data, error: dlErr } = await dev.storage.from(BUCKET).download(name)
      if (dlErr) throw new Error(`download ${name}: ${dlErr.message}`)
      const { error: upErr } = await prod.storage.from(BUCKET).upload(name, data, { upsert: true, contentType: data.type })
      if (upErr) throw new Error(`upload ${name}: ${upErr.message}`)
      ok++
      console.log(`✔ ${name}`)
    } catch (e) {
      failed++
      console.error(`✘ ${name}: ${e.message}`)
    }
  }

  console.log(`\nCopiados: ${ok} | Fallidos: ${failed}`)
  if (failed > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
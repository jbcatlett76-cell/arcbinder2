import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const staleFiles = ['_redirects']

for (const filename of staleFiles) {
  const target = resolve('dist', filename)
  await rm(target, { force: true })
  console.log(`Removed stale Cloudflare asset: dist/${filename}`)
}

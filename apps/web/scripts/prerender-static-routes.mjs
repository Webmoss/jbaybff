import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distDir = path.join(root, 'dist')

const targetRoutes = [
  '/',
  '/campaigns',
  '/blog',
  '/events',
  '/actions',
  '/impact',
  '/shop',
]

async function run() {
  const indexPath = path.join(distDir, 'index.html')
  const html = await readFile(indexPath, 'utf8')
  let written = 0

  for (const route of targetRoutes) {
    if (route === '/') continue
    const outDir = path.join(distDir, route.replace(/^\//, ''))
    await mkdir(outDir, { recursive: true })
    await writeFile(path.join(outDir, 'index.html'), html, 'utf8')
    written++
  }

  console.log(`Prerender pilot wrote ${written} route shells.`)
  console.log(`Routes: ${targetRoutes.join(', ')}`)
}

run().catch((err) => {
  console.error('Prerender pilot failed:', err)
  process.exitCode = 1
})

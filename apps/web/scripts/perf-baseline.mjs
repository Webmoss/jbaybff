import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distDir = path.join(root, 'dist')
const assetsDir = path.join(distDir, 'assets')
const reportPath = path.join(root, 'dist', 'perf-baseline.json')

const routeChecks = [
  '/',
  '/campaigns',
  '/blog',
  '/events',
  '/actions',
  '/impact',
  '/shop',
]

async function gatherAssetSizes() {
  const entries = await readdir(assetsDir)
  const files = await Promise.all(
    entries.map(async (name) => {
      const abs = path.join(assetsDir, name)
      const s = await stat(abs)
      return { name, bytes: s.size }
    }),
  )
  const js = files.filter((f) => f.name.endsWith('.js'))
  const css = files.filter((f) => f.name.endsWith('.css'))

  const sum = (rows) => rows.reduce((acc, row) => acc + row.bytes, 0)
  return {
    jsBytes: sum(js),
    cssBytes: sum(css),
    largestJs: js.sort((a, b) => b.bytes - a.bytes).slice(0, 5),
    largestCss: css.sort((a, b) => b.bytes - a.bytes).slice(0, 5),
  }
}

async function verifyPrerenderShells() {
  const checks = await Promise.all(
    routeChecks.map(async (route) => {
      const htmlPath =
        route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, route.slice(1), 'index.html')
      try {
        const html = await readFile(htmlPath, 'utf8')
        return {
          route,
          ok: html.includes('<div id="app"></div>'),
        }
      } catch {
        return { route, ok: false }
      }
    }),
  )
  return checks
}

async function main() {
  const [assets, routeShells] = await Promise.all([gatherAssetSizes(), verifyPrerenderShells()])
  const report = {
    generatedAt: new Date().toISOString(),
    assets,
    routeShells,
    thresholds: {
      jsBudgetBytes: 1_000_000,
      cssBudgetBytes: 150_000,
    },
    pass:
      assets.jsBytes <= 1_000_000 &&
      assets.cssBytes <= 150_000 &&
      routeShells.every((row) => row.ok),
  }

  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`Perf baseline report: ${reportPath}`)
  console.log(
    `JS ${assets.jsBytes} bytes, CSS ${assets.cssBytes} bytes, routes OK: ${routeShells.filter((r) => r.ok).length}/${routeShells.length}`,
  )

  if (!report.pass) {
    console.error('Baseline check failed.')
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('Perf baseline failed:', err)
  process.exitCode = 1
})

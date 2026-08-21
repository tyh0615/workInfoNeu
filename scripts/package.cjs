/**
 * 手动打包脚本（替代 neu CLI，绕开 commander 异步静默问题）
 * 流程与官方 bundler 一致：
 *   1. 组装 .tmp 资源包目录（resources/ + neutralino.config.json）
 *   2. 用 @electron/asar 打包为 resources.neu（Neutralino 6.x 资源包格式）
 *   3. 复制 neutralino-win_x64.exe 并重命名为应用名
 *   4. release 模式生成 zip
 */
const fs = require('fs')
const fse = require('fs-extra')
const asar = require('@electron/asar')
const zl = require('zip-lib')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'neutralino.config.json'), 'utf-8'))

const binaryName = CONFIG.cli.binaryName
const resourcesPath = (CONFIG.cli.resourcesPath || '/resources/').replace(/^\/+|\/+$/g, '')
const buildDir = CONFIG.cli.distributionPath ? CONFIG.cli.distributionPath.replace(/^\/+/, '') : 'dist'
const release = process.argv.includes('--release')

const tmpDir = path.join(ROOT, '.tmp')
const outDir = path.join(ROOT, buildDir, binaryName)
const resourceFile = path.join(outDir, 'resources.neu')

async function main() {
  console.log(`[package] bundling ${resourcesPath}/ -> resources.neu`)

  // 1. 组装资源目录
  fse.emptyDirSync(tmpDir)
  fse.copySync(path.join(ROOT, resourcesPath), path.join(tmpDir, resourcesPath), { overwrite: true })
  fse.copySync(path.join(ROOT, 'neutralino.config.json'), path.join(tmpDir, 'neutralino.config.json'), {
    overwrite: true
  })

  // 图标：若 config 指定且在资源目录中则已复制，否则从项目根补
  const icon = (CONFIG.modes.window.icon || '').replace(/^\/+/, '')
  if (icon) {
    const src = path.join(ROOT, icon)
    if (fs.existsSync(src)) {
      fse.copySync(src, path.join(tmpDir, icon), { overwrite: true })
    }
  }

  // 2. asar 打包
  fse.emptyDirSync(outDir)
  await asar.createPackage(tmpDir, resourceFile)
  console.log(`[package] generated ${path.relative(ROOT, resourceFile)}`)

  // 3. 复制并重命名二进制
  const winBin = 'neutralino-win_x64.exe'
  const binSrc = path.join(ROOT, 'bin', winBin)
  const exeDest = path.join(outDir, `${binaryName}.exe`)
  if (!fs.existsSync(binSrc)) {
    throw new Error(`missing ${binSrc}`)
  }
  fse.copySync(binSrc, exeDest)
  console.log(`[package] copied ${winBin} -> ${path.relative(ROOT, exeDest)}`)

  // 4. release zip
  if (release) {
    const zipPath = path.join(ROOT, buildDir, `${binaryName}-release.zip`)
    await zl.archiveFolder(outDir, zipPath)
    console.log(`[package] generated ${path.relative(ROOT, zipPath)}`)
  }

  console.log('[package] done')
}

main().catch((e) => {
  console.error('[package] failed:', e.message)
  process.exit(1)
})

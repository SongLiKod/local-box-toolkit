import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { configGet, configSet } from './configStore'

const RENDERER_DIR = path.join(__dirname, '..', 'renderer')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
  },
])

function mime(p: string): string {
  const ext = path.extname(p).toLowerCase()
  const map: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.webmanifest': 'application/manifest+json',
  }
  return map[ext] ?? 'application/octet-stream'
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: '#F5F7FA',
    autoHideMenuBar: true,
    title: 'LocalBox 本地工具箱',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  })
  void win.loadURL('app://localbox/index.html')
  win.on('page-title-updated', (e) => e.preventDefault())
}

app.whenReady().then(() => {
  // 本地文件系统协议：完全离线，无网络请求
  protocol.handle('app', async (request) => {
    const url = new URL(request.url)
    let rel = decodeURIComponent(url.pathname)
    if (rel === '/' || rel === '') rel = '/index.html'
    const filePath = path.join(RENDERER_DIR, rel)
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(path.resolve(RENDERER_DIR))) {
      return new Response('Forbidden', { status: 403 })
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return new Response('Not Found', { status: 404 })
    }
    const data = await fs.promises.readFile(resolved)
    return new Response(data, { headers: { 'Content-Type': mime(resolved) } })
  })

  // 本地配置读写（AppData JSON）
  ipcMain.handle('config:get', (_e, key: string) => configGet(key))
  ipcMain.handle('config:set', (_e, key: string, value: string) => {
    configSet(key, value)
    return true
  })

  // 保存文件到本地系统
  ipcMain.handle('file:save', async (e, name: string, data: ArrayBuffer) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return null
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: '保存文件',
      defaultPath: name,
    })
    if (canceled || !filePath) return null
    await fs.promises.writeFile(filePath, Buffer.from(data))
    return filePath
  })

  // 批量重命名落盘（便民工具：批量文件重命名，Electron 端支持本机执行）
  ipcMain.handle('file:rename', (_e, map: Record<string, string>) => {
    const done: string[] = []
    for (const [from, to] of Object.entries(map)) {
      try {
        if (fs.existsSync(from) && from !== to) {
          fs.renameSync(from, to)
          done.push(to)
        }
      } catch {
        /* 单个失败不影响其它 */
      }
    }
    return done
  })

  ipcMain.handle('shell:open', async (_e, p: string) => shell.openPath(p))

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// 可选：桌面快捷方式由 electron-builder 的 nsis/dmg 配置生成（见 electron-builder.yml）

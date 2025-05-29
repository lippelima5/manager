import { is } from "@electron-toolkit/utils";
import { exec } from "child_process";
import { app, BrowserWindow, ipcMain } from "electron";
import { getPort } from "get-port-please";
import { startServer } from "next/dist/server/lib/start-server";
import { promises as fs } from 'fs'
import * as path from 'path'

type Config = {
  pinned: string[]
  baseDir: string
}

const CONFIG_PATH = path.resolve(app.getPath('userData'), 'config.json')
const DEFAULT_CONFIG: Config = {
  pinned: [],
  baseDir: '/Users/dev/projects'
}

let mainWindow: BrowserWindow

async function initializeConfigFile() {
  try {
    await fs.access(CONFIG_PATH)
  } catch {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
    await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8')
  }
}

async function readConfig(): Promise<Config> {
  const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
  return JSON.parse(raw)
}

async function writeConfig(config: Config) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export async function detectStack(projectPath: string): Promise<string> {
  /** Lê um arquivo e devolve string ou `null` se não existir/der erro. */
  const read = async (rel: string) => {
    try {
      return await fs.readFile(path.join(projectPath, rel), 'utf-8');
    } catch {
      return null;
    }
  };

  /** 1⃣ Projetos Node (package.json) */
  const pkgRaw = await read('package.json');
  if (pkgRaw) {
    try {
      const { dependencies = {}, devDependencies = {} } = JSON.parse(pkgRaw);
      const deps: Record<string, string> = { ...dependencies, ...devDependencies };

      const has = (...names: string[]) => names.some(n => deps[n]);

      if (has('next')) return 'Next.js';
      if (has('vite')) return 'Vite (React/Vue...)';
      if (has('nuxt')) return 'Nuxt (Vue)';
      if (has('react-native')) return 'React Native';
      if (has('electron', 'electron-builder')) return 'Electron';
      if (has('nestjs')) return 'NestJS';
      if (has('express', 'fastify', 'koa')) return 'Node.js';
      if (has('aws-cdk-lib', 'cdktf')) return 'CDK / IaC';
      if (has('@angular/core')) return 'Angular';
      if (has('vue')) return 'Vue.js';
      if (has('svelte', '@sveltejs/kit')) return 'Svelte / SvelteKit';
      if (has('jest', 'vitest', 'playwright')) return 'JS/TS (tooling only)';

      return 'JavaScript / TypeScript';        // “plain” Node project
    } catch { /* continua a checagem abaixo */ }
  }

  /** 2⃣ Python (requirements.txt ou pyproject.toml) */
  const req = await read('requirements.txt');
  if (req) {
    const lines = req.toLowerCase();
    if (lines.match(/\bdjango\b/)) return 'Python (Django)';
    if (lines.match(/\bfastapi\b/)) return 'Python (FastAPI)';
    if (lines.match(/\bflask\b/)) return 'Python (Flask)';
    return 'Python';
  }
  const pyproj = await read('pyproject.toml');
  if (pyproj) {
    if (pyproj.match(/django/i)) return 'Python (Django)';
    if (pyproj.match(/fastapi/i)) return 'Python (FastAPI)';
    if (pyproj.match(/flask/i)) return 'Python (Flask)';
    return 'Python';
  }

  /** 3⃣ Go (go.mod) */
  const gomod = await read('go.mod');
  if (gomod) {
    if (gomod.match(/gin-gonic/i)) return 'Go (Gin)';
    if (gomod.match(/echo.*github/i)) return 'Go (Echo)';
    return 'Go';
  }

  /** 4⃣ Rust (Cargo.toml) */
  if (await read('Cargo.toml')) return 'Rust';

  /** 5⃣ Java (Maven/Gradle) */
  if (await read('pom.xml')) return 'Java (Maven)';
  if (await read('build.gradle') || await read('build.gradle.kts'))
    return 'Java / Kotlin (Gradle)';

  /** 6⃣ PHP (composer.json) */
  const comp = await read('composer.json');
  if (comp) {
    const cDeps = Object.keys(JSON.parse(comp).require ?? {});
    if (cDeps.includes('laravel/framework')) return 'PHP (Laravel)';
    if (cDeps.some(d => d.startsWith('symfony/'))) return 'PHP (Symfony)';
    return 'PHP';
  }

  /** 7⃣ . NET  */
  const hasCsproj = (await fs.readdir(projectPath)).some(f => f.endsWith('.csproj')) || (await fs.readdir(projectPath)).some(f => f.endsWith('.sln'));
  if (hasCsproj) return '.NET / C#';

  /** 8⃣ Flutter / Dart */
  if (await read('pubspec.yaml')) return 'Flutter / Dart';

  /** 9⃣ Rails / Ruby */
  if (await read('Gemfile')) return 'Ruby (Rails?)';

  /** 🔚 Nada casou */
  return 'Unknown';
}

ipcMain.handle('initialize-config', async () => {
  await initializeConfigFile()
})

ipcMain.handle('get-config', async () => {
  await initializeConfigFile()
  return readConfig()
})

ipcMain.handle('set-base-dir', async (_event, newBaseDir: string) => {
  const config = await readConfig()
  config.baseDir = newBaseDir
  await writeConfig(config)
  return config
})

ipcMain.handle('load-projects', async () => {
  const { baseDir, pinned } = await readConfig()
  const entries = await fs.readdir(baseDir, { withFileTypes: true })
  const dirs = entries.filter(e => e.isDirectory())

  const projects = await Promise.all(
    dirs.map(async (dir, i) => {
      const projectPath = path.join(baseDir, dir.name)
      const { mtime } = await fs.stat(projectPath);
      return {
        id: i,
        name: dir.name,
        path: projectPath,
        stack: await detectStack(projectPath),
        lastOpened: mtime.toISOString(),
        isPinned: pinned.includes(projectPath),
        description: '',
        icon: '📁',
      }
    })
  )

  return projects
})

ipcMain.handle('toggle-pin', async (_event, projectPath: string) => {
  const config = await readConfig()
  const idx = config.pinned.indexOf(projectPath)
  if (idx >= 0) config.pinned.splice(idx, 1)
  else config.pinned.push(projectPath)
  await writeConfig(config)
  return config.pinned
})

ipcMain.handle('open-project', async (_event, projectPath: string) => {
  exec(`code "${projectPath}"`, err => {
    if (err) console.error('Error opening VS Code:', err)
  })
})


const createWindow = () => {

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 670,
    // frame: false,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  const loadURL = async () => {
    if (is.dev) {
      mainWindow.loadURL("http://localhost:3000");
    } else {
      try {
        const port = await startNextJSServer();
        console.log("Next.js server started on port:", port);
        mainWindow.loadURL(`http://localhost:${port}`);
      } catch (error) {
        console.error("Error starting Next.js server:", error);
      }
    }
  };

  loadURL();
  return mainWindow;
};

const startNextJSServer = async () => {
  try {
    const nextJSPort = await getPort({ portRange: [30_011, 50_000] });
    const webDir = path.join(app.getAppPath(), "app");

    await startServer({
      dir: webDir,
      isDev: false,
      hostname: "localhost",
      port: nextJSPort,
      customServer: true,
      allowRetry: false,
      keepAliveTimeout: 5000,
      minimalMode: true,
    });

    return nextJSPort;
  } catch (error) {
    console.error("Error starting Next.js server:", error);
    throw error;
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

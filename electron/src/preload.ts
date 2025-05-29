import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  initializeConfig: () => ipcRenderer.invoke('initialize-config'),
  getConfig:        () => ipcRenderer.invoke('get-config'),
  setBaseDir:       (dir: string) => ipcRenderer.invoke('set-base-dir', dir),
  loadProjects:     () => ipcRenderer.invoke('load-projects'),
  togglePin:        (projectPath: number) => ipcRenderer.invoke('toggle-pin', projectPath),
  openProject:      (projectPath: string) => ipcRenderer.invoke('open-project', projectPath),
})

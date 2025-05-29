"use client"

import { useState, useEffect } from "react"
import { Search, Pin, Clock, Folder, Star, Filter, Grid3X3, List, Moon, Sun, Cog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

declare global {
  interface Window {
    electronAPI: {
      initializeConfig: () => Promise<void>
      getConfig: () => Promise<{ pinned: string[]; baseDir: string }>
      setBaseDir: (dir: string) => Promise<{ pinned: string[]; baseDir: string }>
      loadProjects: () => Promise<any[]>
      togglePin: (path: string) => Promise<string[]>
      openProject: (path: string) => Promise<void>
    }
  }
}

const stackColors = {
  'Next.js': 'bg-slate-950 text-white dark:bg-slate-900',
  'React': 'bg-cyan-600  text-white dark:bg-cyan-700',
  'React Native': 'bg-cyan-600  text-white dark:bg-cyan-700',
  'Vue.js': 'bg-green-600 text-white dark:bg-green-700',
  'Angular': 'bg-red-600   text-white dark:bg-red-700',
  'Svelte': 'bg-orange-600 text-white dark:bg-orange-700',
  'Solid.js': 'bg-indigo-500 text-white dark:bg-indigo-600',
  'Gatsby': 'bg-purple-600 text-white dark:bg-purple-700',
  'Vite': 'bg-purple-600 text-white dark:bg-purple-700',
  'Node.js': 'bg-emerald-600 text-white dark:bg-emerald-700',
  'Python': 'bg-blue-600  text-white dark:bg-blue-700',
  'PHP': 'bg-indigo-600 text-white dark:bg-indigo-700',
  'Monorepo': 'bg-zinc-600  text-white dark:bg-zinc-700',
  'Unknown': 'bg-neutral-500 text-white dark:bg-neutral-600',
}

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [baseDir, setBaseDir] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStack, setSelectedStack] = useState('all')
  const [directoryDialogOpen, setDirectoryDialogOpen] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  useEffect(() => {
    async function init() {
      await window.electronAPI.initializeConfig()
      const config = await window.electronAPI.getConfig()
      setBaseDir(config.baseDir)
      const lista = await window.electronAPI.loadProjects()
      setProjects(lista)
      console.log(lista)
    }
    init()
  }, [])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    if (!isDarkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const handleUpdateBaseDir = async () => {
    const config = await window.electronAPI.setBaseDir(baseDir)
    setBaseDir(config.baseDir)
    const lista = await window.electronAPI.loadProjects()
    setProjects(lista)
    setDirectoryDialogOpen(false)
  }

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStack = selectedStack === 'all' || p.stack === selectedStack
    return matchesSearch && matchesStack
  })
  const pinned = filtered.filter(p => p.isPinned)
  const recent = filtered.filter(p => !p.isPinned)

  const togglePin = async (p: any) => {
    const newPinned = await window.electronAPI.togglePin(p.path)
    setProjects(old =>
      old.map(item =>
        item.path === p.path ? { ...item, isPinned: newPinned.includes(item.path) } : item
      )
    )
  }

  const openProject = (p: any) => {
    window.electronAPI.openProject(p.path)
  }

  const formatLastOpened = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();

    const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
    const absSeconds = Math.abs(diffSeconds);

    if (absSeconds < 60) return 'Agora mesmo';

    const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

    const diffMinutes = diffSeconds / 60;
    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(Math.round(diffMinutes), 'minute');      // “há 5 minutos”
    }

    const diffHours = diffMinutes / 60;
    if (Math.abs(diffHours) < 24) {
      return rtf.format(Math.round(diffHours), 'hour');          // “há 3 horas”
    }

    const diffDays = diffHours / 24;
    if (Math.abs(diffDays) < 7) {
      return rtf.format(Math.round(diffDays), 'day');
    }

    const diffWeeks = diffDays / 7;
    if (Math.abs(diffWeeks) < 5) {
      return rtf.format(Math.round(diffWeeks), 'week');
    }

    const diffMonths = diffDays / 30.44;
    if (Math.abs(diffMonths) < 12) {
      return rtf.format(Math.round(diffMonths), 'month');
    }

    const diffYears = diffDays / 365.25;
    return rtf.format(Math.round(diffYears), 'year');
  };

  const ProjectCard = ({ project }: { project: any }) => (
    <Card className="group hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-slate-800 hover:scale-105">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl bg-slate-100 dark:bg-slate-700 p-2 rounded-lg">{project.icon}</div>
            <div>
              <CardTitle className="text-lg font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-slate-900 dark:text-slate-100">
                {project.name}
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{project.description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              togglePin(project)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Pin
              className={`h-4 w-4 ${project.isPinned ? "fill-current text-yellow-500" : "text-slate-400 dark:text-slate-500"}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent onClick={() => openProject(project)}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge
              className={`${stackColors[project.stack as keyof typeof stackColors] || "bg-slate-600 text-white dark:bg-slate-700"} font-medium`}
            >
              {project.stack}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="h-3 w-3" />
              {formatLastOpened(project.lastOpened)}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Folder className="h-4 w-4" />
            <span className="truncate font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
              {project.path}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const ProjectListItem = ({ project }: { project: any }) => (
    <Card className="group hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardContent className="p-4" onClick={() => openProject(project)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="text-xl bg-slate-100 dark:bg-slate-700 p-2 rounded-lg">{project.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-slate-900 dark:text-slate-100">
                {project.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{project.description}</p>
            </div>
            <Badge
              className={`${stackColors[project.stack as keyof typeof stackColors] || "bg-slate-600 text-white dark:bg-slate-700"} font-medium`}
            >
              {project?.stack || "Desconhecido"}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 min-w-0">
              <Clock className="h-3 w-3" />
              {formatLastOpened(project.lastOpened)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              togglePin(project.id)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Pin
              className={`h-4 w-4 ${project.isPinned ? "fill-current text-yellow-500" : "text-slate-400 dark:text-slate-500"}`}
            />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Projects Manager</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Gerencie e acesse seus projetos de desenvolvimento
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDarkMode}
                className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Dialog open={directoryDialogOpen} onOpenChange={setDirectoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-lg">
                    <Cog className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-slate-100">Alterar Diretório Base</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">
                        Diretório
                      </Label>
                      <Input
                        value={baseDir}
                        onChange={(e) => setBaseDir(e.target.value)}
                        placeholder="/Users/dev/projects/meu-projeto"
                        className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-mono text-sm"
                      />
                    </div>
                    <Button
                      onClick={() => handleUpdateBaseDir()}
                      className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                    >
                      Alterar Diretório Base
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4" />
              <Input
                placeholder="Buscar projetos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Stack: {selectedStack === "all" ? "Todas" : selectedStack}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <DropdownMenuItem
                  onClick={() => setSelectedStack("all")}
                  className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Todas as Stacks
                </DropdownMenuItem>
                {Object.keys(stackColors).map((stack) => (
                  <DropdownMenuItem
                    key={stack}
                    onClick={() => setSelectedStack(stack)}
                    className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    {stack}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={
                  viewMode === "grid"
                    ? "bg-slate-900 dark:bg-slate-700 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={
                  viewMode === "list"
                    ? "bg-slate-900 dark:bg-slate-700 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Projects */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 md:grid-cols-4 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Todos
            </TabsTrigger>
            <TabsTrigger
              value="pinned"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Fixados
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Recentes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {pinned.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Projetos Fixados</h2>
                </div>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {pinned.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 mb-8">
                    {pinned.map((project) => (
                      <ProjectListItem key={project.id} project={project} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {recent.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Projetos Recentes</h2>
                </div>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recent.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recent.map((project) => (
                      <ProjectListItem key={project.id} project={project} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pinned">
            {pinned.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pinned.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {pinned.map((project) => (
                    <ProjectListItem key={project.id} project={project} />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Nenhum projeto fixado</h3>
                <p className="text-slate-500 dark:text-slate-400">Fixe seus projetos favoritos para acesso rápido</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent">
            {recent.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recent.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {recent.map((project) => (
                    <ProjectListItem key={project.id} project={project} />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Nenhum projeto recente</h3>
                <p className="text-slate-500 dark:text-slate-400">Seus projetos recentes aparecerão aqui</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Coordinadores from './pages/Coordinadores'
import Tareas from './pages/Tareas'
import Documentacion from './pages/Documentacion'

const PAGES = { dashboard: Dashboard, coordinadores: Coordinadores, tareas: Tareas, documentacion: Documentacion }

export default function App() {
  const [page, setPage] = useState('tareas')
  const [coordOpen, setCoordOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [serverStatus, setServerStatus] = useState('checking') // 'checking' | 'waking' | 'ready'

  useEffect(() => {
    let wakeTimer = setTimeout(() => setServerStatus('waking'), 4000)

    const check = async () => {
      try {
        const res = await fetch('/api/health')
        clearTimeout(wakeTimer)
        if (res.ok) setServerStatus('ready')
      } catch {
        clearTimeout(wakeTimer)
        setServerStatus('waking')
        // Reintenta cada 15 segundos hasta que el servidor responda
        wakeTimer = setTimeout(check, 15000)
      }
    }

    check()
    return () => clearTimeout(wakeTimer)
  }, [])

  const Page = PAGES[page] || Tareas


  function goTo(p) {
    setPage(p)
    if (p === 'coordinadores' || p === 'dashboard') setCoordOpen(true)
  }

  const coordActive = page === 'coordinadores' || page === 'dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {serverStatus === 'waking' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-sm font-medium px-4 py-2.5 flex items-center gap-3 shadow-md">
          <svg className="animate-spin shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          El servidor se esta iniciando tras un periodo de inactividad. Espera a que esta barra desaparezca antes de guardar cambios (puede tardar hasta 60 seg).
        </div>
      )}
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-0'} bg-gray-900 text-white flex flex-col shrink-0 transition-[width] duration-200 overflow-hidden`}>
        <div className="px-6 py-5 border-b border-gray-700 flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">Nodo Sur</div>
            <h1 className="text-lg font-bold text-white leading-tight">Gestión de Capacitación</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="mt-1 text-gray-500 hover:text-white transition-colors text-sm shrink-0"
            title="Ocultar menú"
          >
            ◀
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {/* Tareas */}
          <button
            onClick={() => goTo('tareas')}
            className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              page === 'tareas'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>✓</span>
            Tareas
          </button>

          {/* Coordinadores — colapsable */}
          <div>
            <button
              onClick={() => setCoordOpen(o => !o)}
              className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                coordActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>👥</span>
              <span className="flex-1">Coordinadores</span>
              <span className="text-xs opacity-60">{coordOpen ? '▲' : '▼'}</span>
            </button>

            {coordOpen && (
              <div className="ml-3 mt-1 space-y-0.5 border-l border-gray-700 pl-3">
                <button
                  onClick={() => goTo('coordinadores')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    page === 'coordinadores'
                      ? 'bg-indigo-500 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Lista
                </button>
                <button
                  onClick={() => goTo('dashboard')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    page === 'dashboard'
                      ? 'bg-indigo-500 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Documentación — siempre al fondo */}
        <div className="p-3 border-t border-gray-700">
          <button
            onClick={() => goTo('documentacion')}
            className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              page === 'documentacion'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>📂</span>
            Documentación
          </button>
        </div>

        <div className="px-5 py-3 border-t border-gray-700 text-xs text-gray-500">
          v1.0 · Fase 1
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-gray-900 text-white px-1 py-3 rounded-r-lg text-xs hover:bg-gray-700 transition-colors"
            title="Mostrar menú"
          >
            ▶
          </button>
        )}
        <Page />
      </main>
    </div>
  )
}

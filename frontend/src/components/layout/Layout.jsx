import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { CommandPalette } from '../ui/CommandPalette'

export default function Layout({ children }) {
  const [commandOpen, setCommandOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-screen bg-surface-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenCommand={() => setCommandOpen(true)} />
<main key={pathname} className="flex-1 overflow-y-auto px-2 py-0 animate-fade-in">  
          {children}
        </main>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  )
}

import type { ReactNode } from 'react'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import type { Summary } from '../types'

interface LayoutProps {
  summary: Summary | null
  selected: string
  onSelect: (key: string | number) => void
  children: ReactNode
}

export default function Layout({ summary, selected, onSelect, children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar summary={summary} selected={selected} onSelect={onSelect} />
      {children}
      <BottomNav />
    </div>
  )
}

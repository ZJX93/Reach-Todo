import Sidebar from './components/Sidebar.jsx'
import BottomNav from './components/BottomNav.jsx'

export default function Layout({ summary, selected, onSelect, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar summary={summary} selected={selected} onSelect={onSelect} />
      {children}
      <BottomNav />
    </div>
  )
}

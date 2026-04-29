'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function HomeSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="flex gap-2 bg-dark-800 border border-dark-600 rounded-2xl p-2 focus-within:border-brand-500 transition-colors shadow-2xl shadow-black/30">
        <div className="flex items-center pl-2 text-dark-400">
          <Package className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter tracking number — any courier…"
          className="flex-1 bg-transparent text-white placeholder-dark-400 outline-none text-sm sm:text-base px-2 py-2"
          autoFocus
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className={cn(
            'btn-primary rounded-xl py-2.5 px-5 flex-shrink-0',
          )}
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Track</span>
        </button>
      </div>
      <p className="text-xs text-dark-500 mt-3 text-center">
        Supports Delhivery, BlueDart, DTDC, India Post, Ekart, XpressBees & more
      </p>
    </form>
  )
}

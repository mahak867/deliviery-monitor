'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Package, RefreshCw, X } from 'lucide-react'
import { searchApi } from '@/lib/api'
import type { Shipment } from '@/types'
import { MOCK_SHIPMENTS } from '@/hooks/useDeliveries'
import DeliveryCard from '@/components/ui/DeliveryCard'
import { detectCourier } from '@/lib/utils'

function SearchContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const initialQuery = searchParams.get('q') ?? ''

  const [query,    setQuery]    = useState(initialQuery)
  const [results,  setResults]  = useState<Shipment[]>([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const doSearch = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const res = await searchApi.search(q.trim())
      setResults(res.data.data.shipments)
    } catch {
      // Fallback: search mock data
      const mockResults = MOCK_SHIPMENTS.filter(
        (s) =>
          s.trackingNumber.toLowerCase().includes(q.toLowerCase()) ||
          s.product?.name?.toLowerCase().includes(q.toLowerCase()) ||
          s.origin.city.toLowerCase().includes(q.toLowerCase()) ||
          s.destination.city.toLowerCase().includes(q.toLowerCase()) ||
          s.courier.toLowerCase().includes(q.toLowerCase()),
      )
      setResults(mockResults)
    } finally {
      setLoading(false)
    }
  }

  // Auto-search if query param present
  useEffect(() => {
    if (initialQuery) doSearch(initialQuery)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.replace(`/search?q=${encodeURIComponent(q)}`)
    doSearch(q)
  }

  const detectedCourier = detectCourier(query)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 page-enter">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="relative mb-8">
        <div className="flex gap-2 bg-dark-800 border border-dark-600 rounded-2xl p-2 focus-within:border-brand-500 transition-colors">
          <div className="flex items-center pl-2 text-dark-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tracking number, product name, city…"
            className="flex-1 bg-transparent text-white placeholder-dark-400 outline-none text-sm px-2 py-2"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setSearched(false) }}
              className="p-2 text-dark-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="btn-primary py-2 px-4 rounded-xl"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Detected courier hint */}
        {detectedCourier && !searched && (
          <p className="text-xs text-dark-400 mt-2 ml-4">
            Looks like a{' '}
            <span className="text-brand-400 font-medium capitalize">
              {detectedCourier.replace(/_/g, ' ')}
            </span>{' '}
            tracking number
          </p>
        )}
      </form>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : searched && results.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-14 h-14 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-300 mb-2">No results found</h3>
          <p className="text-dark-500 text-sm mb-6 max-w-xs mx-auto">
            Try a different tracking number or check for typos.
          </p>
          <p className="text-xs text-dark-500">
            Want to track a new number?{' '}
            <Link href="/dashboard" className="text-brand-400 hover:text-brand-300">
              Add to your dashboard
            </Link>
          </p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-dark-400 mb-4">
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{searchParams.get('q')}&rdquo;
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((s) => (
              <DeliveryCard key={s.id} shipment={s} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-dark-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-dark-700" />
          <p className="text-sm">Enter a tracking number or keyword to search</p>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8"><div className="skeleton h-12 rounded-2xl" /></div>}>
      <SearchContent />
    </Suspense>
  )
}

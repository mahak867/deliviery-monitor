import type { Metadata } from 'next'
import Link from 'next/link'
import { Package, MapPin, Bell, Search, Zap, Shield, Globe, ChevronRight } from 'lucide-react'
import HomeSearch from './HomeSearch'

export const metadata: Metadata = {
  title: 'TrackAll — Universal Delivery Tracker for India',
}

const FEATURES = [
  {
    icon: Globe,
    title: '12+ Courier Partners',
    description: 'Delhivery, BlueDart, DTDC, Ekart, India Post, XpressBees and more.',
    color: 'text-blue-400',
    bg:    'bg-blue-500/10',
  },
  {
    icon: Zap,
    title: 'Real-Time Updates',
    description: 'Live WebSocket updates so you know the moment your package moves.',
    color: 'text-yellow-400',
    bg:    'bg-yellow-500/10',
  },
  {
    icon: MapPin,
    title: 'Live Map View',
    description: 'Visualise your package journey on an interactive map of India.',
    color: 'text-green-400',
    bg:    'bg-green-500/10',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Push, SMS and WhatsApp alerts for every status change.',
    color: 'text-purple-400',
    bg:    'bg-purple-500/10',
  },
  {
    icon: Search,
    title: 'Universal Search',
    description: 'Search across all couriers with a single tracking number.',
    color: 'text-orange-400',
    bg:    'bg-orange-500/10',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is encrypted. Phone-based OTP login, no passwords.',
    color: 'text-red-400',
    bg:    'bg-red-500/10',
  },
]

const COURIERS = [
  'Delhivery', 'BlueDart', 'DTDC', 'Ekart', 'India Post',
  'XpressBees', 'Shadowfax', 'Amazon Logistics', 'Ecom Express',
  'Professional Couriers', 'Gati', 'Shiprocket',
]

export default function HomePage() {
  return (
    <div className="page-enter">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-600/10 border border-brand-500/20 text-brand-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Real-time tracking · 12+ couriers · India-wide
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Track Every Delivery,{' '}
            <span className="gradient-text">All in One Place</span>
          </h1>

          <p className="text-lg text-dark-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            India&rsquo;s most comprehensive delivery tracker. Enter any tracking number and
            instantly see live status, location on map, and get alerts — no app required.
          </p>

          {/* Search widget */}
          <HomeSearch />

          <p className="text-xs text-dark-500 mt-4">
            Or{' '}
            <Link href="/register" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
              create a free account
            </Link>{' '}
            to save and manage all your deliveries
          </p>
        </div>
      </section>

      {/* ── Supported couriers strip ──────────────────────────────────────── */}
      <section className="border-y border-dark-700/50 bg-dark-900/50 py-5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-dark-500 text-center mb-4 font-medium uppercase tracking-widest">
            Supported Couriers
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {COURIERS.map((c) => (
              <span
                key={c}
                className="text-xs text-dark-400 bg-dark-800 border border-dark-700 px-3 py-1.5 rounded-lg"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Everything you need to stay on top of deliveries
          </h2>
          <p className="text-dark-400 max-w-xl mx-auto">
            Built specifically for Indian consumers and businesses, with all the
            features you need in a clean, fast interface.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
            <div key={title} className="card hover:border-dark-600">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-dark-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 to-dark-800 border border-brand-700/30 p-10 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl" />
          </div>
          <Package className="w-12 h-12 text-brand-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Start tracking for free
          </h2>
          <p className="text-dark-300 mb-8 max-w-md mx-auto">
            Sign up with your phone number and track unlimited shipments from all your
            favourite shopping apps.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-primary justify-center">
              Get Started Free
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard" className="btn-secondary justify-center">
              View Demo Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Package,
  Map,
  Search,
  Bell,
  Settings,
  Menu,
  X,
  ChevronRight,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'My Deliveries', icon: Package },
  { href: '/map',           label: 'Live Map',       icon: Map     },
  { href: '/search',        label: 'Search',         icon: Search  },
  { href: '/notifications', label: 'Notifications',  icon: Bell    },
  { href: '/settings',      label: 'Settings',       icon: Settings },
]

export default function Navbar() {
  const pathname  = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 glass-dark border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center group-hover:bg-brand-500 transition-colors">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg hidden sm:block">
                Track<span className="text-brand-400">All</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.slice(0, 4).map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    pathname === href || pathname.startsWith(href + '/')
                      ? 'bg-brand-600/20 text-brand-300'
                      : 'text-dark-300 hover:text-white hover:bg-dark-700',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className={cn(
                  'hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  pathname === '/settings'
                    ? 'bg-brand-600/20 text-brand-300'
                    : 'text-dark-300 hover:text-white hover:bg-dark-700',
                )}
              >
                <Settings className="w-4 h-4" />
              </Link>

              <Link
                href="/login"
                className="hidden md:flex items-center gap-1.5 text-sm font-medium text-dark-300 hover:text-white hover:bg-dark-700 px-3 py-2 rounded-lg transition-all duration-150"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setOpen(!open)}
                className="md:hidden p-2 rounded-lg text-dark-300 hover:text-white hover:bg-dark-700 transition-all"
                aria-label="Toggle menu"
              >
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute right-0 top-0 h-full w-72 bg-dark-900 border-l border-dark-700 flex flex-col pt-20 pb-8 px-4 gap-1 animate-slide-up">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider px-3 mb-2">
              Navigation
            </p>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-brand-600/20 text-brand-300'
                    : 'text-dark-200 hover:text-white hover:bg-dark-700',
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </Link>
            ))}

            <div className="mt-auto pt-4 border-t border-dark-700">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-dark-200 hover:text-white hover:bg-dark-700 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}

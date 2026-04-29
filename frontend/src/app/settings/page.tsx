'use client'

import { useState } from 'react'
import {
  Settings, User, Bell, Moon, Globe, Shield, Trash2,
  ChevronRight, LogOut, Phone, Mail, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

type SettingsSection = 'profile' | 'notifications' | 'appearance' | 'privacy'

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('profile')
  const [saving,  setSaving]  = useState(false)

  // Profile state
  const [name,  setName]  = useState('Rahul Sharma')
  const [email, setEmail] = useState('rahul@example.com')
  const [phone] = useState('9876543210')

  // Notification state
  const [pushEnabled,      setPushEnabled]      = useState(true)
  const [smsEnabled,       setSmsEnabled]       = useState(true)
  const [emailEnabled,     setEmailEnabled]     = useState(false)
  const [whatsappEnabled,  setWhatsappEnabled]  = useState(true)

  // Appearance
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [lang,  setLang]  = useState<'en' | 'hi' | 'ta'>('en')

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    toast.success('Settings saved!')
  }

  const SECTIONS = [
    { key: 'profile',       label: 'Profile',        icon: User    },
    { key: 'notifications', label: 'Notifications',  icon: Bell    },
    { key: 'appearance',    label: 'Appearance',     icon: Moon    },
    { key: 'privacy',       label: 'Privacy',        icon: Shield  },
  ] as const

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 page-enter">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-brand-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Sidebar nav */}
        <nav className="sm:w-48 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 flex-shrink-0">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
                section === key
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">
          {section === 'profile' && (
            <div className="card space-y-5">
              <h2 className="text-base font-semibold text-white">Profile</h2>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-dark-700/50 border border-dark-600 rounded-xl text-dark-400 text-sm">
                    +91
                  </span>
                  <input
                    value={phone}
                    disabled
                    className="input-field flex-1 opacity-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-dark-500 mt-1">Phone number cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Email Address <span className="text-dark-500">(optional)</span>
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          )}

          {section === 'notifications' && (
            <div className="card space-y-5">
              <h2 className="text-base font-semibold text-white">Notification Preferences</h2>
              <p className="text-sm text-dark-400">Choose how you want to receive delivery updates.</p>

              {[
                { label: 'Push Notifications', desc: 'Browser / app push notifications', state: pushEnabled,     setState: setPushEnabled },
                { label: 'SMS Alerts',          desc: 'Text messages to your mobile',     state: smsEnabled,      setState: setSmsEnabled  },
                { label: 'Email Alerts',        desc: 'Updates to your email address',    state: emailEnabled,    setState: setEmailEnabled },
                { label: 'WhatsApp Updates',    desc: 'Messages via WhatsApp',            state: whatsappEnabled, setState: setWhatsappEnabled },
              ].map(({ label, desc, state, setState }) => (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-dark-400">{desc}</p>
                  </div>
                  <button
                    onClick={() => setState(!state)}
                    className={cn(
                      'relative w-10 h-5.5 rounded-full transition-colors',
                      state ? 'bg-brand-600' : 'bg-dark-600',
                    )}
                    role="switch"
                    aria-checked={state}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                        state ? 'translate-x-5' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </div>
              ))}

              <button onClick={handleSave} disabled={saving} className="btn-primary mt-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Preferences'}
              </button>
            </div>
          )}

          {section === 'appearance' && (
            <div className="card space-y-5">
              <h2 className="text-base font-semibold text-white">Appearance</h2>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-3 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        'px-3 py-2.5 rounded-xl text-sm font-medium capitalize border transition-all',
                        theme === t
                          ? 'bg-brand-600/20 text-brand-300 border-brand-500/30'
                          : 'text-dark-400 border-dark-700 hover:border-dark-500 hover:text-white',
                      )}
                    >
                      {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '⚙️ System'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-3 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'en', label: 'English' },
                    { key: 'hi', label: 'हिंदी'   },
                    { key: 'ta', label: 'தமிழ்'   },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setLang(key)}
                      className={cn(
                        'px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                        lang === key
                          ? 'bg-brand-600/20 text-brand-300 border-brand-500/30'
                          : 'text-dark-400 border-dark-700 hover:border-dark-500 hover:text-white',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Appearance'}
              </button>
            </div>
          )}

          {section === 'privacy' && (
            <div className="card space-y-5">
              <h2 className="text-base font-semibold text-white">Privacy & Security</h2>

              <div className="space-y-3">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-dark-700/50 rounded-xl hover:bg-dark-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-brand-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Export My Data</p>
                      <p className="text-xs text-dark-400">Download all your tracking data as JSON</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-dark-500" />
                </button>

                <button className="w-full flex items-center justify-between px-4 py-3 bg-dark-700/50 rounded-xl hover:bg-dark-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-dark-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Sign Out</p>
                      <p className="text-xs text-dark-400">Sign out of all devices</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-dark-500" />
                </button>

                <div className="pt-2 border-t border-dark-700">
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-red-400">Delete Account</p>
                        <p className="text-xs text-dark-400">Permanently delete your account and data</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-dark-500" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

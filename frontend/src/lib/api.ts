import axios from 'axios'
import type {
  ApiResponse,
  PaginatedResponse,
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  Shipment,
  SearchResult,
  SearchFilters,
  DashboardStats,
  Notification,
  User,
} from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor — handle 401 refresh ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post<ApiResponse<AuthTokens>>(
          `${BASE_URL}/api/auth/refresh`,
          { refreshToken },
        )
        localStorage.setItem('accessToken',  data.data.accessToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        if (typeof window !== 'undefined') window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/otp/send', { phone }),

  login: (payload: LoginPayload) =>
    api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', payload),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }),
}

// ── Tracking ─────────────────────────────────────────────────────────────────

export const trackingApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<PaginatedResponse<Shipment>>('/tracking', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Shipment>>(`/tracking/${id}`),

  getByTrackingNumber: (trackingNumber: string) =>
    api.get<ApiResponse<Shipment>>(`/tracking/number/${trackingNumber}`),

  add: (trackingNumber: string, courier?: string) =>
    api.post<ApiResponse<Shipment>>('/tracking', { trackingNumber, courier }),

  refresh: (id: string) =>
    api.post<ApiResponse<Shipment>>(`/tracking/${id}/refresh`),

  toggleFavourite: (id: string) =>
    api.patch<ApiResponse<Shipment>>(`/tracking/${id}/favourite`),

  archive: (id: string) =>
    api.patch<ApiResponse<Shipment>>(`/tracking/${id}/archive`),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/tracking/${id}`),

  getStats: () =>
    api.get<ApiResponse<DashboardStats>>('/tracking/stats'),
}

// ── Search ───────────────────────────────────────────────────────────────────

export const searchApi = {
  search: (query: string, filters?: SearchFilters) =>
    api.get<ApiResponse<SearchResult>>('/search', { params: { q: query, ...filters } }),

  publicTrack: (trackingNumber: string) =>
    api.get<ApiResponse<Shipment>>(`/search/track/${trackingNumber}`),
}

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get<PaginatedResponse<Notification>>('/notifications', { params }),

  markRead: (id: string) =>
    api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch('/notifications/read-all'),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),
}

// ── User / Settings ───────────────────────────────────────────────────────────

export const userApi = {
  updateProfile: (data: Partial<User>) =>
    api.put<ApiResponse<User>>('/users/profile', data),

  updatePreferences: (preferences: User['preferences']) =>
    api.put<ApiResponse<User>>('/users/preferences', preferences),

  deleteAccount: () =>
    api.delete('/users/account'),
}

export default api

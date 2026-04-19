// ─── Delivery Status ────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'order_placed'
  | 'packed'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delayed'
  | 'cancelled'
  | 'returned'
  | 'failed_delivery'

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  order_placed:     'Order Placed',
  packed:           'Packed',
  shipped:          'Shipped',
  in_transit:       'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  delayed:          'Delayed',
  cancelled:        'Cancelled',
  returned:         'Returned',
  failed_delivery:  'Failed Delivery',
}

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  order_placed:     'bg-gray-500/20 text-gray-300 border-gray-500/30',
  packed:           'bg-blue-500/20 text-blue-300 border-blue-500/30',
  shipped:          'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  in_transit:       'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  out_for_delivery: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  delivered:        'bg-green-500/20 text-green-300 border-green-500/30',
  delayed:          'bg-red-500/20 text-red-300 border-red-500/30',
  cancelled:        'bg-gray-500/20 text-gray-400 border-gray-500/30',
  returned:         'bg-purple-500/20 text-purple-300 border-purple-500/30',
  failed_delivery:  'bg-red-600/20 text-red-400 border-red-600/30',
}

export const DELIVERY_STATUS_PROGRESS: Record<DeliveryStatus, number> = {
  order_placed:     10,
  packed:           25,
  shipped:          40,
  in_transit:       60,
  out_for_delivery: 85,
  delivered:        100,
  delayed:          55,
  cancelled:        0,
  returned:         0,
  failed_delivery:  80,
}

// ─── Courier Partners ────────────────────────────────────────────────────────

export type CourierCode =
  | 'delhivery'
  | 'bluedart'
  | 'dtdc'
  | 'ekart'
  | 'india_post'
  | 'xpressbees'
  | 'shadowfax'
  | 'amazon_logistics'
  | 'shiprocket'
  | 'ecom_express'
  | 'professional_couriers'
  | 'gati'

export interface Courier {
  code:      CourierCode
  name:      string
  logo?:     string
  color:     string
  trackUrl?: string
}

export const COURIERS: Record<CourierCode, Courier> = {
  delhivery:             { code: 'delhivery',             name: 'Delhivery',              color: '#D42D27' },
  bluedart:              { code: 'bluedart',              name: 'BlueDart',               color: '#003882' },
  dtdc:                  { code: 'dtdc',                  name: 'DTDC',                   color: '#ED1C24' },
  ekart:                 { code: 'ekart',                 name: 'Ekart Logistics',        color: '#F9A825' },
  india_post:            { code: 'india_post',            name: 'India Post',             color: '#C62828' },
  xpressbees:            { code: 'xpressbees',            name: 'XpressBees',             color: '#FF6B00' },
  shadowfax:             { code: 'shadowfax',             name: 'Shadowfax',              color: '#7C3AED' },
  amazon_logistics:      { code: 'amazon_logistics',      name: 'Amazon Logistics',       color: '#FF9900' },
  shiprocket:            { code: 'shiprocket',            name: 'Shiprocket',             color: '#E31C5F' },
  ecom_express:          { code: 'ecom_express',          name: 'Ecom Express',           color: '#1565C0' },
  professional_couriers: { code: 'professional_couriers', name: 'Professional Couriers',  color: '#2E7D32' },
  gati:                  { code: 'gati',                  name: 'Gati',                   color: '#BF360C' },
}

// ─── Location ────────────────────────────────────────────────────────────────

export interface GeoLocation {
  lat:  number
  lng:  number
  city?: string
  state?: string
}

// ─── Tracking Event ──────────────────────────────────────────────────────────

export interface TrackingEvent {
  id:          string
  shipmentId:  string
  status:      DeliveryStatus
  description: string
  location:    string
  geoLocation?: GeoLocation
  timestamp:   string
  courier:     CourierCode
  isLatest:    boolean
}

// ─── Shipment ────────────────────────────────────────────────────────────────

export interface Shipment {
  id:              string
  trackingNumber:  string
  courier:         CourierCode
  status:          DeliveryStatus
  origin: {
    city:    string
    state:   string
    pincode: string
    address: string
  }
  destination: {
    city:    string
    state:   string
    pincode: string
    address: string
    name:    string
    phone:   string
  }
  currentLocation?: GeoLocation
  estimatedDelivery?: string
  actualDelivery?:    string
  weight?:   number
  dimensions?: {
    length: number
    width:  number
    height: number
  }
  product?: {
    name:        string
    description: string
    value:       number
    imageUrl?:   string
  }
  events:         TrackingEvent[]
  createdAt:      string
  updatedAt:      string
  userId?:        string
  orderNumber?:   string
  isFavourite:    boolean
  isArchived:     boolean
  notes?:         string
}

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin' | 'business'

export interface User {
  id:           string
  phone:        string
  email?:       string
  name:         string
  avatar?:      string
  role:         UserRole
  createdAt:    string
  preferences: UserPreferences
}

export interface UserPreferences {
  notifications: {
    push:    boolean
    sms:     boolean
    email:   boolean
    whatsapp: boolean
  }
  theme:    'dark' | 'light' | 'system'
  language: 'en' | 'hi' | 'ta' | 'te' | 'bn'
}

// ─── Notification ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'status_update'
  | 'delivery_attempt'
  | 'delay_alert'
  | 'out_for_delivery'
  | 'delivered'
  | 'system'

export interface Notification {
  id:         string
  userId:     string
  shipmentId?: string
  type:        NotificationType
  title:       string
  message:     string
  isRead:      boolean
  createdAt:   string
  metadata?:   Record<string, unknown>
}

// ─── API Response wrappers ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data:    T
  message?: string
  error?:   string
}

export interface PaginatedResponse<T> {
  success:    boolean
  data:       T[]
  pagination: {
    page:       number
    limit:      number
    total:      number
    totalPages: number
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken:  string
  refreshToken: string
}

export interface LoginPayload {
  phone: string
  otp:   string
}

export interface RegisterPayload {
  phone: string
  name:  string
  email?: string
  otp:   string
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  shipments:   Shipment[]
  total:       number
  query:       string
  suggestions: string[]
}

export interface SearchFilters {
  status?:   DeliveryStatus
  courier?:  CourierCode
  dateFrom?: string
  dateTo?:   string
  page?:     number
  limit?:    number
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  total:          number
  active:         number
  delivered:      number
  delayed:        number
  outForDelivery: number
  cancelled:      number
}

// ─── Socket Events ───────────────────────────────────────────────────────────

export interface SocketTrackingUpdate {
  shipmentId:    string
  trackingNumber: string
  status:        DeliveryStatus
  event:         TrackingEvent
  courier:       CourierCode
}

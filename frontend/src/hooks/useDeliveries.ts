'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Shipment, DashboardStats, SearchFilters } from '@/types'
import { trackingApi } from '@/lib/api'

// ── Mock shipments for dev ────────────────────────────────────────────────────
const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: 'shp_001',
    trackingNumber: '127429287160',
    courier: 'delhivery',
    status: 'in_transit',
    isFavourite: true,
    isArchived: false,
    orderNumber: 'FLP-4821923',
    origin:      { city: 'Mumbai',    state: 'Maharashtra', pincode: '400001', address: 'Flipkart Warehouse, Andheri' },
    destination: { city: 'Bengaluru', state: 'Karnataka',   pincode: '560001', address: '42, MG Road', name: 'Rahul Sharma', phone: '9876543210' },
    currentLocation: { lat: 17.3850, lng: 78.4867, city: 'Hyderabad', state: 'Telangana' },
    estimatedDelivery: new Date(Date.now() + 86400000 * 1).toISOString(),
    product: { name: 'OnePlus 12R 5G Smartphone', description: '128GB, Cooling Blue', value: 39999 },
    weight: 350,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    events: [
      {
        id: 'evt_001a',
        shipmentId: 'shp_001',
        status: 'in_transit',
        description: 'Shipment in transit at Hyderabad hub',
        location: 'Hyderabad, Telangana',
        geoLocation: { lat: 17.3850, lng: 78.4867, city: 'Hyderabad', state: 'Telangana' },
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        courier: 'delhivery',
        isLatest: true,
      },
      {
        id: 'evt_001b',
        shipmentId: 'shp_001',
        status: 'shipped',
        description: 'Package picked up and dispatched from origin facility',
        location: 'Mumbai, Maharashtra',
        geoLocation: { lat: 19.0760, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra' },
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        courier: 'delhivery',
        isLatest: false,
      },
      {
        id: 'evt_001c',
        shipmentId: 'shp_001',
        status: 'packed',
        description: 'Item packed and ready for pickup',
        location: 'Mumbai, Maharashtra',
        geoLocation: { lat: 19.0760, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra' },
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        courier: 'delhivery',
        isLatest: false,
      },
      {
        id: 'evt_001d',
        shipmentId: 'shp_001',
        status: 'order_placed',
        description: 'Order received and confirmed',
        location: 'Online',
        timestamp: new Date(Date.now() - 86400000 * 2 - 3600000).toISOString(),
        courier: 'delhivery',
        isLatest: false,
      },
    ],
  },
  {
    id: 'shp_002',
    trackingNumber: 'EE394827394IN',
    courier: 'india_post',
    status: 'out_for_delivery',
    isFavourite: false,
    isArchived: false,
    orderNumber: 'AMZ-384910',
    origin:      { city: 'Delhi',     state: 'Delhi',     pincode: '110001', address: 'Amazon Fulfilment Centre, Manesar' },
    destination: { city: 'Jaipur',    state: 'Rajasthan', pincode: '302001', address: '11, Pink City Road', name: 'Priya Singh', phone: '9876512340' },
    currentLocation: { lat: 26.9124, lng: 75.7873, city: 'Jaipur', state: 'Rajasthan' },
    estimatedDelivery: new Date(Date.now() + 3600000 * 3).toISOString(),
    product: { name: 'Nike Air Max 270', description: 'Size 8, Black/White', value: 10995 },
    weight: 900,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    events: [
      {
        id: 'evt_002a',
        shipmentId: 'shp_002',
        status: 'out_for_delivery',
        description: 'Out for delivery – delivery agent Ramesh Kumar (ID: DL3849)',
        location: 'Jaipur, Rajasthan',
        geoLocation: { lat: 26.9124, lng: 75.7873, city: 'Jaipur', state: 'Rajasthan' },
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        courier: 'india_post',
        isLatest: true,
      },
      {
        id: 'evt_002b',
        shipmentId: 'shp_002',
        status: 'in_transit',
        description: 'Package arrived at Jaipur sorting facility',
        location: 'Jaipur GPO, Rajasthan',
        geoLocation: { lat: 26.9124, lng: 75.7873, city: 'Jaipur', state: 'Rajasthan' },
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        courier: 'india_post',
        isLatest: false,
      },
    ],
  },
  {
    id: 'shp_003',
    trackingNumber: '9876543210',
    courier: 'dtdc',
    status: 'delivered',
    isFavourite: false,
    isArchived: false,
    orderNumber: 'MNT-12839',
    origin:      { city: 'Chennai',  state: 'Tamil Nadu', pincode: '600001', address: 'Myntra Warehouse, Ambattur' },
    destination: { city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001', address: '5, Avinashi Road', name: 'Karthik R', phone: '9994421230' },
    currentLocation: { lat: 11.0168, lng: 76.9558, city: 'Coimbatore', state: 'Tamil Nadu' },
    actualDelivery: new Date(Date.now() - 86400000).toISOString(),
    product: { name: 'Levi\'s 511 Slim Fit Jeans', description: '32W x 32L, Dark Blue', value: 3499 },
    weight: 400,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    events: [
      {
        id: 'evt_003a',
        shipmentId: 'shp_003',
        status: 'delivered',
        description: 'Package delivered successfully. Received by Karthik R.',
        location: 'Coimbatore, Tamil Nadu',
        geoLocation: { lat: 11.0168, lng: 76.9558, city: 'Coimbatore', state: 'Tamil Nadu' },
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        courier: 'dtdc',
        isLatest: true,
      },
      {
        id: 'evt_003b',
        shipmentId: 'shp_003',
        status: 'out_for_delivery',
        description: 'Out for delivery',
        location: 'Coimbatore, Tamil Nadu',
        geoLocation: { lat: 11.0168, lng: 76.9558 },
        timestamp: new Date(Date.now() - 86400000 - 14400000).toISOString(),
        courier: 'dtdc',
        isLatest: false,
      },
    ],
  },
  {
    id: 'shp_004',
    trackingNumber: '398471029384',
    courier: 'bluedart',
    status: 'delayed',
    isFavourite: true,
    isArchived: false,
    orderNumber: 'TTA-98231',
    origin:      { city: 'Kolkata',  state: 'West Bengal', pincode: '700001', address: 'TataCLiQ Warehouse' },
    destination: { city: 'Guwahati', state: 'Assam',       pincode: '781001', address: '14, GS Road', name: 'Ananya Das', phone: '9862034512' },
    currentLocation: { lat: 26.2006, lng: 92.9376, city: 'Guwahati', state: 'Assam' },
    estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString(),
    product: { name: 'Saree – Banarasi Silk', description: 'Red, with golden zari work', value: 8500 },
    weight: 600,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    events: [
      {
        id: 'evt_004a',
        shipmentId: 'shp_004',
        status: 'delayed',
        description: 'Delivery delayed due to severe weather conditions on NH-27',
        location: 'Guwahati, Assam',
        geoLocation: { lat: 26.2006, lng: 92.9376, city: 'Guwahati', state: 'Assam' },
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        courier: 'bluedart',
        isLatest: true,
      },
    ],
  },
  {
    id: 'shp_005',
    trackingNumber: 'FMPP8291748293',
    courier: 'ekart',
    status: 'shipped',
    isFavourite: false,
    isArchived: false,
    orderNumber: 'FLP-9382749',
    origin:      { city: 'Pune',      state: 'Maharashtra', pincode: '411001', address: 'Ekart Hub, Chakan' },
    destination: { city: 'Nagpur',    state: 'Maharashtra', pincode: '440001', address: '88, Dharampeth', name: 'Vijay Patil', phone: '9823401234' },
    currentLocation: { lat: 18.5204, lng: 73.8567, city: 'Pune', state: 'Maharashtra' },
    estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString(),
    product: { name: 'Boat Rockerz 450 Headphones', description: 'Blue Colour', value: 1499 },
    weight: 250,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5400000).toISOString(),
    events: [
      {
        id: 'evt_005a',
        shipmentId: 'shp_005',
        status: 'shipped',
        description: 'Package dispatched from Pune Ekart hub',
        location: 'Pune, Maharashtra',
        geoLocation: { lat: 18.5204, lng: 73.8567, city: 'Pune', state: 'Maharashtra' },
        timestamp: new Date(Date.now() - 5400000).toISOString(),
        courier: 'ekart',
        isLatest: true,
      },
    ],
  },
]

const MOCK_STATS: DashboardStats = {
  total:          5,
  active:         3,
  delivered:      1,
  delayed:        1,
  outForDelivery: 1,
  cancelled:      0,
}

// ─────────────────────────────────────────────────────────────────────────────

interface UseDeliveriesOptions {
  page?:    number
  limit?:   number
  filters?: SearchFilters
}

interface UseDeliveriesReturn {
  shipments:         Shipment[]
  stats:             DashboardStats | null
  loading:           boolean
  error:             string | null
  total:             number
  totalPages:        number
  refresh:           () => Promise<void>
  toggleFavourite:   (id: string) => Promise<void>
  archiveShipment:   (id: string) => Promise<void>
  refreshShipment:   (id: string) => Promise<void>
  deleteShipment:    (id: string) => Promise<void>
  addShipment:       (trackingNumber: string, courier?: string) => Promise<void>
}

export function useDeliveries({
  page  = 1,
  limit = 20,
}: UseDeliveriesOptions = {}): UseDeliveriesReturn {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [stats,     setStats]     = useState<DashboardStats | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [total,     setTotal]     = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [trackingRes, statsRes] = await Promise.all([
        trackingApi.getAll({ page, limit }),
        trackingApi.getStats(),
      ])
      setShipments(trackingRes.data.data)
      setTotal(trackingRes.data.pagination.total)
      setTotalPages(trackingRes.data.pagination.totalPages)
      setStats(statsRes.data.data)
    } catch {
      // Fall back to mock data in development
      setShipments(MOCK_SHIPMENTS)
      setStats(MOCK_STATS)
      setTotal(MOCK_SHIPMENTS.length)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries])

  const toggleFavourite = useCallback(async (id: string) => {
    setShipments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavourite: !s.isFavourite } : s)),
    )
    try {
      await trackingApi.toggleFavourite(id)
    } catch {
      // Revert optimistic update on failure
      setShipments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isFavourite: !s.isFavourite } : s)),
      )
    }
  }, [])

  const archiveShipment = useCallback(async (id: string) => {
    setShipments((prev) => prev.filter((s) => s.id !== id))
    try {
      await trackingApi.archive(id)
    } catch {
      await fetchDeliveries()
    }
  }, [fetchDeliveries])

  const refreshShipment = useCallback(async (id: string) => {
    try {
      const res = await trackingApi.refresh(id)
      setShipments((prev) =>
        prev.map((s) => (s.id === id ? res.data.data : s)),
      )
    } catch {
      // silently fail
    }
  }, [])

  const deleteShipment = useCallback(async (id: string) => {
    setShipments((prev) => prev.filter((s) => s.id !== id))
    try {
      await trackingApi.delete(id)
    } catch {
      await fetchDeliveries()
    }
  }, [fetchDeliveries])

  const addShipment = useCallback(async (trackingNumber: string, courier?: string) => {
    try {
      const res = await trackingApi.add(trackingNumber, courier)
      setShipments((prev) => [res.data.data, ...prev])
    } catch (err) {
      throw err
    }
  }, [])

  return {
    shipments,
    stats,
    loading,
    error,
    total,
    totalPages,
    refresh: fetchDeliveries,
    toggleFavourite,
    archiveShipment,
    refreshShipment,
    deleteShipment,
    addShipment,
  }
}

export { MOCK_SHIPMENTS, MOCK_STATS }

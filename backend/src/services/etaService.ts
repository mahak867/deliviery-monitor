/**
 * ETA prediction service — estimates delivery date based on distance + courier SLA
 */

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Mumbai:    { lat: 19.0760, lng: 72.8777 },
  Delhi:     { lat: 28.7041, lng: 77.1025 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Chennai:   { lat: 13.0827, lng: 80.2707 },
  Kolkata:   { lat: 22.5726, lng: 88.3639 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Pune:      { lat: 18.5204, lng: 73.8567 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Jaipur:    { lat: 26.9124, lng: 75.7873 },
  Lucknow:   { lat: 26.8467, lng: 80.9462 },
  Nagpur:    { lat: 21.1458, lng: 79.0882 },
  Bhopal:    { lat: 23.2599, lng: 77.4126 },
  Guwahati:  { lat: 26.2006, lng: 92.9376 },
  Coimbatore:{ lat: 11.0168, lng: 76.9558 },
  Patna:     { lat: 25.5941, lng: 85.1376 },
}

// Average km/day for each courier
const COURIER_SPEED_KM_PER_DAY: Record<string, number> = {
  delhivery:             400,
  bluedart:              500,
  dtdc:                  350,
  ekart:                 380,
  india_post:            250,
  xpressbees:            420,
  shadowfax:             300,
  amazon_logistics:      450,
  shiprocket:            350,
  ecom_express:          380,
  professional_couriers: 300,
  gati:                  350,
}

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function estimateETA(opts: {
  originCity:      string
  destinationCity: string
  courier:         string
  dispatchedAt?:   Date
}): Date | null {
  const { originCity, destinationCity, courier, dispatchedAt = new Date() } = opts

  const origin = CITY_COORDS[originCity]
  const dest   = CITY_COORDS[destinationCity]
  if (!origin || !dest) return null

  const distanceKm     = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng)
  const speedKmPerDay  = COURIER_SPEED_KM_PER_DAY[courier] ?? 350
  const daysNeeded     = Math.ceil((distanceKm / speedKmPerDay) + 0.5) // +0.5 for processing
  const eta            = new Date(dispatchedAt)
  eta.setDate(eta.getDate() + daysNeeded)

  // Skip Sundays
  while (eta.getDay() === 0) eta.setDate(eta.getDate() + 1)

  return eta
}

export function formatETA(date: Date | null): string {
  if (!date) return 'TBD'
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }
  return date.toLocaleDateString('en-IN', options)
}

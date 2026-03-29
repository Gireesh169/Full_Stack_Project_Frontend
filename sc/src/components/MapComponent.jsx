import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { toast } from 'react-toastify'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix for default marker icons in Leaflet
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.setIcon(defaultIcon)

const defaultCenter = [20.5937, 78.9629]

// Custom icon for user location (blue)
const userLocationIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMzY4N2Y1IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

const MapComponent = () => {
  const [locations, setLocations] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  // NEW: User location state
  const [userLocation, setUserLocation] = useState(null)
  const [watchId, setWatchId] = useState(null)

  const fetchLocations = async () => {
    setLoadingLocations(true)
    try {
      const { data } = await axios.get('http://localhost:8080/api/locations')
      setLocations(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load map locations')
      setLocations([])
    } finally {
      setLoadingLocations(false)
    }
  }

  // NEW: Initialize geolocation on component mount
  useEffect(() => {
    fetchLocations()

    // Request user's current location with real-time tracking
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          setUserLocation({ lat: latitude, lng: longitude, accuracy })
        },
        (error) => {
          console.warn('Geolocation error:', error.message)
          if (error.code === error.PERMISSION_DENIED) {
            console.log('Location permission denied by user')
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
      setWatchId(id)

      // Cleanup function: stop watching position on unmount
      return () => {
        if (id) navigator.geolocation.clearWatch(id)
      }
    }
  }, [])

  const center = useMemo(() => {
    // NEW: Prioritize user location if available
    if (userLocation) {
      return [userLocation.lat, userLocation.lng]
    }

    const first = locations[0]
    if (!first) return defaultCenter

    const lat = Number(first.latitude ?? first.lat ?? defaultCenter[0])
    const lng = Number(first.longitude ?? first.lng ?? defaultCenter[1])

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return defaultCenter

    return [lat, lng]
  }, [userLocation, locations])

  if (loadingLocations) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white/50 text-sm font-semibold text-slate-600">
        Loading map...
      </div>
    )
  }

  return (
    <MapContainer center={center} zoom={12} style={{ width: '100%', height: '420px', borderRadius: '1rem' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* NEW: Marker for user's current location */}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-blue-600">📍 You are here</p>
              <p className="text-xs text-slate-600">Lat: {userLocation.lat.toFixed(4)}</p>
              <p className="text-xs text-slate-600">Lng: {userLocation.lng.toFixed(4)}</p>
              <p className="text-xs text-slate-500">Accuracy: ±{Math.round(userLocation.accuracy)}m</p>
            </div>
          </Popup>
        </Marker>
      )}
      {/* Existing: Markers for backend locations */}
      {locations.map((location, index) => {
        const lat = Number(location.latitude ?? location.lat)
        const lng = Number(location.longitude ?? location.lng)

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

        const type = String(location.type ?? '').toLowerCase()

        return (
          <Marker key={location.id ?? `${lat}-${lng}-${index}`} position={[lat, lng]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-slate-900">Type: {type}</p>
                <p className="text-xs text-slate-600">Lat: {lat.toFixed(4)}</p>
                <p className="text-xs text-slate-600">Lng: {lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

export default MapComponent
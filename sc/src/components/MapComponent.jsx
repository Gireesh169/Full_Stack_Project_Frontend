import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../api/axiosConfig'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultCenter = [20.5937, 78.9629]

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const userLocationIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMzY4N2Y1IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

L.Marker.prototype.setIcon(defaultIcon)

const DestinationClickHandler = ({ onDestinationSelect, onLocationSelect }) => {
  useMapEvents({
    click: (event) => {
      const point = { lat: event.latlng.lat, lng: event.latlng.lng }
      if (typeof onDestinationSelect === 'function') {
        onDestinationSelect(point)
      }
      if (typeof onLocationSelect === 'function') {
        onLocationSelect(point)
      }
    },
  })
  return null
}

const FollowUserLocation = ({ userLocation }) => {
  const map = useMap()

  useEffect(() => {
    if (!userLocation) return
    map.setView([userLocation.lat, userLocation.lng])
  }, [map, userLocation])

  return null
}

const RouteLayer = ({ userLocation, destination }) => {
  const map = useMap()
  const routingControlRef = useRef(null)
  const hasErrorNotifiedRef = useRef(false)

  useEffect(() => {
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current)
      routingControlRef.current = null
    }

    if (!userLocation || !destination) return

    if (!L.Routing || !L.Routing.control) {
      console.log('Leaflet Routing Machine is not available')
      return
    }

    const serviceUrls = [
      'https://router.project-osrm.org/route/v1',
      'https://routing.openstreetmap.de/routed-car/route/v1',
    ]

    const createRoutingControl = (serviceUrl) =>
      L.Routing.control({
        waypoints: [L.latLng(userLocation.lat, userLocation.lng), L.latLng(destination.lat, destination.lng)],
        router: L.Routing.osrmv1({ serviceUrl, profile: 'driving' }),
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        lineOptions: {
          styles: [{ color: '#0f766e', opacity: 0.9, weight: 5 }],
        },
        createMarker: () => null,
      }).addTo(map)

    let serviceIndex = 0
    const attachHandlers = () => {
      if (!routingControlRef.current) return

      routingControlRef.current.on('routesfound', (event) => {
        console.log('Route found:', event.routes?.[0]?.summary)
        hasErrorNotifiedRef.current = false
      })

      routingControlRef.current.on('routingerror', (event) => {
        console.log('Routing error:', event.error)

        if (routingControlRef.current) {
          map.removeControl(routingControlRef.current)
          routingControlRef.current = null
        }

        serviceIndex += 1
        if (serviceIndex < serviceUrls.length) {
          routingControlRef.current = createRoutingControl(serviceUrls[serviceIndex])
          attachHandlers()
          return
        }

        if (!hasErrorNotifiedRef.current) {
          toast.error('Unable to draw road route right now. Try again in a moment.')
          hasErrorNotifiedRef.current = true
        }
      })
    }

    routingControlRef.current = createRoutingControl(serviceUrls[serviceIndex])
    attachHandlers()

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current)
        routingControlRef.current = null
      }
    }
  }, [map, userLocation, destination])

  return null
}

const MapComponent = ({
  destination = null,
  onDestinationSelect = null,
  onLocationSelect = null,
  readOnly = false,
  mapHeight = 420,
}) => {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [clickedDestination, setClickedDestination] = useState(null)

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/locations`)
        setLocations(Array.isArray(data) ? data : [])
      } catch {
        toast.error('Failed to load map locations')
        setLocations([])
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setUserLocation({ lat: latitude, lng: longitude, accuracy })
      },
      (error) => {
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

    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const center = useMemo(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng]
    return defaultCenter
  }, [userLocation])

  const activeDestination = useMemo(() => {
    if (
      destination &&
      Number.isFinite(Number(destination.lat)) &&
      Number.isFinite(Number(destination.lng))
    ) {
      return { lat: Number(destination.lat), lng: Number(destination.lng) }
    }

    if (
      clickedDestination &&
      Number.isFinite(Number(clickedDestination.lat)) &&
      Number.isFinite(Number(clickedDestination.lng))
    ) {
      return { lat: Number(clickedDestination.lat), lng: Number(clickedDestination.lng) }
    }

    return null
  }, [destination, clickedDestination])

  const routeStart = useMemo(() => {
    if (!userLocation) return null
    return {
      lat: Number(userLocation.lat.toFixed(4)),
      lng: Number(userLocation.lng.toFixed(4)),
    }
  }, [userLocation])

  if (loading) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white/50 text-sm font-semibold text-slate-600"
        style={{ height: `${mapHeight}px` }}
      >
        Loading map...
      </div>
    )
  }

  return (
    <MapContainer center={center} zoom={12} style={{ width: '100%', height: `${mapHeight}px`, borderRadius: '1rem' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {!readOnly && (
        <DestinationClickHandler
          onLocationSelect={onLocationSelect}
          onDestinationSelect={(value) => {
            setClickedDestination(value)
            if (typeof onDestinationSelect === 'function') {
              onDestinationSelect(value)
            }
          }}
        />
      )}
      <FollowUserLocation userLocation={userLocation} />
      <RouteLayer userLocation={routeStart} destination={activeDestination} />

      {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon} />}

      {activeDestination && <Marker position={[activeDestination.lat, activeDestination.lng]} />}

      {locations.map((location, index) => {
        const lat = Number(location.latitude ?? location.lat)
        const lng = Number(location.longitude ?? location.lng)

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

        return <Marker key={location.id ?? `${lat}-${lng}-${index}`} position={[lat, lng]} />
      })}
    </MapContainer>
  )
}

export default MapComponent

import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'

const DEFAULT_CENTER = [17.385, 78.4867]

const LocationCapture = ({ onPick }) => {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng
      onPick({ lat, lng })
    },
  })

  return null
}

const ComplaintLocationPicker = ({ value, onChange }) => {
  const mapCenter = value ? [value.lat, value.lng] : DEFAULT_CENTER

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-semibold text-slate-700">Select Complaint Location</p>
      <p className="text-xs text-slate-500">Click on map to pin exact location.</p>
      <MapContainer center={mapCenter} zoom={13} className="h-64 w-full rounded-lg">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationCapture onPick={onChange} />
        {value && <CircleMarker center={[value.lat, value.lng]} radius={8} pathOptions={{ color: '#0d9488' }} />}
      </MapContainer>
      {value && (
        <p className="text-xs text-slate-600">
          Selected: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}
    </div>
  )
}

export default ComplaintLocationPicker

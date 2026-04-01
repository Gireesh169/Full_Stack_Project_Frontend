import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api/axiosConfig";

const containerStyle = {
  width: "100%",
  height: "500px",
};

const center = {
  lat: 17.385044,
  lng: 78.486671,
};

export default function MapComponent() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/locations`);
      setLocations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <LoadScript googleMapsApiKey="YOUR_API_KEY_HERE">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10}>
        {locations.map((loc) => (
          <Marker key={loc.id} position={{ lat: loc.lat, lng: loc.lng }} />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}
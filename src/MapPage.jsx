import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix icon lỗi Leaflet trong React
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapPage() {
  // 🏫 Vị trí mặc định: THPT Số 1 Tư Nghĩa (Quảng Ngãi)
  const [position, setPosition] = useState([15.077, 108.712]);

  // 📍 GPS realtime
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ GPS");
      return;
    }

    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];

        setPosition(newPos);
      },
      (err) => console.log("GPS error:", err),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  return (
    <div className="h-screen w-full">
      {/* HEADER */}
      <div className="bg-blue-900 text-white p-3 text-center font-bold">
        📍 BẢN ĐỒ TRƯỜNG THPT SỐ 1 TƯ NGHĨA
      </div>

      {/* MAP */}
      <MapContainer
        center={position}
        zoom={17}
        className="h-[calc(100vh-48px)] w-full"
      >
        {/* Nền bản đồ */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 📌 Marker trường học */}
        <Marker position={[15.077, 108.712]}>
          <Popup>🏫 THPT Số 1 Tư Nghĩa</Popup>
        </Marker>

        {/* 📍 Marker GPS realtime */}
        <Marker position={position}>
          <Popup>
            📍 Vị trí hiện tại của bạn
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
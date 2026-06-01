import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  Popup,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

// ================= KIỂM TRA DRONE TRONG KHU VỰC =================
function isInsideArea(point, polygon) {
  let x = point.lng;
  let y = point.lat;

  let inside = false;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;

    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y &&
      x <
        ((xj - xi) * (y - yi)) /
          (yj - yi + 0.0000001) +
          xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

// ================= HÀM DI CHUYỂN =================
function moveTowards(
  current,
  target,
  speed = 0.1
) {
  const latDiff = target.lat - current.lat;
  const lngDiff = target.lng - current.lng;

  return {
    lat: current.lat + latDiff * speed,
    lng: current.lng + lngDiff * speed,
  };
}

// ================= TRUNG TÂM TRƯỜNG =================
const center = {
  lat: 15.1482,
  lng: 108.8009,
};

// ================= TUYẾN TUẦN TRA =================
const patrolRoute = [
  { lat: 15.1482, lng: 108.8009 },
  { lat: 15.1490, lng: 108.8012 },
  { lat: 15.1490, lng: 108.8000 },
  { lat: 15.1478, lng: 108.7998 },
];

// ================= KHUÔN VIÊN TRƯỜNG =================
const schoolArea = [
  { lat: 15.1490, lng: 108.7998 },
  { lat: 15.1490, lng: 108.8015 },
  { lat: 15.1475, lng: 108.8015 },
  { lat: 15.1475, lng: 108.7998 },
];

// ================= ICON DRONE =================
const droneIcon = new L.Icon({
  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/565/565547.png",

  iconSize: [40, 40],
});

export default function SchoolMap() {
  const [drone, setDrone] = useState(
    patrolRoute[0]
  );

  const [targetIndex, setTargetIndex] =
    useState(1);

  const [alert, setAlert] =
    useState(false);

  // ================= AI TUẦN TRA =================
  useEffect(() => {
    const interval = setInterval(() => {
      setDrone((prevDrone) => {
        const target =
          patrolRoute[targetIndex];

        let nextDrone =
          moveTowards(
            prevDrone,
            target,
            0.1
          );

        // Drone ra ngoài trường
        if (
          !isInsideArea(
            nextDrone,
            schoolArea
          )
        ) {
          setAlert(true);

          nextDrone =
            moveTowards(
              nextDrone,
              center,
              0.2
            );
        } else {
          setAlert(false);
        }

        const distance =
          Math.abs(
            nextDrone.lat - target.lat
          ) +
          Math.abs(
            nextDrone.lng - target.lng
          );

        if (distance < 0.0001) {
          setTargetIndex(
            (oldIndex) =>
              (oldIndex + 1) %
              patrolRoute.length
          );
        }

        return nextDrone;
      });
    }, 1000);

    return () =>
      clearInterval(interval);
  }, [targetIndex]);

  return (
    <div>

      <MapContainer
        center={[
          center.lat,
          center.lng,
        ]}
        zoom={18}
        style={{
          width: "100%",
          height: "500px",
        }}
      >

        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Drone */}
        <Marker
          position={[
            drone.lat,
            drone.lng,
          ]}
          icon={droneIcon}
        >
          <Popup>
            🚁 Drone AI tuần tra
          </Popup>
        </Marker>

        {/* Trung tâm trường */}
        <Marker
          position={[
            center.lat,
            center.lng,
          ]}
        >
          <Popup>
            🏫 THPT Số 1 Tư Nghĩa
          </Popup>
        </Marker>

        {/* Khuôn viên trường */}
        <Polygon
          positions={schoolArea.map(
            (point) => [
              point.lat,
              point.lng,
            ]
          )}
        />

      </MapContainer>

      {alert && (
        <div className="mt-4 p-3 bg-red-600 text-white rounded-xl font-bold">
          🚨 DRONE RA KHỎI KHU VỰC TRƯỜNG!
        </div>
      )}

    </div>
  );
}
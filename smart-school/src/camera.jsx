import { useEffect, useRef } from "react";

export default function Camera() {
  const videoRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
      })
      .catch(err => {
        console.log("Camera error:", err);
      });
  }, []);

  return (
    <div>
      <h2>Camera Test</h2>
      <video ref={videoRef} autoPlay muted style={{ width: "600px" }} />
    </div>
  );
}
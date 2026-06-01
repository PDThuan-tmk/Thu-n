import {
  FaHome,
  FaCamera,
  FaUserGraduate,
  FaChartBar
} from "react-icons/fa";

export default function Sidebar({ setPage, setSelectedBlock, setSelectedClass }) {
  return (
    <div className="w-64 bg-blue-900 text-white p-5 min-h-screen">

      <h2 className="text-xl font-bold mb-8">
        🏫 THPT Số 1 Tư Nghĩa
      </h2>

      <div className="space-y-4">

        <button
          onClick={() => {
            setPage("dashboard");
            setSelectedBlock(null);
            setSelectedClass(null);
          }}
          className="flex items-center gap-2 w-full bg-blue-800 p-3 rounded-lg hover:bg-blue-700"
        >
          <FaHome /> Dashboard
        </button>

        <button
          onClick={() => setPage("camera")}
          className="flex items-center gap-2 w-full bg-blue-800 p-3 rounded-lg hover:bg-blue-700"
        >
          <FaCamera /> Camera AI
        </button>

        <button
          onClick={() => setPage("students")}
          className="flex items-center gap-2 w-full bg-blue-800 p-3 rounded-lg hover:bg-blue-700"
        >
          <FaUserGraduate /> Học sinh
        </button>

        <button
          onClick={() => setPage("dashboard")}
          className="flex items-center gap-2 w-full bg-blue-800 p-3 rounded-lg hover:bg-blue-700"
        >
          <FaChartBar /> Thống kê
        </button>

      </div>
    </div>
  );
}
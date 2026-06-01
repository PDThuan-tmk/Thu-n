<div className="grid grid-cols-3 gap-5 mb-6">

  {/* TOTAL */}
  <div className="bg-white rounded-2xl shadow-lg p-6 hover:scale-105 transition border-l-4 border-blue-600">
    <p className="text-gray-500">Tổng học sinh</p>
    <h3 className="text-3xl font-bold text-blue-600">{students.length}</h3>
    <p className="text-xs text-gray-400 mt-1">Toàn trường</p>
  </div>

  {/* PRESENT */}
  <div className="bg-white rounded-2xl shadow-lg p-6 hover:scale-105 transition border-l-4 border-green-600">
    <p className="text-gray-500">Có mặt</p>
    <h3 className="text-3xl font-bold text-green-600">{present}</h3>
    <p className="text-xs text-gray-400 mt-1">Đang học</p>
  </div>

  {/* ABSENT */}
  <div className="bg-white rounded-2xl shadow-lg p-6 hover:scale-105 transition border-l-4 border-red-600">
    <p className="text-gray-500">Vắng</p>
    <h3 className="text-3xl font-bold text-red-600">{absent}</h3>
    <p className="text-xs text-gray-400 mt-1">Không có mặt</p>
  </div>

</div>
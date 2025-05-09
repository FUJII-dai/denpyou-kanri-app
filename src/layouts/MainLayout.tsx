import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Main layout component that provides a consistent structure for all pages
 */
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = location.pathname === '/';

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {!isRoot && (
        <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">FunFare 伝票管理v2</h1>
          <button
            className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
        </header>
      )}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;

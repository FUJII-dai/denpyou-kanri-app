import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

/**
 * A wrapper component for pages that provides a consistent header and layout
 */
const PageWrapper: React.FC<PageWrapperProps> = ({
  title,
  children,
  actions,
  showBackButton = true,
  onBack,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          {actions}
          {showBackButton && (
            <button
              className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default PageWrapper;

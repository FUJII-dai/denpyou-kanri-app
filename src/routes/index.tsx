import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import MainLayout from '../layouts/MainLayout';

import {
  DashboardWrapper,
  NewOrderWrapper,
  ActiveOrdersWrapper,
  CompletedOrdersWrapper,
  DailySalesWrapper,
  StaffManagementWrapper,
  RegisterCashWrapper
} from '../components/wrappers/RouteWrappers';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-800 border-t-transparent mb-4"></div>
      <p className="text-gray-600">読み込み中...</p>
    </div>
  </div>
);

const ErrorFallback = () => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-md m-4">
    <h2 className="text-lg font-bold text-red-700 mb-2">エラーが発生しました</h2>
    <p className="text-red-600 mb-4">
      ページの読み込み中にエラーが発生しました。再読み込みしてください。
    </p>
    <button
      className="bg-blue-600 text-white px-4 py-2 rounded-md"
      onClick={() => window.location.reload()}
    >
      ページを再読み込み
    </button>
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorFallback />,
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <ErrorBoundary>
              <DashboardWrapper />
            </ErrorBoundary>
          </React.Suspense>
        ),
      },
      {
        path: 'new-order',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <ErrorBoundary>
              <NewOrderWrapper />
            </ErrorBoundary>
          </React.Suspense>
        ),
      },
      {
        path: 'active-orders',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <ErrorBoundary>
              <ActiveOrdersWrapper />
            </ErrorBoundary>
          </React.Suspense>
        ),
      },
      {
        path: 'completed-orders',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <ErrorBoundary>
              <CompletedOrdersWrapper />
            </ErrorBoundary>
          </React.Suspense>
        ),
      },
      {
        path: 'daily-sales',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <ErrorBoundary>
              <DailySalesWrapper />
            </ErrorBoundary>
          </React.Suspense>
        ),
      },
      {
        path: 'staff-management',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <ErrorBoundary>
              <StaffManagementWrapper />
            </ErrorBoundary>
          </React.Suspense>
        ),
      },
      {
        path: 'register-cash',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <ErrorBoundary>
              <RegisterCashWrapper />
            </ErrorBoundary>
          </React.Suspense>
        ),
      },
    ],
  },
]);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;

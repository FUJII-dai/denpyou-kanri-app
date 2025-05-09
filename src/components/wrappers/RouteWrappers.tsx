import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../Dashboard';
import NewOrder from '../NewOrder';
import ActiveOrders from '../ActiveOrders';
import CompletedOrders from '../CompletedOrders';
import DailySales from '../DailySales';
import StaffManagement from '../StaffManagement';
import RegisterCash from '../RegisterCash.new';

/**
 * Wrapper components for routes that handle navigation and props
 */

export const DashboardWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleScreenChange = (screen: string) => {
    navigate(`/${screen}`);
  };
  
  return <Dashboard onScreenChange={handleScreenChange} />;
};

export const NewOrderWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <NewOrder onBack={handleBack} />;
};

export const ActiveOrdersWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <ActiveOrders onBack={handleBack} />;
};

export const CompletedOrdersWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <CompletedOrders onBack={handleBack} />;
};

export const DailySalesWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <DailySales onBack={handleBack} />;
};

export const StaffManagementWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <StaffManagement onBack={handleBack} />;
};

export const RegisterCashWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/');
  };
  
  return <RegisterCash />;
};

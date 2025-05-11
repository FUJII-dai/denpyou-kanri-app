import { useState } from 'react';
import Dashboard from './components/Dashboard';
import NewOrder from './components/NewOrder';
import ActiveOrders from './components/ActiveOrders';
import CompletedOrders from './components/CompletedOrders';
import DailySales from './components/DailySales';
import StaffManagement from './components/StaffManagement';
import RegisterCash from './components/RegisterCash.new';

const GirlsBarApp = () => {
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  const handleScreenChange = (screen: string) => {
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch(currentScreen) {
      case 'newOrder':
        return <NewOrder onBack={() => setCurrentScreen('dashboard')} />;
      case 'activeOrders':
        return <ActiveOrders onBack={() => setCurrentScreen('dashboard')} />;
      case 'completedOrders':
        return <CompletedOrders onBack={() => setCurrentScreen('dashboard')} />;
      case 'dailySales':
        return <DailySales onBack={() => setCurrentScreen('dashboard')} />;
      case 'staff':
        return <StaffManagement onBack={() => setCurrentScreen('dashboard')} />;
      case 'registerCash':
        return <RegisterCash onBack={() => setCurrentScreen('dashboard')} />;
      default:
        return <Dashboard onScreenChange={handleScreenChange} />;
    }
  };

  return renderScreen();
};

export default GirlsBarApp;

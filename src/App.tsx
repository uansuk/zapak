import { StoreProvider } from './state/store';
import { useRoute } from './router';
import PublicDashboard from './pages/PublicDashboard';
import Login from './pages/Login';
import { SellerHomeGuarded, SellerRegisterGuarded, SellerRegistrationsGuarded } from './pages/seller';
import { BrokerHomeGuarded, BrokerArrivalsGuarded, BrokerAuctionsGuarded, BrokerNoticesGuarded } from './pages/broker';
import BuyerGuarded from './pages/buyer';
import AdminGuarded from './pages/admin';

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}

function Router() {
  const path = useRoute();
  switch (path) {
    case '/': return <PublicDashboard />;
    case '/login': return <Login />;
    case '/seller': return <SellerHomeGuarded />;
    case '/seller/register-fish': return <SellerRegisterGuarded />;
    case '/seller/my-registrations': return <SellerRegistrationsGuarded />;
    case '/broker': return <BrokerHomeGuarded />;
    case '/broker/arrivals': return <BrokerArrivalsGuarded />;
    case '/broker/auctions': return <BrokerAuctionsGuarded />;
    case '/broker/notices': return <BrokerNoticesGuarded />;
    case '/buyer': return <BuyerGuarded />;
    case '/admin': return <AdminGuarded />;
    default: return <PublicDashboard />;
  }
}

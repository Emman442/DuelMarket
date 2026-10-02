import React, { useState } from 'react';
import { Navbar, NavTab } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingView } from './components/landing/LandingView';
import { MarketsList } from './components/markets/MarketsList';
import { MarketDetail } from './components/markets/MarketDetail';
import { CreateMarketModal } from './components/create/CreateMarketModal';
import { PortfolioView } from './components/portfolio/PortfolioView';
import { WalletModal } from './components/wallet/WalletModal';
import { WalletProvider } from '@/lib/genlayer/WalletProvider';
import { Toaster } from 'sonner';
import { Bet } from '@/lib/contracts/types';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

function MainApp() {
  const [currentView, setCurrentView] = useState<NavTab | 'detail'>('landing');
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const navigate = useNavigate();


  const handleSelectMarket = (market: Bet) => {

    navigate(`/bet/${market.bet_id}`);
  };


  const handleTabChange = (tab: NavTab) => {
    setCurrentView(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F2EFE8] text-[#1E1B18] antialiased">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={currentView === 'detail' ? 'markets' : currentView}
        setActiveTab={handleTabChange}
        onOpenCreate={() => setIsCreateModalOpen(true)}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        <Routes>
          {/* Landing route */}
          <Route
            path="/"
            element={
              <LandingView
                onCreateMarket={() => setIsCreateModalOpen(true)}
                onExploreMarkets={() => navigate('/markets')}
                onSelectMarket={handleSelectMarket}
              />
            }
          />

          {/* /bet list and /markets alias */}
          <Route
            path="/bet"
            element={
              <MarketsList
                onCreateMarket={() => setIsCreateModalOpen(true)}
                onSelectMarket={handleSelectMarket}
              />
            }
          />
          <Route
            path="/markets"
            element={
              <MarketsList
                onCreateMarket={() => setIsCreateModalOpen(true)}
                onSelectMarket={handleSelectMarket}
              />
            }
          />

          <Route
            path="/bet/:marketId"
            element={
              <MarketDetail
                marketId={selectedMarketId!}
                onOpenWallet={() => setIsWalletModalOpen(true)}
                onBack={() => handleTabChange('markets')}
              />
            }
          />
          <Route
            path="/markets/:marketId"
            element={
              <MarketDetail
                marketId={selectedMarketId!}
                onOpenWallet={() => setIsWalletModalOpen(true)}
                onBack={() => handleTabChange('markets')}
              />
            }
          />

          <Route
            path="/my-positions"
            element={<PortfolioView onSelectMarket={handleSelectMarket} onExploreMarkets={() => navigate('/markets')} />}
          />

          {/* Fallback route */}
          <Route
            path="*"
            element={
              <MarketsList
                onCreateMarket={() => setIsCreateModalOpen(true)} onSelectMarket={handleSelectMarket}
              />
            }
          />
        </Routes>
      </main>

      {/* Editorial Footer */}
      <Footer
        onNavigateToMarkets={() => handleTabChange('markets')}
        onNavigateToCreate={() => setIsCreateModalOpen(true)}
      />

      {/* Create Market Modal */}
      <CreateMarketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Wallet Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <MainApp />
        <Toaster />
      </WalletProvider>
    </BrowserRouter>
  );
}

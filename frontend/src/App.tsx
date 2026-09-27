import React, { useState } from 'react';
import { MarketProvider } from './context/MarketContext';
import { Navbar, NavTab } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingView } from './components/landing/LandingView';
import { MarketsList } from './components/markets/MarketsList';
import { MarketDetail } from './components/markets/MarketDetail';
import { CreateMarketModal } from './components/create/CreateMarketModal';
import { PortfolioView } from './components/portfolio/PortfolioView';
import { WalletModal } from './components/wallet/WalletModal';
import { Market } from './types/market';

function MainApp() {
  const [currentView, setCurrentView] = useState<NavTab | 'detail'>('landing');
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarketId(market.id);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarketCreated = (newMarketId: string) => {
    setSelectedMarketId(newMarketId);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        {currentView === 'landing' && (
          <LandingView
            onSelectMarket={handleSelectMarket}
            onExploreMarkets={() => handleTabChange('markets')}
            onCreateMarket={() => setIsCreateModalOpen(true)}
          />
        )}

        {currentView === 'markets' && (
          <MarketsList
            onSelectMarket={handleSelectMarket}
            onCreateMarket={() => setIsCreateModalOpen(true)}
          />
        )}

        {currentView === 'detail' && selectedMarketId && (
          <MarketDetail
            marketId={selectedMarketId}
            onBack={() => setCurrentView('markets')}
            onOpenWallet={() => setIsWalletModalOpen(true)}
          />
        )}

        {currentView === 'portfolio' && (
          <PortfolioView
            onSelectMarket={handleSelectMarket}
            onExploreMarkets={() => handleTabChange('markets')}
          />
        )}
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
        onMarketCreated={handleMarketCreated}
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
    <MarketProvider>
      <MainApp />
    </MarketProvider>
  );
}

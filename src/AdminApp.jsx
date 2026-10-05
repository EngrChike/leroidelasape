import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Users, 
  Building2, 
  Store, 
  Receipt, 
  LogOut, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';

// Modular Component Imports (from src/components/)
import InventoryManagement from './components/InventoryManagement';
import BatchTransferModal from './components/BatchTransferModal';
import BranchManagement from './components/BranchManagement';
import StorefrontPreview from './components/StorefrontPreview';

// Existing Components in src/
import StaffManagement from './StaffManagement';
import SalesLedger from './SalesLedger';

export default function AdminApp({ supabase }) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const fetchAllAdminData = async () => {
    setLoading(true);
    await Promise.all([
      fetchInventory(),
      fetchBranches()
    ]);
    setLoading(false);
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setInventory(data);
  };

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setBranches(data);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500 rounded-xl text-slate-950 font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide uppercase">Panneau d'Administration</h1>
              <p className="text-[10px] text-slate-400">Gestion globale des stocks & succursales</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAllAdminData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="Rafraîchir tout"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="/"
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Quitter</span>
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-800/80 border-t border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-1 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'inventory'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Catalogue & Stocks</span>
            </button>

            <button
              onClick={() => setActiveTab('branches')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'branches'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Succursales ({branches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'staff'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Personnel & PIN</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'sales'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Registre Ventes</span>
            </button>

            <button
              onClick={() => setActiveTab('storefront')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'storefront'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Aperçu Vitrine</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'inventory' && (
          <InventoryManagement
            inventory={inventory}
            branches={branches}
            supabase={supabase}
            refreshInventory={fetchInventory}
            onOpenBatchTransfer={() => setIsTransferModalOpen(true)}
          />
        )}

        {activeTab === 'branches' && (
          <BranchManagement
            branches={branches}
            supabase={supabase}
            refreshBranches={fetchBranches}
          />
        )}

        {activeTab === 'staff' && (
          <StaffManagement
            supabase={supabase}
            branches={branches}
          />
        )}

        {activeTab === 'sales' && (
          <SalesLedger
            supabase={supabase}
            branches={branches}
          />
        )}

        {activeTab === 'storefront' && (
          <StorefrontPreview
            inventory={inventory}
            branches={branches}
          />
        )}
      </main>

      {/* Inter-Branch Transfer Modal */}
      <BatchTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        inventory={inventory}
        branches={branches}
        supabase={supabase}
        refreshData={fetchInventory}
      />
    </div>
  );
}
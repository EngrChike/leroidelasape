import React, { useState } from 'react';
import { Search, ShoppingBag, ExternalLink, Sparkles } from 'lucide-react';

export default function StorefrontPreview({ inventory = [], branches = [] }) {
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredItems = inventory.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base">Aperçu de la Vitrine Client (Storefront)</h2>
          </div>
          <p className="text-xs text-slate-300">
            Voici comment vos produits et stocks apparaissent en direct aux clients en ligne.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="text-xs bg-slate-800 text-white border border-slate-700 px-3 py-2 rounded-xl outline-none"
          >
            <option value="ALL">Vue Global (Toutes Succursales)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0"
          >
            <span>Ouvrir la Boutique Client</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Simuler une recherche client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredItems.map(item => {
          const displayStock = selectedBranch === 'ALL'
            ? (item.stock || 0)
            : (item.branch_stock?.[selectedBranch] || 0);

          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="w-8 h-8 text-gray-300" />
                )}
                <span className="absolute top-2 right-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {item.category || 'Général'}
                </span>
              </div>

              <div className="p-3">
                <h4 className="font-bold text-xs text-gray-900 line-clamp-1">{item.name}</h4>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-black text-sm text-indigo-600">{(item.price || 0).toLocaleString()} FCFA</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    displayStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {displayStock > 0 ? `En stock (${displayStock})` : 'Rupture'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, ArrowRightLeft, Package, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BatchTransferModal({ isOpen, onClose, inventory = [], branches = [], supabase, refreshData }) {
  const [sourceBranch, setSourceBranch] = useState('hq');
  const [targetBranch, setTargetBranch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !targetBranch || transferQty <= 0) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs correctement.' });
      return;
    }
    if (sourceBranch === targetBranch) {
      setMessage({ type: 'error', text: 'La source et la destination doivent être différentes.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const item = inventory.find(i => i.id === selectedProduct);
      if (!item) throw new Error('Produit introuvable.');

      const currentStock = sourceBranch === 'hq' 
        ? (item.stock || 0) 
        : (item.branch_stock?.[sourceBranch] || 0);

      if (transferQty > currentStock) {
        throw new Error(`Stock insuffisant en source. Disponible: ${currentStock}`);
      }

      let updatedStock = item.stock || 0;
      let updatedBranchStock = { ...(item.branch_stock || {}) };

      if (sourceBranch === 'hq') {
        updatedStock -= transferQty;
      } else {
        updatedBranchStock[sourceBranch] = (updatedBranchStock[sourceBranch] || 0) - transferQty;
      }

      if (targetBranch === 'hq') {
        updatedStock += transferQty;
      } else {
        updatedBranchStock[targetBranch] = (updatedBranchStock[targetBranch] || 0) + transferQty;
      }

      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          stock: updatedStock,
          branch_stock: updatedBranchStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProduct);

      if (updateError) throw updateError;

      await supabase.from('stock_transfers').insert([{
        product_id: selectedProduct,
        product_name: item.name,
        source_branch: sourceBranch,
        target_branch: targetBranch,
        quantity: transferQty,
        created_at: new Date().toISOString()
      }]).catch(() => {});

      setMessage({ type: 'success', text: 'Transfert de stock effectué avec succès !' });
      if (refreshData) refreshData();
      
      setTimeout(() => {
        setTransferQty(1);
        setSelectedProduct('');
        setMessage(null);
        onClose();
      }, 1200);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors du transfert.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm tracking-wide uppercase">Transfert de Stock Inter-Succursales</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="p-6 space-y-4">
          {message && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">Article à transférer</label>
            <div className="relative">
              <Package className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="w-full border border-slate-300 pl-9 pr-3 py-2.5 text-xs rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                required
              >
                <option value="">-- Sélectionner un produit --</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stock Total: {item.stock || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">Source (Départ)</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={sourceBranch}
                  onChange={e => setSourceBranch(e.target.value)}
                  className="w-full border border-slate-300 pl-9 pr-3 py-2.5 text-xs rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="hq">Siège / Entp. Principal</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">Destination (Arrivée)</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={targetBranch}
                  onChange={e => setTargetBranch(e.target.value)}
                  className="w-full border border-slate-300 pl-9 pr-3 py-2.5 text-xs rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  required
                >
                  <option value="">-- Choisir --</option>
                  <option value="hq" disabled={sourceBranch === 'hq'}>Siège / Entp. Principal</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} disabled={sourceBranch === b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">Quantité à transférer</label>
            <input
              type="number"
              min="1"
              value={transferQty}
              onChange={e => setTransferQty(parseInt(e.target.value) || 1)}
              className="w-full border border-slate-300 p-2.5 text-xs rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
              required
            />
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 text-xs font-bold uppercase rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2.5 text-xs font-bold uppercase rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Transfert...' : 'Valider Transfert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

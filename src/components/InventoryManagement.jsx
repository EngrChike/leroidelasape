import React, { useState } from 'react';
import { Plus, Search, Edit3, Trash2, ArrowRightLeft, Package, Image as ImageIcon, RefreshCw } from 'lucide-react';

export default function InventoryManagement({ inventory = [], branches = [], supabase, refreshInventory, onOpenBatchTransfer }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Parfums',
    price: '',
    cost_price: '',
    stock: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);

  const categories = ['ALL', 'Parfums', 'Cosmétiques', 'Soins', 'Mèches & Cheveux', 'Accessoires'];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return alert('Le nom et le prix sont requis.');

    setLoading(true);
    try {
      const payload = {
        name: newItem.name.trim(),
        category: newItem.category || 'Général',
        price: parseFloat(newItem.price) || 0,
        cost_price: parseFloat(newItem.cost_price) || 0,
        stock: parseInt(newItem.stock) || 0,
        image_url: newItem.image_url.trim() || null
      };

      if (editingItem) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        alert('Produit mis à jour !');
      } else {
        const { error } = await supabase.from('inventory').insert([payload]);
        if (error) throw error;
        alert('Nouveau produit ajouté au catalogue !');
      }

      setNewItem({ name: '', category: 'Parfums', price: '', cost_price: '', stock: '', image_url: '' });
      setEditingItem(null);
      if (refreshInventory) refreshInventory();
    } catch (err) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet article ?')) return;
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;
      if (refreshInventory) refreshInventory();
    } catch (err) {
      alert(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name || '',
      category: item.category || 'Parfums',
      price: item.price || '',
      cost_price: item.cost_price || '',
      stock: item.stock || 0,
      image_url: item.image_url || ''
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setNewItem({ name: '', category: 'Parfums', price: '', cost_price: '', stock: '', image_url: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs border p-2 rounded-lg outline-none bg-gray-50 font-medium"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onOpenBatchTransfer}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-orange-600" />
            <span>Transfert Inter-Succursales</span>
          </button>
          <button
            onClick={refreshInventory}
            className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600"
            title="Rafraîchir les données"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
          <h3 className="font-bold text-xs uppercase text-gray-800 pb-3 border-b mb-4 flex items-center">
            {editingItem ? <Edit3 className="w-4 h-4 mr-2 text-blue-600" /> : <Plus className="w-4 h-4 mr-2 text-emerald-600" />}
            {editingItem ? 'Modifier le Produit' : 'Nouveau Produit au Catalogue'}
          </h3>

          <form onSubmit={handleSaveItem} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Nom du Produit</label>
              <input
                type="text"
                placeholder="ex: Parfum Supreme Gold 100ml"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full border p-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Catégorie</label>
                <select
                  value={newItem.category}
                  onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full border p-2 text-xs rounded-lg outline-none"
                >
                  <option value="Parfums">Parfums</option>
                  <option value="Cosmétiques">Cosmétiques</option>
                  <option value="Soins">Soins</option>
                  <option value="Mèches & Cheveux">Mèches & Cheveux</option>
                  <option value="Accessoires">Accessoires</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Stock Siège</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newItem.stock}
                  onChange={e => setNewItem({ ...newItem, stock: e.target.value })}
                  className="w-full border p-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Prix de Vente (FCFA)</label>
                <input
                  type="number"
                  placeholder="ex: 15000"
                  value={newItem.price}
                  onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                  className="w-full border p-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Prix de Dépense / Coût</label>
                <input
                  type="number"
                  placeholder="ex: 9000"
                  value={newItem.cost_price}
                  onChange={e => setNewItem({ ...newItem, cost_price: e.target.value })}
                  className="w-full border p-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Lien de la Photo (Image URL)</label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="url"
                  placeholder="https://..."
                  value={newItem.image_url}
                  onChange={e => setNewItem({ ...newItem, image_url: e.target.value })}
                  className="w-full border pl-8 pr-2 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              {editingItem && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="w-1/3 py-2 text-xs font-bold border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-slate-900 text-white py-2 text-xs font-bold rounded-lg uppercase hover:bg-slate-800 transition-colors"
              >
                {editingItem ? 'Enregistrer Modif.' : 'Ajouter au Stock'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b mb-4">
            <h3 className="font-bold text-xs uppercase text-gray-800 flex items-center">
              <Package className="w-4 h-4 mr-2 text-slate-700" />
              Catalogue Produits ({filteredInventory.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2.5 font-bold text-gray-600">Produit</th>
                  <th className="p-2.5 font-bold text-gray-600">Catégorie</th>
                  <th className="p-2.5 font-bold text-gray-600">Prix Vente</th>
                  <th className="p-2.5 font-bold text-gray-600">Stock Siège</th>
                  <th className="p-2.5 font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-2.5 font-bold flex items-center gap-2">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-7 h-7 rounded object-cover border" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                          IMG
                        </div>
                      )}
                      <span>{item.name}</span>
                    </td>
                    <td className="p-2.5 text-gray-500">{item.category}</td>
                    <td className="p-2.5 font-bold text-slate-900">{(item.price || 0).toLocaleString()} FCFA</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        (item.stock || 0) <= 3 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.stock || 0}
                      </span>
                    </td>
                    <td className="p-2.5 text-right space-x-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Modifier"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

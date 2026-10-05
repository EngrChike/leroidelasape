import React, { useState } from 'react';
import { Building2, MapPin, Phone } from 'lucide-react';

export default function BranchManagement({ branches = [], supabase, refreshBranches }) {
  const [newBranch, setNewBranch] = useState({ name: '', location: '', phone: '' });
  const [editingBranch, setEditingBranch] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.name) return alert('Le nom de la succursale est obligatoire.');

    setLoading(true);
    try {
      const payload = {
        name: newBranch.name.trim(),
        location: newBranch.location.trim() || null,
        phone: newBranch.phone.trim() || null,
        is_active: true
      };

      if (editingBranch) {
        const { error } = await supabase.from('branches').update(payload).eq('id', editingBranch.id);
        if (error) throw error;
        alert('Succursale mise à jour !');
      } else {
        const { error } = await supabase.from('branches').insert([payload]);
        if (error) throw error;
        alert('Nouvelle succursale créée !');
      }

      setNewBranch({ name: '', location: '', phone: '' });
      setEditingBranch(null);
      if (refreshBranches) refreshBranches();
    } catch (err) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleBranchStatus = async (branch) => {
    try {
      const { error } = await supabase.from('branches').update({ is_active: !branch.is_active }).eq('id', branch.id);
      if (error) throw error;
      if (refreshBranches) refreshBranches();
    } catch (err) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const startEdit = (branch) => {
    setEditingBranch(branch);
    setNewBranch({
      name: branch.name || '',
      location: branch.location || '',
      phone: branch.phone || ''
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
        <h3 className="font-bold text-xs uppercase text-gray-800 pb-3 border-b mb-4 flex items-center">
          <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
          {editingBranch ? 'Modifier la Succursale' : 'Ajouter une Succursale'}
        </h3>

        <form onSubmit={handleSaveBranch} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Nom de la Succursale</label>
            <input
              type="text"
              placeholder="ex: Boutik Abidjan Cocody"
              value={newBranch.name}
              onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
              className="w-full border p-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-indigo-600"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Localisation / Adresse</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="ex: Angré Boulevard Mitterrand"
                value={newBranch.location}
                onChange={e => setNewBranch({ ...newBranch, location: e.target.value })}
                className="w-full border pl-8 pr-2 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Téléphone de Contact</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="+225 07..."
                value={newBranch.phone}
                onChange={e => setNewBranch({ ...newBranch, phone: e.target.value })}
                className="w-full border pl-8 pr-2 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            {editingBranch && (
              <button
                type="button"
                onClick={() => { setEditingBranch(null); setNewBranch({ name: '', location: '', phone: '' }); }}
                className="w-1/3 py-2 text-xs font-bold border rounded-lg hover:bg-gray-100"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 text-xs font-bold rounded-lg uppercase hover:bg-indigo-700 transition-colors"
            >
              {editingBranch ? 'Mettre à jour' : 'Enregistrer Succursale'}
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-xs uppercase text-gray-800 pb-3 border-b mb-4 flex items-center justify-between">
          <span>Points de Vente & Succursales</span>
          <span className="text-gray-400 text-[10px] uppercase font-bold">{branches.length} enregistrée(s)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map(branch => (
            <div key={branch.id} className="p-4 border rounded-xl bg-gray-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm text-slate-900">{branch.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    branch.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                  }`}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {branch.location && (
                  <p className="text-xs text-gray-600 flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> {branch.location}
                  </p>
                )}
                {branch.phone && (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {branch.phone}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t flex justify-end gap-2">
                <button
                  onClick={() => startEdit(branch)}
                  className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                >
                  Modifier
                </button>
                <button
                  onClick={() => toggleBranchStatus(branch)}
                  className={`px-2.5 py-1 text-xs font-bold rounded ${
                    branch.is_active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {branch.is_active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

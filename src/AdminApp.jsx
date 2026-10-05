import React, { useState, useEffect } from 'react';
import { Package, Users, Eye, Pencil, Archive, RotateCcw, X, Layers, UserCog, Key, Store, MapPin, Filter } from 'lucide-react';
import SalesLedger from './SalesLedger';

export default function AdminApp({ currentUser, supabase }) {
  const isAdmin = currentUser?.role === 'admin';
  
  const [activeTab, setActiveTab] = useState(isAdmin ? 'inventory' : 'customers'); 

  // Global Data states
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [branches, setBranches] = useState([]);
  
  // Branch Context Filters
  const [viewingBranch, setViewingBranch] = useState('ALL'); // HQ Dashboard Filter
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);

  // Branch form states
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [editingBranch, setEditingBranch] = useState(null);

  // Staff form states
  const [staffName, setStaffName] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffRole, setStaffRole] = useState('staff');
  const [staffBranch, setStaffBranch] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);

  // Inventory forms states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [batch, setBatch] = useState('');
  const [productBranch, setProductBranch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Determine active branch context (Admin sees what they filter, Staff sees only their branch)
  const activeBranchId = isAdmin ? viewingBranch : (currentUser?.branch_id || 'ALL');

  useEffect(() => {
    fetchBranchesFromSupabase();
    fetchProducts();
    fetchCustomersFromSupabase();
    if (isAdmin) {
      fetchStaffFromSupabase();
    }
  }, [isAdmin, activeTab]);

  const fetchBranchesFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true });
      if (!error && data) setBranches(data);
    } catch (err) { console.error("Erreur branches:", err); }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
    } catch (err) { console.error("Erreur produits:", err); }
  };

  const fetchCustomersFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('customers').select('*, customer_history(*)').order('created_at', { ascending: false });
      if (!error && data) {
        const formatted = data.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          branch_id: c.branch_id,
          totalDebt: c.total_debt || 0,
          history: c.customer_history ? c.customer_history.sort((a, b) => b.id - a.id) : []
        }));
        setCustomers(formatted);
      }
    } catch (err) { console.error("Erreur clients:", err.message); }
  };

  const fetchStaffFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
      if (!error && data) setStaffList(data);
    } catch (err) { console.error("Erreur personnel:", err); }
  };

  const verifyAdminPinBeforeAction = () => {
    const adminPin = prompt("Sécurité Admin : Entrez votre code PIN Administrateur pour confirmer :");
    if (!adminPin) return false;
    const verifyingAdmin = staffList.find(s => s.pin_code === adminPin && s.role === 'admin' && s.is_active);
    if (!verifyingAdmin) { alert("Code PIN incorrect."); return false; }
    return true;
  };

  // Branch Handlers
  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchName) return;
    try {
      const payload = { name: branchName.trim(), location: branchLocation.trim() };
      if (editingBranch) {
        await supabase.from('branches').update(payload).eq('id', editingBranch.id);
        alert('Succursale mise à jour !');
      } else {
        await supabase.from('branches').insert([payload]);
        alert('Nouvelle succursale créée !');
      }
      setBranchName(''); setBranchLocation(''); setEditingBranch(null);
      fetchBranchesFromSupabase();
    } catch (err) { alert(`Erreur: ${err.message}`); }
  };

  // Staff Handlers
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !staffPin) return;
    try {
      const payload = {
        full_name: staffName.trim(),
        pin_code: staffPin.trim(),
        role: staffRole,
        branch_id: staffBranch || null,
        is_active: true
      };
      if (editingStaff) {
        await supabase.from('staff').update(payload).eq('id', editingStaff.id);
        alert('Personnel mis à jour !');
      } else {
        await supabase.from('staff').insert([payload]);
        alert('Nouveau membre ajouté !');
      }
      setStaffName(''); setStaffPin(''); setStaffRole('staff'); setStaffBranch(''); setEditingStaff(null);
      fetchStaffFromSupabase();
    } catch (err) { alert(`Erreur: ${err.message}`); }
  };

  const handleToggleStaffStatus = async (id, currentStatus) => {
    if (!verifyAdminPinBeforeAction()) return;
    const { error } = await supabase.from('staff').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) { fetchStaffFromSupabase(); alert('Statut mis à jour !'); }
  };

  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.75) => { /* Original logic */
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width; let height = img.height;
          if (width > height) { if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; } }
          else { if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
        };
      };
    });
  };

  // Product Handlers
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || quantity === '' || !batch) return;
    setUploading(true);
    let image_url = editingProduct ? editingProduct.image_url : 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=80';
    try {
      if (imageFile) {
        let fileToUpload = await compressImage(imageFile, 800, 800, 0.75);
        const fileName = `${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('product-images').upload(fileName, fileToUpload);
        if (upErr) throw upErr;
        image_url = supabase.storage.from('product-images').getPublicUrl(fileName)?.data?.publicUrl || image_url;
      }
      
      const parsedQty = parseInt(quantity) || 0;
      const parsedInitQty = initialQuantity !== '' ? parseInt(initialQuantity) : (editingProduct ? editingProduct.initial_quantity : parsedQty);

      const payload = { 
        name: name.trim(), 
        description: description.trim(), 
        price: parseFloat(price),
        cost_price: parseFloat(costPrice) || 0,
        image_url, 
        quantity: parsedQty, 
        initial_quantity: parsedInitQty || parsedQty,
        stock_status: parsedQty > 0, 
        batch_reference: batch.trim().toUpperCase(),
        branch_id: productBranch || null, // Associates inventory with HQ or a Branch
        is_archived: false
      };

      if (editingProduct) await supabase.from('products').update(payload).eq('id', editingProduct.id);
      else await supabase.from('products').insert([payload]);

      handleCancelEditProduct();
      await fetchProducts();
      alert('Inventaire enregistré avec succès !');
    } catch (err) { alert(`Erreur: ${err.message}`); } finally { setUploading(false); }
  };

  const handleStartEditProduct = (p) => {
    setEditingProduct(p); setName(p.name); setPrice(p.price); setCostPrice(p.cost_price || '');
    setQuantity(p.quantity); setInitialQuantity(p.initial_quantity !== undefined ? p.initial_quantity : p.quantity);
    setDescription(p.description || ''); setBatch(p.batch_reference || ''); setProductBranch(p.branch_id || '');
  };

  const handleCancelEditProduct = () => {
    setEditingProduct(null); setName(''); setPrice(''); setCostPrice(''); setQuantity(''); 
    setInitialQuantity(''); setDescription(''); setBatch(''); setImageFile(null); setProductBranch('');
  };

  const handleUpdateStockVolume = async (id, newVolume) => {
    const parsedVolume = parseInt(newVolume) || 0;
    await supabase.from('products').update({ quantity: parsedVolume, stock_status: parsedVolume > 0 }).eq('id', id);
    setProducts(prev => prev.map(p => String(p.id) === String(id) ? { ...p, quantity: parsedVolume, stock_status: parsedVolume > 0 } : p));
  };

  const handleArchiveProduct = async (id, archiveState = true) => {
    if (!window.confirm(archiveState ? 'Archiver ce produit ?' : 'Restaurer ce produit ?')) return;
    await supabase.from('products').update({ is_archived: archiveState }).eq('id', id);
    setProducts(prev => prev.map(p => String(p.id) === String(id) ? { ...p, is_archived: archiveState } : p));
  };

  // ---- CONTEXT FILTERING FOR DASHBOARD & METRICS ----
  const contextProducts = products.filter(p => activeBranchId === 'ALL' || String(p.branch_id) === String(activeBranchId));
  const contextCustomers = customers.filter(c => activeBranchId === 'ALL' || String(c.branch_id) === String(activeBranchId));

  const getProductSoldQty = (productId) => {
    return contextCustomers.reduce((acc, c) => acc + (c.history || []).reduce((hAcc, h) => {
      if (h.items && Array.isArray(h.items)) {
        const item = h.items.find(i => String(i.productId) === String(productId));
        return hAcc + (item ? (parseInt(item.qty) || 0) : 0);
      } else { return hAcc + (String(h.productId) === String(productId) ? (parseInt(h.qty) || 1) : 0); }
    }, 0), 0);
  };

  const getTrueInitialQty = (p) => {
    if (p.initial_quantity !== undefined && p.initial_quantity !== null && p.initial_quantity !== '') return parseInt(p.initial_quantity);
    return (parseInt(p.quantity) || 0) + getProductSoldQty(p.id);
  };

  // Accurate Financial Metrics strictly preserved
  const totalInventoryCost = contextProducts.reduce((acc, p) => acc + ((parseFloat(p.cost_price) || 0) * getTrueInitialQty(p)), 0);
  const totalExpectedRevenue = contextProducts.reduce((acc, p) => acc + ((parseFloat(p.price) || 0) * getTrueInitialQty(p)), 0);
  const totalPotentialRetail = contextProducts.filter(p => !p.is_archived).reduce((acc, p) => acc + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0)), 0);
  const totalGoodsSoldCost = contextProducts.reduce((acc, p) => acc + ((parseFloat(p.cost_price) || 0) * getProductSoldQty(p.id)), 0);
  const totalSalesRevenue = contextCustomers.reduce((acc, c) => acc + (c.history || []).reduce((hAcc, h) => hAcc + (parseFloat(h.total) || 0), 0), 0);
  const totalOutstandingDebt = contextCustomers.reduce((acc, c) => acc + (parseFloat(c.totalDebt) || 0), 0);

  const uniqueBatches = ['ALL', ...new Set(contextProducts.map(p => p.batch_reference).filter(Boolean))];
  const filteredProducts = contextProducts.filter(p => {
    const matchesBatch = selectedBatchFilter === 'ALL' || p.batch_reference === selectedBatchFilter;
    const matchesArchiveState = showArchived ? p.is_archived : !p.is_archived;
    return matchesBatch && matchesArchiveState;
  });

  const frontPageProducts = contextProducts.filter(p => !p.is_archived && parseInt(p.quantity) >= 1);

  return (
    <div className="bg-[#f5f5f7] text-gray-900 font-sans p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER NAVIGATION */}
        {isAdmin ? (
          <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center space-x-2 ${activeTab === 'inventory' ? 'bg-[#f68b1e] text-white' : 'bg-gray-100 text-gray-600'}`}><Package className="w-4 h-4" /> <span>Inventory</span></button>
                <button onClick={() => setActiveTab('customers')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center space-x-2 ${activeTab === 'customers' ? 'bg-[#f68b1e] text-white' : 'bg-gray-100 text-gray-600'}`}><Users className="w-4 h-4" /> <span>Sales Ledger</span></button>
                <button onClick={() => setActiveTab('storefront')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center space-x-2 ${activeTab === 'storefront' ? 'bg-[#f68b1e] text-white' : 'bg-gray-100 text-gray-600'}`}><Eye className="w-4 h-4" /> <span>Storefront</span></button>
                <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center space-x-2 ${activeTab === 'staff' ? 'bg-[#f68b1e] text-white' : 'bg-gray-100 text-gray-600'}`}><UserCog className="w-4 h-4" /> <span>Staff</span></button>
                <button onClick={() => setActiveTab('branches')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center space-x-2 ${activeTab === 'branches' ? 'bg-[#f68b1e] text-white' : 'bg-gray-100 text-gray-600'}`}><Store className="w-4 h-4" /> <span>Branches & HQ</span></button>
              </div>

              {/* ADMIN BRANCH GLOBAL FILTER */}
              <div className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50">
                <Filter className="w-4 h-4 text-gray-500" />
                <select value={viewingBranch} onChange={(e) => setViewingBranch(e.target.value)} className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer">
                  <option value="ALL">HQ Global View (All Branches)</option>
                  {branches.map(b => <option key={b.id} value={b.id}>Vue: {b.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex justify-between items-center">
            <h2 className="text-sm font-black uppercase text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#f68b1e]" /> Interface de Vente - {currentUser.full_name}
            </h2>
            <span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-600">
              {branches.find(b => b.id === currentUser.branch_id)?.name || 'Succursale Non Assignée'}
            </span>
          </div>
        )}

        {/* FINANCIAL METRICS (Dynamically updates based on HQ/Branch Filter) */}
        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border shadow-xs">
              <p className="text-[10px] font-extrabold uppercase text-gray-400">Total Achat Initial</p>
              <p className="text-sm sm:text-lg font-black text-gray-900 mt-1">{totalInventoryCost.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-xs">
              <p className="text-[10px] font-extrabold uppercase text-gray-400">Total Vente Initiale</p>
              <p className="text-sm sm:text-lg font-black text-indigo-600 mt-1">{totalExpectedRevenue.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-xs">
              <p className="text-[10px] font-extrabold uppercase text-gray-400">Valeur Stock Actuel</p>
              <p className="text-sm sm:text-lg font-black text-orange-600 mt-1">{totalPotentialRetail.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-xs">
              <p className="text-[10px] font-extrabold uppercase text-gray-400">Coût Marchandises</p>
              <p className="text-sm sm:text-lg font-black text-purple-600 mt-1">{totalGoodsSoldCost.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-xs">
              <p className="text-[10px] font-extrabold uppercase text-gray-400">Total Ventes (Rev)</p>
              <p className="text-sm sm:text-lg font-black text-blue-600 mt-1">{totalSalesRevenue.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-xs">
              <p className="text-[10px] font-extrabold uppercase text-gray-400">Dettes Clients Restantes</p>
              <p className="text-sm sm:text-lg font-black text-red-600 mt-1">{totalOutstandingDebt.toLocaleString()} FCFA</p>
            </div>
          </div>
        )}

        {/* TAB 1: BRANCHES & HQ MANAGEMENT */}
        {isAdmin && activeTab === 'branches' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
              <h3 className="font-bold text-xs uppercase text-gray-700 mb-4 pb-2 border-b">
                {editingBranch ? 'Modifier la Succursale' : 'Créer une Succursale / QG'}
              </h3>
              <form onSubmit={handleSaveBranch} className="space-y-3.5">
                <input type="text" placeholder="Nom (ex: Headquarter, Branch A)" value={branchName} onChange={e => setBranchName(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required />
                <input type="text" placeholder="Localisation (ex: Abidjan Centre)" value={branchLocation} onChange={e => setBranchLocation(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" />
                <button type="submit" className="w-full bg-[#f68b1e] text-white text-xs py-3 rounded-lg font-bold uppercase">
                  {editingBranch ? 'Mettre à jour' : 'Créer Succursale'}
                </button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-xs uppercase text-gray-700 pb-3 border-b flex items-center"><MapPin className="w-4 h-4 mr-2"/> Réseau de Succursales</h3>
              <table className="w-full text-left text-xs mt-3">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 font-bold border-b">
                    <th className="p-2.5">Nom de la Succursale</th>
                    <th className="p-2.5">Localisation</th>
                    <th className="p-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/50 border-b last:border-0">
                      <td className="p-2.5 font-bold text-gray-800">{b.name}</td>
                      <td className="p-2.5 text-gray-500">{b.location || 'N/A'}</td>
                      <td className="p-2.5 text-center">
                        <button onClick={() => { setEditingBranch(b); setBranchName(b.name); setBranchLocation(b.location); }} className="text-blue-500 font-bold hover:underline">Éditer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY MANAGEMENT */}
        {isAdmin && activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h3 className="font-bold text-xs uppercase text-gray-700">{editingProduct ? 'Modifier le produit' : 'Ajouter au Stock (HQ/Branch)'}</h3>
                {editingProduct && <button onClick={handleCancelEditProduct} className="text-gray-400 hover:text-red-500 text-xs flex"><X className="w-3.5 h-3.5 mr-1" /> Annuler</button>}
              </div>
              <form onSubmit={handleSaveProduct} className="space-y-3.5">
                <select value={productBranch} onChange={e => setProductBranch(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg bg-gray-50 font-bold text-indigo-700" required>
                  <option value="">-- Assigner à une Succursale (Requis) --</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <input type="text" placeholder="Nom du produit" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required />
                <input type="text" placeholder="Batch Reference" value={batch} onChange={e => setBatch(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg uppercase" required />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-gray-400 font-bold block mb-1">Prix Achat</label><input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required /></div>
                  <div><label className="text-[10px] text-gray-400 font-bold block mb-1">Prix Vente</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-gray-400 font-bold block mb-1">Qté Initiale</label><input type="number" value={initialQuantity} onChange={e => setInitialQuantity(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" /></div>
                  <div><label className="text-[10px] text-gray-400 font-bold block mb-1">Qté Actuelle</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required /></div>
                </div>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full text-xs" />
                <button type="submit" disabled={uploading} className="w-full bg-[#f68b1e] text-white text-xs py-3 rounded-lg font-bold uppercase">{uploading ? 'Upload...' : 'Enregistrer Stock'}</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between pb-3 border-b gap-3">
                <h3 className="font-bold text-xs uppercase text-gray-700 flex items-center"><Layers className="w-4 h-4 mr-1.5 text-orange-600" /> Catalogue des Produits</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowArchived(!showArchived)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100">{showArchived ? 'Voir Actifs' : 'Voir Archivés'}</button>
                  <select value={selectedBatchFilter} onChange={e => setSelectedBatchFilter(e.target.value)} className="border p-1.5 text-xs rounded-lg bg-gray-50 font-bold">{uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}</select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead><tr className="bg-gray-50 text-gray-400 font-bold border-b"><th className="p-2.5">Branch</th><th className="p-2.5">Article</th><th className="p-2.5">Achat/Vente</th><th className="p-2.5 text-center">Stock</th><th className="p-2.5 text-center">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className={p.is_archived ? 'opacity-60 bg-gray-50' : 'hover:bg-gray-50'}>
                        <td className="p-2.5 text-[10px] font-black text-indigo-600">{branches.find(b => b.id === p.branch_id)?.name || 'HQ'}</td>
                        <td className="p-2.5 font-bold flex items-center gap-2"><img src={p.image_url} alt="" className="w-8 h-8 rounded" />{p.name}</td>
                        <td className="p-2.5 text-gray-500">{p.cost_price?.toLocaleString()} / <span className="text-orange-600 font-bold">{p.price?.toLocaleString()}</span></td>
                        <td className="p-2.5 text-center"><input type="number" value={p.quantity} onChange={(e) => handleUpdateStockVolume(p.id, e.target.value)} className="w-14 border text-center p-1 rounded font-bold" /></td>
                        <td className="p-2.5 text-center space-x-2">
                          <button onClick={() => handleStartEditProduct(p)} className="text-blue-500"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleArchiveProduct(p.id, !p.is_archived)} className={p.is_archived ? "text-green-600" : "text-purple-600"}><Archive className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SALES LEDGER (Only operates on active branch context) */}
        {activeTab === 'customers' && (
          <SalesLedger 
            products={contextProducts}
            customers={contextCustomers}
            fetchProducts={fetchProducts}
            fetchCustomers={fetchCustomersFromSupabase}
            supabase={supabase}
            currentUser={currentUser}
            activeBranchId={activeBranchId} // Ensure SalesLedger uses this when creating new orders/customers
          />
        )}

        {/* TAB 4: STOREFRONT PREVIEW */}
        {isAdmin && activeTab === 'storefront' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-black text-sm uppercase">Aperçu Front-Page</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {frontPageProducts.map(p => (
                <div key={p.id} className="border rounded-xl p-4 bg-white shadow-xs">
                  <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded mb-2 block w-fit">
                    {branches.find(b => b.id === p.branch_id)?.name || 'HQ'}
                  </span>
                  <img src={p.image_url} alt="" className="w-full h-40 object-cover rounded-lg mb-2" />
                  <h4 className="font-black text-sm leading-tight">{p.name}</h4>
                  <div className="mt-3 flex justify-between items-center border-t pt-2">
                    <span className="font-black text-orange-600 text-sm">{p.price?.toLocaleString()} FCFA</span>
                    <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Stock: {p.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: STAFF MANAGEMENT */}
        {isAdmin && activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
              <h3 className="font-bold text-xs uppercase text-gray-700 mb-4 border-b pb-2">{editingStaff ? 'Modifier Staff' : 'Nouveau Staff'}</h3>
              <form onSubmit={handleSaveStaff} className="space-y-3.5">
                <div><label className="text-[10px] font-bold block">Nom Complet</label><input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required /></div>
                <div><label className="text-[10px] font-bold block">Code PIN</label><input type="text" value={staffPin} onChange={e => setStaffPin(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required /></div>
                <div>
                  <label className="text-[10px] font-bold block">Assignation (Succursale)</label>
                  <select value={staffBranch} onChange={e => setStaffBranch(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg">
                    <option value="">-- Accès Global (Pas de succursale fixe) --</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold block">Rôle</label>
                  <select value={staffRole} onChange={e => setStaffRole(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg"><option value="staff">Vendeur</option><option value="admin">Admin</option></select>
                </div>
                <button type="submit" className="w-full bg-[#f68b1e] text-white py-3 text-xs rounded-lg font-bold uppercase">{editingStaff ? 'Mettre à jour' : 'Créer'}</button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-xs uppercase text-gray-700 pb-3 border-b">Liste du Personnel</h3>
              <table className="w-full text-left text-xs mt-3">
                <thead><tr className="bg-gray-50 text-gray-400 font-bold border-b"><th className="p-2.5">Nom</th><th className="p-2.5">Succursale</th><th className="p-2.5">Rôle</th><th className="p-2.5 text-center">Actions</th></tr></thead>
                <tbody>
                  {staffList.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50 border-b">
                      <td className="p-2.5 font-bold">{s.full_name}</td>
                      <td className="p-2.5 font-bold text-indigo-600">{branches.find(b => b.id === s.branch_id)?.name || 'Toutes (HQ)'}</td>
                      <td className="p-2.5">{s.role}</td>
                      <td className="p-2.5 text-center space-x-2">
                        <button onClick={() => { if(!verifyAdminPinBeforeAction()) return; setEditingStaff(s); setStaffName(s.full_name); setStaffPin(s.pin_code); setStaffRole(s.role); setStaffBranch(s.branch_id || ''); }} className="text-blue-500 font-bold">Éditer</button>
                        <button onClick={() => handleToggleStaffStatus(s.id, s.is_active)} className={`font-bold ${s.is_active ? 'text-red-500' : 'text-green-600'}`}>{s.is_active ? 'Désactiver' : 'Activer'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
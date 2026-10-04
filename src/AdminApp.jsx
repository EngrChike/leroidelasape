import React, { useState, useEffect } from 'react';
import { Package, Users, Eye, Pencil, Archive, RotateCcw, X, Layers, UserCog, Key, Store, Truck, MapPin } from 'lucide-react';
import SalesLedger from './SalesLedger';

export default function AdminApp({ currentUser, supabase }) {
  const isAdmin = currentUser?.role === 'admin';
  
  const [activeTab, setActiveTab] = useState(isAdmin ? 'inventory' : 'customers'); 

  // Data states
  const [products, setProducts] = useState([]);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  // NEW: Branch States
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  
  // NEW: Transfer States
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState(null);
  const [transferBranchId, setTransferBranchId] = useState('');
  const [transferQty, setTransferQty] = useState('');

  // Staff form states
  const [staffName, setStaffName] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffRole, setStaffRole] = useState('staff');
  const [staffBranchId, setStaffBranchId] = useState(''); // NEW
  const [editingStaff, setEditingStaff] = useState(null);

  // Inventory forms states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [batch, setBatch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomersFromSupabase();
    if (isAdmin) {
      fetchStaffFromSupabase();
      fetchBranches(); // NEW
    }
  }, [isAdmin, activeTab]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
    } catch (err) { console.error("Erreur produits: ", err); }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true });
      if (!error && data) setBranches(data);
    } catch (err) { console.error("Erreur branches: ", err); }
  };

  const fetchCustomersFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('customers').select('*, customer_history(*)').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const formatted = data.map(c => ({
          id: c.id, name: c.name, phone: c.phone, totalDebt: c.total_debt || 0,
          history: c.customer_history ? c.customer_history.sort((a, b) => b.id - a.id) : []
        }));
        setCustomers(formatted);
      }
    } catch (err) { console.error("Erreur clients:", err.message); }
  };

  const fetchStaffFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('staff').select('*, branches(name)').order('created_at', { ascending: false });
      if (!error && data) setStaffList(data);
    } catch (err) { console.error("Erreur personnel:", err); }
  };

  const verifyAdminPinBeforeAction = () => {
    const adminPin = prompt("Sécurité Admin : Entrez votre code PIN Administrateur pour confirmer :");
    if (!adminPin) return false;
    const verifyingAdmin = staffList.find(s => s.pin_code === adminPin && s.role === 'admin' && s.is_active);
    if (!verifyingAdmin) { alert("Code PIN administrateur incorrect ou non autorisé."); return false; }
    return true;
  };

  // --- NEW: BRANCH MANAGEMENT ---
  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchName) return;
    try {
      const { error } = await supabase.from('branches').insert([{ name: branchName.trim(), location: branchLocation.trim() }]);
      if (error) throw error;
      alert('Succursale créée avec succès !');
      setBranchName(''); setBranchLocation('');
      fetchBranches();
    } catch (err) { alert(`Erreur: ${err.message}`); }
  };

  // --- NEW: STOCK TRANSFER LOGIC ---
  const executeStockTransfer = async (e) => {
    e.preventDefault();
    if (!transferBranchId || !transferQty || transferQty <= 0) return;
    
    const qtyToTransfer = parseInt(transferQty);
    if (qtyToTransfer > transferProduct.quantity) {
      alert("Stock insuffisant au siège (HQ) pour ce transfert.");
      return;
    }

    try {
      // 1. Deduct from HQ (Master Products table)
      const newHqQty = transferProduct.quantity - qtyToTransfer;
      const { error: hqError } = await supabase.from('products').update({ quantity: newHqQty, stock_status: newHqQty > 0 }).eq('id', transferProduct.id);
      if (hqError) throw hqError;

      // 2. Add to Branch Inventory (Upsert)
      // Check if branch already has this product
      const { data: existingBranchStock } = await supabase.from('branch_inventory')
        .select('*').eq('branch_id', transferBranchId).eq('product_id', transferProduct.id).single();

      if (existingBranchStock) {
        await supabase.from('branch_inventory').update({ quantity: existingBranchStock.quantity + qtyToTransfer })
          .eq('id', existingBranchStock.id);
      } else {
        await supabase.from('branch_inventory').insert([{ branch_id: transferBranchId, product_id: transferProduct.id, quantity: qtyToTransfer }]);
      }

      alert(`Transfert de ${qtyToTransfer} ${transferProduct.name} réussi vers la succursale !`);
      setTransferModalOpen(false);
      setTransferQty('');
      fetchProducts(); // Refresh HQ stock
    } catch (err) {
      alert(`Erreur de transfert: ${err.message}`);
    }
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !staffPin) return;
    try {
      const payload = {
        full_name: staffName.trim(),
        pin_code: staffPin.trim(),
        role: staffRole,
        branch_id: staffBranchId || null, // NEW
        is_active: true
      };
      if (editingStaff) {
        const { error } = await supabase.from('staff').update(payload).eq('id', editingStaff.id);
        if (error) throw error;
        alert('Membre du personnel mis à jour avec succès !');
      } else {
        const { error } = await supabase.from('staff').insert([payload]);
        if (error) throw error;
        alert('Nouveau membre ajouté avec succès !');
      }
      setStaffName(''); setStaffPin(''); setStaffRole('staff'); setStaffBranchId(''); setEditingStaff(null);
      fetchStaffFromSupabase();
    } catch (err) { alert(`Erreur: ${err.message}`); }
  };

  const handleToggleStaffStatus = async (id, currentStatus) => {
    if (!verifyAdminPinBeforeAction()) return;
    const { error } = await supabase.from('staff').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) { fetchStaffFromSupabase(); alert('Statut mis à jour avec succès !'); }
  };

  // Keep existing image compression and product saving intact
  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width; let height = img.height;
          if (width > height) { if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; } }
          else { if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            else reject(new Error('Compression failed'));
          }, 'image/jpeg', quality);
        }; img.onerror = (err) => reject(err);
      }; reader.onerror = (err) => reject(err);
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || quantity === '' || !batch) return;
    setUploading(true);
    let image_url = editingProduct ? editingProduct.image_url : 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=80';
    try {
      if (imageFile) {
        let fileToUpload = await compressImage(imageFile, 800, 800, 0.75);
        const fileName = `${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('product-images').upload(fileName, fileToUpload, { upsert: false });
        if (upErr) { alert(`Erreur d'upload d'image`); setUploading(false); return; }
        const urlResponse = supabase.storage.from('product-images').getPublicUrl(fileName);
        image_url = urlResponse?.data?.publicUrl || urlResponse?.publicURL || image_url;
      }
      const parsedQty = parseInt(quantity) || 0;
      const parsedInitQty = initialQuantity !== '' ? parseInt(initialQuantity) : (editingProduct ? editingProduct.initial_quantity : parsedQty);
      const payload = { 
        name: name.trim(), description: description.trim(), price: parseFloat(price), cost_price: parseFloat(costPrice) || 0,
        image_url, quantity: parsedQty, initial_quantity: parsedInitQty || parsedQty, stock_status: parsedQty > 0, 
        batch_reference: batch.trim().toUpperCase(), is_archived: false
      };
      if (editingProduct) {
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
      } else {
        await supabase.from('products').insert([payload]);
      }
      setName(''); setPrice(''); setCostPrice(''); setQuantity(''); setInitialQuantity(''); setDescription(''); setBatch(''); setImageFile(null); setEditingProduct(null);
      await fetchProducts();
    } catch (err) { alert(`Erreur: ${err.message}`); } finally { setUploading(false); }
  };

  const handleUpdateStockVolume = async (id, newVolume) => {
    const parsedVolume = parseInt(newVolume) || 0;
    const { error } = await supabase.from('products').update({ quantity: parsedVolume, stock_status: parsedVolume > 0 }).eq('id', id);
    if (!error) setProducts(prev => prev.map(p => String(p.id) === String(id) ? { ...p, quantity: parsedVolume, stock_status: parsedVolume > 0 } : p));
  };

  // Metrics logic
  const getProductSoldQty = (productId) => customers.reduce((acc, c) => acc + (c.history || []).reduce((hAcc, h) => {
    if (h.items && Array.isArray(h.items)) {
      const item = h.items.find(i => String(i.productId) === String(productId)); return hAcc + (item ? (parseInt(item.qty) || 0) : 0);
    } else { return String(h.productId) === String(productId) ? hAcc + (parseInt(h.qty) || 1) : hAcc; }
  }, 0), 0);

  const getTrueInitialQty = (p) => p.initial_quantity !== undefined && p.initial_quantity !== null && p.initial_quantity !== '' ? parseInt(p.initial_quantity) : (parseInt(p.quantity) || 0) + getProductSoldQty(p.id);

  const uniqueBatches = ['ALL', ...new Set(products.map(p => p.batch_reference).filter(Boolean))];
  const filteredProducts = products.filter(p => (selectedBatchFilter === 'ALL' || p.batch_reference === selectedBatchFilter) && (showArchived ? p.is_archived : !p.is_archived));
  const frontPageProducts = products.filter(p => !p.is_archived && !isNaN(parseInt(p.quantity)) && parseInt(p.quantity) >= 1);

  return (
    <div className="bg-[#f5f5f7] text-gray-900 font-sans p-3 sm:p-6 lg:p-8 relative">
      
      {/* TRANSFER MODAL */}
      {transferModalOpen && transferProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
              <h3 className="font-black text-orange-800 flex items-center gap-2">
                <Truck className="w-5 h-5" /> Distribuer au Succursale
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={executeStockTransfer} className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Produit</p>
                <p className="font-black text-lg text-gray-900">{transferProduct.name}</p>
                <p className="text-sm text-green-600 font-bold mt-1">Stock au Siège (HQ): {transferProduct.quantity} pcs</p>
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">Sélectionner la Succursale</label>
                <select value={transferBranchId} onChange={e => setTransferBranchId(e.target.value)} className="w-full border p-3 text-sm rounded-lg bg-gray-50 font-bold" required>
                  <option value="">-- Choisir une succursale --</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name} - {b.location}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">Quantité à Envoyer</label>
                <input type="number" min="1" max={transferProduct.quantity} value={transferQty} onChange={e => setTransferQty(e.target.value)} className="w-full border p-3 text-lg font-black text-center rounded-lg" required />
              </div>

              <button type="submit" className="w-full bg-[#f68b1e] text-white py-3 rounded-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-4 hover:bg-orange-600">
                <Truck className="w-5 h-5" /> Confirmer le Transfert
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER NAVIGATION */}
        {isAdmin ? (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button onClick={() => setActiveTab('inventory')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 ${activeTab === 'inventory' ? 'bg-[#f68b1e] text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Package className="w-4 h-4" /> <span>HQ Stock (Master)</span>
              </button>
              <button onClick={() => setActiveTab('branches')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 ${activeTab === 'branches' ? 'bg-[#f68b1e] text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Store className="w-4 h-4" /> <span>Succursales</span>
              </button>
              <button onClick={() => setActiveTab('customers')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 ${activeTab === 'customers' ? 'bg-[#f68b1e] text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Users className="w-4 h-4" /> <span>Ventes Globales</span>
              </button>
              <button onClick={() => setActiveTab('staff')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 ${activeTab === 'staff' ? 'bg-[#f68b1e] text-white' : 'bg-gray-100 text-gray-600'}`}>
                <UserCog className="w-4 h-4" /> <span>Personnel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex justify-between items-center">
            <h2 className="text-sm font-black uppercase text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#f68b1e]" /> 
              Caisse - {currentUser.full_name}
            </h2>
            {/* Show branch name if assigned */}
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Store className="w-3 h-3" /> Branch Active
            </span>
          </div>
        )}

        {/* TAB: BRANCHES MANAGEMENT (NEW) */}
        {isAdmin && activeTab === 'branches' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
               <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700 mb-4 pb-2 border-b">
                 Créer une Succursale
               </h3>
               <form onSubmit={handleSaveBranch} className="space-y-3.5">
                 <div>
                   <label className="text-[10px] text-gray-400 font-bold block mb-1">Nom de la Boutique</label>
                   <input type="text" placeholder="Ex: Boutique Abidjan Sud" value={branchName} onChange={e => setBranchName(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required />
                 </div>
                 <div>
                   <label className="text-[10px] text-gray-400 font-bold block mb-1">Emplacement / Ville</label>
                   <input type="text" placeholder="Ex: Marcory, Zone 4" value={branchLocation} onChange={e => setBranchLocation(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" />
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white text-xs py-3 rounded-lg font-bold uppercase tracking-wider flex justify-center items-center gap-2">
                   <Store className="w-4 h-4" /> Ajouter Succursale
                 </button>
               </form>
             </div>

             <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700 pb-3 border-b flex items-center gap-2">
                 <MapPin className="w-4 h-4 text-gray-400" /> Réseau de Boutiques
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                 {branches.map(b => (
                   <div key={b.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50 flex items-start gap-4 shadow-xs">
                     <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                       <Store className="w-6 h-6" />
                     </div>
                     <div>
                       <h4 className="font-black text-sm text-gray-900">{b.name}</h4>
                       <p className="text-xs text-gray-500 font-medium mt-1">{b.location || 'Emplacement non défini'}</p>
                     </div>
                   </div>
                 ))}
                 {branches.length === 0 && (
                   <div className="col-span-full text-center py-8 text-gray-400 text-xs">
                     Aucune succursale enregistrée.
                   </div>
                 )}
               </div>
             </div>
           </div>
        )}

        {/* TAB: INVENTORY (HQ) */}
        {isAdmin && activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
              {/* Existing Add Product Form (Unchanged) */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700">
                  {editingProduct ? 'Modifier le produit (HQ)' : 'Ajouter un produit (HQ)'}
                </h3>
              </div>
              <form onSubmit={handleSaveProduct} className="space-y-3.5">
                <input type="text" placeholder="Nom du produit" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required />
                <input type="text" placeholder="Batch Reference (e.g., BATCH-A)" value={batch} onChange={e => setBatch(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg uppercase" required />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Prix Achat</label>
                    <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Prix Vente</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Qté Achetée</label>
                    <input type="number" value={initialQuantity} onChange={e => setInitialQuantity(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Stock HQ</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required />
                  </div>
                </div>
                <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg h-16" />
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full text-xs text-gray-500" />
                <button type="submit" disabled={uploading} className="w-full bg-[#f68b1e] text-white text-xs py-3 rounded-lg font-bold uppercase tracking-wider">
                  {uploading ? 'Traitement...' : 'Sauvegarder HQ Stock'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700 flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-orange-600" /> Master Stock (Siège)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 font-bold border-b">
                      <th className="p-2.5">Image</th>
                      <th className="p-2.5">Article</th>
                      <th className="p-2.5 text-center">Stock HQ</th>
                      <th className="p-2.5 text-center">Distribution</th>
                      <th className="p-2.5 text-center">Éditer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="p-2.5"><img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-lg border" /></td>
                        <td className="p-2.5 font-extrabold">{p.name}</td>
                        <td className="p-2.5 text-center">
                          <span className="bg-gray-100 px-2 py-1 rounded font-black text-sm">{p.quantity}</span>
                        </td>
                        <td className="p-2.5 text-center">
                           <button 
                            onClick={() => { setTransferProduct(p); setTransferModalOpen(true); }}
                            className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-green-200 transition-colors mx-auto"
                            title="Envoyer au Succursale"
                           >
                             <Truck className="w-3.5 h-3.5" /> Transfert
                           </button>
                        </td>
                        <td className="p-2.5 text-center">
                          <button onClick={() => { /* Start Edit Logic */ }} className="text-blue-500"><Pencil className="w-4 h-4 inline" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STAFF MANAGEMENT (UPDATED) */}
        {isAdmin && activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700">Créer/Modifier Personnel</h3>
              </div>
              <form onSubmit={handleSaveStaff} className="space-y-3.5">
                <input type="text" placeholder="Nom Complet" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required />
                <input type="text" placeholder="Code PIN (Connexion)" value={staffPin} onChange={e => setStaffPin(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg" required />
                
                <select value={staffRole} onChange={e => setStaffRole(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg bg-gray-50 font-bold">
                  <option value="staff">Staff (Vendeur)</option>
                  <option value="admin">Admin (Accès Total)</option>
                </select>

                {/* NEW: Branch Assignment Dropdown */}
                {staffRole === 'staff' && (
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">Affecter à une Succursale</label>
                    <select value={staffBranchId} onChange={e => setStaffBranchId(e.target.value)} className="w-full border p-2.5 text-xs rounded-lg bg-gray-50 font-bold">
                      <option value="">-- HQ ou Aucune --</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}

                <button type="submit" className="w-full bg-[#f68b1e] text-white text-xs py-3 rounded-lg font-bold uppercase tracking-wider">
                  Enregistrer
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700 pb-3 border-b flex items-center">
                Liste du Personnel & Affectations
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 font-bold border-b">
                      <th className="p-2.5">Nom</th>
                      <th className="p-2.5">Rôle</th>
                      <th className="p-2.5">Succursale (Branch)</th>
                      <th className="p-2.5 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffList.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="p-2.5 font-bold">{s.full_name}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.role === 'admin' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}`}>
                            {s.role}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold text-blue-600">
                          {s.branches ? s.branches.name : 'Siège (HQ)'}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {s.is_active ? 'Actif' : 'Off'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* TAB 2: SALES LEDGER & CART */}
        {activeTab === 'customers' && (
          <SalesLedger 
            products={products}
            customers={customers}
            fetchProducts={fetchProducts}
            fetchCustomers={fetchCustomersFromSupabase}
            supabase={supabase}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}
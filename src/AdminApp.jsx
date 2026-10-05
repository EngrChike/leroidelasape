import React, { useState, useEffect } from 'react';
import { Package, Users, Eye, Pencil, Archive, RotateCcw, X, Layers, UserCog, Key, Store, MapPin, Filter, ArrowRightLeft, Send, Check, AlertCircle, ArrowRight, Store as StoreIcon } from 'lucide-react';
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
  const [viewingBranch, setViewingBranch] = useState(''); // Default to '' (HQ Main Stock) instead of 'ALL'
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);

  // Storefront Specific Branch Filter State (Default to HQ '')
  const [storefrontBranch, setStorefrontBranch] = useState('');
  const [storefrontModalOpen, setStorefrontModalOpen] = useState(false);

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

  // Batch Transfer States
  const [batchTransferOpen, setBatchTransferOpen] = useState(false);
  const [batchTransferStep, setBatchTransferStep] = useState('select'); // 'select' or 'review'
  const [selectedBatchItems, setSelectedBatchItems] = useState({}); // { [productId]: { product, selected, targetBranch, qty } }
  const [batchTransferLoading, setBatchTransferLoading] = useState(false);
  const [batchTransferError, setBatchTransferError] = useState('');

  // Determine active branch context (Admin sees what they filter, Staff sees only their branch)
  const activeBranchId = isAdmin ? viewingBranch : (currentUser?.branch_id || '');

  useEffect(() => {
    fetchBranchesFromSupabase();
    fetchProducts();
    fetchCustomersFromSupabase();
    if (isAdmin) {
      fetchStaffFromSupabase();
    }
  }, [isAdmin, activeTab]);

  // Automatically sync product creation branch with the admin workspace view
  useEffect(() => {
    if (viewingBranch !== 'ALL') {
      setProductBranch(viewingBranch);
    } else {
      setProductBranch('');
    }
  }, [viewingBranch]);

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

  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.75) => { 
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

  // --- BATCH TRANSFER HANDLERS ---
  const handleOpenBatchTransfer = () => {
    setSelectedBatchItems({});
    setBatchTransferStep('select');
    setBatchTransferError('');
    setBatchTransferOpen(true);
  };

  const handleToggleBatchItemSelect = (product) => {
    setSelectedBatchItems(prev => {
      const copy = { ...prev };
      if (copy[product.id]?.selected) {
        delete copy[product.id];
      } else {
        copy[product.id] = {
          product,
          selected: true,
          targetBranch: branches[0]?.id || '',
          qty: 1
        };
      }
      return copy;
    });
  };

  const handleUpdateBatchItemDetail = (productId, field, value) => {
    setSelectedBatchItems(prev => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: value
        }
      };
    });
  };

  const handleProceedToBatchReview = () => {
    const activeItems = Object.values(selectedBatchItems).filter(item => item.selected);
    if (activeItems.length === 0) {
      setBatchTransferError("Veuillez sélectionner au moins un produit à transférer.");
      return;
    }

    for (const item of activeItems) {
      if (!item.targetBranch) {
        setBatchTransferError("Veuillez assigner une succursale de destination pour tous les produits sélectionnés.");
        return;
      }
      if (item.qty <= 0) {
        setBatchTransferError(`La quantité pour "${item.product.name}" doit être supérieure à 0.`);
        return;
      }
      if (item.qty > item.product.quantity) {
        setBatchTransferError(`Quantité insuffisante au QG pour "${item.product.name}" (Max: ${item.product.quantity}).`);
        return;
      }
    }

    setBatchTransferError('');
    setBatchTransferStep('review');
  };

  const handleConfirmBatchTransfer = async () => {
    setBatchTransferLoading(true);
    setBatchTransferError('');

    try {
      const activeItems = Object.values(selectedBatchItems).filter(item => item.selected);

      for (const item of activeItems) {
        const { product, targetBranch, qty } = item;

        // 1. Deduct quantity from HQ product
        const newHqQty = product.quantity - qty;
        const { error: hqError } = await supabase
          .from('products')
          .update({ quantity: newHqQty, stock_status: newHqQty > 0 })
          .eq('id', product.id);

        if (hqError) throw hqError;

        // 2. Check if product already exists in target branch
        const existingTargetProd = products.find(p => 
          p.name.trim().toLowerCase() === product.name.trim().toLowerCase() && 
          String(p.batch_reference || '') === String(product.batch_reference || '') && 
          String(p.branch_id || '') === String(targetBranch)
        );

        if (existingTargetProd) {
          const newTargetQty = (existingTargetProd.quantity || 0) + Number(qty);
          const { error: updateError } = await supabase
            .from('products')
            .update({ quantity: newTargetQty, stock_status: newTargetQty > 0 })
            .eq('id', existingTargetProd.id);

          if (updateError) throw updateError;
        } else {
          const { id, created_at, ...prodData } = product;
          prodData.branch_id = targetBranch;
          prodData.quantity = Number(qty);
          prodData.initial_quantity = Number(qty);
          prodData.stock_status = true;
          const { error: insertError } = await supabase.from('products').insert([prodData]);

          if (insertError) throw insertError;
        }
      }

      setBatchTransferLoading(false);
      setBatchTransferOpen(false);
      await fetchProducts();
      alert("Transfert groupé effectué avec succès !");
    } catch (err) {
      console.error("Batch transfer error:", err);
      setBatchTransferError(`Erreur lors du transfert: ${err.message}`);
      setBatchTransferLoading(false);
    }
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
  const contextProducts = products.filter(p => activeBranchId === 'ALL' || String(p.branch_id || '') === String(activeBranchId));
  const contextCustomers = customers.filter(c => activeBranchId === 'ALL' || String(c.branch_id || '') === String(activeBranchId));

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

  // Storefront filtered products based on storefrontBranch (Default HQ)
  const storefrontFilteredProducts = products.filter(p => {
    if (p.is_archived || parseInt(p.quantity) < 1) return false;
    if (storefrontBranch === '') {
      return !p.branch_id || p.branch_id === '';
    }
    return String(p.branch_id || '') === String(storefrontBranch);
  });

  const hqProductsForTransfer = products.filter(p => (!p.branch_id || p.branch_id === '') && !p.is_archived && parseInt(p.quantity) > 0);
  const activeSelectedArray = Object.values(selectedBatchItems).filter(i => i.selected);

  return (
    <div className="bg-[#f8f9fa] text-gray-800 font-sans p-3 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER NAVIGATION */}
        {isAdmin ? (
          <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('inventory')} className={`px-5 py-2.5 text-sm font-semibold rounded-lg flex items-center space-x-2 transition-all ${activeTab === 'inventory' ? 'bg-[#0f172a] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}><Package className="w-4 h-4" /> <span>Inventory</span></button>
                <button onClick={() => setActiveTab('customers')} className={`px-5 py-2.5 text-sm font-semibold rounded-lg flex items-center space-x-2 transition-all ${activeTab === 'customers' ? 'bg-[#0f172a] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}><Users className="w-4 h-4" /> <span>Sales Ledger</span></button>
                <button onClick={() => setActiveTab('storefront')} className={`px-5 py-2.5 text-sm font-semibold rounded-lg flex items-center space-x-2 transition-all ${activeTab === 'storefront' ? 'bg-[#0f172a] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}><Eye className="w-4 h-4" /> <span>Storefront</span></button>
                <button onClick={() => setActiveTab('staff')} className={`px-5 py-2.5 text-sm font-semibold rounded-lg flex items-center space-x-2 transition-all ${activeTab === 'staff' ? 'bg-[#0f172a] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}><UserCog className="w-4 h-4" /> <span>Staff</span></button>
                <button onClick={() => setActiveTab('branches')} className={`px-5 py-2.5 text-sm font-semibold rounded-lg flex items-center space-x-2 transition-all ${activeTab === 'branches' ? 'bg-[#0f172a] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}><Store className="w-4 h-4" /> <span>Branches & HQ</span></button>
              </div>

              {/* ADMIN BRANCH GLOBAL FILTER */}
              <div className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg bg-gray-50 shadow-sm">
                <Filter className="w-4 h-4 text-gray-500" />
                <select value={viewingBranch} onChange={(e) => setViewingBranch(e.target.value)} className="bg-transparent text-sm font-semibold text-gray-800 outline-none cursor-pointer">
                  <option value="">HQ Main Stock (Default)</option>
                  <option value="ALL">Global View (All Branches)</option>
                  <option value="divider" disabled>──────────</option>
                  {branches.map(b => <option key={b.id} value={b.id}>View: {b.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0f172a]" /> Staff Portal - {currentUser.full_name}
            </h2>
            <span className="text-xs font-semibold bg-blue-50 px-3 py-1.5 rounded-full text-blue-700 border border-blue-100">
              {branches.find(b => b.id === currentUser.branch_id)?.name || 'HQ / Main'}
            </span>
          </div>
        )}

        {/* FINANCIAL METRICS */}
        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-500">Total Asset Cost</p>
              <p className="text-lg font-bold text-gray-900 mt-2">{totalInventoryCost.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-500">Expected Revenue</p>
              <p className="text-lg font-bold text-indigo-700 mt-2">{totalExpectedRevenue.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-500">Current Stock Value</p>
              <p className="text-lg font-bold text-emerald-600 mt-2">{totalPotentialRetail.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-500">Cost of Goods Sold</p>
              <p className="text-lg font-bold text-purple-700 mt-2">{totalGoodsSoldCost.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-500">Total Sales (Rev)</p>
              <p className="text-lg font-bold text-blue-700 mt-2">{totalSalesRevenue.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow border-t-4 border-t-red-500">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-500">Outstanding Debts</p>
              <p className="text-lg font-bold text-red-600 mt-2">{totalOutstandingDebt.toLocaleString()} FCFA</p>
            </div>
          </div>
        )}

        {/* TAB 1: BRANCHES & HQ MANAGEMENT */}
        {isAdmin && activeTab === 'branches' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
              <h3 className="font-semibold text-sm uppercase text-gray-800 mb-5 pb-3 border-b">
                {editingBranch ? 'Edit Branch' : 'Create New Branch'}
              </h3>
              <form onSubmit={handleSaveBranch} className="space-y-4">
                <input type="text" placeholder="Branch Name (e.g. Abidjan Center)" value={branchName} onChange={e => setBranchName(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" required />
                <input type="text" placeholder="Location Details" value={branchLocation} onChange={e => setBranchLocation(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" />
                <button type="submit" className="w-full bg-[#0f172a] hover:bg-gray-800 text-white text-sm py-3 rounded-lg font-semibold transition-colors">
                  {editingBranch ? 'Update Branch' : 'Register Branch'}
                </button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-sm uppercase text-gray-800 pb-4 border-b flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-500"/> Branch Network</h3>
              <div className="overflow-hidden mt-4 rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 font-semibold text-gray-600">Branch Name</th>
                      <th className="p-4 font-semibold text-gray-600">Location</th>
                      <th className="p-4 font-semibold text-center text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {branches.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{b.name}</td>
                        <td className="p-4 text-gray-500">{b.location || 'N/A'}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => { setEditingBranch(b); setBranchName(b.name); setBranchLocation(b.location); }} className="text-blue-600 font-medium hover:text-blue-800">Edit Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY MANAGEMENT */}
        {isAdmin && activeTab === 'inventory' && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* INVENTORY FORM */}
            <div className="xl:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
              <div className="flex justify-between items-center mb-5 pb-3 border-b">
                <h3 className="font-semibold text-sm uppercase text-gray-800">{editingProduct ? 'Edit Product' : 'Add to Stock'}</h3>
                {editingProduct && <button onClick={handleCancelEditProduct} className="text-gray-400 hover:text-red-500 text-xs flex font-medium"><X className="w-4 h-4 mr-1" /> Cancel</button>}
              </div>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Assign To Workspace</label>
                  <select value={productBranch} onChange={e => setProductBranch(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg bg-gray-50 font-medium text-gray-900 focus:ring-2 focus:ring-[#0f172a] outline-none" required>
                    <option value="">HQ Main Stock</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <input type="text" placeholder="Product Name" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" required />
                <input type="text" placeholder="Batch Reference" value={batch} onChange={e => setBatch(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg uppercase focus:ring-2 focus:ring-[#0f172a] outline-none" required />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Cost Price</label><input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" required /></div>
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Retail Price</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Init Quantity</label><input type="number" value={initialQuantity} onChange={e => setInitialQuantity(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" /></div>
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Current Stock</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" required /></div>
                </div>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100" />
                <button type="submit" disabled={uploading} className="w-full bg-[#0f172a] hover:bg-gray-800 text-white text-sm py-3 rounded-lg font-semibold transition-colors">{uploading ? 'Uploading...' : 'Save Inventory Entry'}</button>
              </form>
            </div>

            {/* INVENTORY TABLE */}
            <div className="xl:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row justify-between pb-4 border-b gap-4 items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm uppercase text-gray-800 flex items-center"><Layers className="w-5 h-5 mr-2 text-indigo-600" /> Inventory Catalogue</h3>
                  <button 
                    onClick={handleOpenBatchTransfer}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-xs transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Transfert Groupé (QG → Succursales)</span>
                  </button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowArchived(!showArchived)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">{showArchived ? 'View Active' : 'View Archived'}</button>
                  <select value={selectedBatchFilter} onChange={e => setSelectedBatchFilter(e.target.value)} className="border border-gray-300 px-3 py-2 text-xs rounded-lg bg-white font-medium focus:ring-2 focus:ring-[#0f172a] outline-none">{uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}</select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Location</th>
                      <th className="p-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Item Name</th>
                      <th className="p-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Cost / Retail Price</th>
                      <th className="p-4 font-semibold text-center text-gray-600 text-xs uppercase tracking-wider">Stock Lvl</th>
                      <th className="p-4 font-semibold text-center text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className={`${p.is_archived ? 'opacity-50 bg-gray-50' : 'bg-white hover:bg-gray-50/80'} transition-colors`}>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${!p.branch_id ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                            {branches.find(b => b.id === p.branch_id)?.name || 'HQ Main'}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                          <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover border border-gray-200 shadow-sm" />
                          <div>
                            <p>{p.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Batch: {p.batch_reference}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">Cost: {p.cost_price?.toLocaleString()} FCFA</span>
                            <span className="font-semibold text-emerald-600">Retail: {p.price?.toLocaleString()} FCFA</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <input type="number" value={p.quantity} onChange={(e) => handleUpdateStockVolume(p.id, e.target.value)} className="w-16 border border-gray-300 text-center p-1.5 rounded-md font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center space-x-3">
                            <button title="Edit Product" onClick={() => handleStartEditProduct(p)} className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button title={p.is_archived ? "Restore" : "Archive"} onClick={() => handleArchiveProduct(p.id, !p.is_archived)} className={`${p.is_archived ? "text-emerald-500 hover:text-emerald-700" : "text-gray-400 hover:text-red-500"} transition-colors`}><Archive className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SALES LEDGER */}
        {activeTab === 'customers' && (
          <SalesLedger 
            products={contextProducts}
            customers={contextCustomers}
            fetchProducts={fetchProducts}
            fetchCustomers={fetchCustomersFromSupabase}
            supabase={supabase}
            currentUser={currentUser}
            activeBranchId={activeBranchId} 
          />
        )}

        {/* TAB 4: STOREFRONT PREVIEW */}
        {isAdmin && activeTab === 'storefront' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-sm uppercase text-gray-800 flex items-center space-x-2">
                  <StoreIcon className="w-4 h-4 text-indigo-600" />
                  <span>Storefront Display Catalogue</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Affichage actuel : <span className="font-bold text-black">{storefrontBranch === '' ? 'Headquarter (HQ Main Stock)' : (branches.find(b => b.id === storefrontBranch)?.name || 'Succursale')}</span>
                </p>
              </div>

              <button 
                onClick={() => setStorefrontModalOpen(true)}
                className="bg-zinc-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-xs transition-all"
              >
                <Store className="w-4 h-4 text-indigo-400" />
                <span>Choisir la Succursale (Storefront)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
              {storefrontFilteredProducts.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-xs font-semibold">Aucun produit disponible dans cette succursale pour le moment.</p>
                </div>
              ) : (
                storefrontFilteredProducts.map(p => (
                  <div key={p.id} className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 block w-fit">
                      {branches.find(b => b.id === p.branch_id)?.name || 'HQ Main'}
                    </span>
                    <img src={p.image_url} alt="" className="w-full h-40 object-cover rounded-lg mb-4" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight">{p.name}</h4>
                    </div>
                    <div className="mt-4 flex justify-between items-end border-t border-gray-100 pt-3">
                      <span className="font-bold text-emerald-600 text-sm">{p.price?.toLocaleString()} FCFA</span>
                      <span className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md">Qty: {p.quantity}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: STAFF MANAGEMENT */}
        {isAdmin && activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
              <h3 className="font-semibold text-sm uppercase text-gray-800 mb-5 border-b pb-3">{editingStaff ? 'Edit Staff Profile' : 'Register New Staff'}</h3>
              <form onSubmit={handleSaveStaff} className="space-y-4">
                <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Full Name</label><input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" required /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Access PIN Code</label><input type="text" value={staffPin} onChange={e => setStaffPin(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" required /></div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Branch Assignment</label>
                  <select value={staffBranch} onChange={e => setStaffBranch(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none">
                    <option value="">Global / HQ Access</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">System Role</label>
                  <select value={staffRole} onChange={e => setStaffRole(e.target.value)} className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none">
                    <option value="staff">Sales Agent (Staff)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-[#0f172a] hover:bg-gray-800 text-white py-3 text-sm rounded-lg font-semibold transition-colors mt-2">{editingStaff ? 'Update Profile' : 'Create Account'}</button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-sm uppercase text-gray-800 pb-4 border-b">Authorized Personnel</h3>
              <div className="overflow-hidden mt-4 rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 font-semibold text-gray-600">Personnel Name</th>
                      <th className="p-4 font-semibold text-gray-600">Assignment</th>
                      <th className="p-4 font-semibold text-gray-600">Role</th>
                      <th className="p-4 font-semibold text-center text-gray-600">Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffList.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{s.full_name}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${!s.branch_id ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                            {branches.find(b => b.id === s.branch_id)?.name || 'HQ Main'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 capitalize">{s.role}</td>
                        <td className="p-4 text-center space-x-4">
                          <button onClick={() => { if(!verifyAdminPinBeforeAction()) return; setEditingStaff(s); setStaffName(s.full_name); setStaffPin(s.pin_code); setStaffRole(s.role); setStaffBranch(s.branch_id || ''); }} className="text-blue-600 font-medium hover:text-blue-800">Edit</button>
                          <button onClick={() => handleToggleStaffStatus(s.id, s.is_active)} className={`font-medium ${s.is_active ? 'text-red-500 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-800'}`}>{s.is_active ? 'Revoke' : 'Activate'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STOREFRONT BRANCH SELECTOR MODAL */}
      {storefrontModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-zinc-900 text-white px-6 py-4 flex justify-between items-center border-b border-zinc-800">
              <h3 className="text-sm font-black uppercase tracking-tight flex items-center space-x-2">
                <Store className="w-4 h-4 text-indigo-400" />
                <span>Sélectionner la Succursale Storefront</span>
              </h3>
              <button onClick={() => setStorefrontModalOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-gray-500 mb-2">
                Choisissez quelle succursale ou le QG afficher sur la page d'accueil de la vitrine (Storefront).
              </p>

              {/* Headquarter Option */}
              <div 
                onClick={() => setStorefrontBranch('')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  storefrontBranch === '' ? 'border-indigo-600 bg-indigo-50/40 shadow-xs' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div>
                  <h4 className="text-xs font-extrabold text-black uppercase">Headquarter (HQ Main Stock)</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Par défaut (Stock principal du QG)</p>
                </div>
                {storefrontBranch === '' && <Check className="w-5 h-5 text-indigo-600" />}
              </div>

              {/* Branch Options */}
              {branches.map(b => (
                <div 
                  key={b.id}
                  onClick={() => setStorefrontBranch(b.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    String(storefrontBranch) === String(b.id) ? 'border-indigo-600 bg-indigo-50/40 shadow-xs' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-extrabold text-black uppercase">{b.name}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">{b.location || 'Succursale'}</p>
                  </div>
                  {String(storefrontBranch) === String(b.id) && <Check className="w-5 h-5 text-indigo-600" />}
                </div>
              ))}
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setStorefrontModalOpen(false)}
                className="bg-black hover:bg-zinc-800 text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Appliquer (OK)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-PRODUCT BATCH TRANSFER MODAL */}
      {batchTransferOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-zinc-900 text-white px-6 py-4 flex justify-between items-center border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-black tracking-tight uppercase flex items-center space-x-2">
                  <Send className="w-5 h-5 text-indigo-400" />
                  <span>Transfert Groupé QG vers Succursales</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {batchTransferStep === 'select' ? '1. Sélectionnez les produits, les quantités et la succursale de destination' : '2. Vérifiez et confirmez le transfert'}
                </p>
              </div>
              <button onClick={() => setBatchTransferOpen(false)} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Alert */}
            {batchTransferError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{batchTransferError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {batchTransferStep === 'select' ? (
                <div>
                  <p className="text-xs text-gray-500 mb-4 font-medium">
                    Cochez les produits du QG que vous souhaitez transférer. Indiquez la quantité et la succursale cible pour chacun.
                  </p>

                  {hqProductsForTransfer.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-gray-400 text-xs">Aucun produit disponible au QG pour le transfert.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {hqProductsForTransfer.map(product => {
                        const isSelected = !!selectedBatchItems[product.id]?.selected;
                        const itemData = selectedBatchItems[product.id] || {};

                        return (
                          <div 
                            key={product.id} 
                            className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                              isSelected ? 'border-indigo-600 bg-indigo-50/30 shadow-xs' : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3 w-full md:w-auto flex-1">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleBatchItemSelect(product)}
                                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                              />
                              <img src={product.image_url} alt="" className="w-11 h-11 object-cover rounded-lg border bg-gray-100 shrink-0" />
                              <div>
                                <h4 className="text-sm font-extrabold text-black line-clamp-1">{product.name}</h4>
                                <p className="text-[11px] text-gray-500">Stock QG disponible: <span className="font-bold text-black">{product.quantity}</span> | Prix: {product.price?.toLocaleString()} FCFA</p>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="flex items-center space-x-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Destination</span>
                                  <select 
                                    value={itemData.targetBranch}
                                    onChange={(e) => handleUpdateBatchItemDetail(product.id, 'targetBranch', e.target.value)}
                                    className="bg-white border border-gray-300 rounded-lg text-xs py-1.5 px-2 focus:outline-none focus:border-indigo-600 font-medium"
                                  >
                                    <option value="">-- Choisir --</option>
                                    {branches.map(b => (
                                      <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex flex-col w-24">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Quantité</span>
                                  <input 
                                    type="number" 
                                    min="1"
                                    max={product.quantity}
                                    value={itemData.qty}
                                    onChange={(e) => handleUpdateBatchItemDetail(product.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                                    className="bg-white border border-gray-300 rounded-lg text-xs py-1.5 px-2 focus:outline-none focus:border-indigo-600 font-bold text-center"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                    <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Résumé du transfert groupé</h3>
                    <p className="text-xs text-indigo-700 mt-0.5">Veuillez vérifier les éléments sélectionnés ci-dessous et cliquer sur Confirmer pour valider.</p>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200">
                          <th className="p-3">Produit</th>
                          <th className="p-3">Quantité</th>
                          <th className="p-3">Succursale Cible</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {activeSelectedArray.map((item, idx) => {
                          const targetBranchObj = branches.find(b => b.id === item.targetBranch);
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3 flex items-center space-x-2.5">
                                <img src={item.product.image_url} alt="" className="w-8 h-8 object-cover rounded border" />
                                <span className="font-bold text-black">{item.product.name}</span>
                              </td>
                              <td className="p-3 font-black text-indigo-600">-{item.qty} unités</td>
                              <td className="p-3 font-medium text-gray-800">{targetBranchObj ? targetBranchObj.name : item.targetBranch}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              {batchTransferStep === 'review' ? (
                <button 
                  onClick={() => setBatchTransferStep('select')} 
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  ← Retour aux sélections
                </button>
              ) : (
                <span className="text-xs text-gray-500 font-bold">
                  {activeSelectedArray.length} produit(s) sélectionné(s)
                </span>
              )}

              <div className="flex space-x-3 ml-auto">
                <button 
                  onClick={() => setBatchTransferOpen(false)} 
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>

                {batchTransferStep === 'select' ? (
                  <button 
                    onClick={handleProceedToBatchReview}
                    disabled={activeSelectedArray.length === 0}
                    className="bg-black hover:bg-zinc-800 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5"
                  >
                    <span>Vérifier le transfert</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button 
                    onClick={handleConfirmBatchTransfer}
                    disabled={batchTransferLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 shadow-md"
                  >
                    {batchTransferLoading ? (
                      <span>Transfert en cours...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirmer et Transférer (OK)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
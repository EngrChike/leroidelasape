import React, { useState, useEffect } from 'react';
import { Package, Users, Eye, UserCog, Store, Filter } from 'lucide-react';
import SalesLedger from './SalesLedger';
import InventoryManagement from './InventoryManagement';
import BranchManagement from './BranchManagement';
import StorefrontPreview from './StorefrontPreview';
import BatchTransferModal from './BatchTransferModal';
import StaffManagement from './StaffManagement';

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

  // Storefront Specific Branch Filter State (Persisted in localStorage for live client view)
  const [storefrontBranch, setStorefrontBranch] = useState(() => {
    return localStorage.getItem('donchike_storefront_branch') || '';
  });
  const [storefrontModalOpen, setStorefrontModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('donchike_storefront_branch', storefrontBranch);
  }, [storefrontBranch]);

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
        branch_id: productBranch || null,
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

  // Storefront filtered products based on storefrontBranch (Default HQ, switches dynamically)
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
          <BranchManagement 
            branches={branches}
            branchName={branchName}
            setBranchName={setBranchName}
            branchLocation={branchLocation}
            setBranchLocation={setBranchLocation}
            editingBranch={editingBranch}
            setEditingBranch={setEditingBranch}
            handleSaveBranch={handleSaveBranch}
          />
        )}

        {/* TAB 2: INVENTORY MANAGEMENT */}
        {isAdmin && activeTab === 'inventory' && (
          <InventoryManagement 
            branches={branches}
            productBranch={productBranch}
            setProductBranch={setProductBranch}
            name={name}
            setName={setName}
            batch={batch}
            setBatch={setBatch}
            costPrice={costPrice}
            setCostPrice={setCostPrice}
            price={price}
            setPrice={setPrice}
            initialQuantity={initialQuantity}
            setInitialQuantity={setInitialQuantity}
            quantity={quantity}
            setQuantity={setQuantity}
            setImageFile={setImageFile}
            handleSaveProduct={handleSaveProduct}
            uploading={uploading}
            editingProduct={editingProduct}
            handleCancelEditProduct={handleCancelEditProduct}
            handleOpenBatchTransfer={handleOpenBatchTransfer}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            selectedBatchFilter={selectedBatchFilter}
            setSelectedBatchFilter={setSelectedBatchFilter}
            uniqueBatches={uniqueBatches}
            filteredProducts={filteredProducts}
            handleUpdateStockVolume={handleUpdateStockVolume}
            handleStartEditProduct={handleStartEditProduct}
            handleArchiveProduct={handleArchiveProduct}
          />
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
          <StorefrontPreview 
            branches={branches}
            storefrontBranch={storefrontBranch}
            setStorefrontBranch={setStorefrontBranch}
            storefrontModalOpen={storefrontModalOpen}
            setStorefrontModalOpen={setStorefrontModalOpen}
            storefrontFilteredProducts={storefrontFilteredProducts}
          />
        )}

        {/* TAB 5: STAFF MANAGEMENT */}
        {isAdmin && activeTab === 'staff' && (
          <StaffManagement 
            supabase={supabase}
            branches={branches}
            staffList={staffList}
            fetchStaffFromSupabase={fetchStaffFromSupabase}
            verifyAdminPinBeforeAction={verifyAdminPinBeforeAction}
            staffName={staffName}
            setStaffName={setStaffName}
            staffPin={staffPin}
            setStaffPin={setStaffPin}
            staffRole={staffRole}
            setStaffRole={setStaffRole}
            staffBranch={staffBranch}
            setStaffBranch={setStaffBranch}
            editingStaff={editingStaff}
            setEditingStaff={setEditingStaff}
            handleSaveStaff={handleSaveStaff}
            handleToggleStaffStatus={handleToggleStaffStatus}
          />
        )}
      </div>

      {/* MULTI-PRODUCT BATCH TRANSFER MODAL */}
      <BatchTransferModal 
        batchTransferOpen={batchTransferOpen}
        setBatchTransferOpen={setBatchTransferOpen}
        batchTransferStep={batchTransferStep}
        setBatchTransferStep={setBatchTransferStep}
        batchTransferError={batchTransferError}
        hqProductsForTransfer={hqProductsForTransfer}
        selectedBatchItems={selectedBatchItems}
        handleToggleBatchItemSelect={handleToggleBatchItemSelect}
        handleUpdateBatchItemDetail={handleUpdateBatchItemDetail}
        branches={branches}
        activeSelectedArray={activeSelectedArray}
        handleProceedToBatchReview={handleProceedToBatchReview}
        handleConfirmBatchTransfer={handleConfirmBatchTransfer}
        batchTransferLoading={batchTransferLoading}
      />
    </div>
  );
}
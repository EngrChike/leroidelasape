import React, { useState, useEffect } from 'react';
import { Package, Users, Eye, Pencil, Archive, X, Layers, UserCog, Store, MapPin, Filter, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
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
  const [viewingBranch, setViewingBranch] = useState('ALL'); 
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);

  // Form states (Branch, Staff, Product)
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [editingBranch, setEditingBranch] = useState(null);

  const [staffName, setStaffName] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffRole, setStaffRole] = useState('staff');
  const [staffBranch, setStaffBranch] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);

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

  // Stock Transfer States
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState(null);
  const [transferToBranch, setTransferToBranch] = useState('');
  const [transferQty, setTransferQty] = useState('');

  // Active Context
  const activeBranchId = isAdmin ? viewingBranch : (currentUser?.branch_id || 'ALL');

  useEffect(() => {
    fetchBranchesFromSupabase();
    fetchProducts();
    fetchCustomersFromSupabase();
    if (isAdmin) fetchStaffFromSupabase();
  }, [isAdmin, activeTab]);

  const fetchBranchesFromSupabase = async () => {
    const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true });
    if (!error && data) setBranches(data);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error && data) setProducts(data);
  };

  const fetchCustomersFromSupabase = async () => {
    const { data, error } = await supabase.from('customers').select('*, customer_history(*)').order('created_at', { ascending: false });
    if (!error && data) {
      const formatted = data.map(c => ({
        id: c.id, name: c.name, phone: c.phone, branch_id: c.branch_id, totalDebt: c.total_debt || 0,
        history: c.customer_history ? c.customer_history.sort((a, b) => b.id - a.id) : []
      }));
      setCustomers(formatted);
    }
  };

  const fetchStaffFromSupabase = async () => {
    const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (!error && data) setStaffList(data);
  };

  const verifyAdminPinBeforeAction = () => {
    const adminPin = prompt("Admin Security: Enter your PIN to confirm:");
    if (!adminPin) return false;
    const verifyingAdmin = staffList.find(s => s.pin_code === adminPin && s.role === 'admin' && s.is_active);
    if (!verifyingAdmin) { alert("Invalid PIN."); return false; }
    return true;
  };

  // --- STOCK TRANSFER LOGIC ---
  const handleOpenTransfer = (product) => {
    setTransferProduct(product);
    setTransferQty('');
    setTransferToBranch('');
    setTransferModalOpen(true);
  };

  const executeStockTransfer = async (e) => {
    e.preventDefault();
    const qtyToTransfer = parseInt(transferQty);
    
    if (!transferToBranch || qtyToTransfer <= 0 || qtyToTransfer > transferProduct.quantity) {
      alert("Invalid transfer details or insufficient stock.");
      return;
    }

    try {
      // 1. Deduct from source product
      const newSourceQty = transferProduct.quantity - qtyToTransfer;
      await supabase.from('products').update({ quantity: newSourceQty }).eq('id', transferProduct.id);

      // 2. Check if this exact product/batch already exists in the destination branch
      const { data: existingDestProd } = await supabase.from('products')
        .select('*')
        .eq('name', transferProduct.name)
        .eq('batch_reference', transferProduct.batch_reference)
        .eq('branch_id', transferToBranch === 'HQ' ? null : transferToBranch)
        .single();

      if (existingDestProd) {
        // Add to existing branch stock
        await supabase.from('products').update({ 
          quantity: existingDestProd.quantity + qtyToTransfer 
        }).eq('id', existingDestProd.id);
      } else {
        // Create new inventory row for the branch
        const { id, created_at, branch_id, ...productData } = transferProduct;
        const newProd = {
          ...productData,
          branch_id: transferToBranch === 'HQ' ? null : transferToBranch,
          quantity: qtyToTransfer,
          initial_quantity: qtyToTransfer
        };
        await supabase.from('products').insert([newProd]);
      }

      alert('Stock successfully transferred!');
      setTransferModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert(`Transfer failed: ${err.message}`);
    }
  };

  // --- SAVE HANDLERS ---
  const handleSaveBranch = async (e) => {
    e.preventDefault();
    const payload = { name: branchName.trim(), location: branchLocation.trim() };
    if (editingBranch) {
      await supabase.from('branches').update(payload).eq('id', editingBranch.id);
    } else {
      await supabase.from('branches').insert([payload]);
    }
    setBranchName(''); setBranchLocation(''); setEditingBranch(null); fetchBranchesFromSupabase();
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    const payload = { full_name: staffName.trim(), pin_code: staffPin.trim(), role: staffRole, branch_id: staffBranch || null, is_active: true };
    if (editingStaff) await supabase.from('staff').update(payload).eq('id', editingStaff.id);
    else await supabase.from('staff').insert([payload]);
    setStaffName(''); setStaffPin(''); setStaffRole('staff'); setStaffBranch(''); setEditingStaff(null); fetchStaffFromSupabase();
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setUploading(true);
    let image_url = editingProduct ? editingProduct.image_url : 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=80';
    try {
      const parsedQty = parseInt(quantity) || 0;
      const parsedInitQty = initialQuantity !== '' ? parseInt(initialQuantity) : (editingProduct ? editingProduct.initial_quantity : parsedQty);

      const payload = { 
        name: name.trim(), price: parseFloat(price), cost_price: parseFloat(costPrice) || 0,
        image_url, quantity: parsedQty, initial_quantity: parsedInitQty || parsedQty,
        stock_status: parsedQty > 0, batch_reference: batch.trim().toUpperCase(),
        branch_id: productBranch || null, is_archived: false
      };

      if (editingProduct) await supabase.from('products').update(payload).eq('id', editingProduct.id);
      else await supabase.from('products').insert([payload]);

      handleCancelEditProduct(); await fetchProducts();
    } catch (err) { alert(`Error: ${err.message}`); } finally { setUploading(false); }
  };

  const handleCancelEditProduct = () => {
    setEditingProduct(null); setName(''); setPrice(''); setCostPrice(''); setQuantity(''); 
    setInitialQuantity(''); setBatch(''); setImageFile(null); setProductBranch('');
  };

  const handleUpdateStockVolume = async (id, newVolume) => {
    const parsedVolume = parseInt(newVolume) || 0;
    await supabase.from('products').update({ quantity: parsedVolume }).eq('id', id);
    fetchProducts();
  };

  // --- CONTEXT FILTERING ---
  const contextProducts = products.filter(p => activeBranchId === 'ALL' || String(p.branch_id || 'HQ') === String(activeBranchId));
  const contextCustomers = customers.filter(c => activeBranchId === 'ALL' || String(c.branch_id || 'HQ') === String(activeBranchId));

  const uniqueBatches = ['ALL', ...new Set(contextProducts.map(p => p.batch_reference).filter(Boolean))];
  const filteredProducts = contextProducts.filter(p => {
    const matchesBatch = selectedBatchFilter === 'ALL' || p.batch_reference === selectedBatchFilter;
    return matchesBatch && (showArchived ? p.is_archived : !p.is_archived);
  });

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER NAVIGATION - MATURE DESIGN */}
        {isAdmin ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'inventory', icon: Package, label: 'Inventory' },
                { id: 'customers', icon: Users, label: 'Sales Ledger' },
                { id: 'storefront', icon: Eye, label: 'Storefront' },
                { id: 'staff', icon: UserCog, label: 'Staff' },
                { id: 'branches', icon: Store, label: 'Branches' }
              ].map(tab => (
                <button 
                  key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <tab.icon className="w-4 h-4" /> <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 border border-slate-200 p-2.5 rounded-xl bg-slate-50 w-full md:w-auto">
              <Filter className="w-5 h-5 text-slate-400" />
              <select value={viewingBranch} onChange={(e) => setViewingBranch(e.target.value)} className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer w-full">
                <option value="ALL">Global View (All Branches)</option>
                <option value="HQ">Headquarters (HQ)</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" /> Sales Terminal - {currentUser.full_name}
            </h2>
            <span className="text-sm font-semibold bg-indigo-50 px-4 py-1.5 rounded-full text-indigo-700">
              {branches.find(b => b.id === currentUser.branch_id)?.name || 'Headquarters'}
            </span>
          </div>
        )}

        {/* TAB 2: INVENTORY & TRANSFERS */}
        {isAdmin && activeTab === 'inventory' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* ADD / EDIT FORM */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Stock'}</h3>
                {editingProduct && <button onClick={handleCancelEditProduct} className="text-slate-400 hover:text-red-500 text-sm flex items-center"><X className="w-4 h-4 mr-1" /> Cancel</button>}
              </div>
              <form onSubmit={handleSaveProduct} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Assign Location</label>
                  <select value={productBranch} onChange={e => setProductBranch(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl bg-slate-50 font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none" required>
                    <option value="">-- Select Branch or HQ --</option>
                    <option value="HQ">Headquarters (HQ)</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Product Details</label>
                  <input type="text" placeholder="Product Name" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl mb-3 focus:ring-2 focus:ring-slate-900 outline-none" required />
                  <input type="text" placeholder="Batch Reference (e.g. BATCH-01)" value={batch} onChange={e => setBatch(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl uppercase focus:ring-2 focus:ring-slate-900 outline-none" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Cost Price</label>
                    <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Selling Price</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Current Qty</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" required />
                  </div>
                </div>

                <button type="submit" disabled={uploading} className="w-full bg-slate-900 text-white text-sm py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                  {uploading ? 'Processing...' : 'Save Product'}
                </button>
              </form>
            </div>

            {/* PRODUCT CATALOGUE */}
            <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-4">
                <h3 className="font-bold text-base text-slate-800 flex items-center"><Layers className="w-5 h-5 mr-2 text-slate-900" /> Master Inventory</h3>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button onClick={() => setShowArchived(!showArchived)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200">
                    {showArchived ? 'View Active' : 'View Archived'}
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="p-4 rounded-tl-xl">Location</th>
                      <th className="p-4">Item & Batch</th>
                      <th className="p-4">Cost / Sell</th>
                      <th className="p-4 text-center">Stock</th>
                      <th className="p-4 text-right rounded-tr-xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${!p.branch_id ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {!p.branch_id || p.branch_id === 'HQ' ? 'HQ' : branches.find(b => b.id === p.branch_id)?.name}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{p.batch_reference}</p>
                        </td>
                        <td className="p-4 text-slate-600">
                          {p.cost_price?.toLocaleString()} / <span className="text-slate-900 font-bold">{p.price?.toLocaleString()}</span>
                        </td>
                        <td className="p-4 text-center">
                          <input type="number" value={p.quantity} onChange={(e) => handleUpdateStockVolume(p.id, e.target.value)} className="w-20 border border-slate-300 text-center p-2 rounded-lg font-bold bg-white focus:ring-2 focus:ring-slate-900 outline-none" />
                        </td>
                        <td className="p-4 text-right space-x-3">
                          <button onClick={() => handleOpenTransfer(p)} className="text-slate-600 hover:text-indigo-600 font-medium text-sm inline-flex items-center" title="Transfer Stock">
                            <ArrowRightLeft className="w-4 h-4 mr-1"/> Transfer
                          </button>
                          <button onClick={() => { setEditingProduct(p); setName(p.name); setPrice(p.price); setCostPrice(p.cost_price); setQuantity(p.quantity); setBatch(p.batch_reference); setProductBranch(p.branch_id || 'HQ'); }} className="text-blue-600 hover:text-blue-800"><Pencil className="w-4 h-4 inline" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TRANSFER MODAL OVERLAY --- */}
        {transferModalOpen && transferProduct && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900 flex items-center"><ArrowRightLeft className="w-5 h-5 mr-2 text-indigo-600"/> Transfer Stock</h3>
                <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={executeStockTransfer} className="p-6 space-y-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Transferring Item:</p>
                  <p className="font-bold text-slate-900">{transferProduct.name} <span className="text-indigo-600 text-sm">({transferProduct.batch_reference})</span></p>
                  <p className="text-sm font-medium mt-2">Available: <span className="text-emerald-600">{transferProduct.quantity} units</span></p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Destination Branch</label>
                  <select value={transferToBranch} onChange={e => setTransferToBranch(e.target.value)} className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required>
                    <option value="">-- Select Destination --</option>
                    {(!transferProduct.branch_id || transferProduct.branch_id === 'HQ') ? null : <option value="HQ">Headquarters (HQ)</option>}
                    {branches.filter(b => b.id !== transferProduct.branch_id).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Quantity to Transfer</label>
                  <input type="number" max={transferProduct.quantity} value={transferQty} onChange={e => setTransferQty(e.target.value)} className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm">
                    Confirm Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: SALES LEDGER / BUY & SALE (Passes strict branch context) */}
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
        
        {/* TAB 5: STAFF MANAGEMENT */}
        {isAdmin && activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-base text-slate-800 mb-6 pb-4 border-b border-slate-100">{editingStaff ? 'Edit Staff Profile' : 'Register New Staff'}</h3>
              <form onSubmit={handleSaveStaff} className="space-y-4">
                <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Full Name</label><input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" required /></div>
                <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Security PIN</label><input type="text" value={staffPin} onChange={e => setStaffPin(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" required /></div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Branch Assignment</label>
                  <select value={staffBranch} onChange={e => setStaffBranch(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl focus:ring-2 focus:ring-slate-900 outline-none">
                    <option value="">Global Access (Headquarters)</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">System Role</label>
                  <select value={staffRole} onChange={e => setStaffRole(e.target.value)} className="w-full border border-slate-300 p-3 text-sm rounded-xl focus:ring-2 focus:ring-slate-900 outline-none">
                    <option value="staff">Sales Rep</option><option value="admin">Administrator</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 text-sm rounded-xl font-bold mt-2 hover:bg-slate-800 transition-colors">{editingStaff ? 'Update Profile' : 'Create Profile'}</button>
              </form>
            </div>
            
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-base text-slate-800 pb-4 border-b border-slate-100">Team Directory</h3>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead><tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200"><th className="p-4 rounded-tl-xl">Name</th><th className="p-4">Location</th><th className="p-4">Role</th><th className="p-4 text-right rounded-tr-xl">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                          {s.is_active && <CheckCircle2 className="w-4 h-4 text-emerald-500"/>} {s.full_name}
                        </td>
                        <td className="p-4 font-medium text-slate-600">
                          <span className="bg-slate-100 px-3 py-1 rounded-full text-xs">{branches.find(b => b.id === s.branch_id)?.name || 'Headquarters'}</span>
                        </td>
                        <td className="p-4 capitalize text-slate-500">{s.role}</td>
                        <td className="p-4 text-right space-x-3">
                          <button onClick={() => { if(!verifyAdminPinBeforeAction()) return; setEditingStaff(s); setStaffName(s.full_name); setStaffPin(s.pin_code); setStaffRole(s.role); setStaffBranch(s.branch_id || ''); }} className="text-blue-600 font-medium hover:underline">Edit</button>
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
    </div>
  );
}
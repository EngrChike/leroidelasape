import React from 'react';
import { MapPin } from 'lucide-react';

export default function BranchManagement({
  branches,
  branchName,
  setBranchName,
  branchLocation,
  setBranchLocation,
  editingBranch,
  setEditingBranch,
  handleSaveBranch
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
        <h3 className="font-semibold text-sm uppercase text-gray-800 mb-5 pb-3 border-b">
          {editingBranch ? 'Edit Branch' : 'Create New Branch'}
        </h3>
        <form onSubmit={handleSaveBranch} className="space-y-4">
          <input 
            type="text" 
            placeholder="Branch Name (e.g. Abidjan Center)" 
            value={branchName} 
            onChange={e => setBranchName(e.target.value)} 
            className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" 
            required 
          />
          <input 
            type="text" 
            placeholder="Location Details" 
            value={branchLocation} 
            onChange={e => setBranchLocation(e.target.value)} 
            className="w-full border border-gray-300 p-3 text-sm rounded-lg focus:ring-2 focus:ring-[#0f172a] outline-none" 
          />
          <button 
            type="submit" 
            className="w-full bg-[#0f172a] hover:bg-gray-800 text-white text-sm py-3 rounded-lg font-semibold transition-colors"
          >
            {editingBranch ? 'Update Branch' : 'Register Branch'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-sm uppercase text-gray-800 pb-4 border-b flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-gray-500" /> Branch Network
        </h3>
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
                    <button 
                      onClick={() => { setEditingBranch(b); setBranchName(b.name); setBranchLocation(b.location); }} 
                      className="text-blue-600 font-medium hover:text-blue-800"
                    >
                      Edit Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Plus, Wallet, Pencil, Trash2, X } from "lucide-react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "ASET",
    type: "",
    description: ""
  });

  const fetchAccounts = () => {
    setLoading(true);
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setAccounts(d);
        } else {
          setAccounts([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setAccounts([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenAddModal = () => {
    setEditingAccountId(null);
    setFormData({ code: "", name: "", category: "ASET", type: "", description: "" });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (account: any) => {
    setEditingAccountId(account.id);
    setFormData({
      code: account.code || "",
      name: account.name || "",
      category: account.category || "ASET",
      type: account.type || "",
      description: account.description || ""
    });
    setIsModalOpen(true);
  };

  const handleDeleteAccount = async (account: any) => {
    if (!confirm(`Are you sure you want to delete account "${account.code} - ${account.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        fetchAccounts();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete account");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting account.");
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingAccountId ? `/api/accounts/${editingAccountId}` : "/api/accounts";
    const method = editingAccountId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingAccountId(null);
        setFormData({ code: "", name: "", category: "ASET", type: "", description: "" });
        fetchAccounts();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to save account"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save account.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Chart of Accounts</h2>
            <p className="text-sm text-slate-500">Bagan Akun Standar (PSAK)</p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} className="mr-2" />
          Add Account
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Name</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {Array.isArray(accounts) && accounts.length > 0 ? (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{account.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{account.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${account.category === 'ASET' ? 'bg-emerald-100 text-emerald-800' : 
                          account.category === 'LIABILITAS' ? 'bg-red-100 text-red-800' : 
                          account.category === 'EKUITAS' ? 'bg-purple-100 text-purple-800' :
                          account.category === 'PENDAPATAN' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {account.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{account.type || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(account)}
                        className="inline-flex items-center p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Account"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        className="inline-flex items-center p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsModalOpen(false)} 
          />
          
          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all border border-slate-100">
              <div>
                <div className="text-left">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold leading-6 text-slate-900" id="modal-title">
                      {editingAccountId ? "Edit Account" : "Add New Account"}
                    </h3>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div>
                    <form onSubmit={handleSaveAccount} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Account Code</label>
                        <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Account Name</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Category</label>
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                          <option value="ASET">ASET</option>
                          <option value="LIABILITAS">LIABILITAS</option>
                          <option value="EKUITAS">EKUITAS</option>
                          <option value="PENDAPATAN">PENDAPATAN</option>
                          <option value="BEBAN">BEBAN</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Type (Optional)</label>
                        <input type="text" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                      </div>
                      <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse space-y-2 sm:space-y-0">
                        <button type="submit" className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                          {editingAccountId ? "Update Account" : "Save Account"}
                        </button>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-full inline-flex justify-center rounded-lg border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, ArrowRightLeft, Save, X, Pencil, Filter, RotateCcw } from "lucide-react";

type FormValues = {
  date: string;
  description: string;
  category: string;
  originalCurrency: string;
  baseCurrency: string;
  exchangeRate: number;
  entries: {
    accountId: string;
    type: "DEBIT" | "CREDIT";
    amountOriginal: number;
  }[];
};

const MONTHS = [
  { value: "ALL", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters State
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const { register, control, handleSubmit, watch, reset } = useForm<FormValues>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      description: "",
      category: "",
      originalCurrency: "IDR",
      baseCurrency: "IDR",
      exchangeRate: 1.0,
      entries: [
        { accountId: "", type: "DEBIT", amountOriginal: 0 },
        { accountId: "", type: "CREDIT", amountOriginal: 0 },
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries"
  });

  const watchEntries = watch("entries") || [];
  const exchangeRate = watch("exchangeRate") || 1;
  
  const totalDebit = watchEntries.reduce((sum, entry) => entry?.type === "DEBIT" ? sum + (Number(entry?.amountOriginal) || 0) : sum, 0);
  const totalCredit = watchEntries.reduce((sum, entry) => entry?.type === "CREDIT" ? sum + (Number(entry?.amountOriginal) || 0) : sum, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  useEffect(() => {
    fetch("/api/accounts")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAccounts(data);
        } else {
          setAccounts([]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch accounts:", err);
        setAccounts([]);
      });
  }, []);

  const fetchTransactions = (m = selectedMonth, y = selectedYear) => {
    const params = new URLSearchParams({ limit: "100" });
    if (m !== "ALL") params.append("month", m);
    if (y !== "ALL") params.append("year", y);

    fetch(`/api/transactions?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTransactions(data);
        } else {
          setTransactions([]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch transactions:", err);
        setTransactions([]);
      });
  };

  useEffect(() => {
    fetchTransactions(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const handleOpenCreateModal = () => {
    setEditingTxId(null);
    reset({
      date: new Date().toISOString().split('T')[0],
      description: "",
      category: "",
      originalCurrency: "IDR",
      baseCurrency: "IDR",
      exchangeRate: 1.0,
      entries: [
        { accountId: "", type: "DEBIT", amountOriginal: 0 },
        { accountId: "", type: "CREDIT", amountOriginal: 0 },
      ]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: any) => {
    setEditingTxId(tx.id);
    const formattedEntries = Array.isArray(tx.journalEntries) && tx.journalEntries.length > 0
      ? tx.journalEntries.map((e: any) => ({
          accountId: e.accountId,
          type: e.type,
          amountOriginal: Number(e.amountOriginal) || 0
        }))
      : [
          { accountId: "", type: "DEBIT", amountOriginal: 0 },
          { accountId: "", type: "CREDIT", amountOriginal: 0 },
        ];

    reset({
      date: new Date(tx.date).toISOString().split('T')[0],
      description: tx.description || "",
      category: tx.category || "",
      originalCurrency: tx.originalCurrency || "IDR",
      baseCurrency: tx.baseCurrency || "IDR",
      exchangeRate: Number(tx.exchangeRate) || 1.0,
      entries: formattedEntries
    });
    setIsModalOpen(true);
  };

  const handleDeleteTx = async (txId: string) => {
    if (!confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTransactions();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete transaction");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting transaction.");
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!isBalanced) {
      alert("Total Debit must equal Total Credit.");
      return;
    }
    
    setSubmitting(true);
    try {
      const url = editingTxId ? `/api/transactions/${editingTxId}` : "/api/transactions";
      const method = editingTxId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingTxId(null);
        reset();
        fetchTransactions();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save transaction");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ArrowRightLeft size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Journal Entries</h2>
            <p className="text-sm text-slate-500">Record and edit financial transactions</p>
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} className="mr-2" />
          New Transaction
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-slate-500 font-medium text-sm">
            <Filter size={18} className="text-indigo-600" />
            <span>Filter Periode:</span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">Semua Tahun</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {(selectedMonth !== "ALL" || selectedYear !== "ALL") && (
            <button
              onClick={() => {
                setSelectedMonth("ALL");
                setSelectedYear("ALL");
              }}
              className="flex items-center space-x-1 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            >
              <RotateCcw size={14} />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="text-slate-900 font-bold">{transactions.length}</span> transaksi
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Amount (Base)</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Created By</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {Array.isArray(transactions) && transactions.length > 0 ? (
              transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {new Date(tx.date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{tx.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: tx.baseCurrency || 'IDR' }).format(tx.amountBase)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{tx.createdBy?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(tx)}
                      className="inline-flex items-center p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Transaction"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTx(tx.id)}
                      className="inline-flex items-center p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Transaction"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No transactions found. Click &quot;New Transaction&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Dark Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsModalOpen(false)} 
          />
          
          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <div className="relative z-10 w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all border border-slate-100">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingTxId ? "Edit Journal Entry" : "Create Journal Entry"}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input type="date" {...register("date", { required: true })} className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input type="text" {...register("description", { required: true })} className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Transaction description" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                      <input type="text" {...register("originalCurrency")} className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Exchange Rate</label>
                      <input type="number" step="0.0001" {...register("exchangeRate", { valueAsNumber: true })} className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 grid grid-cols-12 gap-4">
                    <div className="col-span-5 text-sm font-semibold text-slate-700">Account</div>
                    <div className="col-span-3 text-sm font-semibold text-slate-700">Debit / Credit</div>
                    <div className="col-span-3 text-sm font-semibold text-slate-700 text-right">Amount (Original)</div>
                    <div className="col-span-1"></div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 transition-colors">
                        <div className="col-span-5">
                          <select {...register(`entries.${index}.accountId` as const, { required: true })} className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option value="">Select Account</option>
                            {Array.isArray(accounts) && accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <select {...register(`entries.${index}.type` as const)} className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option value="DEBIT">Debit</option>
                            <option value="CREDIT">Credit</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input type="number" step="0.01" {...register(`entries.${index}.amountOriginal` as const, { valueAsNumber: true, required: true, min: 0 })} className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-right font-medium" />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <button type="button" onClick={() => append({ accountId: "", type: "DEBIT", amountOriginal: 0 })} className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                      <Plus size={16} className="mr-1" /> Add Line
                    </button>
                    <div className="flex space-x-8 text-sm">
                      <div className="flex flex-col items-end">
                        <span className="text-slate-500 mb-1">Total Debit</span>
                        <span className="font-bold text-slate-800">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalDebit * exchangeRate)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-slate-500 mb-1">Total Credit</span>
                        <span className={`font-bold ${isBalanced ? 'text-slate-800' : 'text-red-600'}`}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalCredit * exchangeRate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || !isBalanced} className="flex items-center px-5 py-2.5 bg-indigo-600 border border-transparent rounded-lg text-white font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save size={18} className="mr-2" />
                    {submitting ? "Saving..." : editingTxId ? "Update Transaction" : "Save Transaction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

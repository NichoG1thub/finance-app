"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState<{ kpi: any; monthlyData: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpi = data?.kpi || { totalPendapatan: 0, totalBeban: 0, labaBersih: 0, saldoKas: 0 };
  const monthlyData = data?.monthlyData || [];

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox title="Total Pendapatan (YTD)" value={kpi.totalPendapatan} icon={TrendingUp} color="text-emerald-500" bg="bg-emerald-50" />
        <KPIBox title="Total Beban (YTD)" value={kpi.totalBeban} icon={TrendingDown} color="text-red-500" bg="bg-red-50" />
        <KPIBox title="Laba/Rugi Bersih (YTD)" value={kpi.labaBersih} icon={DollarSign} color={kpi.labaBersih >= 0 ? "text-blue-500" : "text-red-500"} bg={kpi.labaBersih >= 0 ? "bg-blue-50" : "bg-red-50"} />
        <KPIBox title="Saldo Kas" value={kpi.saldoKas} icon={Wallet} color="text-purple-500" bg="bg-purple-50" />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Revenue vs Expense Trend (YTD)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp ${val / 1000000}M`} />
              <Tooltip 
                formatter={(value: any) => formatIDR(Number(value || 0))}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" name="Pendapatan" dataKey="pendapatan" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" name="Beban" dataKey="beban" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center transition-transform hover:scale-105 duration-200">
      <div className={`p-4 rounded-xl ${bg} ${color} mr-4`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-800">
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
        </p>
      </div>
    </div>
  );
}

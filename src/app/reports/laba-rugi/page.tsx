"use client";

import { useEffect, useState } from "react";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export default function LabaRugiPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = () => {
    setLoading(true);
    fetch(`/api/reports/laba-rugi?startDate=${startDate}&endDate=${endDate}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Laporan Laba Rugi", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28);
    
    let y = 40;
    
    doc.setFont("helvetica", "bold");
    doc.text("PENDAPATAN", 14, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    data.pendapatan.forEach((item: any) => {
      doc.text(`${item.code} - ${item.name}`, 20, y);
      doc.text(formatIDR(item.balance), 180, y, { align: "right" });
      y += 6;
    });
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total Pendapatan`, 20, y);
    doc.text(formatIDR(data.totalPendapatan), 180, y, { align: "right" });
    y += 12;
    
    doc.text("BEBAN", 14, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    data.beban.forEach((item: any) => {
      doc.text(`${item.code} - ${item.name}`, 20, y);
      doc.text(formatIDR(item.balance), 180, y, { align: "right" });
      y += 6;
    });
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total Beban`, 20, y);
    doc.text(formatIDR(data.totalBeban), 180, y, { align: "right" });
    y += 12;
    
    doc.text(`LABA (RUGI) BERSIH`, 14, y);
    doc.text(formatIDR(data.labaBersih), 180, y, { align: "right" });
    
    doc.save("Laba_Rugi.pdf");
  };

  const handleExportExcel = () => {
    const wsData = [
      ["Laporan Laba Rugi", ""],
      [`Periode: ${startDate} s/d ${endDate}`, ""],
      ["", ""],
      ["PENDAPATAN", ""],
      ...data.pendapatan.map((item: any) => [`${item.code} - ${item.name}`, item.balance]),
      ["Total Pendapatan", data.totalPendapatan],
      ["", ""],
      ["BEBAN", ""],
      ...data.beban.map((item: any) => [`${item.code} - ${item.name}`, item.balance]),
      ["Total Beban", data.totalBeban],
      ["", ""],
      ["LABA (RUGI) BERSIH", data.labaBersih]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laba Rugi");
    XLSX.writeFile(wb, "Laba_Rugi.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Laporan Laba Rugi</h2>
          <p className="text-sm text-slate-500">Income Statement (PSAK 1)</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button 
            onClick={fetchReport}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Filter
          </button>
          
          <button onClick={handleExportPDF} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center">
            <FileText size={16} className="mr-2" /> PDF
          </button>
          <button onClick={handleExportExcel} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center">
            <FileSpreadsheet size={16} className="mr-2" /> Excel
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">FinanceApp PT</h1>
            <h2 className="text-lg font-semibold text-slate-600">Laporan Laba Rugi</h2>
            <p className="text-sm text-slate-500">Periode: {startDate} s/d {endDate}</p>
          </div>

          <div className="space-y-6 text-sm">
            {/* PENDAPATAN */}
            <div>
              <h3 className="font-bold text-slate-800 text-base mb-2 border-b pb-2">PENDAPATAN</h3>
              <div className="space-y-2 pl-4">
                {data.pendapatan.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="text-slate-800 font-medium">{formatIDR(item.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t pl-4">
                <span className="font-bold text-slate-800">Total Pendapatan</span>
                <span className="font-bold text-slate-800">{formatIDR(data.totalPendapatan)}</span>
              </div>
            </div>

            {/* BEBAN */}
            <div>
              <h3 className="font-bold text-slate-800 text-base mb-2 border-b pb-2">BEBAN</h3>
              <div className="space-y-2 pl-4">
                {data.beban.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="text-slate-800 font-medium">{formatIDR(item.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t pl-4">
                <span className="font-bold text-slate-800">Total Beban</span>
                <span className="font-bold text-slate-800">{formatIDR(data.totalBeban)}</span>
              </div>
            </div>

            {/* LABA BERSIH */}
            <div className="flex justify-between mt-6 pt-4 border-t-2 border-slate-800">
              <span className="font-bold text-slate-800 text-base uppercase">Laba (Rugi) Bersih</span>
              <span className={`font-bold text-base ${data.labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatIDR(data.labaBersih)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

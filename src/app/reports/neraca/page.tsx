"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export default function NeracaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports/neraca?date=${asOfDate}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [asOfDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Laporan Posisi Keuangan (Neraca)", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Per Tanggal: ${asOfDate}`, 14, 28);
    
    let y = 40;
    
    // ASET
    doc.setFont("helvetica", "bold");
    doc.text("ASET", 14, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    data.aset.forEach((item: any) => {
      doc.text(`${item.code} - ${item.name}`, 20, y);
      doc.text(formatIDR(item.balance), 180, y, { align: "right" });
      y += 6;
    });
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total Aset`, 20, y);
    doc.text(formatIDR(data.totalAset), 180, y, { align: "right" });
    y += 12;
    
    // LIABILITAS
    doc.text("LIABILITAS", 14, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    data.liabilitas.forEach((item: any) => {
      doc.text(`${item.code} - ${item.name}`, 20, y);
      doc.text(formatIDR(item.balance), 180, y, { align: "right" });
      y += 6;
    });
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total Liabilitas`, 20, y);
    doc.text(formatIDR(data.totalLiabilitas), 180, y, { align: "right" });
    y += 12;

    // EKUITAS
    doc.text("EKUITAS", 14, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    data.ekuitas.forEach((item: any) => {
      doc.text(`${item.code} - ${item.name}`, 20, y);
      doc.text(formatIDR(item.balance), 180, y, { align: "right" });
      y += 6;
    });
    
    doc.text(`Laba Bersih Tahun Berjalan`, 20, y);
    doc.text(formatIDR(data.labaBersihTahunBerjalan), 180, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text(`Total Ekuitas`, 20, y);
    doc.text(formatIDR(data.totalEkuitas), 180, y, { align: "right" });
    y += 12;

    doc.text(`TOTAL LIABILITAS & EKUITAS`, 14, y);
    doc.text(formatIDR(data.totalLiabilitas + data.totalEkuitas), 180, y, { align: "right" });
    
    doc.save("Neraca.pdf");
  };

  const handleExportExcel = () => {
    const wsData = [
      ["Laporan Posisi Keuangan (Neraca)", ""],
      [`Per Tanggal: ${asOfDate}`, ""],
      ["", ""],
      ["ASET", ""],
      ...data.aset.map((item: any) => [`${item.code} - ${item.name}`, item.balance]),
      ["Total Aset", data.totalAset],
      ["", ""],
      ["LIABILITAS", ""],
      ...data.liabilitas.map((item: any) => [`${item.code} - ${item.name}`, item.balance]),
      ["Total Liabilitas", data.totalLiabilitas],
      ["", ""],
      ["EKUITAS", ""],
      ...data.ekuitas.map((item: any) => [`${item.code} - ${item.name}`, item.balance]),
      ["Laba Bersih Tahun Berjalan", data.labaBersihTahunBerjalan],
      ["Total Ekuitas", data.totalEkuitas],
      ["", ""],
      ["TOTAL LIABILITAS & EKUITAS", data.totalLiabilitas + data.totalEkuitas]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Neraca");
    XLSX.writeFile(wb, "Neraca.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Laporan Posisi Keuangan (Neraca)</h2>
          <p className="text-sm text-slate-500">Balance Sheet (PSAK 1)</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 font-medium">Per Tanggal:</span>
            <input 
              type="date" 
              value={asOfDate} 
              onChange={e => setAsOfDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
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
            <h2 className="text-lg font-semibold text-slate-600">Laporan Posisi Keuangan</h2>
            <p className="text-sm text-slate-500">Per Tanggal: {asOfDate}</p>
          </div>

          <div className="space-y-6 text-sm">
            {/* ASET */}
            <div>
              <h3 className="font-bold text-slate-800 text-base mb-2 border-b pb-2">ASET</h3>
              <div className="space-y-2 pl-4">
                {data.aset.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="text-slate-800 font-medium">{formatIDR(item.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t pl-4">
                <span className="font-bold text-slate-800">Total Aset</span>
                <span className="font-bold text-slate-800">{formatIDR(data.totalAset)}</span>
              </div>
            </div>

            {/* LIABILITAS */}
            <div>
              <h3 className="font-bold text-slate-800 text-base mb-2 border-b pb-2">LIABILITAS</h3>
              <div className="space-y-2 pl-4">
                {data.liabilitas.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="text-slate-800 font-medium">{formatIDR(item.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t pl-4">
                <span className="font-bold text-slate-800">Total Liabilitas</span>
                <span className="font-bold text-slate-800">{formatIDR(data.totalLiabilitas)}</span>
              </div>
            </div>

            {/* EKUITAS */}
            <div>
              <h3 className="font-bold text-slate-800 text-base mb-2 border-b pb-2">EKUITAS</h3>
              <div className="space-y-2 pl-4">
                {data.ekuitas.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="text-slate-800 font-medium">{formatIDR(item.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-blue-700">
                  <span className="font-medium">Laba Bersih Tahun Berjalan</span>
                  <span className="font-medium">{formatIDR(data.labaBersihTahunBerjalan)}</span>
                </div>
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t pl-4">
                <span className="font-bold text-slate-800">Total Ekuitas</span>
                <span className="font-bold text-slate-800">{formatIDR(data.totalEkuitas)}</span>
              </div>
            </div>

            {/* TOTAL */}
            <div className="flex justify-between mt-6 pt-4 border-t-2 border-slate-800 bg-slate-50 p-4 rounded-lg">
              <span className="font-bold text-slate-800 text-base uppercase">Total Liabilitas & Ekuitas</span>
              <span className="font-bold text-base text-slate-900">
                {formatIDR(data.totalLiabilitas + data.totalEkuitas)}
              </span>
            </div>
            
            {/* Validation */}
            {data.totalAset !== (data.totalLiabilitas + data.totalEkuitas) && (
              <div className="text-center text-xs text-red-500 mt-2">
                * Peringatan: Neraca tidak seimbang. Selisih: {formatIDR(Math.abs(data.totalAset - (data.totalLiabilitas + data.totalEkuitas)))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

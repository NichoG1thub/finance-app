import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AccountCategory, EntryType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get('year') || new Date().getFullYear().toString();
    const year = parseInt(yearStr);

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Fetch all accounts
    const accounts = await prisma.account.findMany({
      include: {
        journalEntries: {
          include: {
            transaction: true
          }
        }
      }
    });

    let totalPendapatan = 0;
    let totalBeban = 0;
    let saldoKas = 0;
    
    // Monthly data initialization
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i, 1).toLocaleString('id-ID', { month: 'short' }),
      pendapatan: 0,
      beban: 0
    }));

    accounts.forEach(acc => {
      let balance = 0;
      
      acc.journalEntries.forEach(entry => {
        const amount = Number(entry.amountBase);
        const entryDate = new Date(entry.transaction.date);
        const inCurrentYear = entryDate >= startDate && entryDate <= endDate;
        const monthIndex = entryDate.getMonth();

        if (acc.category === AccountCategory.ASET && acc.type === 'KAS') {
          balance += entry.type === EntryType.DEBIT ? amount : -amount;
        } else if (acc.category === AccountCategory.PENDAPATAN) {
          balance += entry.type === EntryType.CREDIT ? amount : -amount;
          if (inCurrentYear) {
            monthlyData[monthIndex].pendapatan += (entry.type === EntryType.CREDIT ? amount : -amount);
          }
        } else if (acc.category === AccountCategory.BEBAN) {
          balance += entry.type === EntryType.DEBIT ? amount : -amount;
          if (inCurrentYear) {
            monthlyData[monthIndex].beban += (entry.type === EntryType.DEBIT ? amount : -amount);
          }
        }
      });

      if (acc.category === AccountCategory.ASET && acc.type === 'KAS') {
        saldoKas += balance;
      } else if (acc.category === AccountCategory.PENDAPATAN) {
        totalPendapatan += balance; // Note: For KPI we might want just this year, but this gives all-time. Let's do all-time for Kas, current year for P/L.
      } else if (acc.category === AccountCategory.BEBAN) {
        totalBeban += balance;
      }
    });

    // Recalculate YTD P/L
    let ytdPendapatan = monthlyData.reduce((sum, m) => sum + m.pendapatan, 0);
    let ytdBeban = monthlyData.reduce((sum, m) => sum + m.beban, 0);

    return NextResponse.json({
      kpi: {
        totalPendapatan: ytdPendapatan,
        totalBeban: ytdBeban,
        labaBersih: ytdPendapatan - ytdBeban,
        saldoKas
      },
      monthlyData
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

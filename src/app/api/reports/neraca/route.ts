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
    const asOfDate = searchParams.get('date');

    const dateFilter = asOfDate ? { lte: new Date(asOfDate) } : undefined;
    const transactionFilter = dateFilter ? { date: dateFilter } : undefined;

    // Fetch all accounts
    const accounts = await prisma.account.findMany({
      include: {
        journalEntries: {
          where: transactionFilter ? { transaction: transactionFilter } : undefined
        }
      }
    });

    let totalAset = 0;
    let totalLiabilitas = 0;
    let totalEkuitas = 0;
    let totalPendapatan = 0;
    let totalBeban = 0;

    const aset: { id: string; code: string; name: string; balance: number }[] = [];
    const liabilitas: { id: string; code: string; name: string; balance: number }[] = [];
    const ekuitas: { id: string; code: string; name: string; balance: number }[] = [];

    accounts.forEach(acc => {
      let balance = 0;
      acc.journalEntries.forEach(entry => {
        const amount = Number(entry.amountBase);
        // Calculate balance based on normal balance rules
        if (acc.category === AccountCategory.ASET || acc.category === AccountCategory.BEBAN) {
          // Normal Debit
          balance += entry.type === EntryType.DEBIT ? amount : -amount;
        } else {
          // Normal Credit
          balance += entry.type === EntryType.CREDIT ? amount : -amount;
        }
      });

      if (acc.category === AccountCategory.ASET) {
        totalAset += balance;
        aset.push({ id: acc.id, code: acc.code, name: acc.name, balance });
      } else if (acc.category === AccountCategory.LIABILITAS) {
        totalLiabilitas += balance;
        liabilitas.push({ id: acc.id, code: acc.code, name: acc.name, balance });
      } else if (acc.category === AccountCategory.EKUITAS) {
        totalEkuitas += balance;
        ekuitas.push({ id: acc.id, code: acc.code, name: acc.name, balance });
      } else if (acc.category === AccountCategory.PENDAPATAN) {
        totalPendapatan += balance;
      } else if (acc.category === AccountCategory.BEBAN) {
        totalBeban += balance;
      }
    });

    const labaBersih = totalPendapatan - totalBeban;
    totalEkuitas += labaBersih; // Add Net Income to Equity to balance

    return NextResponse.json({
      aset,
      liabilitas,
      ekuitas,
      totalAset,
      totalLiabilitas,
      totalEkuitas,
      labaBersihTahunBerjalan: labaBersih
    });

  } catch (error) {
    console.error("Neraca Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

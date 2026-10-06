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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const transactionFilter = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : undefined;

    // Fetch all Pendapatan and Beban accounts with their entries
    const accounts = await prisma.account.findMany({
      where: {
        category: {
          in: [AccountCategory.PENDAPATAN, AccountCategory.BEBAN]
        }
      },
      include: {
        journalEntries: {
          where: transactionFilter ? { transaction: transactionFilter } : undefined
        }
      }
    });

    let totalPendapatan = 0;
    let totalBeban = 0;

    const pendapatan = accounts.filter(a => a.category === AccountCategory.PENDAPATAN).map(acc => {
      // Normal balance for Pendapatan is Credit
      const balance = acc.journalEntries.reduce((sum, entry) => {
        const amount = Number(entry.amountBase);
        return entry.type === EntryType.CREDIT ? sum + amount : sum - amount;
      }, 0);
      totalPendapatan += balance;
      return { id: acc.id, code: acc.code, name: acc.name, balance };
    });

    const beban = accounts.filter(a => a.category === AccountCategory.BEBAN).map(acc => {
      // Normal balance for Beban is Debit
      const balance = acc.journalEntries.reduce((sum, entry) => {
        const amount = Number(entry.amountBase);
        return entry.type === EntryType.DEBIT ? sum + amount : sum - amount;
      }, 0);
      totalBeban += balance;
      return { id: acc.id, code: acc.code, name: acc.name, balance };
    });

    const labaBersih = totalPendapatan - totalBeban;

    return NextResponse.json({
      pendapatan,
      beban,
      totalPendapatan,
      totalBeban,
      labaBersih
    });

  } catch (error) {
    console.error("Laba Rugi Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

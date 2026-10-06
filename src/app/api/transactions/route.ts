import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EntryType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const whereFilter: any = {};

    if (year && year !== 'ALL') {
      const y = parseInt(year);
      if (month && month !== 'ALL') {
        const m = parseInt(month) - 1; // 0-indexed month
        const startDate = new Date(Date.UTC(y, m, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        whereFilter.date = {
          gte: startDate,
          lte: endDate
        };
      } else {
        const startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
        whereFilter.date = {
          gte: startDate,
          lte: endDate
        };
      }
    } else if (month && month !== 'ALL') {
      // If month is specified without year, filter by month across years
      const currentYr = new Date().getFullYear();
      const m = parseInt(month) - 1;
      const startDate = new Date(Date.UTC(currentYr, m, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(currentYr, m + 1, 0, 23, 59, 59, 999));
      whereFilter.date = {
        gte: startDate,
        lte: endDate
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereFilter,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        journalEntries: {
          include: { account: true }
        },
        createdBy: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET transactions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'ACCOUNTANT')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { date, description, category, originalCurrency, baseCurrency, exchangeRate, attachmentUrl, entries } = body;

    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      return NextResponse.json({ error: "At least two journal entries are required for double-entry bookkeeping" }, { status: 400 });
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const parsedEntries = entries.map((entry: any) => {
      const amountOriginal = parseFloat(entry.amountOriginal);
      const amountBase = amountOriginal * parseFloat(exchangeRate);

      if (entry.type === EntryType.DEBIT) {
        totalDebit += amountBase;
      } else if (entry.type === EntryType.CREDIT) {
        totalCredit += amountBase;
      }

      return {
        accountId: entry.accountId,
        type: entry.type as EntryType,
        amountOriginal,
        amountBase
      };
    });

    // Handle floating point imprecision
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: `Transaction is not balanced. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}` }, { status: 400 });
    }

    const newTransaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        description,
        category,
        originalCurrency,
        baseCurrency,
        exchangeRate: parseFloat(exchangeRate),
        amountOriginal: parsedEntries.filter(e => e.type === EntryType.DEBIT).reduce((sum, e) => sum + e.amountOriginal, 0),
        amountBase: totalDebit,
        attachmentUrl,
        createdById: session.user.id,
        journalEntries: {
          create: parsedEntries
        }
      },
      include: {
        journalEntries: true
      }
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'Transaction',
        entityId: newTransaction.id,
        details: `Created transaction for ${description} with total ${totalDebit} ${baseCurrency}`
      }
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EntryType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        journalEntries: {
          include: { account: true }
        },
        createdBy: {
          select: { name: true, email: true }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("GET transaction by ID error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'ACCOUNTANT')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { date, description, category, originalCurrency, baseCurrency, exchangeRate, attachmentUrl, entries } = body;

    const existingTx = await prisma.transaction.findUnique({ where: { id } });
    if (!existingTx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

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

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: `Transaction is not balanced. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}` }, { status: 400 });
    }

    // Execute atomic transaction update
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // 1. Delete old journal entries
      await tx.journalEntry.deleteMany({
        where: { transactionId: id }
      });

      // 2. Update transaction & create new journal entries
      return await tx.transaction.update({
        where: { id },
        data: {
          date: new Date(date),
          description,
          category,
          originalCurrency: originalCurrency || "IDR",
          baseCurrency: baseCurrency || "IDR",
          exchangeRate: parseFloat(exchangeRate),
          amountOriginal: parsedEntries.filter(e => e.type === EntryType.DEBIT).reduce((sum, e) => sum + e.amountOriginal, 0),
          amountBase: totalDebit,
          attachmentUrl,
          journalEntries: {
            create: parsedEntries
          }
        },
        include: {
          journalEntries: true
        }
      });
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'Transaction',
        entityId: id,
        details: `Updated transaction ${id}: ${description} (${totalDebit} ${baseCurrency})`
      }
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error("PUT transaction error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'ACCOUNTANT')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existingTx = await prisma.transaction.findUnique({ where: { id } });
    if (!existingTx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'Transaction',
        entityId: id,
        details: `Deleted transaction ${id}: ${existingTx.description}`
      }
    });

    return NextResponse.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("DELETE transaction error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    const account = await prisma.account.findUnique({
      where: { id }
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("GET account error:", error);
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
    const { code, name, category, type, description } = body;

    const existingAccount = await prisma.account.findUnique({
      where: { id }
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check code uniqueness if code was modified
    if (code && code !== existingAccount.code) {
      const codeConflict = await prisma.account.findUnique({
        where: { code }
      });
      if (codeConflict) {
        return NextResponse.json({ error: "Account code already in use by another account" }, { status: 400 });
      }
    }

    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        code,
        name,
        category,
        type,
        description
      }
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'Account',
        entityId: id,
        details: `Updated account ${code} - ${name}`
      }
    });

    return NextResponse.json(updatedAccount);
  } catch (error) {
    console.error("PUT account error:", error);
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

    const existingAccount = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: { journalEntries: true }
        }
      }
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (existingAccount._count.journalEntries > 0) {
      return NextResponse.json({ 
        error: `Cannot delete account "${existingAccount.name}" because it is referenced in ${existingAccount._count.journalEntries} journal entries.` 
      }, { status: 400 });
    }

    await prisma.account.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'Account',
        entityId: id,
        details: `Deleted account ${existingAccount.code} - ${existingAccount.name}`
      }
    });

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("DELETE account error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

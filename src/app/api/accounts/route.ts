import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      orderBy: { code: 'asc' }
    });

    return NextResponse.json(accounts);
  } catch (error) {
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
    const { code, name, category, type, description } = body;

    const existingAccount = await prisma.account.findUnique({
      where: { code }
    });

    if (existingAccount) {
      return NextResponse.json({ error: "Account code already exists" }, { status: 400 });
    }

    const newAccount = await prisma.account.create({
      data: {
        code,
        name,
        category,
        type,
        description
      }
    });

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

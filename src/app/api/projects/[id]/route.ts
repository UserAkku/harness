import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    // @ts-expect-error
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project || project.userId !== userId) {
      return NextResponse.json({ message: 'Not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    // @ts-expect-error
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project || project.userId !== userId) {
      return NextResponse.json({ message: 'Not found or unauthorized' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

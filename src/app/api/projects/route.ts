import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // @ts-expect-error - NextAuth typings
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-expect-error - NextAuth typings
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const project = await prisma.project.upsert({
      where: { id: body.id },
      update: {
        name: body.name,
        description: body.description,
        canvasData: body.canvasData,
        tests: body.tests,
        faultScenarios: body.faultScenarios,
        simulationConfig: body.simulationConfig,
        updatedAt: new Date(),
      },
      create: {
        id: body.id,
        userId,
        name: body.name,
        description: body.description,
        canvasData: body.canvasData,
        tests: body.tests,
        faultScenarios: body.faultScenarios,
        simulationConfig: body.simulationConfig,
      }
    });

    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

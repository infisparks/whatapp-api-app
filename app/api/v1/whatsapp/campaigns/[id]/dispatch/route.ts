import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeCampaignDispatch } from '@/services/campaigns';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Execute dispatch batch
    const result = await executeCampaignDispatch(campaign.id, {
      batchSize: 50,
      delayBetweenBatchesMs: 150,
    });

    const updatedCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: {
        template: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      result,
      campaign: updatedCampaign,
      message: `Dispatched ${result.processed} messages (${result.successCount} sent, ${result.failedCount} failed)`,
    });
  } catch (error: any) {
    console.error('Dispatch campaign error:', error);
    return NextResponse.json({ error: error.message || 'Failed to dispatch campaign' }, { status: 500 });
  }
}

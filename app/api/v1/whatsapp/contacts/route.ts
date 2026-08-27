import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/services/messaging';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const optIn = searchParams.get('optIn'); // 'all', 'true', 'false'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = { organizationId: session.organizationId };

    if (optIn === 'true') where.optedIn = true;
    if (optIn === 'false') where.optedIn = false;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { messages: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phone, name, email, tags, customFields, optedIn = true } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = normalizePhoneNumber(phone);
    if (cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const contact = await prisma.contact.upsert({
      where: {
        organizationId_phone: {
          organizationId: session.organizationId,
          phone: cleanPhone,
        },
      },
      update: {
        name: name || undefined,
        email: email || undefined,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : tags || undefined,
        customFields: customFields ? JSON.stringify(customFields) : undefined,
        optedIn: Boolean(optedIn),
        optedInAt: optedIn ? new Date() : undefined,
        updatedAt: new Date(),
      },
      create: {
        organizationId: session.organizationId,
        phone: cleanPhone,
        name,
        email,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : tags,
        customFields: customFields ? JSON.stringify(customFields) : null,
        optedIn: Boolean(optedIn),
        optedInAt: optedIn ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save contact' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/services/messaging';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { contacts = [], tags = [] } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'No contact rows found in request' }, { status: 400 });
    }

    let inserted = 0;
    let skipped = 0;

    for (const row of contacts) {
      const rawPhone = row.phone || row.Phone || row.mobile || row.Mobile || row.phoneNumber || row['Phone Number'];
      if (!rawPhone) {
        skipped++;
        continue;
      }

      const cleanPhone = normalizePhoneNumber(String(rawPhone));
      if (cleanPhone.length < 8) {
        skipped++;
        continue;
      }

      const name = row.name || row.Name || row.fullName || row['Full Name'] || null;
      const email = row.email || row.Email || null;
      const optedIn = row.optedIn !== false && row.opt_in !== 'false' && row.OptIn !== 'false';

      // Custom fields (all other columns)
      const customFields: Record<string, any> = {};
      Object.keys(row).forEach((key) => {
        if (!['phone', 'Phone', 'mobile', 'Mobile', 'name', 'Name', 'email', 'Email', 'optedIn', 'opt_in'].includes(key)) {
          customFields[key] = row[key];
        }
      });

      try {
        await prisma.contact.upsert({
          where: {
            organizationId_phone: {
              organizationId: session.organizationId,
              phone: cleanPhone,
            },
          },
          update: {
            ...(name ? { name: String(name) } : {}),
            ...(email ? { email: String(email) } : {}),
            customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : undefined,
            tags: tags.length > 0 ? JSON.stringify(tags) : undefined,
            optedIn,
            optedInAt: optedIn ? new Date() : undefined,
            updatedAt: new Date(),
          },
          create: {
            organizationId: session.organizationId,
            phone: cleanPhone,
            name: name ? String(name) : null,
            email: email ? String(email) : null,
            customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
            tags: tags.length > 0 ? JSON.stringify(tags) : null,
            optedIn,
            optedInAt: optedIn ? new Date() : null,
          },
        });
        inserted++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${inserted} contacts (${skipped} skipped or invalid)`,
      inserted,
      skipped,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to import CSV contacts' }, { status: 500 });
  }
}

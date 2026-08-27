const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

function encryptToken(plainText) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'whatsapp-platform-default-dev-secret-key-32b').digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function seed() {
  console.log('Seeding WhatsApp Business Platform database...');

  // 1. Create Demo User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@enterprise.com' },
    update: {},
    create: {
      name: 'Mudassir Shah',
      email: 'admin@enterprise.com',
      passwordHash,
    },
  });

  console.log('User created/verified:', user.email);

  // 2. Create Organization
  let org = await prisma.organization.findFirst({
    where: { ownerUserId: user.id },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Infispark Technologies',
        ownerUserId: user.id,
      },
    });
  }

  // 3. Organization Membership
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: { role: 'OWNER' },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  // 4. WhatsApp Connection with Coexistence Active
  const dummyMetaToken = encryptToken('EAAG...META_SAMPLE_BUSINESS_ACCESS_TOKEN_2026');
  const connection = await prisma.whatsAppConnection.upsert({
    where: {
      organizationId_phoneNumberId: {
        organizationId: org.id,
        phoneNumberId: '1084755870646567',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      wabaId: '3457567954401110',
      phoneNumberId: '1084755870646567',
      displayPhoneNumber: '+91 98765 43210',
      verifiedName: 'Infispark Official',
      qualityRating: 'GREEN',
      codeVerificationStatus: 'VERIFIED',
      encryptedAccessToken: dummyMetaToken,
      status: 'ACTIVE',
      coexistenceStatus: 'ACTIVE',
      isSubscribed: true,
      embeddedSignupCompletedAt: new Date(),
    },
  });

  console.log('WhatsApp Connection created:', connection.displayPhoneNumber);

  // 5. Message Templates
  const templatesData = [
    {
      name: 'order_confirmation',
      category: 'UTILITY',
      language: 'en_US',
      headerType: 'TEXT',
      headerContent: 'Order Confirmed: {{1}}',
      body: 'Hello {{1}},\n\nYour order {{2}} has been confirmed! Total amount: {{3}}.\n\nWe will notify you once dispatched.',
      footer: 'Infispark Store • Support: help@infispark.com',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Track Shipment' },
        { type: 'URL', text: 'View Invoice', url: 'https://infispark.com/orders/{{1}}' },
      ],
      status: 'APPROVED',
      qualityRating: 'GREEN',
    },
    {
      name: 'festive_discount_offer',
      category: 'MARKETING',
      language: 'en_US',
      headerType: 'IMAGE',
      body: 'Hi {{1}},\n\nSpecial Festive Sale is live! Use code {{2}} to get 25% off on your next purchase.\n\nOffer valid till this Sunday.',
      footer: 'Reply STOP to unsubscribe',
      buttons: [
        { type: 'URL', text: 'Shop Now', url: 'https://infispark.com/sale' },
      ],
      status: 'APPROVED',
      qualityRating: 'GREEN',
    },
    {
      name: 'appointment_reminder',
      category: 'UTILITY',
      language: 'en_US',
      headerType: 'NONE',
      body: 'Dear {{1}},\n\nThis is a reminder for your upcoming consultation scheduled on {{2}} at {{3}}.\n\nPlease confirm your availability.',
      footer: 'Infispark Clinic',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Confirm' },
        { type: 'QUICK_REPLY', text: 'Reschedule' },
      ],
      status: 'APPROVED',
      qualityRating: 'GREEN',
    },
  ];

  for (const t of templatesData) {
    await prisma.messageTemplate.upsert({
      where: {
        organizationId_name_language: {
          organizationId: org.id,
          name: t.name,
          language: t.language,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        whatsappConnectionId: connection.id,
        metaTemplateId: `meta_tpl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: t.name,
        category: t.category,
        language: t.language,
        headerType: t.headerType,
        headerContent: t.headerContent || null,
        body: t.body,
        footer: t.footer,
        buttonsJson: JSON.stringify(t.buttons),
        status: t.status,
        qualityRating: t.qualityRating,
      },
    });
  }

  // 6. Sample Contacts
  const contactsData = [
    { phone: '919876543210', name: 'John Doe', email: 'john@example.com', tags: ['VIP', 'Customer'], optedIn: true },
    { phone: '919876543211', name: 'Sarah Connor', email: 'sarah@example.com', tags: ['Enterprise'], optedIn: true },
    { phone: '919876543212', name: 'Michael Scott', email: 'michael@dunder.com', tags: ['Lead'], optedIn: true },
    { phone: '919876543213', name: 'Dwight Schrute', email: 'dwight@schrute.farm', tags: ['VIP'], optedIn: true },
  ];

  const savedContacts = [];
  for (const c of contactsData) {
    const contact = await prisma.contact.upsert({
      where: {
        organizationId_phone: {
          organizationId: org.id,
          phone: c.phone,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        phone: c.phone,
        name: c.name,
        email: c.email,
        tags: JSON.stringify(c.tags),
        optedIn: c.optedIn,
        optedInAt: new Date(),
      },
    });
    savedContacts.push(contact);
  }

  // 7. Seed Sample Inbound & Outbound Messages for live inbox & 24h window
  const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago (within 24h window)

  await prisma.message.upsert({
    where: { metaMessageId: 'wamid.HBgSAMPLE_INBOUND_001' },
    update: {},
    create: {
      organizationId: org.id,
      whatsappConnectionId: connection.id,
      contactId: savedContacts[0].id,
      metaMessageId: 'wamid.HBgSAMPLE_INBOUND_001',
      direction: 'INBOUND',
      type: 'TEXT',
      body: 'Hi, I would like to check the tracking status of my order #ORD-1001.',
      status: 'DELIVERED',
      sentAt: recentDate,
      deliveredAt: recentDate,
    },
  });

  await prisma.message.upsert({
    where: { metaMessageId: 'wamid.HBgSAMPLE_OUTBOUND_002' },
    update: {},
    create: {
      organizationId: org.id,
      whatsappConnectionId: connection.id,
      contactId: savedContacts[0].id,
      metaMessageId: 'wamid.HBgSAMPLE_OUTBOUND_002',
      direction: 'OUTBOUND',
      type: 'TEXT',
      body: 'Hello John! Your order #ORD-1001 has been dispatched via BlueDart with AWB #882910. Expected delivery is tomorrow.',
      status: 'READ',
      sentAt: new Date(Date.now() - 90 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 88 * 60 * 1000),
      readAt: new Date(Date.now() - 85 * 60 * 1000),
    },
  });

  console.log('Database seeded successfully with users, connections, templates, and messages!');
}

seed()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

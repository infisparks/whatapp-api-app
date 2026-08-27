import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, organizationName } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Create User, Default Organization, and OrganizationMember in a transaction
    const orgName = organizationName?.trim() || `${name}'s Organization`;

    const user = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        passwordHash,
        ownedOrgs: {
          create: {
            name: orgName,
            members: {
              create: {
                role: 'OWNER',
                user: {
                  connect: undefined, // will be linked automatically via relation
                },
              },
            },
          },
        },
      },
      include: {
        ownedOrgs: {
          include: {
            members: true,
          },
        },
      },
    });

    const defaultOrg = user.ownedOrgs[0];

    // Ensure member record links back to user
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: defaultOrg.id,
          userId: user.id,
        },
      },
      update: { role: 'OWNER' },
      create: {
        organizationId: defaultOrg.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    const sessionToken = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: defaultOrg.id,
      role: 'OWNER',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organization: {
          id: defaultOrg.id,
          name: defaultOrg.name,
          role: 'OWNER',
        },
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}

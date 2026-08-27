import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'whatsapp-secret-jwt-key-multi-tenant-2026';
const AUTH_COOKIE_NAME = 'wa_auth_token';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  role: string;
}

/**
 * Hashes a plain password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Verifies a plain password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Creates a signed JWT session token
 */
export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies and decodes a signed JWT session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Resolves current authenticated session from cookies or Authorization header
 */
export async function getAuthSession(req?: NextRequest): Promise<SessionPayload | null> {
  let token: string | undefined;

  if (req) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    }
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    } catch {
      // In server components without cookies context
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Enforces organization boundary security
 * Verifies that the authenticated user is a verified member of the requested organization
 */
export async function enforceOrgMembership(
  userId: string,
  organizationId: string
): Promise<{ allowed: boolean; role?: string }> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    return { allowed: false };
  }

  return { allowed: true, role: membership.role };
}

export { AUTH_COOKIE_NAME };

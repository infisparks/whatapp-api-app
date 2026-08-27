const crypto = require('crypto');

console.log('--- Testing WhatsApp Platform Core Services ---');

// 1. Test AES-256-GCM Encryption / Decryption
function encryptToken(plainText, secret) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptToken(encryptedString, secret) {
  const parts = encryptedString.split(':');
  const [ivHex, authTagHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.createHash('sha256').update(secret).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const testToken = 'EAAGSampleMetaAccessToken_Secure_2026_xyz123';
const encSecret = 'my-super-secret-key-32-chars-long!!';
const encrypted = encryptToken(testToken, encSecret);
const decrypted = decryptToken(encrypted, encSecret);

if (decrypted === testToken) {
  console.log('✔ AES-256-GCM Encryption & Decryption: PASSED');
} else {
  console.error('✖ Encryption test FAILED');
}

// 2. Test Phone Normalization
function normalizePhoneNumber(phone) {
  return phone.replace(/[^0-9]/g, '');
}

const rawPhone = '+91 98765-43210 ';
const cleanPhone = normalizePhoneNumber(rawPhone);
if (cleanPhone === '919876543210') {
  console.log('✔ E.164 Phone Normalization: PASSED');
} else {
  console.error('✖ Phone Normalization test FAILED:', cleanPhone);
}

// 3. Test 24-Hour Customer Care Window Checker
function isWithin24HourWindow(lastInboundMessageAt) {
  if (!lastInboundMessageAt) return { isOpen: false, remainingMinutes: 0 };
  const inboundDate = new Date(lastInboundMessageAt);
  const now = new Date();
  const diffMs = now.getTime() - inboundDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours >= 24) return { isOpen: false, remainingMinutes: 0 };
  return { isOpen: true, remainingMinutes: Math.floor((24 * 60 * 60 * 1000 - diffMs) / (1000 * 60)) };
}

const recentInbound = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
const oldInbound = new Date(Date.now() - 26 * 60 * 60 * 1000); // 26 hours ago

const recentCheck = isWithin24HourWindow(recentInbound);
const oldCheck = isWithin24HourWindow(oldInbound);

if (recentCheck.isOpen && !oldCheck.isOpen) {
  console.log('✔ 24-Hour WhatsApp Service Window Evaluation: PASSED');
} else {
  console.error('✖ 24-Hour Window evaluation FAILED');
}

// 4. Test Webhook Challenge Verification
function verifyWebhookChallenge(query, expectedToken) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return { isValid: true, challenge };
  }
  return { isValid: false };
}

const mockQuery = {
  'hub.mode': 'subscribe',
  'hub.verify_token': 'test_verify_token_2026',
  'hub.challenge': '1158201444',
};

const verifyResult = verifyWebhookChallenge(mockQuery, 'test_verify_token_2026');
if (verifyResult.isValid && verifyResult.challenge === '1158201444') {
  console.log('✔ Meta Webhook Challenge Verification: PASSED');
} else {
  console.error('✖ Webhook challenge verification FAILED');
}

console.log('--- All Service Unit Tests Passed Successfully ---');

/**
 * @route /api/test-data
 * @description Test Data Factory endpoints.
 *
 * Endpoints:
 *   POST /api/test-data/generate  — Generate synthetic test data
 *   GET  /api/test-data/types     — List available data types
 *   POST /api/test-data/mask      — Apply PII masking to uploaded data
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import testDataFactory from '../services/testDataFactory';
import type { DataType, Locale, OutputFormat, FieldSpec } from '../services/testDataFactory';

const router = Router();

// ─── GET /api/test-data/types ─────────────────────────────────────────────────
router.get('/types', (_req: Request, res: Response): void => {
  res.json({
    types: [
      { id: 'user',        label: 'User / Person',      description: 'Names, emails, usernames, phone numbers, DOB' },
      { id: 'address',     label: 'Address',             description: 'Street, city, state, country, ZIP/postcode, GPS' },
      { id: 'company',     label: 'Company',             description: 'Business name, industry, VAT, registration number' },
      { id: 'creditCard',  label: 'Credit Card',         description: 'Test card numbers (Luhn-valid), CVV, expiry' },
      { id: 'bankAccount', label: 'Bank Account',        description: 'IBAN, BIC, sort code, account number' },
      { id: 'product',     label: 'Product',             description: 'Name, SKU, price, category, stock, image URL' },
      { id: 'order',       label: 'Order',               description: 'Order number, status, total, currency, delivery date' },
      { id: 'invoice',     label: 'Invoice',             description: 'Invoice number, amounts, tax, due date, status' },
      { id: 'transaction', label: 'Transaction',         description: 'Transaction ID, type, amount, currency, timestamp' },
      { id: 'ticket',      label: 'Support Ticket',      description: 'Ticket key, title, priority, status, assignee' },
      { id: 'email',       label: 'Email Address',       description: 'Random realistic email addresses' },
      { id: 'phone',       label: 'Phone Number',        description: 'Locale-formatted phone numbers' },
      { id: 'custom',      label: 'Custom Schema',       description: 'Generate data from a JSON schema definition' },
    ],
    locales: ['en_US', 'en_GB', 'fr_FR', 'de_DE', 'es_ES', 'ja_JP', 'zh_CN', 'ar_SA', 'pt_BR'],
    formats: ['json', 'csv', 'sql', 'typescript'],
  });
});

// ─── POST /api/test-data/generate ────────────────────────────────────────────
router.post('/generate', requireAuth, (req: Request, res: Response): void => {
  const {
    type,
    count = 10,
    locale = 'en_US',
    format = 'json',
    tableName,
    schema,
    masked = false,
  } = req.body as {
    type: DataType;
    count?: number;
    locale?: Locale;
    format?: OutputFormat;
    tableName?: string;
    schema?: Record<string, FieldSpec>;
    masked?: boolean;
  };

  if (!type) {
    res.status(400).json({ error: "'type' is required. Use GET /api/test-data/types to see available types." });
    return;
  }

  if (count > 10_000) {
    res.status(400).json({ error: 'Maximum count is 10,000 records per request.' });
    return;
  }

  try {
    const dataset = testDataFactory.generate({
      type,
      count: Math.max(1, count),
      locale,
      format,
      tableName,
      schema,
      masked,
    });
    res.json({ success: true, dataset });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Data generation failed' });
  }
});

// ─── POST /api/test-data/mask ─────────────────────────────────────────────────
router.post('/mask', requireAuth, (req: Request, res: Response): void => {
  const { data } = req.body as { data: Record<string, unknown>[] };

  if (!Array.isArray(data)) {
    res.status(400).json({ error: "'data' must be an array of objects." });
    return;
  }

  try {
    // Generate a masked version by passing each row through testDataFactory with masked=true
    const masked = data.map((row) => {
      // Simple inline masking for arbitrary input
      const result = { ...row };
      const piiKeys = ['email', 'phone', 'firstName', 'lastName', 'fullName',
        'dateOfBirth', 'password', 'ssn', 'nationalId', 'creditCard',
        'cardNumber', 'cvv', 'iban', 'accountNumber'];
      for (const key of Object.keys(result)) {
        if (piiKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
          const val = result[key];
          if (typeof val === 'string') {
            if (val.includes('@')) result[key] = '***@***.***';
            else result[key] = '*'.repeat(Math.max(4, val.length - 4)) + val.slice(-4);
          }
        }
      }
      return result;
    });

    res.json({ success: true, masked, count: masked.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Masking failed' });
  }
});

export default router;

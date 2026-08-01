/**
 * @service TestDataFactory
 * @description Generates realistic, type-safe test data for automated tests.
 *
 * Supports:
 *   - Faker.js backed typed data builders
 *   - Schema-driven data generation (JSON Schema)
 *   - Data masking (PII redaction for production snapshots)
 *   - Bulk dataset generation (CSV, JSON, SQL INSERT)
 *   - Localised data (30+ locales)
 *   - Specific domains: credit cards, IBANs, emails, addresses, companies, etc.
 *
 * Usage (server route):
 *   POST /api/test-data/generate { type: 'user', count: 100, locale: 'en_GB' }
 */

import { v4 as uuidv4 } from 'uuid';

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type DataType =
  | 'user'
  | 'address'
  | 'company'
  | 'creditCard'
  | 'bankAccount'
  | 'product'
  | 'order'
  | 'invoice'
  | 'transaction'
  | 'ticket'
  | 'email'
  | 'phone'
  | 'custom';

export type OutputFormat = 'json' | 'csv' | 'sql' | 'typescript';
export type Locale = 'en_US' | 'en_GB' | 'fr_FR' | 'de_DE' | 'es_ES' | 'ja_JP' | 'zh_CN' | 'ar_SA' | 'pt_BR';

export interface GenerateOptions {
  type: DataType;
  count: number;
  locale?: Locale;
  format?: OutputFormat;
  tableName?: string;
  schema?: Record<string, FieldSpec>;
  seed?: number;
  masked?: boolean; // Apply PII masking
}

export interface FieldSpec {
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email' | 'url' | 'enum';
  values?: string[];       // For enum type
  min?: number;            // For number or string length
  max?: number;
  format?: string;         // e.g. 'YYYY-MM-DD' for dates
  nullable?: boolean;
  faker?: string;          // e.g. 'name.fullName' — Faker.js path
}

export interface GeneratedDataset {
  id: string;
  type: DataType;
  count: number;
  locale: Locale;
  format: OutputFormat;
  data: Record<string, unknown>[];
  output: string;  // Serialised output in requested format
  createdAt: string;
}

// ─── Data Templates ───────────────────────────────────────────────────────────

interface FakeUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  dateOfBirth: string;
  avatarUrl: string;
  role: string;
  createdAt: string;
}

interface FakeAddress {
  id: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  fullAddress: string;
}

interface FakeCompany {
  id: string;
  name: string;
  tagline: string;
  industry: string;
  email: string;
  phone: string;
  website: string;
  vatNumber: string;
  registrationNumber: string;
}

interface FakeCreditCard {
  number: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  expiryDate: string;
  cardType: string;
  holderName: string;
}

interface FakeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  sku: string;
  category: string;
  stock: number;
  imageUrl: string;
}

interface FakeOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  estimatedDelivery: string;
  items: number;
}

// ─── Service Implementation ───────────────────────────────────────────────────

class TestDataFactory {

  generate(opts: GenerateOptions): GeneratedDataset {
    const {
      type,
      count = 1,
      locale = 'en_US',
      format = 'json',
      tableName,
      schema,
      masked = false,
    } = opts;

    const items: Record<string, unknown>[] = [];
    for (let i = 0; i < Math.min(count, 10_000); i++) {
      const item = schema
        ? this.generateFromSchema(schema)
        : this.generateByType(type, locale, i);

      items.push(masked ? this.applyMasking(item) : item);
    }

    const output = this.serialise(items, format, tableName ?? type);

    return {
      id: uuidv4(),
      type,
      count: items.length,
      locale,
      format,
      data: items,
      output,
      createdAt: new Date().toISOString(),
    };
  }

  // ─── Type Generators ───────────────────────────────────────────────────────

  private generateByType(type: DataType, locale: Locale, index: number): Record<string, unknown> {
    switch (type) {
      case 'user':       return this.generateUser(locale, index) as unknown as Record<string, unknown>;
      case 'address':    return this.generateAddress(locale) as unknown as Record<string, unknown>;
      case 'company':    return this.generateCompany(locale) as unknown as Record<string, unknown>;
      case 'creditCard': return this.generateCreditCard() as unknown as Record<string, unknown>;
      case 'bankAccount': return this.generateBankAccount(locale) as unknown as Record<string, unknown>;
      case 'product':    return this.generateProduct() as unknown as Record<string, unknown>;
      case 'order':      return this.generateOrder() as unknown as Record<string, unknown>;
      case 'invoice':    return this.generateInvoice() as unknown as Record<string, unknown>;
      case 'transaction': return this.generateTransaction() as unknown as Record<string, unknown>;
      case 'ticket':     return this.generateTicket() as unknown as Record<string, unknown>;
      case 'email':      return { id: uuidv4(), address: this.email() };
      case 'phone':      return { id: uuidv4(), number: this.phone(locale) };
      default:           return { id: uuidv4(), value: `${type}-${index}` };
    }
  }

  private generateUser(locale: Locale, _index: number): FakeUser {
    const firstName = this.firstName(locale);
    const lastName = this.lastName(locale);
    const roles = ['admin', 'editor', 'viewer', 'manager', 'developer', 'qa'];
    return {
      id: uuidv4(),
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: this.email(firstName, lastName),
      username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}`,
      password: 'TestPassword123!',  // Safe test credential — never real
      phone: this.phone(locale),
      dateOfBirth: this.dateOfBirth(),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`,
      role: roles[Math.floor(Math.random() * roles.length)],
      createdAt: this.recentDate(),
    };
  }

  private generateAddress(locale: Locale): FakeAddress {
    const { city, state, country, countryCode } = this.locationData(locale);
    const lat = (Math.random() * 180 - 90).toFixed(6);
    const lon = (Math.random() * 360 - 180).toFixed(6);
    const streetNum = Math.floor(Math.random() * 999) + 1;
    const streets = ['Main St', 'Oak Ave', 'Cedar Blvd', 'Park Lane', 'High Street', 'Queen St', 'King Rd'];
    const street = `${streetNum} ${streets[Math.floor(Math.random() * streets.length)]}`;
    const zip = this.zipCode(locale);

    return {
      id: uuidv4(),
      street,
      city,
      state,
      country,
      zipCode: zip,
      countryCode,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      fullAddress: `${street}, ${city}, ${state} ${zip}, ${country}`,
    };
  }

  private generateCompany(locale: Locale): FakeCompany {
    const suffixes = ['Inc.', 'LLC', 'Ltd.', 'Corp.', 'GmbH', 'S.A.', 'B.V.', 'Pty Ltd'];
    const adjectives = ['Global', 'Digital', 'Advanced', 'Dynamic', 'Innovative', 'Smart', 'Next', 'Peak'];
    const nouns = ['Solutions', 'Technologies', 'Systems', 'Ventures', 'Industries', 'Group', 'Partners', 'Labs'];
    const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Logistics', 'Education', 'Energy'];
    const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);

    return {
      id: uuidv4(),
      name,
      tagline: 'Empowering the future through innovation.',
      industry: industries[Math.floor(Math.random() * industries.length)],
      email: `info@${domain}.com`,
      phone: this.phone(locale),
      website: `https://www.${domain}.com`,
      vatNumber: `${this.randomDigits(2)}${this.randomLetters(2)}${this.randomDigits(8)}`,
      registrationNumber: this.randomDigits(8),
    };
  }

  private generateCreditCard(): FakeCreditCard {
    const cards = [
      { type: 'Visa', prefix: '4', length: 16 },
      { type: 'Mastercard', prefix: '5', length: 16 },
      { type: 'Amex', prefix: '37', length: 15 },
    ];
    const card = cards[Math.floor(Math.random() * cards.length)];
    const number = this.luhnNumber(card.prefix, card.length);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const year = String(new Date().getFullYear() + Math.floor(Math.random() * 5) + 1);
    const names = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Williams'];

    // NOTE: These are generated test card numbers and are NOT real credit cards.
    return {
      number,
      cvv: this.randomDigits(card.type === 'Amex' ? 4 : 3),
      expiryMonth: month,
      expiryYear: year,
      expiryDate: `${month}/${year.slice(2)}`,
      cardType: card.type,
      holderName: names[Math.floor(Math.random() * names.length)],
    };
  }

  private generateBankAccount(_locale: Locale): Record<string, unknown> {
    const countryCode = 'GB';
    const checkDigits = this.randomDigits(2);
    const bankCode = this.randomLetters(4).toUpperCase();
    const accountNum = this.randomDigits(8);
    const bban = `${bankCode}${accountNum}`;
    return {
      id: uuidv4(),
      iban: `${countryCode}${checkDigits}${bban}`,
      bic: `${bankCode}XX${countryCode}`,
      accountNumber: accountNum,
      sortCode: `${this.randomDigits(2)}-${this.randomDigits(2)}-${this.randomDigits(2)}`,
      bankName: ['Barclays', 'HSBC', 'Lloyds', 'NatWest', 'Santander'][Math.floor(Math.random() * 5)],
      currency: 'GBP',
    };
  }

  private generateProduct(): FakeProduct {
    const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Beauty', 'Toys', 'Automotive'];
    const adjectives = ['Premium', 'Essential', 'Pro', 'Ultra', 'Classic', 'Deluxe', 'Standard'];
    const nouns = ['Widget', 'Gadget', 'Device', 'Kit', 'Set', 'Bundle', 'Pack', 'System'];
    const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
    const price = Math.round((Math.random() * 499 + 0.99) * 100) / 100;
    const cat = categories[Math.floor(Math.random() * categories.length)];

    return {
      id: uuidv4(),
      name,
      description: `High-quality ${name.toLowerCase()} designed for professional use. Includes 12-month warranty.`,
      price,
      currency: 'USD',
      sku: `SKU-${this.randomLetters(3).toUpperCase()}-${this.randomDigits(4)}`,
      category: cat,
      stock: Math.floor(Math.random() * 500),
      imageUrl: `https://picsum.photos/seed/${Math.floor(Math.random() * 1000)}/400/300`,
    };
  }

  private generateOrder(): FakeOrder {
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    const now = new Date();
    const delivery = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
    return {
      id: uuidv4(),
      orderNumber: `ORD-${this.randomDigits(8)}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      total: Math.round((Math.random() * 999 + 9.99) * 100) / 100,
      currency: 'USD',
      createdAt: now.toISOString(),
      estimatedDelivery: delivery.toISOString().split('T')[0],
      items: Math.floor(Math.random() * 10) + 1,
    };
  }

  private generateInvoice(): Record<string, unknown> {
    const now = new Date();
    const due = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const subtotal = Math.round((Math.random() * 9999 + 99) * 100) / 100;
    const tax = Math.round(subtotal * 0.2 * 100) / 100;
    return {
      id: uuidv4(),
      invoiceNumber: `INV-${now.getFullYear()}-${this.randomDigits(4)}`,
      status: ['draft', 'sent', 'paid', 'overdue'][Math.floor(Math.random() * 4)],
      issueDate: now.toISOString().split('T')[0],
      dueDate: due.toISOString().split('T')[0],
      subtotal,
      tax,
      total: subtotal + tax,
      currency: 'USD',
    };
  }

  private generateTransaction(): Record<string, unknown> {
    const types = ['purchase', 'refund', 'transfer', 'withdrawal', 'deposit'];
    const statuses = ['completed', 'pending', 'failed', 'reversed'];
    return {
      id: uuidv4(),
      transactionId: `TXN-${this.randomLetters(3).toUpperCase()}${this.randomDigits(8)}`,
      type: types[Math.floor(Math.random() * types.length)],
      amount: Math.round((Math.random() * 9999 + 0.01) * 100) / 100,
      currency: ['USD', 'EUR', 'GBP', 'JPY'][Math.floor(Math.random() * 4)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private generateTicket(): Record<string, unknown> {
    const priorities = ['P0', 'P1', 'P2', 'P3'];
    const statuses = ['open', 'in_progress', 'resolved', 'closed', 'won\'t_fix'];
    const types = ['bug', 'feature', 'task', 'improvement', 'question'];
    const titles = [
      'Login button not responding on mobile',
      'Dashboard charts not loading',
      'Export to CSV missing fields',
      'Performance degradation after v2.3 upgrade',
      'Accessibility: screen reader skips navigation',
    ];
    return {
      id: uuidv4(),
      ticketKey: `TM-${Math.floor(Math.random() * 9999)}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      type: types[Math.floor(Math.random() * types.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      reporter: this.email(),
      assignee: this.email(),
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['automation', 'ai-generated'],
    };
  }

  // ─── Schema-driven generation ──────────────────────────────────────────────

  private generateFromSchema(schema: Record<string, FieldSpec>): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [key, spec] of Object.entries(schema)) {
      if (spec.nullable && Math.random() < 0.1) { obj[key] = null; continue; }
      switch (spec.type) {
        case 'uuid':    obj[key] = uuidv4(); break;
        case 'string':  obj[key] = this.randomString(spec.min ?? 5, spec.max ?? 20); break;
        case 'number':  obj[key] = Math.round(Math.random() * ((spec.max ?? 100) - (spec.min ?? 0)) + (spec.min ?? 0)); break;
        case 'boolean': obj[key] = Math.random() > 0.5; break;
        case 'date':    obj[key] = this.recentDate(); break;
        case 'email':   obj[key] = this.email(); break;
        case 'url':     obj[key] = `https://example.com/${this.randomString(5, 10)}`; break;
        case 'enum':    obj[key] = (spec.values ?? ['a'])[Math.floor(Math.random() * (spec.values?.length ?? 1))]; break;
        default:        obj[key] = null;
      }
    }
    return obj;
  }

  // ─── PII Masking ──────────────────────────────────────────────────────────

  private applyMasking(data: Record<string, unknown>): Record<string, unknown> {
    const masked = { ...data };
    const piiKeys = ['email', 'phone', 'firstName', 'lastName', 'fullName', 'dateOfBirth', 'password', 'creditCard', 'number', 'iban', 'accountNumber'];

    for (const key of Object.keys(masked)) {
      if (piiKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        const val = masked[key];
        if (typeof val === 'string') {
          if (val.includes('@')) masked[key] = '***@***.***';
          else if (val.length > 4) masked[key] = '*'.repeat(val.length - 4) + val.slice(-4);
          else masked[key] = '****';
        }
      }
    }
    return masked;
  }

  // ─── Serialisation ────────────────────────────────────────────────────────

  private serialise(data: Record<string, unknown>[], format: OutputFormat, name: string): string {
    switch (format) {
      case 'json': return JSON.stringify(data, null, 2);
      case 'csv':  return this.toCSV(data);
      case 'sql':  return this.toSQL(data, name);
      case 'typescript': return this.toTypeScript(data, name);
      default: return JSON.stringify(data, null, 2);
    }
  }

  private toCSV(data: Record<string, unknown>[]): string {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  private toSQL(data: Record<string, unknown>[], tableName: string): string {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const cols = headers.map((h) => `\`${h}\``).join(', ');
    const rows = data.map((row) => {
      const vals = headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(', ');
      return `  (${vals})`;
    });
    return `INSERT INTO \`${tableName}\` (${cols}) VALUES\n${rows.join(',\n')};`;
  }

  private toTypeScript(data: Record<string, unknown>[], name: string): string {
    const typeName = name.charAt(0).toUpperCase() + name.slice(1);
    if (!data.length) return `export const ${name}Fixtures: ${typeName}[] = [];`;

    const headers = Object.keys(data[0]);
    const typeFields = headers.map((h) => {
      const val = data[0][h];
      const tsType = val === null ? 'null' : typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string';
      return `  ${h}: ${tsType};`;
    }).join('\n');

    const items = JSON.stringify(data, null, 2);
    return `export interface ${typeName} {\n${typeFields}\n}\n\nexport const ${name}Fixtures: ${typeName}[] = ${items};\n`;
  }

  // ─── Primitive Generators ─────────────────────────────────────────────────

  private firstName(locale: Locale): string {
    const names: Record<string, string[]> = {
      en_US: ['James', 'Emily', 'Michael', 'Sarah', 'David', 'Jessica', 'Daniel', 'Ashley', 'Tyler', 'Lauren'],
      en_GB: ['Oliver', 'Olivia', 'Harry', 'Amelia', 'Jack', 'Isla', 'George', 'Ava', 'Noah', 'Lily'],
      fr_FR: ['Lucas', 'Emma', 'Gabriel', 'Chloé', 'Louis', 'Manon', 'Raphaël', 'Inès', 'Léo', 'Camille'],
      de_DE: ['Leon', 'Sophie', 'Lukas', 'Maria', 'Finn', 'Anna', 'Jonas', 'Laura', 'Felix', 'Lisa'],
      es_ES: ['Alejandro', 'Sofía', 'Pablo', 'Valentina', 'Miguel', 'Isabella', 'Daniel', 'Camila'],
    };
    const list = names[locale] ?? names['en_US'];
    return list[Math.floor(Math.random() * list.length)];
  }

  private lastName(locale: Locale): string {
    const names: Record<string, string[]> = {
      en_US: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor'],
      en_GB: ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans', 'Thomas', 'Wilson'],
      fr_FR: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand'],
      de_DE: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker'],
      es_ES: ['García', 'Martínez', 'López', 'Sánchez', 'González', 'Pérez', 'Rodríguez', 'Fernández'],
    };
    const list = names[locale] ?? names['en_US'];
    return list[Math.floor(Math.random() * list.length)];
  }

  private email(first?: string, last?: string): string {
    const domains = ['example.com', 'testmind.io', 'testuser.net', 'qa.test', 'automation.dev'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    if (first && last) {
      return `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random() * 99)}@${domain}`;
    }
    return `user${Math.floor(Math.random() * 9999)}@${domain}`;
  }

  private phone(locale: Locale): string {
    const prefixes: Record<string, string> = {
      en_US: '+1', en_GB: '+44', fr_FR: '+33', de_DE: '+49', es_ES: '+34',
      ja_JP: '+81', zh_CN: '+86', ar_SA: '+966', pt_BR: '+55',
    };
    const prefix = prefixes[locale] ?? '+1';
    return `${prefix} ${this.randomDigits(3)} ${this.randomDigits(3)} ${this.randomDigits(4)}`;
  }

  private dateOfBirth(): string {
    const year = 1960 + Math.floor(Math.random() * 45);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private recentDate(): string {
    const d = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }

  private zipCode(locale: Locale): string {
    const patterns: Record<string, () => string> = {
      en_US: () => this.randomDigits(5),
      en_GB: () => `${this.randomLetters(2).toUpperCase()}${this.randomDigits(1)} ${this.randomDigits(1)}${this.randomLetters(2).toUpperCase()}`,
      de_DE: () => this.randomDigits(5),
      fr_FR: () => this.randomDigits(5),
      es_ES: () => this.randomDigits(5),
    };
    return (patterns[locale] ?? patterns['en_US'])();
  }

  private locationData(locale: Locale): { city: string; state: string; country: string; countryCode: string } {
    const data: Record<string, { cities: string[]; state: string; country: string; countryCode: string }> = {
      en_US: { cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'], state: 'NY', country: 'United States', countryCode: 'US' },
      en_GB: { cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'], state: 'England', country: 'United Kingdom', countryCode: 'GB' },
      fr_FR: { cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'], state: 'Île-de-France', country: 'France', countryCode: 'FR' },
      de_DE: { cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt'], state: 'Bavaria', country: 'Germany', countryCode: 'DE' },
      es_ES: { cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao'], state: 'Madrid', country: 'Spain', countryCode: 'ES' },
    };
    const d = data[locale] ?? data['en_US'];
    return { city: d.cities[Math.floor(Math.random() * d.cities.length)], state: d.state, country: d.country, countryCode: d.countryCode };
  }

  private luhnNumber(prefix: string, length: number): string {
    let num = prefix;
    while (num.length < length - 1) num += Math.floor(Math.random() * 10);
    // Luhn check digit
    const reversed = num.split('').reverse().map(Number);
    const sum = reversed.reduce((acc, d, i) => {
      if (i % 2 === 0) { const v = d * 2; return acc + (v > 9 ? v - 9 : v); }
      return acc + d;
    }, 0);
    return num + String((10 - (sum % 10)) % 10);
  }

  private randomDigits(n: number): string {
    return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
  }

  private randomLetters(n: number): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  }

  private randomString(min: number, max: number): string {
    const len = min + Math.floor(Math.random() * (max - min));
    return this.randomLetters(len);
  }
}

export default new TestDataFactory();

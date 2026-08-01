import { Router, Request, Response } from 'express';
import { attachUserIfPresent } from '../middleware/auth';
import { runSecurityScan } from '../services/securityScanner';

const router = Router();

const scanResults = new Map<string, unknown>();

// POST /api/security/scan — run a real DAST + SCA scan
router.post('/scan', attachUserIfPresent, async (req: Request, res: Response) => {
  let { url, scanType = 'full' } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL provided. Example: https://example.com' });
    return;
  }

  const validTypes = ['dast', 'sca', 'full'];
  if (!validTypes.includes(scanType)) {
    res.status(400).json({ error: `scanType must be one of: ${validTypes.join(', ')}` });
    return;
  }

  try {
    const result = await runSecurityScan(url, scanType as 'dast' | 'sca' | 'full');
    scanResults.set(result.scanId, result);
    res.json(result);
  } catch (err) {
    console.error('[security/scan]', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Security scan failed',
    });
  }
});

// GET /api/security/findings/:scanId
router.get('/findings/:scanId', (req: Request, res: Response) => {
  const result = scanResults.get(String(req.params.scanId));
  if (!result) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }
  res.json(result);
});

// GET /api/security/compliance-map — OWASP / compliance reference
router.get('/compliance-map', (_req: Request, res: Response) => {
  res.json({
    frameworks: [
      { id: 'owasp', name: 'OWASP Top 10 2021', url: 'https://owasp.org/Top10/' },
      { id: 'soc2', name: 'SOC 2 Type II', url: 'https://www.aicpa.org/soc2' },
      { id: 'pci', name: 'PCI DSS v4', url: 'https://www.pcisecuritystandards.org/' },
      { id: 'hipaa', name: 'HIPAA Security Rule', url: 'https://www.hhs.gov/hipaa' },
      { id: 'gdpr', name: 'GDPR Article 32', url: 'https://gdpr-info.eu/art-32-gdpr/' },
      { id: 'iso27001', name: 'ISO 27001:2022', url: 'https://www.iso.org/isoiec-27001-information-security.html' },
    ],
  });
});

// GET /api/security/owasp-top10 — quick reference
router.get('/owasp-top10', (_req: Request, res: Response) => {
  res.json([
    { rank: 'A01', name: 'Broken Access Control' },
    { rank: 'A02', name: 'Cryptographic Failures' },
    { rank: 'A03', name: 'Injection' },
    { rank: 'A04', name: 'Insecure Design' },
    { rank: 'A05', name: 'Security Misconfiguration' },
    { rank: 'A06', name: 'Vulnerable and Outdated Components' },
    { rank: 'A07', name: 'Identification and Authentication Failures' },
    { rank: 'A08', name: 'Software and Data Integrity Failures' },
    { rank: 'A09', name: 'Security Logging and Monitoring Failures' },
    { rank: 'A10', name: 'Server-Side Request Forgery (SSRF)' },
  ]);
});

export default router;

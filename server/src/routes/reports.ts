import { Router, Request, Response } from 'express';
import fs from 'fs';
import { getReports, getReportById } from '../db/queries';
import { param } from '../utils/params';
import reportGenerator from '../services/reportGenerator';
import bugTracker from '../services/bugTracker';

const router = Router();

router.get('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const reports = getReports(param(req.params.sessionId));
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.get('/:reportId/html', (req: Request, res: Response) => {
  try {
    const report = getReportById(param(req.params.reportId));
    if (!report?.htmlPath || !fs.existsSync(report.htmlPath)) {
      res.status(404).json({ error: 'HTML report not found' });
      return;
    }
    res.sendFile(report.htmlPath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve HTML report' });
  }
});

router.get('/:reportId/export', (req: Request, res: Response) => {
  try {
    const report = getReportById(param(req.params.reportId));
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const format = (req.query.format as string) || 'json';

    if (format === 'csv') {
      const csv = reportGenerator.exportToCSV(report.data.bugs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${report.id}.csv`);
      res.send(csv);
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=report-${report.id}.json`);
    res.json(report.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export report' });
  }
});

export default router;

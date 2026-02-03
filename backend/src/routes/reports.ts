import { Router } from 'express';
import { z } from 'zod';
import { generatePDFReport } from '../services/report.js';
import { logger } from '../services/logger.js';

const router = Router();

const generateSchema = z.object({
  vesselName: z.string(),
  mmsi: z.string(), // Changed to string to match ReportData interface
  vesselType: z.string().optional(),
  flag: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  events: z.array(z.any())
});

router.post('/generate', async (req, res) => {
  try {
    const data = generateSchema.parse(req.body);

    logger.info({ mmsi: data.mmsi }, 'Generating PDF report');

    const pdfBuffer = await generatePDFReport(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${data.mmsi}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      logger.error({ error }, 'Error in report generation route');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;

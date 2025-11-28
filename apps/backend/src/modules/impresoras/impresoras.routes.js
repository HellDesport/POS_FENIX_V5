import { Router } from 'express';
import axios from 'axios';
import { env } from '../../config/env.js';
import * as svc from './impresoras.service.js';

const r = Router();

// ping: backend verifica salud del printer-service
r.get('/ping', async (_req, res) => {
  try {
    const { data } = await axios.get(`${env.printerUrl}/health`, { timeout: 2000 });
    res.json({ ok: true, printer: data });
  } catch (e) {
    res.status(503).json({ ok: false, error: 'printer-service down' });
  }
});

r.post('/text', async (req, res) => {
  const text = req.body?.text ?? 'Ticket Fénix\nDemo\n';
  res.json(await svc.printText(text, req.body?.printerName));
});

r.post('/cut', async (_req, res) => {
  const cut = Uint8Array.from([0x1D, 0x56, 0x00]);
  res.json(await svc.printRaw(cut));
});

export default r;

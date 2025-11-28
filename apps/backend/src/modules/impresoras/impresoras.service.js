import axios from 'axios';
import { env } from '../../config/env.js';

const base = env.printerUrl; // http://localhost:9101

export async function printText(text, printerName) {
  const { data } = await axios.post(`${base}/print`, {
    template: 'TEXT',
    text,
    printerName
  });
  return data;
}

export async function printRaw(bytes, printerName) {
  const b64 = Buffer.from(bytes).toString('base64');
  const { data } = await axios.post(`${base}/print`, {
    template: 'RAW',
    data: b64,
    printerName
  });
  return data;
}

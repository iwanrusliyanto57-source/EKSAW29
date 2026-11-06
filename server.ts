import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dataStore } from './data/store';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fetch all database state
app.get('/api/data', (_req: Request, res: Response) => {
  try {
    const data = dataStore.getState();
    res.json({ status: 'success', data });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Sync from Google Sheets / Apps Script
app.post('/api/sync', async (_req: Request, res: Response) => {
  try {
    const result = await dataStore.syncFromGoogleSheets();
    res.json({ status: 'success', result, data: dataStore.getState() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Batch Save Attendance and Grades
app.post('/api/absensi/batch', async (req: Request, res: Response) => {
  try {
    const logs = req.body.logs;
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Array of logs is required' });
    }
    const count = await dataStore.addAttendanceLogs(logs);
    res.json({ status: 'success', count, data: dataStore.getState() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Update single attendance log
app.put('/api/absensi/:id', async (req: Request, res: Response) => {
  try {
    const log = req.body;
    log.id_log = req.params.id;
    const ok = await dataStore.updateAttendanceLog(log);
    if (!ok) return res.status(404).json({ status: 'error', message: 'Log not found' });
    res.json({ status: 'success', data: dataStore.getState() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Delete single attendance log
app.delete('/api/absensi/:id', async (req: Request, res: Response) => {
  try {
    const ok = await dataStore.deleteAttendanceLog(req.params.id);
    if (!ok) return res.status(404).json({ status: 'error', message: 'Log not found' });
    res.json({ status: 'success', data: dataStore.getState() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Tutor presence record
app.post('/api/tutor-presence', async (req: Request, res: Response) => {
  try {
    const presence = req.body;
    await dataStore.addOrUpdateTutorPresence(presence);
    res.json({ status: 'success', data: dataStore.getState() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Delete tutor presence
app.delete('/api/tutor-presence/:id', async (req: Request, res: Response) => {
  try {
    await dataStore.deleteTutorPresence(req.params.id);
    res.json({ status: 'success', data: dataStore.getState() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Fee disbursement update
app.post('/api/fee-disbursements', (req: Request, res: Response) => {
  try {
    const item = req.body;
    const updated = dataStore.updateFeeDisbursement(item);
    res.json({ status: 'success', item: updated, data: dataStore.getState() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Update configuration
app.post('/api/config', (req: Request, res: Response) => {
  try {
    const config = req.body;
    const updated = dataStore.updateConfig(config);
    res.json({ status: 'success', config: updated, data: dataStore.getState() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Return raw Code.gs content
app.get('/api/code-gs', (_req: Request, res: Response) => {
  try {
    const filePath = path.resolve(__dirname, 'public', 'Code.gs');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.type('text/plain').send(content);
    } else {
      res.status(404).send('Code.gs not found');
    }
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// AI Monthly Class Insights Endpoint
app.post('/api/ai/insights', async (req: Request, res: Response) => {
  try {
    const { className, subject, tutorName, attendanceRate, avgGrade, topStudents, studentNotes, month } = req.body;

    const prompt = `Anda adalah seorang konsultan kurikulum dan analis pedagogik ekstrakurikuler sekolah.
Buat analisis evaluasi komprehensif, padat, dan solutif dalam Bahasa Indonesia untuk laporan bulanan kelas ekstrakurikuler berikut:
- Bulan Evaluasi: ${month || 'Bulan Berjalan'}
- Nama Kelas: ${className} (${subject})
- Tutor Pengampu: ${tutorName}
- Tingkat Kehadiran Siswa: ${attendanceRate}%
- Nilai Rata-rata Kelas: ${avgGrade} / 100
- Siswa Berprestasi/Aktif: ${topStudents?.join(', ') || '-'}
- Ringkasan Catatan Pengamatan Tutor: ${studentNotes?.slice(0, 5).join('; ') || 'Pembelajaran berlangsung kondusif'}

Berikan respons dalam format Markdown terstruktur yang rapi:
1. **Ringkasan Kinerja & Dinamika Kelas** (1-2 paragraf padat)
2. **Sorotan Kemajuan Belajar** (Pencapaian utama siswa)
3. **Peluang Perbaikan & Rekomendasi untuk Pertemuan Berikutnya** (3 butir praktis untuk tutor dan admin)
Gunakan gaya bahasa profesional, apresiatif, dan konstruktif.`;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });
        const text = response.text || '';
        return res.json({ status: 'success', insight: text, source: 'gemini' });
      } catch (aiErr: any) {
        console.warn('Gemini API call failed, using heuristic analysis fallback:', aiErr.message);
      }
    }

    // Heuristic analytical fallback
    const heuristicInsight = `### Evaluasi Perkembangan Kelas ${className} (${month || 'Periode Ini'})

**1. Ringkasan Kinerja & Dinamika Kelas**
Kelas ${className} yang diampu oleh **${tutorName}** pada mata pelajaran **${subject}** menunjukkan tingkat kedisiplinan dan partisipasi yang sangat solid dengan persentase kehadiran mencapai **${attendanceRate}%** serta perolehan rerata nilai **${avgGrade}/100**. Siswa menunjukkan motivasi belajar tinggi dan konsistensi kehadiran yang baik selama sesi tatap muka.

**2. Sorotan Kemajuan Belajar**
- Mayoritas siswa telah menguasai kompetensi dasar dan praktik mandiri sesuai silabus ekskul.
- Siswa dengan performa menonjol: **${topStudents?.join(', ') || 'Seluruh siswa berpartisipasi aktif'}**, menunjukkan inisiatif tinggi dalam menyelesaikan tugas praktik.
- Suasana belajar interaktif dan interaksi dua arah antara tutor dengan siswa berjalan produktif.

**3. Rekomendasi untuk Pertemuan Berikutnya**
- **Diferensiasi Pembelajaran**: Berikan tantangan materi tingkat lanjut (enrichment project) bagi siswa yang telah tuntas lebih cepat.
- **Pendampingan Personal**: Berikan bimbingan ekstra bagi siswa dengan status izin/sakit agar materi tidak tertinggal.
- **Dokumentasi Hasil Karya**: Siapkan etalase karya atau pameran mini pada akhir semester untuk meningkatkan apresiasi orang tua siswa.`;

    return res.json({ status: 'success', insight: heuristicInsight, source: 'heuristic' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Setup Vite Dev Server or Production Static Serve
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

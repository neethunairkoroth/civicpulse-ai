import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('PERMISSION_DENIED') || raw.includes('403') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message:
        'Gemini API access denied or invalid key. Please verify your API key in the Settings > Secrets panel.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API quota limit reached. Please retry shortly or check quota in Settings > Secrets.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message: `Requested Gemini model (${MODEL_NAME}) was not found.`,
    };
  }
  return {
    status: 500,
    message: raw || 'Unexpected error communicating with Gemini AI.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, model: MODEL_NAME });
  });

  app.post('/api/investigate', async (req: Request, res: Response) => {
    try {
      const { question, history, datasetSummary, crossTabMetrics, matchingRows } = req.body as {
        question?: string;
        history?: Array<{ role: 'user' | 'assistant'; content: string }>;
        datasetSummary?: unknown;
        crossTabMetrics?: unknown;
        matchingRows?: unknown[];
      };

      if (!question || typeof question !== 'string' || !question.trim()) {
        res.status(400).json({ error: 'Question is required.' });
        return;
      }

      const ai = getGeminiClient();

      const priorContext = Array.isArray(history)
        ? history
            .slice(-6)
            .map((m) => `${m.role === 'user' ? 'Executive' : 'Analyst'}: ${m.content}`)
            .join('\n')
        : '';

      const systemInstruction = [
        'You are CivicPulse AI, a senior municipal infrastructure & transit asset intelligence analyst.',
        'Answer questions strictly grounded in the provided active dataset metrics and sampled asset records.',
        'Never invent Asset_IDs, locations, or counts that contradict the provided dataset JSON.',
        'Be concise, executive-grade, quantitative, and structured. Reference specific Asset_IDs from matchingRows when citing examples.',
        'Format `summary` using clean Markdown (short paragraphs, bullet points with **bold** lead-ins, no oversized headers).',
        'Populate `referencedAssetIds` with the exact Asset_ID strings mentioned in your answer.',
        'Populate `priorityActions` with 2-4 concrete operational actions (with realistic department owner, timeframe, and measurable impact) when the user asks for remediation, planning, risk mitigation, or prioritization; otherwise return an empty array or 1-2 targeted follow-ups.',
      ].join(' ');

      const promptPayload = [
        priorContext ? `Conversation History:\n${priorContext}\n` : '',
        `Current Executive Question:\n${question.trim()}\n`,
        `Active Dataset Summary:\n${JSON.stringify(datasetSummary ?? {}, null, 2)}\n`,
        crossTabMetrics
          ? `Exact Cross-Tabulation Counts:\n${JSON.stringify(crossTabMetrics, null, 2)}\n`
          : '',
        `Top Relevant Asset Records (${Array.isArray(matchingRows) ? matchingRows.length : 0} rows):\n${JSON.stringify(
          matchingRows ?? [],
          null,
          2
        )}`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: promptPayload,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description:
                  'Executive-grade Markdown response citing exact dataset numbers and specific Asset_IDs.',
              },
              referencedAssetIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exact Asset_ID strings cited in the summary.',
              },
              priorityActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    owner: { type: Type.STRING },
                    timeframe: { type: Type.STRING },
                    impact: { type: Type.STRING },
                  },
                  required: ['title', 'owner', 'timeframe', 'impact'],
                },
                description: 'Concrete operational action items grounded in the dataset.',
              },
            },
            required: ['summary', 'referencedAssetIds', 'priorityActions'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/remediate', async (req: Request, res: Response) => {
    try {
      const { asset, peerManufacturers, referenceDate } = req.body as {
        asset?: Record<string, unknown>;
        peerManufacturers?: string[];
        referenceDate?: string;
      };

      if (!asset || !asset.Asset_ID) {
        res.status(400).json({ error: 'Valid asset payload with Asset_ID is required.' });
        return;
      }

      const ai = getGeminiClient();

      const systemInstruction = [
        'You are CivicPulse AI, a transit & municipal infrastructure engineering specialist.',
        'Given an infrastructure asset record with metadata gaps, overdue inspections, or degraded condition scores, infer missing specifications realistically based on asset category, location, description, and peer manufacturers, and draft an actionable field maintenance / verification ticket.',
        'If Manufacturer is already provided, keep it exact. If missing, infer the most likely transit OEM from peerManufacturers or standard municipal equipment vendors and note it in rationale.',
        'If Install_Date is already provided, keep it exact. If missing, estimate a realistic YYYY-MM-DD installation date consistent with the asset era and condition score.',
        'Provide suggestedNextInspection as YYYY-MM-DD relative to referenceDate (urgent within 7-14 days if condition < 50 or overdue > 365 days; 30-60 days otherwise).',
        'Keep rationale concise (2 sentences max) and checklist items specific to the asset category.',
      ].join(' ');

      const prompt = JSON.stringify(
        {
          referenceDate: referenceDate ?? '2026-11-14',
          asset,
          peerManufacturersInSameCategory: peerManufacturers ?? [],
        },
        null,
        2
      );

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Analyze and generate a remediation proposal and maintenance work order for this asset:\n${prompt}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assetId: { type: Type.STRING },
              inferredManufacturer: { type: Type.STRING },
              inferredInstallDate: { type: Type.STRING },
              suggestedNextInspection: { type: Type.STRING },
              confidence: { type: Type.STRING },
              rationale: { type: Type.STRING },
              maintenanceTicket: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  department: { type: Type.STRING },
                  estimatedCrewHours: { type: Type.NUMBER },
                  checklist: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  'title',
                  'priority',
                  'department',
                  'estimatedCrewHours',
                  'checklist',
                ],
              },
            },
            required: [
              'assetId',
              'inferredManufacturer',
              'inferredInstallDate',
              'suggestedNextInspection',
              'confidence',
              'rationale',
              'maintenanceTicket',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicPulse AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

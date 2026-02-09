
'use server';
/**
 * @fileOverview Flux de prévision de l'occupation IA.
 * 
 * - forecastOccupancy - Analyse les données historiques pour prédire la demande future.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ForecastInputSchema = z.object({
  history: z.array(z.object({
    date: z.string(),
    occupancy: z.number(),
    revenue: z.number(),
  })).describe('Données historiques des 7 derniers jours.'),
});

const ForecastOutputSchema = z.object({
  forecast: z.array(z.object({
    day: z.string(),
    predictedOccupancy: z.number().describe('Pourcentage d\'occupation prédit (0-100)'),
    trend: z.enum(['up', 'down', 'stable']),
  })),
  explanation: z.string().describe('Une brève explication en français des tendances prédites.'),
});

export type ForecastInput = z.infer<typeof ForecastInputSchema>;
export type ForecastOutput = z.infer<typeof ForecastOutputSchema>;

export async function forecastOccupancy(input: ForecastInput): Promise<ForecastOutput> {
  const prompt = ai.definePrompt({
    name: 'occupancyForecastPrompt',
    input: { schema: ForecastInputSchema },
    output: { schema: ForecastOutputSchema },
    prompt: `Tu es un expert en Revenue Management pour ImaraPMS, un hôtel de luxe.
    
Analyse les données suivantes des 7 derniers jours :
{{#each history}}
- {{date}}: {{occupancy}}% d'occupation, {{revenue}}$ de revenus
{{/each}}

Prédit l'occupation pour les 3 prochains jours. Tiens compte des cycles de demande hôtelière habituels.
Fournis une explication professionnelle en français pour justifier tes prévisions.`,
  });

  const { output } = await prompt(input);
  return output!;
}

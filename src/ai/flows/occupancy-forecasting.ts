'use server';

/**
 * @fileOverview AI-powered occupancy forecasting flow for hotel management.
 *
 * - forecastOccupancy - Predicts future occupancy rates based on historical data and booking trends.
 * - ForecastOccupancyInput - The input type for the forecastOccupancy function.
 * - ForecastOccupancyOutput - The return type for the forecastOccupancy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ForecastOccupancyInputSchema = z.object({
  historicalData: z
    .string()
    .describe(
      'Historical occupancy data in CSV format with columns: date (YYYY-MM-DD), occupancyRate (percentage).
      Example:
      date,occupancyRate\n      2023-01-01,60\n      2023-01-02,65\n      ...'
    ),
  bookingTrends: z
    .string()
    .describe(
      'Recent booking trends as a text description, including any notable patterns or changes.
      Example: Bookings for the next month are 20% higher than the same period last year.  There is a large conference scheduled for the 15th-17th of next month.'
    ),
  forecastHorizonDays: z
    .number()
    .describe('Number of days into the future to forecast occupancy.'),
});
export type ForecastOccupancyInput = z.infer<typeof ForecastOccupancyInputSchema>;

const ForecastOccupancyOutputSchema = z.object({
  forecast: z
    .string()
    .describe(
      'A JSON array of forecasted occupancy rates, with date (YYYY-MM-DD) and occupancyRate (percentage) for each day in the forecast horizon. Example: [{\'date\': \'2024-01-01\', \'occupancyRate\': 70}, {\'date\': \'2024-01-02\', \'occupancyRate\': 75}, ...]' // escaped quotes
    ),
  explanation: z
    .string()
    .describe('A brief explanation of the factors influencing the forecast.'),
});
export type ForecastOccupancyOutput = z.infer<typeof ForecastOccupancyOutputSchema>;

export async function forecastOccupancy(input: ForecastOccupancyInput): Promise<ForecastOccupancyOutput> {
  return forecastOccupancyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'forecastOccupancyPrompt',
  input: {schema: ForecastOccupancyInputSchema},
  output: {schema: ForecastOccupancyOutputSchema},
  prompt: `You are an AI specializing in hotel occupancy forecasting.

  Analyze the provided historical data and booking trends to predict future occupancy rates.

  Historical Data:\n  {{historicalData}}

  Booking Trends:\n  {{bookingTrends}}

  Forecast Horizon: {{forecastHorizonDays}} days

  Provide the forecast as a JSON array of date and occupancyRate (percentage) pairs, and include a brief explanation of the factors influencing the forecast. The JSON MUST be valid and parsable.
  Ensure dates are in YYYY-MM-DD format.
  DO NOT include any introductory or trailing text.
  The forecasted occupancy rates MUST be between 0 and 100.

  {{output}}
  `,
});

const forecastOccupancyFlow = ai.defineFlow(
  {
    name: 'forecastOccupancyFlow',
    inputSchema: ForecastOccupancyInputSchema,
    outputSchema: ForecastOccupancyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

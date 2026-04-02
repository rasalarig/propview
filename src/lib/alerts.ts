import { getAll, query } from "./db";
import { localSearch } from "./search";

interface AlertRow {
  id: number;
  user_id: number;
  prompt: string;
  is_active: number;
  created_at: string;
}

/**
 * Check all active alerts against a newly created property.
 * If the property matches an alert's prompt (score > 5), create an alert_match.
 */
export async function checkAlertsForProperty(propertyId: number) {
  const alerts = await getAll(
    "SELECT * FROM search_alerts WHERE is_active = 1"
  ) as AlertRow[];

  for (const alert of alerts) {
    try {
      const results = await localSearch(alert.prompt);
      const match = results.find((r) => r.property.id === propertyId);
      if (match && match.score > 5) {
        await query(
          `INSERT INTO alert_matches (alert_id, property_id, score, reasons)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [alert.id, propertyId, match.score, JSON.stringify(match.matchReasons)]
        );
      }
    } catch (error) {
      console.error(
        `Error checking alert ${alert.id} for property ${propertyId}:`,
        error
      );
    }
  }
}

/**
 * Run an alert's prompt against all existing active properties.
 * Returns the number of matches created.
 */
export async function runAlertAgainstAllProperties(alertId: number, prompt: string): Promise<number> {
  const results = await localSearch(prompt);

  let count = 0;
  for (const result of results) {
    if (result.score > 5) {
      const res = await query(
        `INSERT INTO alert_matches (alert_id, property_id, score, reasons)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [alertId, result.property.id, result.score, JSON.stringify(result.matchReasons)]
      );
      if (res.rowCount && res.rowCount > 0) count++;
    }
  }

  return count;
}

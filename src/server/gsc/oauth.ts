/**
 * Google Search Console OAuth integration.
 * Fetches real impressions, clicks, CTR data instead of heuristics.
 */

export interface GSCProperty {
  siteUrl: string;
  permissionLevel: "siteOwner" | "siteFullUser" | "siteRestrictedUser";
}

export interface GSCStats {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function getGSCProperties(accessToken: string): Promise<GSCProperty[]> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.siteEntry ?? [];
}

export async function getGSCTopQueries(accessToken: string, siteUrl: string, days = 90): Promise<GSCStats[]> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 100,
      }),
    }
  );

  const data = await res.json();
  return data.rows?.map((row: any) => ({
    query: row.keys[0],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  })) ?? [];
}

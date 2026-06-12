/**
 * Slack integration (Wave 4): send audit alerts and score drops
 * Notify users when their sites score drops below threshold
 */

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
}

export async function sendSlackAlert(args: {
  webhookUrl: string;
  siteName: string;
  previousScore: number;
  currentScore: number;
  dropThreshold: number;
}) {
  const drop = args.previousScore - args.currentScore;
  if (drop < args.dropThreshold) return; // Only alert if drop exceeds threshold

  const message: SlackMessage = {
    channel: "#alerts",
    text: `🔻 Score drop for ${args.siteName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Site:* ${args.siteName}\n*Previous:* ${args.previousScore}\n*Current:* ${args.currentScore}\n*Drop:* ${drop} points`,
        },
      },
    ],
  };

  try {
    await fetch(args.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message),
    });
  } catch {
    // Silent fail
  }
}

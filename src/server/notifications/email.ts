import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "fake-key-for-build");

export interface AuditCompletionEmail {
  toEmail: string;
  siteUrl: string;
  overallScore: number;
  previousScore?: number;
  scoreDrop?: number;
  threshold?: number;
  auditUrl: string;
}

export async function sendAuditCompletionEmail({
  toEmail,
  siteUrl,
  overallScore,
  previousScore,
  scoreDrop,
  threshold,
  auditUrl,
}: AuditCompletionEmail) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[EMAIL] Would send completion email (no API key configured)");
    return { ok: true };
  }

  const shouldAlert = scoreDrop && threshold && scoreDrop >= threshold;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@google-saas.com",
      to: toEmail,
      subject: shouldAlert
        ? `⚠️ Score drop detected for ${siteUrl}`
        : `✓ Scheduled audit completed for ${siteUrl}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${shouldAlert ? "⚠️ Score Drop Alert" : "✓ Audit Complete"}</h2>

          <p>Hi,</p>
          <p>Your scheduled audit for <strong>${siteUrl}</strong> has completed.</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Overall Score:</strong> <span style="font-size: 24px; color: #6750a4;">${overallScore}/100</span></p>
            ${
              previousScore
                ? `<p><strong>Previous Score:</strong> ${previousScore}</p>`
                : ""
            }
            ${
              scoreDrop
                ? `<p><strong>Score Change:</strong> ${scoreDrop > 0 ? "-" : "+"}${Math.abs(scoreDrop)} points</p>`
                : ""
            }
          </div>

          ${
            shouldAlert
              ? `<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                   <p><strong>Alert triggered:</strong> Score dropped by ${scoreDrop} points (threshold: ${threshold}%)</p>
                 </div>`
              : ""
          }

          <p>
            <a href="${auditUrl}" style="display: inline-block; background: #6750a4; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
              View Full Report
            </a>
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999;">
            This is an automated message from GoogleSaas. You're receiving this because you set up scheduled audits.
          </p>
        </div>
      `,
    });

    return { ok: true };
  } catch (error) {
    console.error("Failed to send audit completion email:", error);
    return { ok: false, error };
  }
}

export async function sendScoreDropAlertEmail({
  toEmail,
  siteUrl,
  overallScore,
  previousScore,
  scoreDrop,
  threshold,
  auditUrl,
}: AuditCompletionEmail) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[EMAIL] Would send score drop alert (no API key configured)");
    return { ok: true };
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@google-saas.com",
      to: toEmail,
      subject: `🔴 Critical: ${siteUrl} score dropped to ${overallScore}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🔴 Score Drop Alert</h2>

          <p>Critical alert for <strong>${siteUrl}</strong>:</p>

          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Score dropped from ${previousScore} to ${overallScore}</strong><br>
              Drop: ${scoreDrop} points (threshold: ${threshold}%)
            </p>
          </div>

          <h3>What to do:</h3>
          <ol>
            <li>Review the full audit report to identify issues</li>
            <li>Check recent changes to your site</li>
            <li>Prioritize fixes for the most impactful checks</li>
          </ol>

          <p>
            <a href="${auditUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
              Review Audit Report
            </a>
          </p>
        </div>
      `,
    });

    return { ok: true };
  } catch (error) {
    console.error("Failed to send score drop alert:", error);
    return { ok: false, error };
  }
}

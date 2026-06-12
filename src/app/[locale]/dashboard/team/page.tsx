import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/material/Card";
import { Button } from "@/components/material/Button";
import { Chip } from "@/components/material/Chip";
import { Users, Mail, Trash2, Shield } from "lucide-react";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/signin`);

  const t = await getTranslations("team");

  // TODO: Fetch team members from DB
  const teamMembers: any[] = [];

  const ROLE_COLORS: Record<string, string> = {
    owner: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
    editor: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
    viewer: "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-12">
        <h1 className="text-3xl font-medium mb-2 flex items-center gap-2">
          <Users className="w-8 h-8" />
          {t("title")}
        </h1>
        <p className="text-[var(--on-surface-variant)]">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6">
        {/* Invite member */}
        <Card elevated>
          <h3 className="text-lg font-medium mb-4">{t("inviteNew")}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">{t("email")}</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="team@example.com"
                  className="flex-1 px-4 py-2 rounded-xl bg-[var(--surface-variant)] text-[var(--on-surface)]"
                />
                <Button variant="filled">Send invite</Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("role")}</label>
              <select className="w-full px-4 py-2 rounded-xl bg-[var(--surface-variant)] text-[var(--on-surface)]">
                <option value="viewer">{t("roleViewer")}</option>
                <option value="editor">{t("roleEditor")}</option>
                <option value="owner">{t("roleOwner")}</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Team members */}
        <div>
          <h3 className="text-lg font-medium mb-4">{t("members")}</h3>
          {teamMembers.length === 0 ? (
            <Card outlined className="text-center py-12">
              <Mail className="mx-auto mb-3 w-8 h-8 text-[var(--outline)]" />
              <p className="text-[var(--on-surface-variant)]">{t("noMembers")}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <Card key={member.id} outlined>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary-container)]" />
                      <div>
                        <p className="font-medium">{member.email}</p>
                        <Chip label={member.role} className={`mt-1 text-xs ${ROLE_COLORS[member.role]}`} />
                      </div>
                    </div>
                    <Button variant="text" size="small">
                      <Trash2 className="w-4 h-4 text-[var(--error)]" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Pending invites */}
        <div>
          <h3 className="text-lg font-medium mb-4">{t("pending")}</h3>
          <Card outlined className="text-center py-8">
            <p className="text-[var(--on-surface-variant)]">{t("noPending")}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

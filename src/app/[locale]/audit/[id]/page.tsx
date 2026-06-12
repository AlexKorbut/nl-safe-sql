import { AuditProgress } from "@/components/audit/AuditProgress";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <AuditProgress auditId={id} />
    </div>
  );
}

import { requirePermission } from "@/lib/rbac";

export default async function NewProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("write:products");
  return <>{children}</>;
}

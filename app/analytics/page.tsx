import RequireAuth from "@/components/admin/RequireAuth";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <AdminWorkspace initialSection="analytics" />
    </RequireAuth>
  );
}

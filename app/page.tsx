import RequireAuth from "@/components/admin/RequireAuth";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <AdminWorkspace initialSection="overview" />
    </RequireAuth>
  );
}

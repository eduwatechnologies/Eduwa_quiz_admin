import RequireAuth from "@/components/admin/RequireAuth";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

export default function UsersPage() {
  return (
    <RequireAuth>
      <AdminWorkspace initialSection="users" />
    </RequireAuth>
  );
}

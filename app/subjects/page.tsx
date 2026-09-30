import RequireAuth from "@/components/admin/RequireAuth";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

export default function SubjectsPage() {
  return (
    <RequireAuth>
      <AdminWorkspace initialSection="subjects" />
    </RequireAuth>
  );
}

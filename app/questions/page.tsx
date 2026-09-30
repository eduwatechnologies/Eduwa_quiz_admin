import RequireAuth from "@/components/admin/RequireAuth";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

export default function QuestionsPage() {
  return (
    <RequireAuth>
      <AdminWorkspace initialSection="questions" />
    </RequireAuth>
  );
}

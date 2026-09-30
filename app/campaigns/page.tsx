import RequireAuth from "@/components/admin/RequireAuth";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

export default function CampaignsPage() {
  return (
    <RequireAuth>
      <AdminWorkspace initialSection="campaigns" />
    </RequireAuth>
  );
}

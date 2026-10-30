import { AppShell } from "@/components/app-shell";
import { ModuleTheme } from "@/components/module-theme";
import { signOut } from "./actions";

// AUTH TEMPORARIAMENTE DESATIVADA — o shell mostra "Equipe HC-UFTM".
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleTheme className="app-surface min-h-screen">
      <AppShell signOut={signOut}>{children}</AppShell>
    </ModuleTheme>
  );
}

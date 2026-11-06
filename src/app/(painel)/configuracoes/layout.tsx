import { PageHeader } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";

export default function SettingsLayout({ children }: LayoutProps<"/configuracoes">) {
  return (
    <>
      <PageHeader title="Configurações" />
      <SettingsTabs />
      {children}
    </>
  );
}

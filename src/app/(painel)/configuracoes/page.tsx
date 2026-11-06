import { getSettings, templateVariables } from "@/lib/settings";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsForm settings={settings} variables={templateVariables} />;
}

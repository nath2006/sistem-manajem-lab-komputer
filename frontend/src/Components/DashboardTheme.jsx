import React from "react";
import { useSettings } from "../Context/SettingsContext";
import { dashboardTokens } from "../utils/dashboardTheme";
export default function DashboardTheme({ children }) {
  const { settings } = useSettings();
  return (
    <div
      className="dashboard-theme"
      style={dashboardTokens(settings.primary_color)}
    >
      {children}
    </div>
  );
}

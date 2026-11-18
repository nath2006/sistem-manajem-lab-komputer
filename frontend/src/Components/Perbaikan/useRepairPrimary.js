import { useSettings } from '../../Context/SettingsContext';
import { dashboardTokens } from '../../utils/dashboardTheme';

// Context follows React portals; do not depend on a DashboardTheme ancestor.
export default function useRepairPrimary() {
  const { settings } = useSettings();
  const tokens = dashboardTokens(settings.primary_color);
  return {
    className: 'w-full px-5 py-2 text-sm font-semibold text-center rounded-md bg-maroon hover:bg-maroon hover:shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 disabled:opacity-50',
    style: { backgroundColor: tokens['--dashboard-primary'], color: tokens['--dashboard-on-primary'] },
  };
}

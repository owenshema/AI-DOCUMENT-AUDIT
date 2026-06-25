/** Dashboard theme tokens — landing-page style cards, readable in light & dark mode */

const CARD_HOVER =
  'transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg hover:z-10';

export function getDashboardTheme(dark) {
  if (dark) {
    return {
      card: `rounded-2xl bg-white/[0.05] p-5 shadow-sm ${CARD_HOVER} hover:bg-white/[0.07] hover:shadow-indigo-900/30`,
      cardInteractive: `rounded-2xl bg-white/[0.05] p-5 text-left ${CARD_HOVER} hover:bg-white/[0.07] hover:shadow-indigo-900/30`,
      section: 'overflow-hidden rounded-2xl bg-white/[0.05]',
      sectionHeader: 'flex items-center justify-between px-5 py-4',
      listDivider: 'divide-y divide-white/[0.06]',
      pill: 'rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-300',
      textPrimary: 'text-white',
      textSecondary: 'text-slate-300',
      textMuted: 'text-slate-400',
      textLabel: 'text-slate-400',
      barTrack: 'bg-white/10',
      iconWrap: 'bg-indigo-600 shadow-sm shadow-indigo-600/25',
      iconColor: 'text-white',
      statIconBg: {
        indigo: 'bg-indigo-600/20 text-indigo-300',
        amber: 'bg-amber-500/20 text-amber-300',
        emerald: 'bg-emerald-500/20 text-emerald-300',
        red: 'bg-red-500/20 text-red-300',
        blue: 'bg-blue-500/20 text-blue-300',
      },
      quickActionIcon: 'bg-indigo-600/20 text-indigo-300',
      docIcon: 'bg-indigo-600/20 text-indigo-300',
      chartBar: 'bg-indigo-500',
      riskTrack: 'bg-white/8',
    };
  }

  return {
    card: `rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm shadow-indigo-100/40 ${CARD_HOVER} hover:border-indigo-300 hover:shadow-indigo-200/60`,
    cardInteractive: `rounded-2xl border border-indigo-100 bg-gray-50 p-5 text-left shadow-sm ${CARD_HOVER} hover:border-indigo-300 hover:bg-white hover:shadow-indigo-200/60`,
    section: 'overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm shadow-indigo-100/30',
    sectionHeader: 'flex items-center justify-between px-5 py-4',
    listDivider: 'divide-y divide-gray-100',
    pill: 'rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-indigo-700',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-500',
    textLabel: 'text-gray-600',
    barTrack: 'bg-gray-100',
    iconWrap: 'bg-indigo-600 shadow-sm shadow-indigo-600/25',
    iconColor: 'text-white',
    statIconBg: {
      indigo: 'bg-indigo-100 text-indigo-600',
      amber: 'bg-amber-100 text-amber-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      red: 'bg-red-100 text-red-600',
      blue: 'bg-blue-100 text-blue-600',
    },
    quickActionIcon: 'bg-indigo-100 text-indigo-600',
    docIcon: 'bg-indigo-100 text-indigo-600',
    chartBar: 'bg-indigo-600',
    riskTrack: 'bg-gray-100',
  };
}

// Legacy exports — dark-mode defaults for any file not yet migrated
export const dashboardCard = 'rounded-xl bg-white/[0.04]';
export const dashboardCardHover = 'transition-colors hover:bg-white/[0.06]';
export const dashboardSection = 'overflow-hidden rounded-xl bg-white/[0.04]';
export const dashboardSectionHeader = 'flex items-center justify-between px-5 py-4';
export const dashboardListDivider = 'divide-y divide-white/[0.04]';
export const dashboardPill = 'rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-300';

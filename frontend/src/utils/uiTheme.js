/** Shared blue / white theme — readable in both light and dark mode */

export const CARD_LIFT = 'card-lift';

const CARD_HOVER = CARD_LIFT;

/** App-wide surfaces, text, buttons, banners (blue + white only). */
export function getAppTheme(dark) {
  if (dark) {
    return {
      page: 'bg-[#0b1a2e]',
      surface: 'bg-[#122a45]',
      card: 'rounded-2xl border border-blue-400/25 bg-[#122a45]',
      cardBorder: 'border-blue-400/25',
      modal: 'rounded-2xl border border-blue-400/30 bg-[#122a45] shadow-2xl',
      text: 'text-white',
      sub: 'text-blue-100/85',
      muted: 'text-blue-200/70',
      faint: 'text-blue-300/55',
      divider: 'divide-blue-400/15',
      border: 'border-blue-400/25',
      borderSoft: 'border-blue-400/15',
      input: 'rounded-xl border border-blue-400/30 bg-[#0b1a2e] text-white outline-none focus:border-blue-400',
      inputSm: 'rounded-lg border border-blue-400/30 bg-[#0b1a2e] text-white outline-none focus:border-blue-400',
      btn: 'bg-blue-600 text-white hover:bg-blue-500',
      btnSecondary: 'border border-blue-400/35 bg-blue-500/15 text-blue-50 hover:bg-blue-500/25',
      tabActive: 'bg-blue-600 text-white',
      tabIdle: 'border border-blue-400/30 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20',
      banner: 'border border-blue-400/35 bg-blue-500/20',
      bannerTitle: 'text-blue-50',
      bannerBody: 'text-blue-100/90',
      pill: 'bg-blue-500/25 text-blue-100',
      pillSoft: 'bg-blue-500/15 text-blue-200',
      icon: 'text-blue-300',
      iconWrap: 'bg-blue-500/20 border border-blue-400/30 text-blue-200',
      rowHover: 'hover:bg-blue-500/10',
      dropzone: 'border-blue-400/35 bg-[#122a45] hover:border-blue-400/60 hover:bg-blue-500/10',
      dropzoneActive: 'border-blue-400 bg-blue-500/20',
      panel: 'bg-[#0b1a2e]',
      success: 'border-blue-400/40 bg-blue-500/20',
      successText: 'text-blue-50',
      error: 'border-blue-300/40 bg-blue-900/50',
      errorText: 'text-blue-50',
      overlay: 'bg-[#0b1a2e]/70',
    };
  }

  return {
    page: 'bg-[#f0f7ff]',
    surface: 'bg-white',
    card: 'rounded-2xl border border-blue-200 bg-white shadow-sm',
    cardBorder: 'border-blue-200',
    modal: 'rounded-2xl border border-blue-200 bg-white shadow-2xl',
    text: 'text-slate-900',
    sub: 'text-slate-700',
    muted: 'text-slate-600',
    faint: 'text-slate-500',
    divider: 'divide-blue-100',
    border: 'border-blue-200',
    borderSoft: 'border-blue-100',
    input: 'rounded-xl border border-blue-200 bg-white text-slate-900 outline-none focus:border-blue-500',
    inputSm: 'rounded-lg border border-blue-200 bg-white text-slate-900 outline-none focus:border-blue-500',
    btn: 'bg-blue-600 text-white hover:bg-blue-700',
    btnSecondary: 'border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
    tabActive: 'bg-blue-600 text-white',
    tabIdle: 'border border-blue-200 bg-white text-blue-800 hover:bg-blue-50',
    banner: 'border border-blue-200 bg-blue-50',
    bannerTitle: 'text-blue-900',
    bannerBody: 'text-blue-800',
    pill: 'bg-blue-100 text-blue-800',
    pillSoft: 'bg-blue-50 text-blue-700',
    icon: 'text-blue-600',
    iconWrap: 'bg-blue-100 border border-blue-200 text-blue-700',
    rowHover: 'hover:bg-blue-50',
    dropzone: 'border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50',
    dropzoneActive: 'border-blue-500 bg-blue-100',
    panel: 'bg-blue-50',
    success: 'border-blue-200 bg-blue-50',
    successText: 'text-blue-900',
    error: 'border-blue-300 bg-blue-100',
    errorText: 'text-blue-900',
    overlay: 'bg-slate-900/50',
  };
}

/** Status pills — blue shades only (readable on light & dark). */
export function statusPill(status, dark) {
  const key = String(status || '').toLowerCase();
  if (dark) {
    const map = {
      approved: 'bg-blue-500/30 text-blue-100',
      in_review: 'bg-blue-500/20 text-blue-200',
      in_progress: 'bg-blue-400/25 text-blue-100',
      changes_requested: 'bg-blue-600/35 text-blue-50',
      rejected: 'bg-blue-800/50 text-blue-100',
      uploaded: 'bg-blue-500/20 text-blue-200',
      processing: 'bg-blue-400/25 text-blue-100',
      reviewed: 'bg-blue-500/25 text-blue-100',
      archived: 'bg-blue-900/40 text-blue-200',
      flagged: 'bg-blue-700/40 text-blue-100',
      ready_for_client: 'bg-blue-500/30 text-blue-100',
    };
    return map[key] || 'bg-blue-500/20 text-blue-200';
  }
  const map = {
    approved: 'bg-blue-600 text-white',
    in_review: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-blue-200 text-blue-900',
    changes_requested: 'bg-blue-100 text-blue-900',
    rejected: 'bg-blue-900 text-white',
    uploaded: 'bg-blue-50 text-blue-700',
    processing: 'bg-blue-100 text-blue-800',
    reviewed: 'bg-blue-100 text-blue-800',
    archived: 'bg-blue-50 text-blue-600',
    flagged: 'bg-blue-200 text-blue-900',
    ready_for_client: 'bg-blue-600 text-white',
  };
  return map[key] || 'bg-blue-50 text-blue-700';
}

export function getDashboardTheme(dark) {
  const t = getAppTheme(dark);
  if (dark) {
    return {
      card: `rounded-2xl border border-blue-400/25 bg-[#122a45] p-5 shadow-sm ${CARD_HOVER}`,
      cardInteractive: `rounded-2xl border border-blue-400/25 bg-[#122a45] p-5 text-left ${CARD_HOVER} hover:bg-blue-500/10`,
      section: 'overflow-hidden rounded-2xl border border-blue-400/25 bg-[#122a45]',
      sectionHeader: 'flex items-center justify-between px-5 py-4',
      listDivider: 'divide-y divide-blue-400/15',
      pill: 'rounded-full bg-blue-500/25 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-100',
      textPrimary: t.text,
      textSecondary: t.sub,
      textMuted: t.muted,
      textLabel: t.muted,
      barTrack: 'bg-blue-500/20',
      iconWrap: 'bg-blue-600 shadow-sm shadow-blue-900/40',
      iconColor: 'text-white',
      statIconBg: {
        indigo: 'bg-blue-500/25 text-blue-200',
        amber: 'bg-blue-500/25 text-blue-200',
        emerald: 'bg-blue-500/25 text-blue-200',
        red: 'bg-blue-700/40 text-blue-100',
        blue: 'bg-blue-500/25 text-blue-200',
      },
      quickActionIcon: 'bg-blue-500/25 text-blue-200',
      docIcon: 'bg-blue-500/25 text-blue-200',
      chartBar: 'bg-blue-500',
      riskTrack: 'bg-blue-500/20',
    };
  }

  return {
    card: `rounded-2xl border border-blue-200 bg-white p-5 shadow-sm ${CARD_HOVER} hover:border-blue-400`,
    cardInteractive: `rounded-2xl border border-blue-200 bg-blue-50/50 p-5 text-left shadow-sm ${CARD_HOVER} hover:border-blue-400 hover:bg-white`,
    section: 'overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm',
    sectionHeader: 'flex items-center justify-between px-5 py-4',
    listDivider: 'divide-y divide-blue-100',
    pill: 'rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-800',
    textPrimary: t.text,
    textSecondary: t.sub,
    textMuted: t.muted,
    textLabel: t.muted,
    barTrack: 'bg-blue-100',
    iconWrap: 'bg-blue-600 shadow-sm shadow-blue-600/25',
    iconColor: 'text-white',
    statIconBg: {
      indigo: 'bg-blue-100 text-blue-700',
      amber: 'bg-blue-100 text-blue-700',
      emerald: 'bg-blue-100 text-blue-700',
      red: 'bg-blue-200 text-blue-900',
      blue: 'bg-blue-100 text-blue-700',
    },
    quickActionIcon: 'bg-blue-100 text-blue-700',
    docIcon: 'bg-blue-100 text-blue-700',
    chartBar: 'bg-blue-600',
    riskTrack: 'bg-blue-100',
  };
}

// Legacy exports
export const dashboardCard = 'rounded-xl bg-white/[0.04]';
export const dashboardCardHover = 'transition-colors hover:bg-white/[0.06]';
export const dashboardSection = 'overflow-hidden rounded-xl bg-white/[0.04]';
export const dashboardSectionHeader = 'flex items-center justify-between px-5 py-4';
export const dashboardListDivider = 'divide-y divide-white/[0.04]';
export const dashboardPill = 'rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-300';

// Design tokens from the Manus concept canvas. Old key names are kept (sage, cream, ...)
// and remapped so every existing screen picks up the new palette at once.
export const Palette = {
  // Core
  sage: '#174F4A', // accent (deep green)
  sageTint: '#E5F0ED', // wash: selected chips, quiet highlights
  cream: '#FFFFFF', // page surface (the new design is white paper, not cream)
  white: '#FFFFFF',
  nearBlack: '#202D2B', // ink
  textSecondary: '#202D2B',
  muted: '#52615E', // secondary text (passes 4.5:1 on white)
  border: '#D9E2DD', // hairline dividers
  chipBorder: '#71817B', // outline for chips and fields
  danger: '#833E3A',
  // Legacy names now pointing at the quiet danger red instead of terracotta
  terracotta: '#833E3A',
  terracottaText: '#833E3A',
  // Severity rail bands
  band1: '#E5EFEB',
  band2: '#CBDDD5',
  band3: '#AAC8BD',
  tick: '#526A62',
  scrim: 'rgba(23,38,34,0.26)',
};

// Severity is shown as text (score + band), never colour alone. These stay for any
// remaining pills; they are muted greens/ambers that sit with the new palette.
export const SeverityColors = {
  mild: { bg: '#E5EFEB', text: '#174F4A' },
  moderate: { bg: '#F3ECD9', text: '#5C4510' },
  severe: { bg: '#F3E1DF', text: '#833E3A' },
};

// Minimum comfortable touch target (Apple HIG: 44pt).
export const MIN_TOUCH = 44;

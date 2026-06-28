/**
 * CRACO config — keeps Tailwind wired through postcss.config.js.
 * Do not override PostCSS plugins here; that breaks Tailwind compilation.
 */
module.exports = {
  style: {
    postcss: {
      mode: 'file',
    },
  },
};

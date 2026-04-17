module.exports = {
  plugins: [
    {
      name: 'preset-default',
    },
    // In SVGO 4.x, removeViewBox is listed after the preset to avoid warnings
    {
      name: 'removeViewBox',
      params: {
        active: false,
      },
    },
  ],
};

module.exports = {
  plugins: [
    {
      name: 'preset-default',
    },
    // Move removeViewBox outside of preset-default to avoid configuration warning
    {
      name: 'removeViewBox',
      active: false,
    },
  ],
};

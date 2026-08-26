const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withManifestReplace(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (application) {
      const existing = application.$['tools:replace'];
      if (!existing) {
        application.$['tools:replace'] = 'android:fullBackupContent,android:dataExtractionRules';
      } else if (!existing.includes('android:dataExtractionRules')) {
        application.$['tools:replace'] = `${existing},android:fullBackupContent,android:dataExtractionRules`;
      }
    }
    return mod;
  });
};

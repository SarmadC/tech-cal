/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Adds `use_modular_headers!` to the Podfile so that Firebase/AppCheck
// Swift pods (pulled in by @react-native-google-signin) can be linked as
// static libraries.
function withPodfileModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(
          'prepare_react_native_project!',
          'prepare_react_native_project!\n\nuse_modular_headers!'
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return cfg;
    },
  ]);
}

module.exports = withPodfileModularHeaders;

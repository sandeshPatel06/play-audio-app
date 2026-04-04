const {
  withAndroidManifest,
  withDangerousMod,
  withInfoPlist,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Combined Expo Config Plugin for App Patches:
 * 1. Reanimated Hermes Fix (for RN 0.83.4 target name discrepancy)
 * 2. Network Security Config (for cleartext traffic permissions)
 */

// Android: network_security_config content
const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">totalcert.co.uk</domain>
    </domain-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">*.*</domain>
    </domain-config>
</network-security-config>`;

module.exports = function withAppPatches(config) {
  // 1. AndroidManifest setup for Network Security
  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (app && !app.$['android:networkSecurityConfig']) {
      app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return config;
  });

  // 2. Dangerous Mods (File System Operations)
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      // --- Network Security Config File ---
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      const networkConfigPath = path.join(resDir, 'network_security_config.xml');

      if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir, { recursive: true });
      }

      fs.writeFileSync(networkConfigPath, NETWORK_SECURITY_XML);
      console.log('✅ [withAppPatches] Created network_security_config.xml');

      // --- Reanimated Hermes Fix ---
      const reanimatedCmake = path.join(
        config.modRequest.projectRoot,
        'node_modules/react-native-reanimated/android/src/main/cpp/worklets/CMakeLists.txt'
      );

      if (fs.existsSync(reanimatedCmake)) {
        let content = fs.readFileSync(reanimatedCmake, 'utf8');
        const oldText = 'target_link_libraries(worklets hermes-engine::libhermes)';
        const newText = `if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
    target_link_libraries(worklets hermes-engine::hermesvm)
  else()
    target_link_libraries(worklets hermes-engine::libhermes)
  endif()`;

        if (content.includes(oldText) && !content.includes('hermesvm')) {
          content = content.replace(oldText, newText);
          fs.writeFileSync(reanimatedCmake, content);
          console.log('✅ [withAppPatches] Patched Reanimated for hermesvm target.');
        }
      }

      return config;
    },
  ]);

  // 3. iOS: Add ATS exception
  config = withInfoPlist(config, (config) => {
    config.modResults.NSAppTransportSecurity = {
      NSExceptionDomains: {
        'totalcert.co.uk': {
          NSIncludesSubdomains: true,
          NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
          NSTemporaryExceptionMinimumTLSVersion: 'TLSv1.1',
        },
      },
    };
    return config;
  });

  return config;
};

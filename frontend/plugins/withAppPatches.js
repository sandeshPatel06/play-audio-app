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

      // --- Reanimated Hermes Fix (CMake) ---
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
          console.log('✅ [withAppPatches] Patched Reanimated CMake (hermesvm).');
        }
      }

      // --- Reanimated Java Fixes (RN 0.83.4 compatibility) ---
      const projectRoot = config.modRequest.projectRoot;
      
      // 1. BorderRadiiDrawableUtils.java
      const borderRadiiPath = path.join(
        projectRoot,
        'node_modules/react-native-reanimated/android/src/reactNativeVersionPatch/BorderRadiiDrawableUtils/latest/com/swmansion/reanimated/BorderRadiiDrawableUtils.java'
      );
      if (fs.existsSync(borderRadiiPath)) {
        let content = fs.readFileSync(borderRadiiPath, 'utf8');
        const oldCall = 'return length.resolve(bounds.width(), bounds.height()).toPixelFromDIP().getHorizontal();';
        const newCall = 'return length.resolve((float)Math.max(bounds.width(), bounds.height()));';
        if (content.includes(oldCall)) {
          content = content.replace(oldCall, newCall);
          fs.writeFileSync(borderRadiiPath, content);
          console.log('✅ [withAppPatches] Patched BorderRadiiDrawableUtils.java');
        }
      }

      // 2. ReanimatedModule.java
      const modPath = path.join(
        projectRoot,
        'node_modules/react-native-reanimated/android/src/main/java/com/swmansion/reanimated/ReanimatedModule.java'
      );
      if (fs.existsSync(modPath)) {
        let content = fs.readFileSync(modPath, 'utf8');
        
        // Remove failing import
        content = content.replace('import com.facebook.react.uimanager.UIManagerModuleListener;', '');
        
        // Remove implementation of removed interface
        content = content.replace('implements LifecycleEventListener, UIManagerModuleListener, UIManagerListener', 
                                 'implements LifecycleEventListener, UIManagerListener');
        
        // Fix listener registration methods
        content = content.replace('uiManager.addUIManagerListener(this);', 'uiManager.addUIManagerEventListener(this);');
        content = content.replace('uiManager.removeUIManagerListener(this)', 'uiManager.removeUIManagerEventListener(this)');
        
        // Merge the two willDispatchViewUpdates into one that handles both Fabric and Paper
        const oldFabricMethod = /public void willDispatchViewUpdates\(@NonNull UIManager uiManager\) \{[\s\S]*?throw new RuntimeException\("\[Reanimated\] Failed to obtain instance of FabricUIManager\."\);[\s\S]*?\}[\s\S]*?\}/;
        const newUnifiedMethod = `public void willDispatchViewUpdates(@NonNull UIManager uiManager) {
    if (mOperations.isEmpty()) {
      return;
    }
    final ArrayList<UIThreadOperation> operations = mOperations;
    mOperations = new ArrayList<>();
    if (uiManager instanceof FabricUIManager) {
      ((FabricUIManager) uiManager).addUIBlock(uiBlockViewResolver -> {
        NodesManager nodesManager = getNodesManager();
        for (UIThreadOperation operation : operations) {
          operation.execute(nodesManager);
        }
      });
    } else if (uiManager instanceof UIManagerModule) {
      ((UIManagerModule) uiManager).addUIBlock(nativeViewHierarchyManager -> {
        NodesManager nodesManager = getNodesManager();
        for (UIThreadOperation operation : operations) {
          operation.execute(nodesManager);
        }
      });
    }
  }`;
        
        if (content.match(oldFabricMethod)) {
           content = content.replace(oldFabricMethod, newUnifiedMethod);
        }

        // Remove the old Paper-only override which no longer matches the interface parameter
        const oldPaperMethod = /@Override\s+public void willDispatchViewUpdates\(final UIManagerModule uiManager\) \{[\s\S]*?\}\s+?\}\s+/;
        content = content.replace(oldPaperMethod, '');

        fs.writeFileSync(modPath, content);
        console.log('✅ [withAppPatches] Patched ReanimatedModule.java (Robust Unified ViewUpdates)');
      }

      // 3. ReanimatedPackage.java
      const packPath = path.join(
        projectRoot,
        'node_modules/react-native-reanimated/android/src/main/java/com/swmansion/reanimated/ReanimatedPackage.java'
      );
      if (fs.existsSync(packPath)) {
        let content = fs.readFileSync(packPath, 'utf8');
        // Fix Systrace constant
        content = content.replace(/Systrace\.TRACE_TAG_REACT_JAVA_BRIDGE/g, 'Systrace.TRACE_TAG_REACT');
        fs.writeFileSync(packPath, content);
        console.log('✅ [withAppPatches] Patched ReanimatedPackage.java');
      }

      // 4. android/CMakeLists.txt (Remove -Werror)
      const reanimatedMainCmake = path.join(
        projectRoot,
        'node_modules/react-native-reanimated/android/CMakeLists.txt'
      );
      if (fs.existsSync(reanimatedMainCmake)) {
        let content = fs.readFileSync(reanimatedMainCmake, 'utf8');
        content = content.replace(/-Wall -Werror/g, '-Wall -Wno-error');
        fs.writeFileSync(reanimatedMainCmake, content);
        console.log('✅ [withAppPatches] Patched Reanimated android/CMakeLists.txt (Removed -Werror)');
      }

      // 5. ReanimatedModuleProxy.cpp (shadowNodeFromValue shim)
      const proxyCppPath = path.join(
        projectRoot,
        'node_modules/react-native-reanimated/Common/cpp/reanimated/NativeModules/ReanimatedModuleProxy.cpp'
      );
      if (fs.existsSync(proxyCppPath)) {
        let content = fs.readFileSync(proxyCppPath, 'utf8');
        const shim = `
#include <react/renderer/uimanager/primitives.h>
namespace facebook { namespace react {
#if REACT_NATIVE_MINOR_VERSION >= 83
inline static std::shared_ptr<const ShadowNode> shadowNodeFromValue(jsi::Runtime &runtime, const jsi::Value &value) {
  return value.asObject(runtime).getNativeState<ShadowNodeWrapper>(runtime)->shadowNode;
}
#endif
}}
`;
        if (content.includes('shadowNodeFromValue') && !content.includes('getNativeState<ShadowNodeWrapper>')) {
           content = shim + content;
           fs.writeFileSync(proxyCppPath, content);
           console.log('✅ [withAppPatches] Patched ReanimatedModuleProxy.cpp (shadowNodeFromValue shim)');
        }
      }

      // 6. ReanimatedMountHook.h (HighResTimeStamp)
      const mountHookHPath = path.join(
        projectRoot,
        'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ReanimatedMountHook.h'
      );
      if (fs.existsSync(mountHookHPath)) {
        let content = fs.readFileSync(mountHookHPath, 'utf8');
        if (content.includes('double mountTime')) {
          content = content.replace('double mountTime', 'HighResTimeStamp mountTime');
          fs.writeFileSync(mountHookHPath, content);
          console.log('✅ [withAppPatches] Patched ReanimatedMountHook.h (HighResTimeStamp)');
        }
      }

      // 7. ReanimatedMountHook.cpp (HighResTimeStamp)
      const mountHookCppPath = path.join(
        projectRoot,
        'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ReanimatedMountHook.cpp'
      );
      if (fs.existsSync(mountHookCppPath)) {
        let content = fs.readFileSync(mountHookCppPath, 'utf8');
        if (content.includes('double mountTime')) {
          content = content.replace('double mountTime', 'HighResTimeStamp mountTime');
          fs.writeFileSync(mountHookCppPath, content);
          console.log('✅ [withAppPatches] Patched ReanimatedMountHook.cpp (HighResTimeStamp)');
        }
      }

      // 8. LayoutAnimationsProxy.cpp (rawProps removal)
      const layoutProxyPath = path.join(
        projectRoot,
        'node_modules/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy.cpp'
      );
      if (fs.existsSync(layoutProxyPath)) {
        let content = fs.readFileSync(layoutProxyPath, 'utf8');
        const oldMerge = 'layoutAnimation.finalView->props->rawProps';
        if (content.includes(oldMerge)) {
          content = content.replace(oldMerge, 'folly::dynamic::object()');
          fs.writeFileSync(layoutProxyPath, content);
          console.log('✅ [withAppPatches] Patched LayoutAnimationsProxy.cpp (rawProps fallback)');
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

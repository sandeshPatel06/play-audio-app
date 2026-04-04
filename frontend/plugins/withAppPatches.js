const {
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Combined Expo Config Plugin for App Patches:
 * 1. Reanimated Hermes Fix (for RN 0.83.4 target name discrepancy)
 */

module.exports = function withAppPatches(config) {
  // 1. Dangerous Mods (File System Operations)
  config = withDangerousMod(config, [
    'android',
    async (config) => {
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
        }
      }

      // 2. ReanimatedModule.java (Full Rewrite for RN 0.83.4 Compatibility)
      const modPath = path.join(
        projectRoot,
        'node_modules/react-native-reanimated/android/src/main/java/com/swmansion/reanimated/ReanimatedModule.java'
      );
      if (fs.existsSync(modPath)) {
        const fullContent = `package com.swmansion.reanimated;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.bridge.UIManagerListener;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.common.UIManagerType;
import com.swmansion.worklets.WorkletsModule;
import com.facebook.proguard.annotations.DoNotStrip;
import java.util.ArrayList;
import java.util.Objects;
import javax.annotation.Nullable;

@ReactModule(name = ReanimatedModule.NAME)
public class ReanimatedModule extends NativeReanimatedModuleSpec
    implements LifecycleEventListener, UIManagerListener {

  public static final String NAME = "ReanimatedModule";

  private NodesManager mNodesManager;
  private ArrayList<UIThreadOperation> mOperations = new ArrayList<>();
  private @Nullable Runnable mUnsubscribe = () -> {};

  private interface UIThreadOperation {
    void execute(NodesManager nodesManager);
  }

  public ReanimatedModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public void initialize() {
    super.initialize();
    ReactApplicationContext reactCtx = getReactApplicationContext();
    reactCtx.addLifecycleEventListener(this);
    
    UIManager uiManager = UIManagerHelper.getUIManager(reactCtx, UIManagerHelper.getUIManagerType(reactCtx));
    if (uiManager != null) {
      uiManager.addUIManagerEventListener(this);
    }
  }

  public NodesManager getNodesManager() {
    if (mNodesManager == null) {
      mNodesManager = new NodesManager(getReactApplicationContext(), getReactApplicationContext().getNativeModule(WorkletsModule.class));
    }
    return mNodesManager;
  }

  @Override
  public void willDispatchViewUpdates(@NonNull UIManager uiManager) {
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
  }

  @Override
  public void didDispatchMountItems(@NonNull UIManager uiManager) {}

  @Override
  public void didMountItems(@NonNull UIManager uiManager) {}

  @Override
  public void didScheduleMountItems(@NonNull UIManager uiManager) {}

  @Override
  public void onHostResume() {
    if (mNodesManager != null) {
      mNodesManager.onHostResume();
    }
  }

  @Override
  public void onHostPause() {
    if (mNodesManager != null) {
      mNodesManager.onHostPause();
    }
  }

  @Override
  public void onHostDestroy() {}

  @Override
  public void invalidate() {
    super.invalidate();
    if (mNodesManager != null) {
      mNodesManager.invalidate();
    }
    if (mUnsubscribe != null) {
      mUnsubscribe.run();
    }
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  @DoNotStrip
  @Override
  public boolean installTurboModule() {
    return true;
  }

  @ReactMethod
  @DoNotStrip
  @Override
  public void addListener(String ignoredEventName) {}

  @ReactMethod
  @DoNotStrip
  @Override
  public void removeListeners(Integer ignoredCount) {}
}
`;
        fs.writeFileSync(modPath, fullContent);
        console.log('✅ [withAppPatches] Fully rewrote ReanimatedModule.java');
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

  return config;
};

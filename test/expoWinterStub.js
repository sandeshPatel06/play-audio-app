if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}

Object.defineProperty(globalThis, "__ExpoImportMetaRegistry", {
  value: { url: null },
  configurable: true,
  writable: true,
});

module.exports = {};

(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/MapComponent.tsx [app-client] (ecmascript, next/dynamic entry, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "static/chunks/node_modules_34619a67._.js",
  "static/chunks/components_MapComponent_tsx_7ec19d14._.js",
  {
    "path": "static/chunks/node_modules_leaflet_dist_leaflet_ef5f0413.css",
    "included": [
      "[project]/node_modules/leaflet/dist/leaflet.css [app-client] (css)"
    ]
  },
  "static/chunks/components_MapComponent_tsx_2819b73b._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/components/MapComponent.tsx [app-client] (ecmascript, next/dynamic entry)");
    });
});
}),
]);
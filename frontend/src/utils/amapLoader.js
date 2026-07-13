const AMAP_SCRIPT_ID = 'rts-amap-sdk';
let amapPromise = null;
let runtimeAmapKeyPromise = null;

export function loadAmapSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('当前环境不支持地图加载'));
  }
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapPromise) return amapPromise;

  amapPromise = resolveAmapKey().then((amapKey) => new Promise((resolve, reject) => {
    const existingScript = document.getElementById(AMAP_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.AMap));
      existingScript.addEventListener('error', () => reject(new Error('高德地图脚本加载失败')));
      return;
    }

    const script = document.createElement('script');
    script.id = AMAP_SCRIPT_ID;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(amapKey)}&plugin=AMap.ToolBar,AMap.Scale`;
    script.async = true;
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
        return;
      }
      reject(new Error('高德地图 SDK 未就绪'));
    };
    script.onerror = () => reject(new Error('高德地图脚本加载失败'));
    document.head.appendChild(script);
  }));

  return amapPromise;
}

export function getAmapKey() {
  return resolveAmapKey();
}

async function resolveAmapKey() {
  const buildTimeKey = import.meta.env.VITE_AMAP_JS_KEY || window.__TSEP_AMAP_JS_KEY;
  if (buildTimeKey) return buildTimeKey;
  if (runtimeAmapKeyPromise) return runtimeAmapKeyPromise;

  runtimeAmapKeyPromise = fetch('/api/runtime-config')
    .then((response) => (response.ok ? response.json() : {}))
    .then((payload) => payload.amap_js_key || payload.amapJsKey || '')
    .catch(() => '')
    .then((runtimeKey) => {
      if (!runtimeKey) {
        throw new Error('未配置高德地图 JS Key，请设置 TSEP_AMAP_JS_KEY 或 VITE_AMAP_JS_KEY');
      }
      return runtimeKey;
    });
  return runtimeAmapKeyPromise;
}

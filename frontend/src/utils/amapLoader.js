const AMAP_KEY = '936828d7916fa3667a618bdfea983daf';
const AMAP_SCRIPT_ID = 'rts-amap-sdk';
let amapPromise = null;

export function loadAmapSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('当前环境不支持地图加载'));
  }
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapPromise) return amapPromise;

  amapPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(AMAP_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.AMap));
      existingScript.addEventListener('error', () => reject(new Error('高德地图脚本加载失败')));
      return;
    }

    const script = document.createElement('script');
    script.id = AMAP_SCRIPT_ID;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.ToolBar,AMap.Scale`;
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
  });

  return amapPromise;
}

export function getAmapKey() {
  return AMAP_KEY;
}

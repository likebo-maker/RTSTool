from __future__ import annotations

import json
import os
import sys
import threading
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any


HEADQUARTERS_GEO = {
    "city": "深圳",
    "lng": 114.0579,
    "lat": 22.5431,
    "source": "manual",
}

GEO_CONFIG = {
    "useAmapBasemap": True,
    "useGeoCache": True,
    "allowAmapGeocode": True,
    "fallbackToHeadquarters": True,
    "headquarters": {
        "name": "中国区用户服务部",
        "city": "深圳",
        "lng": 114.0579,
        "lat": 22.5431,
    },
}

HEADQUARTERS_KEYWORDS = (
    "中国区用户服务部",
    "用户服务部",
    "中国区总部",
    "用服总部",
    "技术支持中心",
    "中国区",
    "总部",
)

DEFAULT_COORDINATES: dict[str, tuple[str, float, float]] = {
    "北京分公司": ("北京", 116.407526, 39.90403),
    "北京战略客户部": ("北京", 116.407526, 39.90403),
    "上海分公司": ("上海", 121.473701, 31.230416),
    "广州分公司": ("广州", 113.264435, 23.129163),
    "深圳分公司": ("深圳", 114.0579, 22.5431),
    "成都分公司": ("成都", 104.066541, 30.572269),
    "武汉分公司": ("武汉", 114.305392, 30.593098),
    "杭州分公司": ("杭州", 120.15515, 30.274149),
    "南京分公司": ("南京", 118.796877, 32.060255),
    "西安分公司": ("西安", 108.93977, 34.341574),
    "重庆分公司": ("重庆", 106.551556, 29.563009),
    "沈阳分公司": ("沈阳", 123.431475, 41.805698),
    "大连分公司": ("大连", 121.614682, 38.914003),
    "长春分公司": ("长春", 125.323544, 43.817071),
    "哈尔滨分公司": ("哈尔滨", 126.642464, 45.756967),
    "黑吉分公司": ("哈尔滨", 126.642464, 45.756967),
    "济南分公司": ("济南", 117.120128, 36.652069),
    "青岛分公司": ("青岛", 120.382639, 36.067082),
    "郑州分公司": ("郑州", 113.625368, 34.746599),
    "长沙分公司": ("长沙", 112.938814, 28.228209),
    "南昌分公司": ("南昌", 115.858197, 28.682892),
    "福州分公司": ("福州", 119.296389, 26.074268),
    "厦门分公司": ("厦门", 118.089425, 24.479834),
    "昆明分公司": ("昆明", 102.832891, 24.880095),
    "贵阳分公司": ("贵阳", 106.630153, 26.647661),
    "南宁分公司": ("南宁", 108.366543, 22.817002),
    "海口分公司": ("海口", 110.198293, 20.044001),
    "海南分公司": ("海口", 110.198293, 20.044001),
    "乌鲁木齐分公司": ("乌鲁木齐", 87.616848, 43.825592),
    "新疆分公司": ("乌鲁木齐", 87.616848, 43.825592),
    "兰州分公司": ("兰州", 103.834303, 36.061089),
    "银川分公司": ("银川", 106.230909, 38.487193),
    "西宁分公司": ("西宁", 101.778916, 36.623178),
    "呼和浩特分公司": ("呼和浩特", 111.749181, 40.842585),
    "内蒙古分公司": ("呼和浩特", 111.749181, 40.842585),
    "石家庄分公司": ("石家庄", 114.514976, 38.042007),
    "天津分公司": ("天津", 117.200983, 39.084158),
    "合肥分公司": ("合肥", 117.227239, 31.820586),
    "太原分公司": ("太原", 112.549248, 37.857014),
    "苏州分公司": ("苏州", 120.585316, 31.298886),
    "无锡分公司": ("无锡", 120.31191, 31.49117),
    "南通分公司": ("南通", 120.894291, 31.980171),
    "宁波分公司": ("宁波", 121.550357, 29.874556),
    "温州分公司": ("温州", 120.699367, 27.994267),
    "东莞分公司": ("东莞", 113.751765, 23.020536),
    "佛山分公司": ("佛山", 113.121416, 23.021548),
    "洛阳分公司": ("洛阳", 112.45404, 34.619682),
    "徐州分公司": ("徐州", 117.284124, 34.205768),
    "中国区用户服务部": ("深圳", 114.0579, 22.5431),
    "用户服务部": ("深圳", 114.0579, 22.5431),
    "中国区总部": ("深圳", 114.0579, 22.5431),
    "总部": ("深圳", 114.0579, 22.5431),
    "用服总部": ("深圳", 114.0579, 22.5431),
}


def _runtime_root() -> Path:
    if os.environ.get("TSEP_GEO_CACHE_PATH"):
        return Path(os.environ["TSEP_GEO_CACHE_PATH"]).expanduser().resolve().parent
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def _resolve_geo_cache_path() -> Path:
    override = os.environ.get("TSEP_GEO_CACHE_PATH")
    if override:
        return Path(override).expanduser().resolve()
    return _runtime_root() / "config" / "geo_cache.json"


def _now_text() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _build_default_cache() -> dict[str, dict[str, Any]]:
    timestamp = "2026-07-08 10:30:00"
    return {
        name: {
            "city": city,
            "lng": lng,
            "lat": lat,
            "source": "manual",
            "updated_at": timestamp,
        }
        for name, (city, lng, lat) in DEFAULT_COORDINATES.items()
    }


class GeoCacheService:
    def __init__(self, cache_path: Path | None = None) -> None:
        self.cache_path = cache_path or _resolve_geo_cache_path()
        self._lock = threading.Lock()
        self._cache: dict[str, dict[str, Any]] | None = None

    def load_geo_cache(self) -> dict[str, dict[str, Any]]:
        with self._lock:
            if self._cache is not None:
                return self._cache

            cache = _build_default_cache()
            if self.cache_path.exists():
                try:
                    loaded = json.loads(self.cache_path.read_text(encoding="utf-8"))
                    if isinstance(loaded, dict):
                        cache.update({str(key): value for key, value in loaded.items() if isinstance(value, dict)})
                except json.JSONDecodeError:
                    print(f"[GeoCache] 缓存文件损坏，已使用内置坐标重建：{self.cache_path}")

            self._cache = cache
            self._save_locked()
            return self._cache

    def save_geo_cache(self) -> None:
        with self._lock:
            self._save_locked()

    def get_cached_geo(self, location_name: str) -> dict[str, Any] | None:
        cache = self.load_geo_cache()
        normalized = normalize_location_name(location_name)
        if not normalized:
            return None
        return normalize_geo_payload(cache.get(normalized))

    def set_cached_geo(self, location_name: str, geo_info: dict[str, Any]) -> dict[str, Any]:
        cache = self.load_geo_cache()
        normalized = normalize_location_name(location_name)
        payload = normalize_geo_payload(geo_info) or build_headquarters_geo("fallback")
        payload["updated_at"] = payload.get("updated_at") or _now_text()
        cache[normalized] = payload
        self.save_geo_cache()
        print(f"[GeoCache] 已写入缓存：{normalized}")
        return payload

    def resolve_geo(self, location_name: str, allow_geocode: bool = True) -> tuple[dict[str, Any], str]:
        normalized = normalize_location_name(location_name)
        if not normalized:
            geo = build_headquarters_geo("fallback")
            return geo, "fallback"

        cached = self.get_cached_geo(normalized)
        if cached:
            print(f"[GeoCache] 命中缓存：{normalized}")
            return cached, "cache_hit"

        if is_headquarters_location(normalized):
            geo = build_headquarters_geo("manual")
            self.set_cached_geo(normalized, geo)
            print(f"[GeoCache] 归类总部：{normalized}")
            return geo, "headquarters"

        if allow_geocode and GEO_CONFIG["allowAmapGeocode"]:
            try:
                print(f"[GeoCache] 新地点，调用高德：{normalized}")
                geo = self._amap_geocode(normalized)
                self.set_cached_geo(normalized, geo)
                return geo, "amap_resolved"
            except Exception as exc:  # noqa: BLE001 - keep import resilient
                print(f"[GeoCache] 高德解析失败：{normalized}，原因：{exc}")

        geo = build_headquarters_geo("fallback")
        self.set_cached_geo(normalized, geo)
        print(f"[GeoCache] 无法解析，归类总部：{normalized}")
        return geo, "fallback"

    def batch_resolve_geo(self, location_names: list[str], allow_geocode: bool = True) -> dict[str, Any]:
        unique_names = []
        seen = set()
        for item in location_names:
            normalized = normalize_location_name(item)
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            unique_names.append(normalized)

        summary = {
            "cache_hit": 0,
            "amap_resolved": 0,
            "headquarters": 0,
            "fallback": 0,
            "failed": 0,
            "total": len(unique_names),
        }
        items: dict[str, dict[str, Any]] = {}

        for name in unique_names:
            try:
                geo, status = self.resolve_geo(name, allow_geocode=allow_geocode)
                summary[status] = summary.get(status, 0) + 1
                items[name] = geo
            except Exception as exc:  # noqa: BLE001
                summary["failed"] += 1
                items[name] = build_headquarters_geo("fallback")
                print(f"[GeoCache] 解析异常，已使用总部坐标：{name}，原因：{exc}")

        print(
            "[GeoCache] 本次导入统计："
            f"缓存命中 {summary['cache_hit']}，"
            f"新解析 {summary['amap_resolved']}，"
            f"总部归类 {summary['headquarters']}，"
            f"fallback {summary['fallback']}，"
            f"失败 {summary['failed']}"
        )
        return {
            "items": items,
            "summary": summary,
            "config": GEO_CONFIG,
            "cache_path": str(self.cache_path),
        }

    def _save_locked(self) -> None:
        if self._cache is None:
            return
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.cache_path.with_suffix(".json.tmp")
        temp_path.write_text(json.dumps(self._cache, ensure_ascii=False, indent=2), encoding="utf-8")
        temp_path.replace(self.cache_path)

    def _amap_geocode(self, location_name: str) -> dict[str, Any]:
        api_key = (
            os.environ.get("TSEP_AMAP_GEOCODE_KEY")
            or os.environ.get("AMAP_GEOCODE_KEY")
            or os.environ.get("AMAP_API_KEY")
        )
        if not api_key:
            raise RuntimeError("未配置高德地理编码 Key：请设置 TSEP_AMAP_GEOCODE_KEY")

        params = urllib.parse.urlencode({"key": api_key, "address": location_name, "output": "JSON"})
        url = f"https://restapi.amap.com/v3/geocode/geo?{params}"
        with urllib.request.urlopen(url, timeout=8) as response:  # noqa: S310 - configured service endpoint
            payload = json.loads(response.read().decode("utf-8"))

        if payload.get("status") != "1" or not payload.get("geocodes"):
            raise RuntimeError(payload.get("info") or "高德未返回可用坐标")

        geocode = payload["geocodes"][0]
        lng_text, lat_text = str(geocode.get("location", "")).split(",", 1)
        city_value = geocode.get("city") or geocode.get("province") or ""
        if isinstance(city_value, list):
            city_value = geocode.get("province") or ""
        return {
            "city": str(city_value).replace("市", "") or location_name,
            "lng": round(float(lng_text), 6),
            "lat": round(float(lat_text), 6),
            "source": "amap",
            "updated_at": _now_text(),
        }


def normalize_location_name(value: Any) -> str:
    return (
        str(value or "")
        .replace("\u00a0", " ")
        .replace("\u3000", " ")
        .strip()
    )


def normalize_geo_payload(value: dict[str, Any] | None) -> dict[str, Any] | None:
    if not value:
        return None
    try:
        lng = float(value.get("lng"))
        lat = float(value.get("lat"))
    except (TypeError, ValueError):
        return None
    return {
        "city": str(value.get("city") or ""),
        "lng": lng,
        "lat": lat,
        "source": str(value.get("source") or "manual"),
        "updated_at": str(value.get("updated_at") or _now_text()),
    }


def is_headquarters_location(location_name: str) -> bool:
    return any(keyword in location_name for keyword in HEADQUARTERS_KEYWORDS)


def build_headquarters_geo(source: str) -> dict[str, Any]:
    return {
        **HEADQUARTERS_GEO,
        "source": source,
        "updated_at": _now_text(),
    }


geo_cache_service = GeoCacheService()

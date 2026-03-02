import { useEffect, useState, useCallback, useRef } from "react";
import Login from "./components/Login";

// API エンドポイント: .env またはビルド時の環境変数で上書き可能
// VITE_API_ENDPOINT: バックエンド API URL（本番: https://api.yourdomain.com 等に書き換え）
// VITE_DEFAULT_ENDPOINT: 後方互換のエイリアス
// 本番: Render に固定（環境変数で上書き可能）
const DEFAULT_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT ||
  import.meta.env.VITE_DEFAULT_ENDPOINT ||
  "https://hybrid-scouter-api.onrender.com";

// 録音アプリ（ワークスペース）のベースURL
const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL || "http://127.0.0.1:3002";
const DEFAULT_INDUSTRY = "屋根工事";

/** endpoint のサニタイズ（改行・空白・末尾スラッシュを除去） */
function cleanEndpointUrl(raw: string): string {
  return raw
    .trim()
    .replace(/[\r\n]/g, "")
    .replace(/\/+$/, "");
}

const INDUSTRY_OPTIONS = [
  "屋根工事",
  "外壁塗装",
  "建設業",
  "リフォーム",
  "太陽光パネル",
];
const INDUSTRY_LIST_KEY = "scouter_industry_list";
const MAX_INDUSTRY_LIST = 30;
const SCOUTER_TOKEN_KEY = "scouter_token";

function loadIndustryList(): string[] {
  try {
    const raw = localStorage.getItem(INDUSTRY_LIST_KEY);
    if (!raw) return [...INDUSTRY_OPTIONS];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, MAX_INDUSTRY_LIST)
      : [...INDUSTRY_OPTIONS];
  } catch {
    return [...INDUSTRY_OPTIONS];
  }
}

function saveIndustryList(list: string[]) {
  try {
    localStorage.setItem(INDUSTRY_LIST_KEY, JSON.stringify(list.slice(0, MAX_INDUSTRY_LIST)));
  } catch {
    /* ignore */
  }
}

function addToIndustryList(industry: string, currentList: string[]): string[] {
  const trimmed = industry.trim();
  if (!trimmed) return currentList;
  const next = [trimmed, ...currentList.filter((h) => h !== trimmed)];
  saveIndustryList(next);
  return next.slice(0, MAX_INDUSTRY_LIST);
}

function removeFromIndustryList(industry: string, currentList: string[]): string[] {
  const next = currentList.filter((h) => h !== industry);
  saveIndustryList(next);
  return next;
}
const PROGRESS_MESSAGES = [
  "サイト解析中...",
  "AI クリーニング中...",
  "差しどころ抽出中...",
];

interface TalkItem {
  id?: string;
  title: string;
  content: string;
  level?: number; // 1=初級, 2=中級, 3=上級
}

interface ScriptsData {
  base_scenarios: TalkItem[];
  component_talks: Record<string, TalkItem[]>;
}

const EMPTY_SCRIPTS: ScriptsData = { base_scenarios: [], component_talks: {} };

interface HearingCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface HearingItemData {
  id: string;
  title: string;
  content: string;
}

interface HearingData {
  categories: HearingCategory[];
  items_by_category: Record<string, HearingItemData[]>;
}

interface ScoutResult {
  success: boolean;
  map_data?: { region?: string; search_keyword?: string; competitors?: { name: string; rating?: number | null }[] };
  web_summary?: string;
  ollama_available?: boolean;
  sashi_dokoro?: string[];
  strategy?: string;
  knowledge_context?: string | null;
  elapsed_seconds?: number;
}

function getErrorMessage(status: number, detail?: string): string {
  if (status === 504) {
    return "情報の取得に時間がかかりました。ローカルのGemma 3が起動しているか確認してください。";
  }
  if (status === 500) {
    return `サーバーエラー: ${detail || "不明なエラー"}。Python バックエンド (port 8765) が起動しているか確認してください。`;
  }
  return detail || "接続に失敗しました。API エンドポイントを確認してください。";
}

function AccordionHeader({
  title,
  hint,
  isOpen,
  onToggle,
}: {
  title: string;
  hint?: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-1.5 py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 transition text-left"
    >
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-800">
        <span>{title}</span>
        {hint && (
          <span className="text-[10px] font-normal text-stone-500 truncate max-w-[120px]">
            {hint}
          </span>
        )}
      </span>
      <span className={`text-stone-400 text-[10px] transition-transform ${isOpen ? "rotate-180" : ""}`}>
        ▼
      </span>
    </button>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [region, setRegion] = useState("");
  const [industry, setIndustry] = useState(DEFAULT_INDUSTRY);
  const [industryList, setIndustryList] = useState<string[]>([]);
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [result, setResult] = useState<ScoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [appBaseUrl, setAppBaseUrl] = useState(APP_BASE_URL);
  const [dragOverUrl, setDragOverUrl] = useState(false);
  const [dragOverRegion, setDragOverRegion] = useState(false);

  const [openMapResearch, setOpenMapResearch] = useState(true);
  const [openBaseScenario, setOpenBaseScenario] = useState(false);
  const [openComponentTalk, setOpenComponentTalk] = useState(false);
  const [openHearing, setOpenHearing] = useState(false);
  const [selectedHearingCategoryId, setSelectedHearingCategoryId] = useState<string>("");
  const [selectedHearingItemIndex, setSelectedHearingItemIndex] = useState<number>(-1);

  const [scripts, setScripts] = useState<ScriptsData>(() => EMPTY_SCRIPTS);
  const [scriptsSyncStatus, setScriptsSyncStatus] = useState<"synced" | "offline" | "loading">("loading");
  const [syncManualLoading, setSyncManualLoading] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [hearingData, setHearingData] = useState<HearingData | null>(null);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(-1);
  const [selectedCompCategory, setSelectedCompCategory] = useState<string>("");
  const [selectedCompTalkIndex, setSelectedCompTalkIndex] = useState<number>(-1);

  const loadStored = useCallback(async () => {
    const stored = await chrome.storage.local.get([
      "extractedRegion",
      "extractedUrl",
      "apiEndpoint",
      "appBaseUrl",
      SCOUTER_TOKEN_KEY,
    ]);
    if (stored.extractedRegion) setRegion(stored.extractedRegion);
    if (stored.extractedUrl) setUrl(stored.extractedUrl);
    if (stored.apiEndpoint) setEndpoint(cleanEndpointUrl(stored.apiEndpoint) || DEFAULT_ENDPOINT);
    if (stored.appBaseUrl) setAppBaseUrl(cleanEndpointUrl(stored.appBaseUrl) || APP_BASE_URL);
    const t = (stored[SCOUTER_TOKEN_KEY] as string) || null;
    console.log("[スカウター] loadStored: token=", t ? `あり(長さ=${t.length})` : "なし");
    setToken(t);
  }, []);

  const fetchHearing = useCallback(async (baseUrl: string): Promise<HearingData | null> => {
    const base = cleanEndpointUrl(baseUrl);
    const url = `${base}/hearing`;
    try {
      console.log("[スカウター] fetchHearing: リクエストURL=", url);
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const bodyPreview = res.status === 500 ? body : body.slice(0, 300);
        console.error("[スカウター] hearing API 取得失敗:", {
          url,
          status: res.status,
          statusText: res.statusText,
          body: bodyPreview,
        });
        return null;
      }
      const raw = (await res.json()) as unknown;
      console.log("Fetched Hearing:", raw);
      const data = (raw != null && typeof raw === "object" && "data" in raw && raw.data != null)
        ? (raw.data as Partial<HearingData>)
        : (raw as Partial<HearingData>);
      const categories = Array.isArray(data?.categories) ? data.categories : [];
      const items_by_category = data?.items_by_category && typeof data.items_by_category === "object" && !Array.isArray(data.items_by_category)
        ? data.items_by_category
        : {};
      return { categories, items_by_category };
    } catch (err) {
      console.error("[スカウター] hearing API 取得エラー:", { url, error: err });
      return null;
    }
  }, []);

  const fetchScripts = useCallback(async (baseUrl: string): Promise<{ data: ScriptsData | null; status: "synced" | "offline" }> => {
    const base = cleanEndpointUrl(baseUrl);
    const url = `${base}/scripts`;
    try {
      console.log("[スカウター] fetchScripts: リクエストURL=", url);
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const bodyPreview = res.status === 500 ? body : body.slice(0, 300);
        console.error("[スカウター] scripts API 取得失敗:", {
          url,
          status: res.status,
          statusText: res.statusText,
          body: bodyPreview,
        });
        return { data: null, status: "offline" };
      }
      const raw = (await res.json()) as unknown;
      console.log("Fetched Scripts (raw):", raw);
      const data = (raw != null && typeof raw === "object" && "data" in raw && raw.data != null)
        ? (raw.data as Partial<ScriptsData>)
        : (raw as Partial<ScriptsData>);
      const base_scenarios = Array.isArray(data?.base_scenarios) ? data.base_scenarios : [];
      const component_talks = data?.component_talks && typeof data.component_talks === "object" && !Array.isArray(data.component_talks)
        ? data.component_talks
        : {};
      return {
        data: { base_scenarios, component_talks },
        status: "synced",
      };
    } catch (err) {
      console.error("[スカウター] scripts API 取得エラー:", { url, error: err });
      return { data: null, status: "offline" };
    }
  }, []);

  useEffect(() => {
    loadStored().then(() => setAuthLoading(false));
  }, [loadStored]);

  useEffect(() => {
    setIndustryList(loadIndustryList());
  }, []);

  const industryWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (industryWrapperRef.current && !industryWrapperRef.current.contains(e.target as Node)) {
        setIndustryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSync = useCallback(async () => {
    const base = cleanEndpointUrl(endpoint || DEFAULT_ENDPOINT);
    try {
      const [scriptsResult, hearing] = await Promise.all([
        fetchScripts(base),
        fetchHearing(base),
      ]);
      const hasData = scriptsResult.data && (
        (scriptsResult.data.base_scenarios?.length ?? 0) > 0 ||
        Object.keys(scriptsResult.data.component_talks ?? {}).length > 0 ||
        (hearing?.categories?.length ?? 0) > 0
      );
      const status = hasData ? "synced" : scriptsResult.status;
      setScriptsSyncStatus(status);
      setScripts(scriptsResult.data ?? EMPTY_SCRIPTS);
      setHearingData(hearing);
      return status;
    } catch (e) {
      console.error("[スカウター] 同期エラー:", { base, error: e });
      setScriptsSyncStatus("offline");
      return "offline";
    }
  }, [endpoint, fetchScripts, fetchHearing]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setScriptsSyncStatus("loading");
      const base = cleanEndpointUrl(endpoint || DEFAULT_ENDPOINT);
      console.log("[スカウター] scripts/hearing 取得開始: baseUrl=", base);
      const [scriptsResult, hearing] = await Promise.all([
        fetchScripts(base),
        fetchHearing(base),
      ]);
      if (cancelled) return;
      const hasData = scriptsResult.data && (
        (scriptsResult.data.base_scenarios?.length ?? 0) > 0 ||
        Object.keys(scriptsResult.data.component_talks ?? {}).length > 0 ||
        (hearing?.categories?.length ?? 0) > 0
      );
      setScriptsSyncStatus(hasData ? "synced" : scriptsResult.status);
      setScripts(scriptsResult.data ?? EMPTY_SCRIPTS);
      setHearingData(hearing);
    };
    load();
    return () => { cancelled = true; };
  }, [endpoint, fetchScripts, fetchHearing]);

  const handleManualSync = async () => {
    setSyncManualLoading(true);
    setSyncToast(null);
    try {
      const status = await runSync();
      setSyncToast(status === "synced" ? "同期完了" : "同期に失敗しました");
      setTimeout(() => setSyncToast(null), 3000);
    } finally {
      setSyncManualLoading(false);
    }
  };

  useEffect(() => {
    const handler = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;
      if (changes.extractedRegion?.newValue) setRegion(changes.extractedRegion.newValue);
      if (changes.extractedUrl?.newValue) setUrl(changes.extractedUrl.newValue);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  const applySelectionToRegion = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const sel = window.getSelection?.();
          const t = (sel && sel.toString() || "").trim();
          return t.length >= 1 && t.length <= 80 ? t : null;
        },
      });
      const t = results?.[0]?.result;
      if (t) setRegion(t);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setProgressIndex((i) => (i + 1) % PROGRESS_MESSAGES.length);
    }, 3500);
    return () => clearInterval(id);
  }, [loading]);

  const runScout = async () => {
    const u = url.trim();
    if (!u || !u.startsWith("http")) {
      setError("有効なURLを入力してください。");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressIndex(0);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const base = token
        ? cleanEndpointUrl(appBaseUrl || APP_BASE_URL)
        : cleanEndpointUrl(endpoint || DEFAULT_ENDPOINT);
      const urlPath = token ? `${base}/api/ext/scout` : `${base}/scout`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(urlPath, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          url: u,
          region: region.trim() || null,
          industry: industry.trim() || null,
        }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        data = { detail: await res.text().catch(() => "不明なエラー") };
      }

      if (!res.ok) {
        throw new Error(
          getErrorMessage(res.status, (data.detail as string) || (data.error as string))
        );
      }

      const kw = industry.trim() || DEFAULT_INDUSTRY;
      setIndustryList((prev) => addToIndustryList(kw, prev));
      setResult(data as ScoutResult);
      setError(null);
      setOpenMapResearch(false);
      setOpenBaseScenario(true);
    } catch (err) {
      const msg = (err as Error).message || String(err);
      const errorMsg =
        (err as Error).name === "AbortError"
          ? "60秒以内に応答がありませんでした。Ollamaの初回起動や重い処理には時間がかかることがあります。"
          : msg.includes("Failed to fetch") || msg.includes("NetworkError")
            ? "バックエンドに接続できません。http://localhost:8765 が起動しているか確認してください。"
            : msg;
      setError(errorMsg);
      setResult(null);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const openMap = () => {
    const kw = industry.trim() || DEFAULT_INDUSTRY;
    setIndustryList((prev) => addToIndustryList(kw, prev));
    const r = region.trim() || result?.map_data?.region || "";
    const q = [r, kw].filter(Boolean).join(" ");
    const mapUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    chrome.tabs.create({ url: mapUrl });
  };

  const openRecordingPage = () => {
    const params = new URLSearchParams();
    if (url) params.set("url", url);
    if (result?.strategy) params.set("strategy", result.strategy.slice(0, 300));
    const base = cleanEndpointUrl(appBaseUrl || APP_BASE_URL);
    chrome.tabs.create({ url: `${base}/?${params.toString()}` });
  };

  const saveConfig = async () => {
    const cleanedEndpoint = cleanEndpointUrl(endpoint || DEFAULT_ENDPOINT) || DEFAULT_ENDPOINT;
    setEndpoint(cleanedEndpoint);
    await chrome.storage.local.set({
      apiEndpoint: cleanedEndpoint,
      appBaseUrl: cleanEndpointUrl(appBaseUrl || APP_BASE_URL) || APP_BASE_URL,
    });
  };

  const handleUrlDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverUrl(false);
    const uri = e.dataTransfer?.getData("text/uri-list")?.trim().split("\n")[0];
    const plain = e.dataTransfer?.getData("text/plain")?.trim();
    const href = uri || (plain?.startsWith("http") ? plain : null);
    if (href) setUrl(href);
  };

  const handleRegionDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRegion(false);
    const t = e.dataTransfer?.getData("text/plain")?.trim();
    if (t) setRegion(t);
  };

  const md = result?.map_data;
  const resultRegion = md?.region || "";
  const competitors = md?.competitors || [];

  const baseScenarios = scripts.base_scenarios ?? [];
  // 部品トーク: カテゴリを重複なく抽出（Set使用）、トークは選択カテゴリでfilter
  const ct = scripts.component_talks ?? {};
  const isRecordFormat = ct && !Array.isArray(ct) && typeof ct === "object";
  const compCategories = (() => {
    if (isRecordFormat) {
      return [...new Set(Object.keys(ct).filter((k) => Boolean(k)))].sort();
    }
    if (Array.isArray(ct)) {
      const items = ct as Array<{ category?: string; title?: string; content?: string }>;
      return [...new Set(items.map((t) => (t?.category || "").trim() || "未分類").filter(Boolean))].sort();
    }
    return [];
  })();
  const compTalks = (() => {
    if (!selectedCompCategory) return [];
    let raw: TalkItem[];
    if (isRecordFormat) {
      raw = (ct[selectedCompCategory] ?? []).filter((t): t is TalkItem => t != null && typeof (t as TalkItem).title === "string");
    } else if (Array.isArray(ct)) {
      const items = ct as Array<{ category?: string; title?: string; content?: string }>;
      raw = items
        .filter((t) => ((t?.category || "").trim() || "未分類") === selectedCompCategory)
        .map((t) => ({ title: t.title ?? "", content: t.content ?? "" }));
    } else {
      return [];
    }
    return raw;
  })();
  const scenarioContent = selectedScenarioIndex >= 0 && baseScenarios[selectedScenarioIndex]
    ? baseScenarios[selectedScenarioIndex].content
    : null;
  const compContent = selectedCompCategory && selectedCompTalkIndex >= 0 && compTalks[selectedCompTalkIndex]
    ? compTalks[selectedCompTalkIndex].content
    : null;
  useEffect(() => {
    if (!selectedCompCategory) return;
    const ct = scripts.component_talks ?? {};
    const isRecord = ct && !Array.isArray(ct) && typeof ct === "object";
    const valid = isRecord
      ? Object.prototype.hasOwnProperty.call(ct, selectedCompCategory)
      : Array.isArray(ct) &&
        ct.some((t: { category?: string }) => ((t?.category || "").trim() || "未分類") === selectedCompCategory);
    if (!valid) {
      setSelectedCompCategory("");
      setSelectedCompTalkIndex(-1);
    }
  }, [scripts, selectedCompCategory]);

  const hearingCategories = hearingData?.categories ?? [];
  const hearingItems = selectedHearingCategoryId
    ? (hearingData?.items_by_category[selectedHearingCategoryId] ?? [])
    : [];
  const selectedHearingItem =
    selectedHearingItemIndex >= 0 && hearingItems[selectedHearingItemIndex]
      ? hearingItems[selectedHearingItemIndex]
      : null;
  const hearingContent = selectedHearingItem?.content ?? null;

  useEffect(() => {
    if (!selectedHearingCategoryId) {
      setSelectedHearingItemIndex(-1);
      return;
    }
    const items = hearingData?.items_by_category[selectedHearingCategoryId] ?? [];
    setSelectedHearingItemIndex(items.length > 0 ? 0 : -1);
  }, [selectedHearingCategoryId, hearingData]);

  const handleLogout = async () => {
    await chrome.storage.local.remove([SCOUTER_TOKEN_KEY, "scouter_user"]);
    setToken(null);
  };

  const targetHint = [region, industry].filter(Boolean).join(" / ") || undefined;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-800 p-4 flex items-center justify-center text-[10px]">
        <span className="text-stone-500">読み込み中...</span>
      </div>
    );
  }

  if (!token) {
    return (
      <Login
        onLoginSuccess={(t) => setToken(t)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 p-2 max-w-md mx-auto text-[10px] leading-snug">
      <header className="mb-2 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <h1 className="text-[10px] font-bold text-stone-800">スカウター</h1>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-normal"
          title={scriptsSyncStatus === "synced" ? "API と同期済み" : scriptsSyncStatus === "offline" ? "オフライン" : "読み込み中"}
        >
          {scriptsSyncStatus === "synced" && (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
              <span className="text-emerald-600">同期済</span>
            </span>
          )}
          {scriptsSyncStatus === "offline" && (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden />
              <span className="text-red-600">オフライン</span>
            </span>
          )}
          {scriptsSyncStatus === "loading" && (
            <span className="inline-flex items-center gap-1 text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-pulse" aria-hidden />
              <span>接続中</span>
            </span>
          )}
        </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-[9px] text-stone-500 hover:text-stone-700 px-1.5 py-0.5 rounded border border-stone-200 hover:border-stone-300"
        >
          ログアウト
        </button>
      </header>

      {loading && (
        <div className="mb-2 p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800">
          {PROGRESS_MESSAGES[progressIndex]}
        </div>
      )}

      {error && (
        <div className="mb-2 p-1.5 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700">
          {error}
        </div>
      )}

      {syncToast && (
        <div className="mb-2 p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-700">
          {syncToast}
        </div>
      )}

      {/* マップリサーチ */}
      <section className="mb-2">
        <AccordionHeader
          title="マップリサーチ"
          hint={targetHint}
          isOpen={openMapResearch}
          onToggle={() => setOpenMapResearch((o) => !o)}
        />
        {openMapResearch && (
          <div className="mt-1.5 space-y-1.5 pl-0.5">
            <div
              onDrop={handleUrlDrop}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer!.dropEffect = "copy";
                setDragOverUrl(true);
              }}
              onDragLeave={() => setDragOverUrl(false)}
              className={`rounded-lg border-2 border-dashed px-2 py-1.5 transition-all ${
                dragOverUrl ? "border-blue-500 bg-blue-50" : "border-stone-300 bg-white"
              }`}
            >
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL（ドラッグ＆ドロップ）"
                className="w-full bg-transparent text-[10px] outline-none placeholder:text-stone-400"
              />
            </div>
            <div className="flex gap-1">
              <div
                onDrop={handleRegionDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverRegion(true);
                }}
                onDragLeave={() => setDragOverRegion(false)}
                className={`flex-1 rounded-lg border-2 border-dashed px-2 py-1.5 transition-all ${
                  dragOverRegion ? "border-amber-500 bg-amber-50" : "border-stone-300 bg-white"
                }`}
              >
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="地域"
                  className="w-full bg-transparent text-[10px] outline-none placeholder:text-stone-400"
                />
              </div>
              <button
                type="button"
                onClick={applySelectionToRegion}
                className="px-1.5 py-1 bg-stone-200 hover:bg-stone-300 rounded text-[10px]"
              >
                選択入力
              </button>
            </div>
            <div ref={industryWrapperRef} className="relative">
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                onFocus={() => setIndustryDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const kw = industry.trim();
                    if (kw) {
                      setIndustryList((prev) => addToIndustryList(kw, prev));
                    }
                    setIndustryDropdownOpen(false);
                  }
                }}
                placeholder="業種（Enterで追加）"
                className="w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white text-[10px] outline-none"
              />
              {industryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-0.5 z-50 bg-white border border-stone-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {industryList.length === 0 ? (
                    <div className="px-2 py-1.5 text-[10px] text-stone-500">業種がありません</div>
                  ) : (
                    industryList.map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between gap-1 px-2 py-1.5 hover:bg-stone-50 text-[10px] cursor-pointer"
                      >
                        <span
                          className="flex-1 min-w-0 truncate"
                          onClick={() => {
                            setIndustry(item);
                            setIndustryDropdownOpen(false);
                          }}
                        >
                          {item}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIndustryList((prev) => removeFromIndustryList(item, prev));
                          }}
                          className="shrink-0 w-4 h-4 flex items-center justify-center rounded text-stone-400 hover:text-red-600 hover:bg-red-50 text-[10px]"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={openMap}
                className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[10px]"
              >
                マップを表示
              </button>
              <button
                onClick={runScout}
                disabled={loading}
                className="flex-1 py-1.5 px-2 bg-[#4A463F] hover:bg-[#3E3A34] disabled:bg-stone-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-[10px]"
              >
                スカウト開始
              </button>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncManualLoading}
              className="w-full mt-1 py-1.5 px-2 bg-stone-200 hover:bg-stone-300 disabled:bg-stone-100 disabled:cursor-not-allowed text-stone-700 font-medium rounded-lg text-[10px]"
            >
              {syncManualLoading ? "同期中..." : "設定を同期"}
            </button>

            {result && !loading && (
              <div className="mt-2 pt-2 border-t border-stone-200 space-y-1.5">
                <div>
                  <h3 className="text-[10px] font-bold text-amber-700 mb-1">差しどころ</h3>
                  <ul className="space-y-0.5">
                    {(result.sashi_dokoro || []).map((s, i) => (
                      <li
                        key={i}
                        className="px-2 py-1 bg-amber-50 border-l-4 border-l-amber-500 rounded-r text-[10px] font-medium text-stone-800"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                {result.knowledge_context && (
                  <div>
                    <h3 className="text-[10px] font-bold text-stone-600 mb-0.5">RAG トーク</h3>
                    <div className="p-1.5 bg-stone-100 border border-stone-200 rounded-lg text-[10px] whitespace-pre-wrap leading-snug">
                      {result.knowledge_context}
                    </div>
                  </div>
                )}
                {competitors.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-stone-600 mb-0.5">
                      {resultRegion || region || "地域"} の {industry || DEFAULT_INDUSTRY} 競合
                    </h3>
                    <ul className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100 max-h-24 overflow-y-auto">
                      {competitors.map((c, i) => (
                        <li key={i} className="px-1.5 py-1 flex justify-between text-[10px]">
                          <span className="truncate">{c.name}</span>
                          {c.rating != null && (
                            <span className="text-amber-600 font-semibold shrink-0">{c.rating}点</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={openRecordingPage}
                  className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[10px]"
                >
                  この戦略で録音を開始
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 基本シナリオ */}
      <section className="mb-2">
        <AccordionHeader
          title="基本シナリオ"
          hint={selectedScenarioIndex >= 0 ? baseScenarios[selectedScenarioIndex]?.title : undefined}
          isOpen={openBaseScenario}
          onToggle={() => setOpenBaseScenario((o) => !o)}
        />
        {openBaseScenario && (
          <div className="mt-1.5 pl-0.5">
            {scriptsSyncStatus === "loading" ? (
              <p className="px-2 py-3 text-[10px] text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
                読み込み中...
              </p>
            ) : baseScenarios.length === 0 ? (
              <p className="px-2 py-3 text-[10px] text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
                ワークスペースで『スカウターに表示』を設定してください
              </p>
            ) : (
            <>
            <div className="space-y-0.5">
              {baseScenarios.map((s, i) => (
                <button
                  key={s.id ?? `base-${i}`}
                  type="button"
                  onClick={() => {
                    setSelectedScenarioIndex(i);
                    setSelectedCompCategory("");
                    setSelectedCompTalkIndex(-1);
                  }}
                  className={`w-full px-2 py-1.5 text-left text-[10px] font-medium rounded-lg border transition ${
                    selectedScenarioIndex === i
                      ? "border-l-4 border-l-blue-600 border-stone-200 bg-blue-50"
                      : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
            <div
              className={`mt-1.5 p-2 bg-white rounded-lg text-[10px] whitespace-pre-wrap leading-snug min-h-[40px] ${
                selectedScenarioIndex >= 0
                  ? "border-l-4 border-l-blue-600 border border-stone-200"
                  : "border border-stone-200"
              }`}
            >
              {scenarioContent ?? "シナリオを選択してください"}
            </div>
            </>
            )}
          </div>
        )}
      </section>

      {/* 部品トーク */}
      <section className="mb-2">
        <AccordionHeader
          title="部品トーク"
          hint={selectedCompCategory ? selectedCompCategory : undefined}
          isOpen={openComponentTalk}
          onToggle={() => setOpenComponentTalk((o) => !o)}
        />
        {openComponentTalk && (
          <div className="mt-1.5 pl-0.5">
            {scriptsSyncStatus === "loading" ? (
              <p className="px-2 py-3 text-[10px] text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
                読み込み中...
              </p>
            ) : compCategories.length === 0 ? (
              <p className="px-2 py-3 text-[10px] text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
                ワークスペースで『スカウターに表示』を設定してください
              </p>
            ) : (
              <div className="space-y-1">
                <div>
                  <label className="block text-[10px] font-medium text-stone-600 mb-0.5">カテゴリ</label>
                  <select
                    value={selectedCompCategory}
                    onChange={(e) => {
                      setSelectedCompCategory(e.target.value);
                      setSelectedCompTalkIndex(-1);
                      setSelectedScenarioIndex(-1);
                    }}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded text-[10px] bg-white"
                  >
                    <option value="">カテゴリを選択してください</option>
                    {compCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-stone-600 mb-0.5">トーク名</label>
                  <select
                    value={selectedCompTalkIndex >= 0 ? String(selectedCompTalkIndex) : ""}
                    onChange={(e) => {
                      setSelectedCompTalkIndex(Number(e.target.value));
                      setSelectedScenarioIndex(-1);
                    }}
                    disabled={!selectedCompCategory}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded text-[10px] bg-white disabled:bg-stone-100 disabled:text-stone-400"
                  >
                    <option value="">トークを選択してください</option>
                    {compTalks.map((t, i) => (
                      <option key={t.id ?? `comp-${i}`} value={String(i)}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  className={`mt-1.5 p-2 bg-white rounded-lg text-[10px] whitespace-pre-wrap leading-snug min-h-[40px] ${
                    selectedCompCategory && selectedCompTalkIndex >= 0
                      ? "border-l-4 border-l-blue-600 border border-stone-200"
                      : "border border-stone-200"
                  }`}
                >
                  {compContent ?? (selectedCompCategory ? "トークを選択してください" : "カテゴリを選択してください")}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* アポヒアリング */}
      <section className="mb-2">
        <AccordionHeader
          title="アポヒアリング"
          hint={
            selectedHearingCategoryId
              ? hearingCategories.find((c) => c.id === selectedHearingCategoryId)?.name
              : hearingCategories.length
                ? `${hearingCategories.length} カテゴリ`
                : undefined
          }
          isOpen={openHearing}
          onToggle={() => setOpenHearing((o) => !o)}
        />
        {openHearing && (
          <div className="mt-1.5 pl-0.5">
            {scriptsSyncStatus === "loading" ? (
              <p className="px-2 py-1.5 text-[10px] text-stone-500">読み込み中...</p>
            ) : !hearingCategories.length ? (
              <p className="px-2 py-1.5 text-[10px] text-stone-500">ワークスペースでアポヒアリングを設定してください</p>
            ) : (
              <div className="space-y-1">
                <div>
                  <label className="block text-[10px] font-medium text-stone-600 mb-0.5">カテゴリ</label>
                  <select
                    value={selectedHearingCategoryId}
                    onChange={(e) => setSelectedHearingCategoryId(e.target.value)}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded text-[10px] bg-white"
                  >
                    <option value="">カテゴリを選択してください</option>
                    {hearingCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-stone-600 mb-0.5">トーク名</label>
                  <select
                    value={selectedHearingItemIndex >= 0 ? String(selectedHearingItemIndex) : ""}
                    onChange={(e) => setSelectedHearingItemIndex(Number(e.target.value))}
                    disabled={!selectedHearingCategoryId}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded text-[10px] bg-white disabled:bg-stone-100 disabled:text-stone-400"
                  >
                    <option value="">
                      {selectedHearingCategoryId
                        ? hearingItems.length
                          ? "トークを選択してください"
                          : "項目がありません"
                        : "カテゴリを選択してください"}
                    </option>
                    {hearingItems.map((item, i) => (
                      <option key={item.id} value={String(i)}>
                        {item.title || "（無題）"}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  className={`mt-1.5 p-2 bg-white rounded-lg text-[10px] whitespace-pre-wrap leading-snug min-h-[40px] ${
                    selectedHearingCategoryId && selectedHearingItemIndex >= 0
                      ? "border-l-4 border-l-blue-600 border border-stone-200"
                      : "border border-stone-200"
                  }`}
                >
                  {hearingContent ?? "カテゴリを選択してください"}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="pt-2 border-t border-stone-200 flex gap-1">
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="http://localhost:8765"
          className="flex-1 px-1.5 py-1 border border-stone-300 rounded text-[10px]"
        />
        <button
          onClick={saveConfig}
          className="px-1.5 py-1 bg-stone-200 hover:bg-stone-300 rounded text-[10px]"
        >
          保存
        </button>
      </section>
    </div>
  );
}

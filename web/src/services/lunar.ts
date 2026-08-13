// 农历 / 节气 / 黄历 / 节假日服务层：取数、缓存、解析。
// 第三方万年历账号密钥只保存在后端（后端经 /api/lunar 代理 apihz.cn），
// 前端不再内嵌任何第三方 key。
// 数据源可在「系统设置 → 农历数据」切换：默认后端代理；也可选自定义接口（前端直连）。
import useSettingsStore, { type SettingsState } from '../store/settingsStore'
import type { LunarData, HolidayInfo } from '../types'

const LUNAR_CACHE_KEY = 'reach_lunar_cache_v4'
const HOLIDAY_CACHE_KEY = 'reach_holiday_cache_v1'

type CachedLunar = LunarData & { __p?: boolean }

// 把模板里的占位符替换为实际值：
// 农历支持 {date}(YYYY-MM-DD) / {y}{m}{d}；节假日支持 {year}
function fillTemplate(tpl: string, vars: Record<string, string | undefined>): string {
  return tpl
    .replaceAll('{date}', vars.date || '')
    .replaceAll('{year}', vars.year || '')
    .replaceAll('{y}', vars.y || '')
    .replaceAll('{m}', vars.m || '')
    .replaceAll('{d}', vars.d || '')
}

/** 占位空对象工厂：统一字段集合，避免同一字面量手写多遍。 */
export function emptyLunar(extra: Partial<LunarData> = {}): LunarData {
  return {
    lunar: '', term: '', festival: '', lunarYear: '', lunarMonth: '', lunarDay: '',
    ganzhiYear: '', shengxiao: '', yearShengxiao: '', xingzuo: '', yi: [], ji: [],
    yuexiang: '', wuhou: '', xi: '', yanggui: '', yingui: '', fu: '', cai: '',
    daysOfYear: '', weekOfYear: '',
    ...extra,
  }
}

function loadLunarCache(): Record<string, CachedLunar> {
  try {
    const obj = JSON.parse(localStorage.getItem(LUNAR_CACHE_KEY) || '{}') as Record<
      string,
      CachedLunar
    >
    for (const k of Object.keys(obj)) if (obj[k] && obj[k].__p) delete obj[k]
    return obj
  } catch {
    return {}
  }
}

// 模块级缓存：同页多次读取不重复解析 localStorage
const lunarCache: Record<string, CachedLunar> = loadLunarCache()

function persistLunarCache(): void {
  try {
    localStorage.setItem(LUNAR_CACHE_KEY, JSON.stringify(lunarCache))
  } catch {
    /* 超出配额则忽略 */
  }
}

// 由年干支推导年生肖（apihz 返回的 DAYSHENGXIAO 是日生肖，年生肖需从年干支地支对应）
function shengxiaoFromGanzhi(gz: string | undefined): string {
  if (!gz) return ''
  const map: Record<string, string> = {
    子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
    午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
  }
  return map[String(gz).slice(-1)] || ''
}

function parseApizh(j: unknown): LunarData | null {
  const o = j as Record<string, unknown> | null
  if (o && (o.code === 200 || o.code === '200')) {
    const nyue = (o.nyue as string) || ''
    const nri = (o.nri as string) || ''
    const jieqi = (o.jieqi as string) || ''
    // 仅节气当日（JIEQIDAYS=1）显示节气，避免「当前节气区间」挂满半个月
    const term = String(o.JIEQIDAYS || '') === '1' ? jieqi : ''
    // 物候取后半段，如 "寒露 初候鸿雁来宾" → "鸿雁来宾"
    const wuhou = ((o.WUHOU as string) || '').split(' ').pop() || ''
    return {
      lunar: nri === '初一' ? nyue : nri,
      term,
      festival: (o.jieri as string) || '',
      lunarYear: (o.nnian as string) || '',
      lunarMonth: nyue,
      lunarDay: nri,
      ganzhiYear: ((o.YEARGANZHI as string) || (o.ganzhinian as string) || '') as string,
      shengxiao: ((o.DAYSHENGXIAO as string) || (o.shengxiao as string) || '') as string,
      yearShengxiao: shengxiaoFromGanzhi(
        (o.YEARGANZHI as string) || (o.ganzhinian as string) || '',
      ),
      xingzuo: (o.xingzuo as string) || '',
      yi: ((o.yi as string) || '').split('|').filter(Boolean),
      ji: ((o.ji as string) || '').split('|').filter(Boolean),
      yuexiang: (o.YUEXIANG as string) || '',
      wuhou,
      xi: (o.DAYPOSITIONXI as string) || '',
      yanggui: (o.DAYPOSITIONYANGGUI as string) || '',
      yingui: (o.DAYPOSITIONYINGUI as string) || '',
      fu: (o.DAYPOSITIONFU as string) || '',
      cai: (o.DAYPOSITIONCAI as string) || '',
      daysOfYear: (o.DAYSINYEAR as string) || '',
      weekOfYear: (o.YLWEEKNOY as string) || '',
    }
  }
  return null
}

function parseVvhan(j: unknown): LunarData | null {
  const o = j as { code?: number; data?: Record<string, string> } | null
  if (o && o.code === 1 && o.data) {
    return emptyLunar({
      lunar: (o.data.lunarMonth || '') + (o.data.lunarDay || ''),
      term: o.data.solarTerms || '',
    })
  }
  return null
}

function getSettings(): SettingsState {
  return useSettingsStore.getState()
}

/**
 * 获取某一天的农历/黄历数据。
 * 数据源优先级：后端代理（apihz，key 在服务端）→ vvhan → vvhan 经 allorigins。
 * 成功结果持久化到 localStorage；失败不写入缓存，下次重试。
 */
export async function fetchLunar(dateStr: string): Promise<LunarData> {
  const cached = lunarCache[dateStr]
  if (cached) return cached

  // 占位，防止同一天并发重复请求
  lunarCache[dateStr] = emptyLunar({ __p: true })

  // 自定义接口模式：用户自行提供农历接口（前端直连，需 CORS / 同源）
  const { lunarSource, lunarApiBase, lunarApiKey } = getSettings()
  if (lunarSource === 'custom' && lunarApiBase) {
    try {
      const [y, m, d] = dateStr.split('-')
      const url = fillTemplate(lunarApiBase, { date: dateStr, y, m, d })
      const headers = lunarApiKey ? { Authorization: `Bearer ${lunarApiKey}` } : undefined
      const r = await fetch(url, headers ? { headers } : undefined)
      const j = await r.json()
      const res = parseApizh(j) || parseVvhan(j)
      if (res && (res.lunar || res.term || res.festival)) {
        lunarCache[dateStr] = { ...res, __p: false }
        persistLunarCache()
        return lunarCache[dateStr]
      }
    } catch {
      /* 自定义接口失败 → 不缓存，返回空 */
    }
    delete lunarCache[dateStr]
    return emptyLunar()
  }

  const sources: { url: string; parse: (j: unknown) => LunarData | null }[] = [
    { url: `/api/lunar/${dateStr}`, parse: parseApizh },
    { url: `https://api.vvhan.com/api/lunar?date=${dateStr}`, parse: parseVvhan },
    {
      url:
        'https://api.allorigins.win/raw?url=' +
        encodeURIComponent(`https://api.vvhan.com/api/lunar?date=${dateStr}`),
      parse: parseVvhan,
    },
  ]

  let res: LunarData | null = null
  for (const { url, parse } of sources) {
    try {
      const r = await fetch(url)
      res = parse(await r.json())
      if (res && (res.lunar || res.term || res.festival)) break
      res = null
    } catch {
      /* 尝试下一个数据源 */
    }
  }

  if (res) {
    lunarCache[dateStr] = { ...res, __p: false }
    persistLunarCache()
  } else {
    delete lunarCache[dateStr]
    return emptyLunar()
  }
  return lunarCache[dateStr]
}

/** 批量拉取：限流并发，避免触发第三方限频。 */
export async function fetchAllLunar(dateStrs: string[], limit = 3): Promise<void> {
  let i = 0
  const worker = async (): Promise<void> => {
    while (i < dateStrs.length) {
      const ds = dateStrs[i++]
      await fetchLunar(ds)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
}

/** 同步读取缓存（不触发请求），供渲染使用。 */
export function getCachedLunar(dateStr: string): LunarData {
  return lunarCache[dateStr] || emptyLunar()
}

// —— 休假 / 补班：节假日安排（后端代理 jiejiariapi，规避 CORS）——

function loadHolidayCache(): Record<string, Record<string, HolidayInfo>> {
  try {
    return JSON.parse(localStorage.getItem(HOLIDAY_CACHE_KEY) || '{}') as Record<
      string,
      Record<string, HolidayInfo>
    >
  } catch {
    return {}
  }
}

const holidayCache: Record<string, Record<string, HolidayInfo>> = loadHolidayCache()

function persistHolidayCache(obj: Record<string, Record<string, HolidayInfo>>): void {
  try {
    localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify(obj))
  } catch {
    /* 忽略 */
  }
}

export async function fetchHolidayYear(
  year: number | string,
): Promise<Record<string, HolidayInfo>> {
  const yk = String(year)
  if (holidayCache[yk]) return holidayCache[yk]

  // 自定义接口模式：用户自行提供节假日接口（前端直连，需 CORS / 同源）
  const { lunarSource, holidayApiBase, lunarApiKey } = getSettings()
  if (lunarSource === 'custom' && holidayApiBase) {
    try {
      const url = fillTemplate(holidayApiBase, { year: yk })
      const headers = lunarApiKey ? { Authorization: `Bearer ${lunarApiKey}` } : undefined
      const r = await fetch(url, headers ? { headers } : undefined)
      const data = await r.json()
      const map = normalizeHoliday(data)
      holidayCache[yk] = map
      persistHolidayCache(holidayCache)
      return map
    } catch {
      return {}
    }
  }

  try {
    const r = await fetch(`/api/holidays/${yk}`)
    const data = await r.json()
    const map: Record<string, HolidayInfo> = {}
    for (const [k, v] of Object.entries(data as Record<string, { name?: string; isOffDay?: boolean }>)) {
      map[k] = { name: v.name || '', isOffDay: !!v.isOffDay }
    }
    holidayCache[yk] = map
    persistHolidayCache(holidayCache)
    return map
  } catch {
    return {}
  }
}

// 兼容两种常见返回：{ "YYYY-MM-DD": {name, isOffDay} } 或 [{date,name,isOffDay}]
function normalizeHoliday(data: unknown): Record<string, HolidayInfo> {
  if (!data) return {}
  if (Array.isArray(data)) {
    const map: Record<string, HolidayInfo> = {}
    for (const it of data as Array<{ date?: string; name?: string; isOffDay?: boolean }>) {
      if (it && it.date) map[it.date] = { name: it.name || '', isOffDay: !!it.isOffDay }
    }
    return map
  }
  const map: Record<string, HolidayInfo> = {}
  for (const [k, v] of Object.entries(
    data as Record<string, { name?: string; isOffDay?: boolean }>,
  )) {
    map[k] = { name: v?.name || '', isOffDay: !!v?.isOffDay }
  }
  return map
}

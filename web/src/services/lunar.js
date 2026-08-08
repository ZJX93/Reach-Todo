// 农历 / 节气 / 黄历 / 节假日服务层：取数、缓存、解析。
// 第三方万年历账号密钥只保存在后端（后端经 /api/lunar 代理 apihz.cn），
// 前端不再内嵌任何第三方 key。

const LUNAR_CACHE_KEY = 'reach_lunar_cache_v4'
const HOLIDAY_CACHE_KEY = 'reach_holiday_cache_v1'

/** 占位空对象工厂：统一字段集合，避免同一字面量手写多遍。 */
export function emptyLunar(extra = {}) {
  return {
    lunar: '', term: '', festival: '', lunarYear: '', lunarMonth: '', lunarDay: '',
    ganzhiYear: '', shengxiao: '', yearShengxiao: '', xingzuo: '', yi: [], ji: [],
    yuexiang: '', wuhou: '', xi: '', yanggui: '', yingui: '', fu: '', cai: '',
    daysOfYear: '', weekOfYear: '',
    ...extra,
  }
}

function loadLunarCache() {
  try {
    const obj = JSON.parse(localStorage.getItem(LUNAR_CACHE_KEY) || '{}')
    for (const k of Object.keys(obj)) if (obj[k] && obj[k].__p) delete obj[k]
    return obj
  } catch {
    return {}
  }
}

// 模块级缓存：同页多次读取不重复解析 localStorage
const lunarCache = loadLunarCache()

function persistLunarCache() {
  try {
    localStorage.setItem(LUNAR_CACHE_KEY, JSON.stringify(lunarCache))
  } catch {
    /* 超出配额则忽略 */
  }
}

// 由年干支推导年生肖（apihz 返回的 DAYSHENGXIAO 是日生肖，年生肖需从年干支地支对应）
function shengxiaoFromGanzhi(gz) {
  if (!gz) return ''
  const map = {
    子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
    午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
  }
  return map[String(gz).slice(-1)] || ''
}

function parseApizh(j) {
  if (j && j.code === 200) {
    const nyue = j.nyue || ''
    const nri = j.nri || ''
    const jieqi = j.jieqi || ''
    // 仅节气当日（JIEQIDAYS=1）显示节气，避免「当前节气区间」挂满半个月
    const term = String(j.JIEQIDAYS || '') === '1' ? jieqi : ''
    // 物候取后半段，如 "寒露 初候鸿雁来宾" → "鸿雁来宾"
    const wuhou = (j.WUHOU || '').split(' ').pop() || ''
    return {
      lunar: nri === '初一' ? nyue : nri,
      term,
      festival: j.jieri || '',
      lunarYear: j.nnian || '',
      lunarMonth: nyue,
      lunarDay: nri,
      ganzhiYear: j.YEARGANZHI || j.ganzhinian || '',
      shengxiao: j.DAYSHENGXIAO || j.shengxiao || '',
      yearShengxiao: shengxiaoFromGanzhi(j.YEARGANZHI || j.ganzhinian),
      xingzuo: j.xingzuo || '',
      yi: (j.yi || '').split('|').filter(Boolean),
      ji: (j.ji || '').split('|').filter(Boolean),
      yuexiang: j.YUEXIANG || '',
      wuhou,
      xi: j.DAYPOSITIONXI || '',
      yanggui: j.DAYPOSITIONYANGGUI || '',
      yingui: j.DAYPOSITIONYINGUI || '',
      fu: j.DAYPOSITIONFU || '',
      cai: j.DAYPOSITIONCAI || '',
      daysOfYear: j.DAYSINYEAR || '',
      weekOfYear: j.YLWEEKNOY || '',
    }
  }
  return null
}

function parseVvhan(j) {
  if (j && j.code === 1 && j.data) {
    return emptyLunar({
      lunar: (j.data.lunarMonth || '') + (j.data.lunarDay || ''),
      term: j.data.solarTerms || '',
    })
  }
  return null
}

/**
 * 获取某一天的农历/黄历数据。
 * 数据源优先级：后端代理（apihz，key 在服务端）→ vvhan → vvhan 经 allorigins。
 * 成功结果持久化到 localStorage；失败不写入缓存，下次重试。
 */
export async function fetchLunar(dateStr) {
  const cached = lunarCache[dateStr]
  if (cached) return cached

  // 占位，防止同一天并发重复请求
  lunarCache[dateStr] = emptyLunar({ __p: true })

  const sources = [
    { url: `/api/lunar/${dateStr}`, parse: parseApizh },
    { url: `https://api.vvhan.com/api/lunar?date=${dateStr}`, parse: parseVvhan },
    {
      url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(`https://api.vvhan.com/api/lunar?date=${dateStr}`),
      parse: parseVvhan,
    },
  ]

  let res = null
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
export async function fetchAllLunar(dateStrs, limit = 3) {
  let i = 0
  const worker = async () => {
    while (i < dateStrs.length) {
      const ds = dateStrs[i++]
      await fetchLunar(ds)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
}

/** 同步读取缓存（不触发请求），供渲染使用。 */
export function getCachedLunar(dateStr) {
  return lunarCache[dateStr] || emptyLunar()
}

// —— 休假 / 补班：节假日安排（后端代理 jiejiariapi，规避 CORS）——

function loadHolidayCache() {
  try {
    return JSON.parse(localStorage.getItem(HOLIDAY_CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

const holidayCache = loadHolidayCache()

function persistHolidayCache(obj) {
  try {
    localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify(obj))
  } catch {
    /* 忽略 */
  }
}

export async function fetchHolidayYear(year) {
  if (holidayCache[year]) return holidayCache[year]
  try {
    const r = await fetch(`/api/holidays/${year}`)
    const data = await r.json()
    const map = {}
    for (const [k, v] of Object.entries(data)) {
      map[k] = { name: v.name || '', isOffDay: !!v.isOffDay }
    }
    holidayCache[year] = map
    persistHolidayCache(holidayCache)
    return map
  } catch {
    return {}
  }
}

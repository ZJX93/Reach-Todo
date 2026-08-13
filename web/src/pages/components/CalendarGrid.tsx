import { RECORD_TYPES } from '../recordMeta'
import { card } from '../ui'
import { ymd } from '../../utils/date'
import type { DayAgg, LunarDay, HolidayInfo, WeekStart } from '../../types'

const WEEK_SUN = ['日', '一', '二', '三', '四', '五', '六']
const WEEK_MON = ['一', '二', '三', '四', '五', '六', '日']
// 周末用 weekday 字符合集判定：日 (周日) / 六 (周六)；与周起始日无关，
// 避免在两种顺序下分别维护「末两列 / 首末列」的下标逻辑。
const WEEKEND_CHARS = new Set(['日', '六'])

function getWeekOrder(weekStart) {
  return weekStart === 'mon' ? WEEK_MON : WEEK_SUN
}

/**
 * 月历格子：纯展示组件。
 * @param cells 42 个 Date（含上月/下月补位）
 * @param month 当前展示的月份（1-12）
 * @param todayStr 本地今天 YYYY-MM-DD
 * @param selected 选中日 YYYY-MM-DD
 * @param onSelect 选中回调
 * @param days 记录聚合 { [date]: { diary, worklog, note, tasks } }
 * @param lunarMap 农历缓存 { [date]: { lunar, term, festival } }
 * @param holidays 节假日 { [date]: { name, isOffDay } }
 * @param weekStart 'sun' (默认) | 'mon'
 */
interface CalendarGridProps {
  cells: Date[]
  month: number
  todayStr: string
  selected: string
  onSelect: (ds: string) => void
  days: Record<string, DayAgg>
  lunarMap: Record<string, LunarDay>
  holidays: Record<string, HolidayInfo>
  weekStart?: WeekStart
}

export default function CalendarGrid({
  cells, month, todayStr, selected, onSelect, days, lunarMap, holidays, weekStart = 'sun',
}: CalendarGridProps) {
  const weekOrder = getWeekOrder(weekStart)
  return (
    <div className={`${card} p-4 md:p-5 relative overflow-hidden`}>
      {/* 大月份水印 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
        <span className="text-[480px] font-black text-[#94a3b8]/[0.12] leading-none">{month}</span>
      </div>

      {/* 星期表头 */}
      <div className="relative grid grid-cols-7 text-center text-sm font-medium text-[#64748b] mb-2">
        {weekOrder.map((w) => (
          <div key={w} className={`py-2 ${WEEKEND_CHARS.has(w) ? 'text-[#ef4444]' : ''}`}>
            {w}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="relative grid grid-cols-7 gap-1 md:gap-2">
        {cells.map((dt, i) => {
          const ds = ymd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
          const inMonth = dt.getMonth() + 1 === month
          const d = days[ds]
          const L = lunarMap[ds] || { lunar: '', term: '', festival: '' }
          const hd = holidays[ds]
          const isSel = ds === selected
          const isToday = ds === todayStr
          const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
          const isLegalHoliday = hd && hd.isOffDay === true
          const isWorkDay = hd && hd.isOffDay === false
          const termOrFestival = L.term || L.festival || hd?.name || ''

          return (
            <button
              key={i}
              onClick={() => onSelect(ds)}
              className={`relative min-h-[90px] md:min-h-[110px] rounded-xl md:rounded-2xl flex flex-col items-start p-2 md:p-2.5 transition text-left ${
                isSel
                  ? 'bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/25'
                  : isLegalHoliday
                    ? 'bg-[#fef2f2] hover:bg-[#fee2e2]'
                    : isWorkDay
                      ? 'bg-[#eff6ff] hover:bg-[#dbeafe]'
                      : inMonth
                        ? 'bg-white/60 hover:bg-white/90'
                        : 'bg-transparent opacity-35'
              }`}
            >
              {/* 休 / 班 角标 */}
              {hd && hd.isOffDay && (
                <span className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold bg-[#ef4444] text-white">
                  休
                </span>
              )}
              {hd && hd.isOffDay === false && (
                <span className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold bg-[#2563eb] text-white">
                  班
                </span>
              )}

              {/* 公历日期 */}
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${
                  isSel
                    ? 'bg-white text-[#2563eb]'
                    : isToday
                      ? 'bg-[#2563eb] text-white'
                      : isWeekend || isLegalHoliday
                        ? 'text-[#ef4444]'
                        : 'text-[#1e293b]'
                }`}
              >
                {dt.getDate()}
              </span>

              {/* 农历 */}
              {L.lunar && (
                <span className={`text-xs mt-1 ${isSel ? 'text-white/90' : 'text-[#64748b]'}`}>
                  {L.lunar}
                </span>
              )}

              {/* 节气 / 节日 / 节假日名称 */}
              {termOrFestival && (
                <span
                  className={`text-[10px] mt-0.5 truncate max-w-full ${
                    isSel
                      ? 'text-white/95'
                      : L.term
                        ? 'text-[#2563eb]'
                        : isLegalHoliday
                          ? 'text-[#ef4444]'
                          : 'text-[#0ea5e9]'
                  }`}
                >
                  {termOrFestival}
                </span>
              )}

              {/* 记录/任务小点；选中时加白边，避免蓝色点融进蓝色选中背景 */}
              <span className={`flex gap-1 mt-auto pt-1 ${isSel ? '[&>i]:ring-1 [&>i]:ring-white' : ''}`}>
                {d?.diary > 0 && (
                  <i className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RECORD_TYPES.diary.color }} />
                )}
                {d?.worklog > 0 && (
                  <i className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RECORD_TYPES.worklog.color }} />
                )}
                {d?.note > 0 && (
                  <i className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RECORD_TYPES.note.color }} />
                )}
                {d?.tasks > 0 && <i className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

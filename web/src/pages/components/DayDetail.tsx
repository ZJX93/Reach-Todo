import { useNavigate } from 'react-router-dom'
import { card, btnGhost, Icon } from '../ui'
import { typeMeta } from '../recordMeta'
import {
  emptyLunar,
} from '../../services/lunar'
import {
  formatDateCN, dayOfYear, weekOfYear, stripTags,
} from '../../utils/date'
import type { LunarData, HolidayInfo, Task, RecordItem } from '../../types'

/**
 * 日历右侧详情：日期卡片（农历/干支/星座/宜忌/月相/神位）+ 待办 + 记录。
 */
interface DayDetailProps {
  selected: string
  lunar: LunarData | null
  holiday: HolidayInfo | null
  tasks: Task[]
  records: RecordItem[]
}

export default function DayDetail({ selected, lunar, holiday, tasks, records }: DayDetailProps) {
  const navigate = useNavigate()
  const L = lunar || emptyLunar()

  return (
    <div className="space-y-4">
      {/* 日期卡片 */}
      <div className={`${card} p-5`}>
        <div className="text-sm text-[#64748b] text-center">{formatDateCN(selected)}</div>
        <div className="flex items-center justify-center mt-2">
          <div className="w-20 h-20 rounded-2xl bg-[#2563eb] text-white flex flex-col items-center justify-center shadow-lg shadow-[#2563eb]/25">
            <span className="text-4xl font-black leading-none">{selected.slice(8, 10)}</span>
          </div>
        </div>

        <div className="text-center mt-3 space-y-0.5">
          <div className="text-sm text-[#1e293b]">
            {L.lunarYear && L.lunarMonth && L.lunarDay
              ? `${L.lunarYear}年${L.lunarMonth}${L.lunarDay}`
              : L.lunar || '农历信息加载中'}
          </div>
          <div className="text-xs text-[#64748b]">
            {L.ganzhiYear && L.yearShengxiao ? `${L.ganzhiYear}（${L.yearShengxiao}）年` : ''}
          </div>
          <div className="text-xs text-[#64748b]">
            本年第{L.daysOfYear || dayOfYear(selected)}天 第{L.weekOfYear || weekOfYear(selected)}周
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {L.xingzuo && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#fce7f3] text-[#db2777]">
              星座 {L.xingzuo}
            </span>
          )}
          {L.term && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#2563eb]">
              {L.term}
            </span>
          )}
          {L.festival && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#fff7ed] text-[#f97316]">
              {L.festival}
            </span>
          )}
          {holiday?.name && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                holiday.isOffDay
                  ? 'bg-[#fef2f2] text-[#ef4444]'
                  : 'bg-[#eff6ff] text-[#2563eb]'
              }`}
            >
              {holiday.name} {holiday.isOffDay ? '休' : '班'}
            </span>
          )}
        </div>

        {/* 宜 / 忌 */}
        {(L.yi?.length > 0 || L.ji?.length > 0) && (
          <div className="mt-4 space-y-2">
            {L.yi?.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded bg-[#22c55e] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  宜
                </span>
                <p className="text-xs text-[#475569] leading-relaxed">{L.yi.join('，')}</p>
              </div>
            )}
            {L.ji?.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded bg-[#ef4444] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  忌
                </span>
                <p className="text-xs text-[#475569] leading-relaxed">{L.ji.join('，')}</p>
              </div>
            )}
          </div>
        )}

        {/* 月相 / 物候 */}
        {(L.yuexiang || L.wuhou) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {L.yuexiang && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#f3e8ff] text-[#9333ea]">
                月相 {L.yuexiang}
              </span>
            )}
            {L.wuhou && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#eef2ff] text-[#4f46e5]">
                物候 {L.wuhou}
              </span>
            )}
          </div>
        )}

        {/* 神位 */}
        {(L.xi || L.yanggui || L.yingui || L.fu || L.cai) && (
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {[
              ['喜神位', L.xi],
              ['阳贵位', L.yanggui],
              ['阴贵位', L.yingui],
              ['福神位', L.fu],
              ['财神位', L.cai],
            ]
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[#94a3b8]">{label}</span>
                  <span className="text-[#1e293b]">{v}</span>
                </div>
              ))}
          </div>
        )}

        <button
          onClick={() => navigate(`/records?date=${selected}`)}
          className={`${btnGhost} w-full mt-4 justify-center inline-flex items-center gap-1`}
        >
          <Icon.pencil className="w-4 h-4" />
          写此日记录
        </button>
      </div>

      {/* 待办 */}
      <div className={`${card} p-4`}>
        <div className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[#2563eb]" />
          待办到期（{tasks.length}）
        </div>
        {tasks.length === 0 ? (
          <p className="text-xs text-[#94a3b8]">这一天没有到期待办</p>
        ) : (
          <div className="max-h-[175px] overflow-y-auto pr-1">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 bg-white/50 border border-white/75 rounded-xl p-2.5 mb-2">
                <span
                  className={`w-4 h-4 rounded-md border-2 grid place-items-center text-[10px] ${
                    t.status === 'done'
                      ? 'brand-gradient border-transparent text-white'
                      : 'border-[#94a3b8]'
                  }`}
                >
                  {t.status === 'done' ? '✓' : ''}
                </span>
                <span
                  className={`text-sm truncate ${
                    t.status === 'done' ? 'line-through text-[#94a3b8]' : 'text-[#0f172a]'
                  }`}
                >
                  {t.title}
                </span>
                {t.due_time && (
                  <span className="text-[10px] text-[#94a3b8] shrink-0 ml-auto inline-flex items-center gap-1">
                    <Icon.clock className="w-3.5 h-3.5" />
                    {t.due_time}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 记录 */}
      <div className={`${card} p-4`}>
        <div className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[#14b8a6]" />
          记录（{records.length}）
        </div>
        {records.length === 0 ? (
          <p className="text-xs text-[#94a3b8]">这一天还没有记录</p>
        ) : (
          <div className="max-h-[130px] overflow-y-auto pr-1">
            {records.map((r) => {
              const m = typeMeta(r.type)
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/records?edit=${r.id}`)}
                  className="cursor-pointer bg-white/50 border border-white/75 rounded-xl p-3 mb-2 hover:bg-white/80 transition"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.label}
                    </span>
                    <span className="text-sm font-semibold text-[#0f172a] truncate">{r.title}</span>
                    {r.record_time && (
                      <span className="text-[10px] text-[#94a3b8] shrink-0 ml-auto inline-flex items-center gap-1">
                        <Icon.clock className="w-3.5 h-3.5" />
                        {r.record_time}
                      </span>
                    )}
                  </div>
                  {r.content && (
                    <p className="text-[11px] text-[#475569] mt-1 whitespace-pre-wrap line-clamp-2">
                      {stripTags(r.content).slice(0, 60)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

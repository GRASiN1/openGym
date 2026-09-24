import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DAYN, uid, exCount, todayISO } from '../lib/format.js'
import { cycleOn, cycleIndex, cycleStartFor } from '../lib/history.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, cycleDayAssignSheet, loadStarterPlan, planToolsSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Segmented, SelectRow } from '../components/ui.jsx'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'

function RoutineTag({ r }) {
  return r ? <span className="tag acc"><Icon name={glyphOf(r.emoji)} />{r.name}</span> : <span className="tag">{t('Rest')}</span>
}

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const cycle = cycleOn(S)
  const todayIdx = cycle ? cycleIndex(S, todayISO()) : 0

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  const setMode = mode => update(s => {
    const c = s.cycle || { on: false, start: null, days: [] }
    if (mode === 'cycle' && !c.days?.length) c.days = [...s.routines.map(r => r.id), null]
    if (mode === 'cycle' && !c.start) c.start = todayISO()
    c.on = mode === 'cycle'
    s.cycle = c
  })
  const addDay = () => update(s => {
    const today = cycleIndex(s, todayISO())
    s.cycle.days.push(null)
    s.cycle.start = cycleStartFor(todayISO(), today)
  })
  const setToday = i => update(s => { s.cycle.start = cycleStartFor(todayISO(), i) })

  return <>
    <div className="hdr">
      <div><h1>{t('Plan')}</h1><div className="sub">{cycle ? t('Your repeating cycle') : t('Your weekly routine')}</div></div>
      <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
    </div>
    <div className="cols"><div>
      <Segmented className="seg-range" value={cycle ? 'cycle' : 'week'} onChange={setMode}
        options={[{ value: 'week', label: t('Same days every week') }, { value: 'cycle', label: t('Repeating cycle') }]} />
      {cycle ? <>
        <h4 className="sec">{t('Cycle · {0} days', S.cycle.days.length)}</h4>
        <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
          {S.cycle.days.map((rid, i) => (
            <div key={i} className="item" onClick={() => cycleDayAssignSheet(i)}>
              <div className="grow"><div className="tt">{t('Day {0}', i + 1)}{i === todayIdx && <span className="accent"> · {t('today')}</span>}</div></div>
              <RoutineTag r={S.routines.find(x => x.id === rid)} />
              <Icon name="chevronRight" className="chev" /></div>
          ))}
        </div>
        <div style={{ height: 10 }} />
        <Button size="sm" variant="tinted" icon="plus" onClick={addDay}>{t('Add day')}</Button>
        <div className="sect-b" style={{ marginTop: 16 }}>
          <SelectRow icon="calendar" iconTint="var(--orange)" title={t('Today is')} value={todayIdx} onChange={setToday}
            options={S.cycle.days.map((_, i) => ({ value: i, label: t('Day {0}', i + 1) }))} />
        </div>
        <div className="small dim" style={{ margin: '8px 2px 0' }}>
          {t('The days repeat in order, whatever the weekday. Skipped a session? Set “Today is” back a day and everything after it shifts along.')}
        </div>
      </> : <>
        <h4 className="sec">{t('Week schedule')}</h4>
        <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
          {[1, 2, 3, 4, 5, 6, 0].map(d => (
            <div key={d} className="item" onClick={() => dayAssignSheet(d)}>
              <div className="grow"><div className="tt">{t(DAYN[d])}</div></div>
              <RoutineTag r={S.routines.find(x => x.id === S.week[d])} />
              <Icon name="chevronRight" className="chev" /></div>
          ))}
        </div>
      </>}
    </div><div>
      <div className="row between" style={{ marginTop: 22, marginBottom: 10 }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Routines')}</h4>
        <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
      </div>
      {S.routines.length ? <div className="list">{S.routines.map(r => <div key={r.id} className="item" onClick={() => nav('/plan/r/' + r.id)}>
        <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
        <Icon name="chevronRight" className="chev" /></div>)}</div> : <>
        <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Create one or load the starter plan.')}</div>
        <Button icon="sparkles" onClick={loadStarterPlan}>{t('Load starter plan (Push / Pull / Legs)')}</Button>
      </>}
    </div></div>
  </>
}

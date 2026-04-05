<template>
  <div class="page">
    <div class="toolbar">
      <h2 style="margin:0; font-size:18px; font-weight:700; color:#111827;">主页面</h2>
      <div style="flex:1"></div>
      <select v-model="range" @change="fetchAll">
        <option value="7d">近7天</option>
        <option value="30d">近30天</option>
        <option value="90d">近90天</option>
      </select>
      <button class="primary" @click="fetchAll" :disabled="loading">刷新</button>
      <button @click="exportSVG" :disabled="loading">导出SVG</button>
      <button @click="exportPNG" :disabled="loading">导出PNG</button>
      <button @click="exportCSV" :disabled="loading || !hasTrend">导出CSV</button>
    </div>

    <div class="analytics-grid">
      <div class="card">
        <div class="card-title">关键指标</div>
        <div class="kpis">
          <div class="kpi"><div class="kpi-v">{{ fmt(total_users) }}</div><div class="kpi-k">用户总数</div></div>
          <div class="kpi"><div class="kpi-v">{{ fmt(total_videos) }}</div><div class="kpi-k">视频总数</div></div>
          <div class="kpi"><div class="kpi-v">{{ fmt(total_comments) }}</div><div class="kpi-k">评论总数</div></div>
          <div class="kpi"><div class="kpi-v">{{ fmt(total_views) }}</div><div class="kpi-k">累计播放</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">热门分类占比</div>
        <div v-if="categorySegments.length" class="donut-wrap">
          <svg class="donut" viewBox="0 0 120 120" width="160" height="160" aria-hidden="true">
            <g transform="translate(60,60) rotate(-90)">
              <circle class="ring" r="44" cx="0" cy="0" />
              <circle
                v-for="(seg,i) in categorySegments" :key="i"
                class="slice"
                r="44" cx="0" cy="0"
                :stroke="seg.color"
                :stroke-dasharray="seg.len + ' ' + (circumference - seg.len)"
                :stroke-dashoffset="-seg.offset"
              />
            </g>
          </svg>
          <ul class="legend">
            <li v-for="(seg,i) in categoryParts()" :key="i">
              <span class="dot" :style="{ background: seg.color }"></span>{{ seg.label }} {{ fmt(seg.val) }}
            </li>
          </ul>
        </div>
        <div v-else class="empty">暂无分类数据</div>
      </div>

      <div class="card">
        <div class="card-title">最近活跃</div>
        <ul class="list">
          <li>新增用户：{{ fmt(delta_users) }}</li>
          <li>新增视频：{{ fmt(delta_videos) }}</li>
          <li>新增评论：{{ fmt(delta_comments) }}</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-title">趋势（按日）</div>
        <div v-if="hasTrend" class="chart-wrap" ref="chartBox">
          <svg class="linechart" ref="trendSvg" :viewBox="'0 0 ' + chartW + ' ' + chartH" :width="chartW" :height="chartH" aria-hidden="true">
            <!-- axes -->
            <g class="axes">
              <line :x1="padL" :y1="chartH - padB" :x2="chartW - padR" :y2="chartH - padB" class="axis" />
              <line :x1="padL" :y1="padT" :x2="padL" :y2="chartH - padB" class="axis" />
              <g v-for="(v,i) in yTickValues" :key="'y'+i">
                <line :x1="padL" :y1="yForValue(v)" :x2="chartW - padR" :y2="yForValue(v)" class="ygrid" />
                <text :x="padL - 6" :y="yForValue(v) + 3" text-anchor="end" class="tick-text">{{ fmt(v) }}</text>
              </g>
              <g v-for="idx in xTickIndices" :key="'x'+idx">
                <line :x1="xForIndex(idx)" :y1="chartH - padB" :x2="xForIndex(idx)" :y2="chartH - padB + 4" class="tick" />
                <text :x="xForIndex(idx)" :y="chartH - padB + 14" text-anchor="middle" class="tick-text">{{ shortDate(trend[idx] && trend[idx].date) }}</text>
              </g>
            </g>
            <!-- lines -->
            <path v-if="seriesOn.users" :d="areaPath('users')" :fill="areaColor('users')" class="area" />
            <path v-if="seriesOn.videos" :d="areaPath('videos')" :fill="areaColor('videos')" class="area" />
            <path v-if="seriesOn.comments" :d="areaPath('comments')" :fill="areaColor('comments')" class="area" />
            <path v-if="seriesOn.views" :d="areaPath('views')" :fill="areaColor('views')" class="area" />
            <path v-if="seriesOn.users" :d="linePath('users')" stroke="#34d399" class="line" />
            <path v-if="seriesOn.videos" :d="linePath('videos')" stroke="#60a5fa" class="line" />
            <path v-if="seriesOn.comments" :d="linePath('comments')" stroke="#f59e0b" class="line" />
            <path v-if="seriesOn.views" :d="linePath('views')" stroke="#ef4444" class="line" />
            <!-- hover -->
            <g v-if="hoverIndex>=0" class="hover">
              <line :x1="xForIndex(hoverIndex)" :y1="padT" :x2="xForIndex(hoverIndex)" :y2="chartH - padB" class="hover-line" />
              <circle v-if="seriesOn.users" :cx="xForIndex(hoverIndex)" :cy="yFor('users', hoverIndex)" r="3" fill="#34d399" />
              <circle v-if="seriesOn.videos" :cx="xForIndex(hoverIndex)" :cy="yFor('videos', hoverIndex)" r="3" fill="#60a5fa" />
              <circle v-if="seriesOn.comments" :cx="xForIndex(hoverIndex)" :cy="yFor('comments', hoverIndex)" r="3" fill="#f59e0b" />
              <circle v-if="seriesOn.views" :cx="xForIndex(hoverIndex)" :cy="yFor('views', hoverIndex)" r="3" fill="#ef4444" />
            </g>
            <!-- brush selection -->
            <rect v-if="isDrag" class="brush" :x="brushX" :y="padT" :width="brushW" :height="chartH - padT - padB" />
            <!-- hit area -->
            <rect class="hit" :x="0" :y="0" :width="chartW" :height="chartH" fill="transparent" @mousemove="onChartMove" @mouseleave="onChartLeave" @mousedown="onChartDown" @mouseup="onChartUp" />
          </svg>
          <ul class="legend2">
            <li :class="{off: !seriesOn.users}" @click="toggleSeries('users')"><span class="dot green"></span>用户</li>
            <li :class="{off: !seriesOn.videos}" @click="toggleSeries('videos')"><span class="dot blue"></span>视频</li>
            <li :class="{off: !seriesOn.comments}" @click="toggleSeries('comments')"><span class="dot amber"></span>评论</li>
            <li :class="{off: !seriesOn.views}" @click="toggleSeries('views')"><span class="dot red"></span>播放</li>
          </ul>
          <div>
            <button v-if="zoomFromIdx>=0" @click="resetZoom">重置缩放</button>
          </div>
          <div class="tip">
            <template v-if="hoverIndex>=0 && hoverIndex < trend.length">
              <span class="date">{{ shortDateFull(trend[hoverIndex]?.date) }}</span>
              <span v-if="seriesOn.users && trend[hoverIndex]?.users" class="chip g">用户 {{ fmt(trend[hoverIndex].users) }}</span>
              <span v-if="seriesOn.videos && trend[hoverIndex]?.videos" class="chip b">视频 {{ fmt(trend[hoverIndex].videos) }}</span>
              <span v-if="seriesOn.comments && trend[hoverIndex]?.comments" class="chip a">评论 {{ fmt(trend[hoverIndex].comments) }}</span>
              <span v-if="seriesOn.views && trend[hoverIndex]?.views" class="chip r">播放 {{ fmt(trend[hoverIndex].views) }}</span>
            </template>
          </div>
        </div>
        <div v-else class="empty">暂无趋势数据</div>
      </div>

      <div class="card">
        <div class="card-title">日新增堆叠柱（近14日）</div>
        <div v-if="stackBars.length" class="stack-chart">
          <div class="stack-bars">
            <div
              v-for="(b,i) in stackBars"
              :key="b.date || i"
              class="stack-bar"
              :title="stackTitle(b)"
            >
              <span class="seg user" :style="{ height: b.hUsers }"></span>
              <span class="seg video" :style="{ height: b.hVideos }"></span>
              <span class="seg comment" :style="{ height: b.hComments }"></span>
              <span class="seg view" :style="{ height: b.hViews }"></span>
            </div>
          </div>
          <div class="stack-xaxis">
            <span v-for="(b,i) in stackBars" :key="'x'+i" class="x-tick" :class="{show: i===0 || i===stackBars.length-1 || i===midIdx}">
              <small>{{ shortDate(b.date) }}</small>
            </span>
          </div>
          <div class="stack-legend">
            <span><span class="dot green"></span>用户</span>
            <span><span class="dot blue"></span>视频</span>
            <span><span class="dot amber"></span>评论</span>
            <span><span class="dot red"></span>播放</span>
          </div>
        </div>
        <div v-else class="empty">暂无新增数据</div>
      </div>

      <div class="card">
        <div class="card-title">新增对比（本周期累计）</div>
        <div v-if="rangeTotalsList.length" class="bars">
          <div v-for="it in rangeTotalsList" :key="it.key" class="bar-row">
            <div class="bar-label">{{ it.label }}</div>
            <div class="bar">
              <div class="bar-fill" :style="{ width: it.width, background: it.color }"></div>
            </div>
            <div class="bar-val">{{ fmt(it.value) }}</div>
          </div>
        </div>
        <div v-else class="empty">暂无新增数据</div>
      </div>

      <div class="card">
        <div class="card-title">内容可见性分布</div>
        <div class="donut-wrap">
          <svg class="donut" viewBox="0 0 120 120" width="160" height="160" aria-hidden="true">
            <g transform="translate(60,60) rotate(-90)">
              <circle class="ring" r="44" cx="0" cy="0" />
              <circle
                v-for="(seg,i) in visSegments" :key="i"
                class="slice"
                r="44" cx="0" cy="0"
                :stroke="seg.color"
                :stroke-dasharray="seg.len + ' ' + (circumference - seg.len)"
                :stroke-dashoffset="-seg.offset"
              />
            </g>
          </svg>
          <ul class="legend">
            <li><span class="dot pub"></span>公开 {{ fmt(count_public) }}</li>
            <li><span class="dot unl"></span>未列出 {{ fmt(count_unlisted) }}</li>
            <li><span class="dot pri"></span>私密 {{ fmt(count_private) }}</li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-title">热门分类 Top5</div>
        <div class="bars" v-if="(top_categories && top_categories.length)">
          <div v-for="(it,i) in top_categories" :key="i" class="bar-row">
            <div class="bar-label" :title="it.name">{{ it.name }}</div>
            <div class="bar">
              <div class="bar-fill" :style="{ width: barWidth(it.count) }"></div>
            </div>
            <div class="bar-val">{{ fmt(it.count) }}</div>
          </div>
        </div>
        <div v-else class="empty">暂无分类数据</div>
      </div>

      <div class="card">
        <div class="card-title">热门视频 Top5</div>
        <ul class="rank-list" v-if="(top_videos && top_videos.length)">
          <li v-for="(v,i) in top_videos" :key="v.id">
            <span class="idx">{{ i+1 }}</span>
            <span class="name ellipsis" :title="v.title">{{ v.title }}</span>
            <span class="metric">{{ fmt(v.view_count) }} 播放</span>
          </li>
        </ul>
        <div v-else class="empty">暂无数据</div>
      </div>

      <div class="card">
        <div class="card-title">活跃作者 Top5</div>
        <ul class="rank-list" v-if="(top_users && top_users.length)">
          <li v-for="(u,i) in top_users" :key="u.id">
            <span class="idx">{{ i+1 }}</span>
            <span class="name ellipsis" :title="u.username">{{ u.username }}</span>
            <span class="metric">{{ fmt(u.video_count) }} 视频</span>
          </li>
        </ul>
        <div v-else class="empty">暂无数据</div>
      </div>

      <div class="card">
        <div class="card-title">播放趋势柱状</div>
        <div v-if="viewBars.length" class="spark-wrap">
          <div class="bar-spark">
            <div
              v-for="(v,i) in viewBars" :key="i"
              class="bar-spark-item"
              :style="{ height: sparkHeight(v) }"
              :title="sparkTitle(i, v)"
            ></div>
          </div>
          <div class="spark-legend">
            <span>峰值：{{ fmt(viewBarsMax) }}</span>
            <span>日均：{{ fmt(viewBarsAvg) }}</span>
          </div>
        </div>
        <div v-else class="empty">暂无播放数据</div>
      </div>

    </div>

    <p v-if="error" class="err">{{ error }}</p>
  </div>
</template>

<script>
import { adminApi } from '../lib/admin'

export default {
  name: 'AdminAnalytics',
  data() {
    return {
      loading: false,
      error: '',
      range: '7d',
      total_users: 0,
      total_videos: 0,
      total_comments: 0,
      total_views: 0,
      delta_users: 0,
      delta_videos: 0,
      delta_comments: 0,
      count_public: 0,
      count_unlisted: 0,
      count_private: 0,
      top_categories: [],
      top_videos: [],
      top_users: [],
      trend: [],
      originalTrend: [],
      chartW: 560,
      chartH: 160,
      hoverIndex: -1,
      padL: 34,
      padR: 10,
      padT: 10,
      padB: 24,
      seriesOn: { users: true, videos: true, comments: true, views: true },
      // brush/zoom state
      isDrag: false,
      dragStartX: 0,
      brushX: 0,
      brushW: 0,
      zoomFromIdx: -1,
      zoomToIdx: -1,
    }
  },
  created() { this.fetchAll() },
  mounted() {
    this.$nextTick(this.updateChartW)
    window.addEventListener('resize', this.updateChartW)
  },
  beforeUnmount(){
    window.removeEventListener('resize', this.updateChartW)
  },
  methods: {
    fmt(n) { n = Number(n||0); return n>=10000 ? (Math.round(n/100)/100 + '万') : n },
    totalVis() { return Math.max(0, Number(this.count_public||0) + Number(this.count_unlisted||0) + Number(this.count_private||0)) },
    visParts() {
      const t = this.totalVis() || 1
      return [
        { key: 'public', val: Number(this.count_public||0), color: '#1d4ed8' },
        { key: 'unlisted', val: Number(this.count_unlisted||0), color: '#6b7280' },
        { key: 'private', val: Number(this.count_private||0), color: '#7e22ce' },
      ].map(s => ({ ...s, pct: s.val / t }))
    },
    categoryParts(){
      const palette = ['#2563eb','#10b981','#f97316','#ec4899','#8b5cf6']
      const arr = (Array.isArray(this.top_categories) ? this.top_categories.slice(0,5) : [])
      const total = Math.max(1, arr.reduce((a,b)=>a+Number(b.count||0),0))
      return arr.map((it, idx) => ({
        label: it.name || '未分类',
        val: Number(it.count||0),
        pct: Math.max(0, Math.min(1, Number(it.count||0)/total)),
        color: palette[idx % palette.length]
      }))
    },
    barWidth(v){
      const arr = Array.isArray(this.top_categories) ? this.top_categories : []
      const max = Math.max(1, ...arr.map(x => Number(x.count||0)))
      const pct = Math.max(0, Math.min(1, Number(v||0)/max))
      return Math.round(pct*100) + '%'
    },
    barWidthValue(v, base){
      const max = Math.max(1, ...(Array.isArray(base) ? base : []), Number(v||0))
      const pct = Math.max(0, Math.min(1, Number(v||0)/max))
      return Math.round(pct*100) + '%'
    },
    async fetchAll() {
      this.loading = true
      this.error = ''
      try {
        const r = await adminApi.analyticsOverview({ range: this.range })
        const t = r && r.totals ? r.totals : {}
        const d = r && r.deltas ? r.deltas : {}
        const vis = r && r.visibility ? r.visibility : {}
        this.total_users = Number(t.users||0)
        this.total_videos = Number(t.videos||0)
        this.total_comments = Number(t.comments||0)
        this.total_views = Number(t.views||0)
        this.delta_users = Number(d.users||0)
        this.delta_videos = Number(d.videos||0)
        this.delta_comments = Number(d.comments||0)
        this.count_public = Number(vis.public||0)
        this.count_unlisted = Number(vis.unlisted||0)
        this.count_private = Number(vis.private||0)
        this.top_categories = Array.isArray(r && r.top_categories) ? r.top_categories : []
        this.top_videos = Array.isArray(r && r.top_videos) ? r.top_videos : []
        this.top_users = Array.isArray(r && r.top_users) ? r.top_users : []
        this.parseTrend(r)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '加载失败'
      } finally { this.loading = false }
    },
    parseTrend(r){
      const arr = (r && (r.trend || r.trends || r.timeseries || r.daily || r.series)) || []
      if (!Array.isArray(arr)) { this.trend = []; return }
      const mapped = arr.map(it => {
        const date = it.date || it.day || it.d || it.ts || it.time || ''
        const users = Number(it.users ?? it.new_users ?? it.u ?? 0)
        const videos = Number(it.videos ?? it.new_videos ?? it.v ?? 0)
        const comments = Number(it.comments ?? it.new_comments ?? it.c ?? 0)
        const views = Number(it.views ?? it.play ?? it.plays ?? it.view ?? it.pv ?? 0)
        return { date, users, videos, comments, views }
      })
      this.originalTrend = mapped
      this.trend = mapped
      this.zoomFromIdx = -1
      this.zoomToIdx = -1
    },
    linePath(key){
      const pts = this.pointsFor(key)
      if (pts.length === 0) return ''
      return this.cubicSplinePath(pts, 0.5)
    },
    areaPath(key){
      const pts = this.pointsFor(key)
      if (pts.length === 0) return ''
      const baseY = this.yForValue(0)
      const top = this.cubicSplinePath(pts, 0.5, true) // path without initial 'M'
      const first = pts[0]
      const last = pts[pts.length-1]
      return `M ${first.x} ${baseY} L ${first.x} ${first.y} ${top} L ${last.x} ${baseY} Z`
    },
    areaColor(key){
      if (key === 'users') return 'rgba(52, 211, 153, 0.18)'
      if (key === 'videos') return 'rgba(96, 165, 250, 0.18)'
      if (key === 'comments') return 'rgba(245, 158, 11, 0.18)'
      if (key === 'views') return 'rgba(239, 68, 68, 0.18)'
      return 'rgba(0,0,0,0.1)'
    },
    pointsFor(key){
      const data = Array.isArray(this.trend) ? this.trend : []
      const n = data.length
      if (n === 0) return []
      const plotW = Math.max(1, this.chartW - this.padL - this.padR)
      const plotH = Math.max(1, this.chartH - this.padT - this.padB)
      let maxV = 1
      for (const it of data) {
        const m = Math.max(Number(it.users||0), Number(it.videos||0), Number(it.comments||0), Number(it.views||0))
        if (m > maxV) maxV = m
      }
      const xs = i => this.padL + (n<=1 ? 0 : (plotW * i / (n-1)))
      const ys = v => this.padT + plotH * (1 - Math.max(0, Number(v||0)) / maxV)
      const pts = []
      for (let i=0; i<n; i++){
        const v = data[i] && data[i][key]
        pts.push({ x: xs(i), y: ys(v) })
      }
      return pts
    },
    cubicSplinePath(points, tension = 0.5, stripMove = false){
      const n = points.length
      if (n === 0) return ''
      if (n === 1) return `M ${points[0].x} ${points[0].y}`
      let d = `M ${points[0].x} ${points[0].y}`
      for (let i = 0; i < n - 1; i++){
        const p0 = points[i - 1] || points[i]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[i + 2] || p2
        const cp1x = p1.x + (p2.x - p0.x) / 6 * tension
        const cp1y = p1.y + (p2.y - p0.y) / 6 * tension
        const cp2x = p2.x - (p3.x - p1.x) / 6 * tension
        const cp2y = p2.y - (p3.y - p1.y) / 6 * tension
        d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
      }
      if (stripMove) return d.replace(/^M [^C]+\s/, '')
      return d
    },
    xForIndex(i){
      const n = Array.isArray(this.trend) ? this.trend.length : 0
      if (n <= 1) return this.padL
      const plotW = Math.max(1, this.chartW - this.padL - this.padR)
      return this.padL + plotW * (i / (n-1))
    },
    yFor(key, i){
      const d = this.trend[i] || {}
      const plotH = Math.max(1, this.chartH - this.padT - this.padB)
      let maxV = 1
      for (const it of (this.trend || [])) {
        const m = Math.max(Number(it.users||0), Number(it.videos||0), Number(it.comments||0), Number(it.views||0))
        if (m > maxV) maxV = m
      }
      const v = Number(d[key] || 0)
      return this.padT + plotH * (1 - Math.max(0, v) / maxV)
    },
    yForValue(val){
      const plotH = Math.max(1, this.chartH - this.padT - this.padB)
      const v = Math.max(0, Number(val||0))
      const maxV = Math.max(1, this.maxY)
      return this.padT + plotH * (1 - v / maxV)
    },
    onChartMove(e){
      const rect = (e.currentTarget || e.target).getBoundingClientRect()
      const x = e.clientX - rect.left
      const plotW = Math.max(1, this.chartW - this.padL - this.padR)
      const n = Array.isArray(this.trend) ? this.trend.length : 0
      if (n <= 1) { this.hoverIndex = -1; return }
      let idx = Math.round(((x - this.padL) / plotW) * (n - 1))
      if (isNaN(idx)) idx = -1
      idx = Math.max(0, Math.min(n - 1, idx))
      this.hoverIndex = idx
      if (this.isDrag){
        const sx = Math.max(this.padL, Math.min(this.chartW - this.padR, this.dragStartX))
        const cx = Math.max(this.padL, Math.min(this.chartW - this.padR, x))
        this.brushX = Math.min(sx, cx)
        this.brushW = Math.abs(cx - sx)
      }
    },
    onChartLeave(){ this.hoverIndex = -1 },
    onChartDown(e){
      const rect = (e.currentTarget || e.target).getBoundingClientRect()
      const x = e.clientX - rect.left
      this.isDrag = true
      this.dragStartX = x
      this.brushX = x
      this.brushW = 0
    },
    onChartUp(e){
      const rect = (e.currentTarget || e.target).getBoundingClientRect()
      const x = e.clientX - rect.left
      this.isDrag = false
      const minSel = 6
      if (Math.abs(x - this.dragStartX) < minSel) { this.brushW = 0; return }
      // map to indices
      const plotW = Math.max(1, this.chartW - this.padL - this.padR)
      const n = Array.isArray(this.originalTrend) ? this.originalTrend.length : 0
      const idxFrom = Math.max(0, Math.min(n-1, Math.round(((Math.min(x, this.dragStartX) - this.padL) / plotW) * (n - 1))))
      const idxTo = Math.max(0, Math.min(n-1, Math.round(((Math.max(x, this.dragStartX) - this.padL) / plotW) * (n - 1))))
      if (idxTo <= idxFrom) { this.brushW = 0; return }
      this.zoomFromIdx = idxFrom
      this.zoomToIdx = idxTo
      this.trend = this.originalTrend.slice(idxFrom, idxTo + 1)
      this.brushW = 0
    },
    toggleSeries(k){
      try {
        if (!this.seriesOn || !(k in this.seriesOn)) return
        this.seriesOn[k] = !this.seriesOn[k]
      } catch (e) { return }
    },
    exportCSV(){
      try {
        const arr = Array.isArray(this.originalTrend) && this.originalTrend.length ? this.originalTrend : (this.trend || [])
        if (!arr || !arr.length) return
        const headers = ['date','users','videos','comments','views']
        const lines = [headers.join(',')]
        for (const it of arr){
          const row = [
            (it.date || '').toString(),
            Number(it.users || 0),
            Number(it.videos || 0),
            Number(it.comments || 0),
            Number(it.views || 0)
          ]
          lines.push(row.join(','))
        }
        const csv = lines.join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        const ts = (this.range||'').toUpperCase()
        a.download = `trend_${ts}.csv`
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      } catch (e) { return }
    },
    resetZoom(){
      if (Array.isArray(this.originalTrend) && this.originalTrend.length){
        this.trend = this.originalTrend.slice()
      }
      this.zoomFromIdx = -1
      this.zoomToIdx = -1
    },
    exportSVG(){
      try {
        const el = this.$refs.trendSvg
        if (!el) return
        const w = el.getAttribute('width') || this.chartW
        const h = el.getAttribute('height') || this.chartH
        const vb = el.getAttribute('viewBox') || `0 0 ${this.chartW} ${this.chartH}`
        const css = `\n.line{fill:none;stroke-width:2;}\n.axis{stroke:#e5e7eb;stroke-width:1;}\n.tick{stroke:#9ca3af;stroke-width:1;}\n.tick-text{fill:#6b7280;font-size:10px;}\n.ygrid{stroke:#f1f5f9;stroke-width:1;}\n.hover-line{stroke:#d1d5db;stroke-width:1;stroke-dasharray:3 3;}\n.area{opacity:.18;}\n.brush{fill:rgba(59,130,246,0.15);stroke:rgba(59,130,246,0.4);}\n`
        const content = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}"><style>${css}</style>${el.innerHTML}</svg>`
        const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        const ts = (this.range||'').toUpperCase()
        a.download = `trend_${ts}.svg`
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      } catch (e) { return }
    },
    exportPNG(){
      try {
        const el = this.$refs.trendSvg
        if (!el) return
        const w = this.chartW
        const h = this.chartH
        const css = `\n.line{fill:none;stroke-width:2;}\n.axis{stroke:#e5e7eb;stroke-width:1;}\n.tick{stroke:#9ca3af;stroke-width:1;}\n.tick-text{fill:#6b7280;font-size:10px;}\n.ygrid{stroke:#f1f5f9;stroke-width:1;}\n.hover-line{stroke:#d1d5db;stroke-width:1;stroke-dasharray:3 3;}\n.area{opacity:.18;}\n`
        const content = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>${css}</style>${el.innerHTML}</svg>`
        const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(content)
        const img = new Image()
        const ratio = (window.devicePixelRatio || 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(w * ratio)
        canvas.height = Math.round(h * ratio)
        const ctx = canvas.getContext('2d')
        ctx.scale(ratio, ratio)
        img.onload = () => {
          ctx.clearRect(0,0,w,h)
          ctx.drawImage(img, 0, 0, w, h)
          const a = document.createElement('a')
          a.href = canvas.toDataURL('image/png')
          const ts = (this.range||'').toUpperCase()
          a.download = `trend_${ts}.png`
          document.body.appendChild(a); a.click(); a.remove()
        }
        img.src = svgUrl
      } catch (e) { return }
    },
    updateChartW(){
      try {
        const el = this.$refs.chartBox
        if (!el) return
        const w = el.clientWidth || el.offsetWidth || 560
        this.chartW = Math.max(360, Math.min(1000, w - 16))
      } catch (e) { return }
    },
    shortDate(s){
      try { const d = new Date(s); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${m}/${dd}` } catch(_) { return String(s||'').slice(5,10) }
    },
    shortDateFull(s){
      try { const d = new Date(s); const y=d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${y}/${m}/${dd}` } catch(_) { return String(s||'').slice(0,10).replaceAll('-','/') }
    },
    sparkHeight(v){
      const max = Math.max(1, this.viewBarsMax)
      const val = Number(v||0)
      // 如果有数据，至少显示20%高度，确保可见
      if (val > 0) {
        const pct = Math.max(0.2, Math.min(1, val/max))
        return Math.round(pct*100) + '%'
      }
      return '0%'
    },
    sparkTitle(i, v){
      const item = (this.trend || [])[i]
      const date = item ? this.shortDateFull(item.date) : ''
      return `${date}：${this.fmt(v)} 次播放`
    },
    stackTitle(b){
      const d = b && b.date ? this.shortDateFull(b.date) : ''
      return `${d}\n用户 ${this.fmt(b.users)} / 视频 ${this.fmt(b.videos)} / 评论 ${this.fmt(b.comments)} / 播放 ${this.fmt(b.views)}`
    },
  },
  computed: {
    circumference(){ return 2*Math.PI*44 },
    visSegments(){
      const circ = this.circumference
      let acc = 0
      return this.visParts().map(p => {
        const len = circ * p.pct
        const seg = { color: p.color, len, offset: acc }
        acc += len
        return seg
      })
    },
    hasTrend(){ return Array.isArray(this.trend) && this.trend.length > 1 },
    xTickIndices(){
      const n = Array.isArray(this.trend) ? this.trend.length : 0
      if (n <= 1) return [0]
      const picks = [0, Math.floor(n*0.33), Math.floor(n*0.66), n-1]
      return Array.from(new Set(picks)).filter(i => i>=0 && i<n)
    },
    maxY(){
      const arr = Array.isArray(this.trend) ? this.trend : []
      let m = 1
      for (const it of arr){
        const v = Math.max(Number(it.users||0), Number(it.videos||0), Number(it.comments||0), Number(it.views||0))
        if (v > m) m = v
      }
      if (m <= 5) return 5
      const p = Math.pow(10, Math.floor(Math.log10(m)))
      const x = m / p
      if (x <= 1) return 1*p
      if (x <= 2) return 2*p
      if (x <= 5) return 5*p
      return 10*p
    },
    yTickValues(){
      const M = Math.max(1, this.maxY)
      return [0, Math.round(M*0.25), Math.round(M*0.5), Math.round(M*0.75), M]
    },
    categorySegments(){
      const circ = this.circumference
      let acc = 0
      return this.categoryParts().map(p => {
        const len = circ * p.pct
        const seg = { color: p.color, len, offset: acc }
        acc += len
        return seg
      })
    },
    rangeTotals(){
      const arr = Array.isArray(this.trend) ? this.trend : []
      const sum = key => arr.reduce((acc, it) => acc + Number(it[key]||0), 0)
      return {
        users: sum('users'),
        videos: sum('videos'),
        comments: sum('comments'),
        views: sum('views'),
      }
    },
    rangeTotalsList(){
      const m = Math.max(1, ...Object.values(this.rangeTotals || {}))
      const items = [
        { key: 'users', label: '用户', value: this.rangeTotals.users, color: '#34d399' },
        { key: 'videos', label: '视频', value: this.rangeTotals.videos, color: '#60a5fa' },
        { key: 'comments', label: '评论', value: this.rangeTotals.comments, color: '#f59e0b' },
        { key: 'views', label: '播放', value: this.rangeTotals.views, color: '#ef4444' },
      ]
      return items.map(it => ({ ...it, width: Math.round(Math.min(1, Math.max(0, Number(it.value||0)/m)) * 100) + '%' }))
    },
    viewBars(){
      return (Array.isArray(this.trend) ? this.trend : []).map(it => Number(it.views||0))
    },
    viewBarsMax(){
      return Math.max(1, ...this.viewBars, 0)
    },
    viewBarsAvg(){
      const arr = this.viewBars
      if (!arr.length) return 0
      const sum = arr.reduce((a,b)=>a+Number(b||0),0)
      return Math.round(sum / arr.length)
    },
    stackBars(){
      const arr = Array.isArray(this.trend) ? this.trend.slice(-14) : []
      if (!arr.length) return []
      const maxTotal = Math.max(...arr.map(it => Number(it.users||0)+Number(it.videos||0)+Number(it.comments||0)+Number(it.views||0)))
      if (maxTotal === 0) return []
      const max = Math.max(1, maxTotal)
      return arr.map(it => {
        const users = Number(it.users||0)
        const videos = Number(it.videos||0)
        const comments = Number(it.comments||0)
        const views = Number(it.views||0)
        // 设置最小20%高度确保可见，但保持比例
        const scale = v => {
          if (v <= 0) return '0%'
          const pct = Math.max(0.2, v / max)
          return Math.round(pct * 100) + '%'
        }
        return {
          date: it.date,
          users, videos, comments, views,
          hUsers: scale(users),
          hVideos: scale(videos),
          hComments: scale(comments),
          hViews: scale(views),
        }
      })
    },
    midIdx(){
      return Math.max(0, this.stackBars.length ? Math.floor(this.stackBars.length/2) : 0)
    }
  }
}
</script>

<style scoped>
.page { width: 100%; }
.analytics-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
.card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
.card-title { font-weight:700; color:#111827; margin-bottom:8px; }
.kpis { display:flex; gap:14px; flex-wrap:wrap; }
.kpi { background:#f8fafc; border:1px solid #eef2ff; border-radius:10px; padding:12px; min-width:140px; text-align:left; }
.kpi-v { font-size:20px; font-weight:800; color:#1f2937; font-variant-numeric: tabular-nums; }
.kpi-k { font-size:12px; color:#6b7280; }
.list { margin:0; padding-left:16px; color:#374151; }
.chart-wrap { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.linechart .line { fill:none; stroke-width:2; }
.linechart .area { opacity:.18; }
.axes .axis { stroke:#e5e7eb; stroke-width:1; }
.tick { stroke:#9ca3af; stroke-width:1; }
.tick-text { fill:#6b7280; font-size:10px; user-select:none; }
.ygrid { stroke:#f1f5f9; stroke-width:1; }
.hover-line { stroke:#d1d5db; stroke-width:1; stroke-dasharray:3 3; pointer-events:none; }
.brush { fill: rgba(59,130,246,0.15); stroke: rgba(59,130,246,0.4); }
.hit { cursor: crosshair; }
.tip { margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; color:#374151; min-height:32px; }
.tip .date { font-weight:600; }
.chip { font-size:12px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:999px; padding:2px 8px; }
.chip.g { background:#d1fae5; border-color:#a7f3d0; color:#065f46; }
.chip.b { background:#dbeafe; border-color:#bfdbfe; color:#1d4ed8; }
.chip.a { background:#fef3c7; border-color:#fde68a; color:#92400e; }
.chip.r { background:#fee2e2; border-color:#fecaca; color:#991b1b; }
.donut-wrap { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.donut { display:block; }
.ring { fill:none; stroke:#f3f4f6; stroke-width:18; }
.slice { fill:none; stroke-width:18; stroke-linecap:round; }
.legend { list-style:none; margin:0; padding:0; color:#374151; font-size: 13px; }
.legend li { display:flex; align-items:center; gap:8px; margin: 4px 0; }
.dot { width:10px; height:10px; border-radius:999px; display:inline-block; }
.dot.pub { background:#1d4ed8; }
.dot.unl { background:#6b7280; }
.dot.pri { background:#7e22ce; }
.legend2 { list-style:none; display:flex; gap:10px; margin:0; padding:0; color:#374151; font-size: 13px; }
.legend2 li { cursor:pointer; user-select:none; display:flex; align-items:center; gap:6px; padding:2px 6px; border-radius:8px; }
.legend2 li.off { opacity:.55; filter: grayscale(.35); }
.legend2 .dot { margin-right:0; }
.dot.green { background:#34d399; }
.dot.blue { background:#60a5fa; }
.dot.amber { background:#f59e0b; }
.dot.red { background:#ef4444; }
.bars { display:flex; flex-direction:column; gap:8px; }
.bar-row { display:grid; grid-template-columns: 1fr 1fr auto; gap:8px; align-items:center; }
.bar-label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#374151; }
.bar { background:#f3f4f6; border-radius:999px; height:10px; overflow:hidden; }
.bar-fill { height:100%; background:#60a5fa; border-radius:999px; }
.bar-val { font-variant-numeric: tabular-nums; color:#6b7280; }
.empty { 
  color: #9ca3af; 
  font-size: 14px; 
  text-align: center; 
  padding: 40px 20px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e5e7eb;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.err { color:#dc2626; }
/* ranks */
.rank-list { list-style:none; margin:0; padding:0; }
.rank-list li { display:grid; grid-template-columns: 24px 1fr auto; gap:8px; align-items:center; padding:4px 0; }
.rank-list .idx { width:20px; text-align:center; color:#6b7280; }
.rank-list .name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#374151; }
.rank-list .metric { color:#6b7280; font-variant-numeric: tabular-nums; }
.stack-chart { display:flex; flex-direction:column; gap:12px; }
.stack-bars { display:flex; gap:8px; align-items:flex-end; justify-content:center; min-height:120px; padding:20px 8px 0; }
.stack-bar { width:24px; display:flex; flex-direction:column; justify-content:flex-end; gap:3px; }
.stack-bar .seg { display:block; width:100%; border-radius:4px; }
.stack-bar .seg.user { background:#34d399; }
.stack-bar .seg.video { background:#60a5fa; }
.stack-bar .seg.comment { background:#f59e0b; }
.stack-bar .seg.view { background:#ef4444; }
.stack-xaxis { display:flex; gap:8px; justify-content:center; padding:0 8px; margin-top:8px; }
.stack-xaxis .x-tick { width:24px; text-align:center; color:#9ca3af; font-size:11px; visibility:hidden; }
.stack-xaxis .x-tick.show { visibility:visible; }
.stack-legend { display:flex; gap:16px; justify-content:center; color:#6b7280; font-size:12px; flex-wrap:wrap; margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb; }
.spark-wrap { display:flex; flex-direction:column; gap:12px; }
.bar-spark { display:flex; gap:6px; align-items:flex-end; justify-content:center; height:100px; min-height:80px; padding:0 8px; }
.bar-spark-item { width:12px; background:linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%); border-radius:4px 4px 0 0; }
.spark-legend { display:flex; gap:16px; justify-content:center; color:#6b7280; font-size:12px; margin-top:8px; padding-top:8px; border-top:1px solid #e5e7eb; }
@media (max-width: 900px){ .analytics-grid{ grid-template-columns: 1fr; } }
</style>

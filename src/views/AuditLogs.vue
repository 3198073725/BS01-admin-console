<template>
  <div>
    <div class="tabs">
      <button class="tab" :class="{active: tab==='review'}" @click="switchTab('review')">待审核媒体</button>
      <button class="tab" :class="{active: tab==='logs'}" @click="switchTab('logs')">操作日志</button>
    </div>

    <div v-if="tab==='review'">
      <div class="toolbar">
        <input v-model.trim="rq" placeholder="搜索标题/作者用户名" @keyup.enter="fetchReview(1)" style="width: 260px;" />
        <select v-model="rowner" @change="fetchReview(1)">
          <option value="">作者邮箱(全部)</option>
          <option value="true">已验证</option>
          <option value="false">未验证</option>
        </select>
        <select v-model.number="r_page_size" @change="fetchReview(1)">
          <option :value="10">10/页</option>
          <option :value="20">20/页</option>
          <option :value="50">50/页</option>
        </select>
        <button class="primary" @click="fetchReview(1)" :disabled="r_loading">刷新</button>
      </div>

      <div class="bulkbar" v-if="r_selected.length">
        <span>已选 {{ r_selected.length }} 项</span>
        <button class="primary" :disabled="!canBulkPublish || r_acting" @click="bulkPublish">发布</button>
        <button :disabled="r_acting" @click="bulkBan">封禁</button>
        <button :disabled="r_acting" @click="bulkDraft">转草稿</button>
      </div>

      <table class="dense">
        <colgroup>
          <col style="width: 40px;" />
          <col />
          <col style="width: 160px;" />
          <col style="width: 120px;" />
          <col style="width: 220px;" />
        </colgroup>
        <thead>
          <tr>
            <th>
              <input type="checkbox" :checked="r_allChecked" @change="toggleAll($event)" />
            </th>
            <th>标题</th>
            <th>作者</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in r_rows" :key="v.id">
            <td><input type="checkbox" :value="v.id" v-model="r_selected" /></td>
            <td>
              <div class="title">{{ v.title || '(未命名)' }}</div>
              <div class="meta">{{ v.visibility }} · {{ v.status }}</div>
            </td>
            <td>
              <div class="user">
                <span class="uid" :title="v.owner && v.owner.id">{{ v.owner && v.owner.username }}</span>
                <span class="pill" :class="{ on: v.owner && v.owner.is_verified }">{{ (v.owner && v.owner.is_verified) ? '邮箱已验证' : '邮箱未验证' }}</span>
              </div>
            </td>
            <td class="time">{{ fmtTime(v.created_at) }}</td>
            <td>
              <button class="primary" :disabled="!(v.owner && v.owner.is_verified) || r_acting" :title="(v.owner && v.owner.is_verified) ? '发布' : '作者邮箱未验证，不能发布'" @click="approve(v)">发布</button>
              <button :disabled="r_acting" @click="ban(v)">封禁</button>
              <button :disabled="r_acting" @click="toDraft(v)">转草稿</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button :disabled="r_page<=1 || r_loading" @click="fetchReview(r_page-1)">上一页</button>
        <span>第 {{ r_page }} / {{ r_maxPage }} 页（共 {{ r_total }} 条）</span>
        <button :disabled="!r_has_next || r_loading" @click="fetchReview(r_page+1)">下一页</button>
      </div>

      <p v-if="r_error" class="err">{{ r_error }}</p>
    </div>

    <div v-else>
      <div class="toolbar">
        <input v-model.trim="actor_id" placeholder="操作者ID (可选)" @keyup.enter="fetchList(1)" style="width: 240px;" />
        <input v-model.trim="target_type" placeholder="目标类型 (可选)" @keyup.enter="fetchList(1)" style="width: 200px;" />
        <input v-model.trim="target_id" placeholder="目标ID (可选)" @keyup.enter="fetchList(1)" style="width: 260px;" />
        <select v-model.number="page_size" @change="fetchList(1)">
          <option :value="10">10/页</option>
          <option :value="20">20/页</option>
          <option :value="50">50/页</option>
        </select>
        <button class="primary" @click="fetchList(1)" :disabled="loading">查询</button>
      </div>

      <table class="dense">
        <colgroup>
          <col style="width: 160px;" />
          <col style="width: 180px;" />
          <col style="width: 240px;" />
          <col style="width: 180px;" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th>操作</th>
            <th>操作者</th>
            <th>目标</th>
            <th>时间</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in rows" :key="a.id">
            <td><span class="ellipsis" :title="a.verb">{{ fmtVerb(a.verb) }}</span></td>
            <td><span class="ellipsis" :title="a.actor && a.actor.username">{{ a.actor && a.actor.username }}</span></td>
            <td><span class="ellipsis" :title="(a.target_type || '') + ' ' + (a.target_id || '')">{{ fmtTarget(a) }}</span></td>
            <td class="time">{{ fmtTime(a && a.created_at) }}</td>
            <td><span class="ellipsis" :title="stringify(a.meta)">{{ fmtMeta(a) }}</span></td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button :disabled="page<=1 || loading" @click="fetchList(page-1)">上一页</button>
        <span>第 {{ page }} / {{ maxPage }} 页（共 {{ total }} 条）</span>
        <button :disabled="!has_next || loading" @click="fetchList(page+1)">下一页</button>
      </div>

      <p v-if="error" class="err">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import { adminApi } from '../lib/admin'
import { fmtTime } from '../lib/utils'

export default {
  name: 'AuditLogs',
  data() {
    return {
      tab: 'review',
      // logs
      actor_id: '',
      target_type: '',
      target_id: '',
      page: 1,
      page_size: 20,
      total: 0,
      has_next: false,
      rows: [],
      loading: false,
      error: '',
      // review
      rq: '',
      rowner: '',
      r_page: 1,
      r_page_size: 20,
      r_total: 0,
      r_has_next: false,
      r_rows: [],
      r_loading: false,
      r_error: '',
      r_selected: [],
      r_acting: false,
    }
  },
  computed: {
    maxPage() { return Math.max(1, Math.ceil(this.total / this.page_size)) },
    r_maxPage() { return Math.max(1, Math.ceil(this.r_total / this.r_page_size)) },
    r_allChecked() { return this.r_rows.length>0 && this.r_selected.length===this.r_rows.length },
    canBulkPublish() {
      if (!this.r_selected.length) return false
      const allowed = new Set(this.r_selected)
      return this.r_rows.filter(v => allowed.has(v.id)).every(v => v.owner && v.owner.is_verified)
    },
  },
  created() { this.fetchReview(1) },
  methods: {
    fmtTime,
    stringify(v) { try { return JSON.stringify(v) } catch (_) { return '' } },
    brief(v) { const s = this.stringify(v) || ''; return s.length>120 ? (s.slice(0, 120) + '…') : s },
    fmtVerb(v) {
      const map = {
        'video.update': '视频更新',
        'video.bulk_update': '视频批量更新',
        'video.delete': '视频删除',
        'video.create': '视频创建',
        'comment.delete': '评论删除',
        'user.update': '用户更新',
        'user.force_logout': '用户强制下线',
      }
      return map[v] || v || ''
    },
    fmtTarget(a) {
      const tt = String((a && a.target_type) || '').toLowerCase()
      const id = (a && a.target_id) || ''
      const map = { video: '视频', user: '用户', comment: '评论', category: '分类', tag: '标签' }
      const name = map[tt] || (tt || '对象')
      const shortId = id ? String(id).slice(0, 8) + (String(id).length > 8 ? '…' : '') : ''
      return shortId ? `${name} ${shortId}` : name
    },
    _fieldName(k) {
      const map = { status: '状态', published_at: '发布时间', visibility: '可见性', allow_comments: '允许评论', allow_download: '允许下载', category_id: '分类', tags: '标签' }
      return map[k] || k
    },
    fmtMeta(a) {
      const m = (a && a.meta) || {}
      try {
        const parts = []
        if (Array.isArray(m.fields) && m.fields.length) {
          parts.push('变更字段：' + m.fields.map(this._fieldName).join('、'))
        }
        if (typeof m.count === 'number') parts.push('请求数量：' + m.count)
        if (typeof m.affected === 'number') parts.push('实际影响：' + m.affected)
        return parts.length ? parts.join('，') : (this.brief(m) || '')
      } catch (_) {
        return this.brief(m) || ''
      }
    },
    switchTab(t) { this.tab = t; if (t==='review') this.fetchReview(1); else this.fetchList(1) },
    async fetchList(p) {
      this.loading = true
      this.error = ''
      try {
        const params = {
          page: p,
          page_size: this.page_size,
          actor_id: this.actor_id || undefined,
          target_type: this.target_type || undefined,
          target_id: this.target_id || undefined,
        }
        const r = await adminApi.listAuditLogs(params)
        this.rows = r.results || []
        this.page = Number(r.page || p)
        this.page_size = Number(r.page_size || this.page_size)
        this.total = Number(r.total || 0)
        this.has_next = !!r.has_next
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '加载失败'
        if (e && e.status === 403) this.$router.replace({ name: 'login' })
      } finally {
        this.loading = false
      }
    },
    async fetchReview(p) {
      this.r_loading = true
      this.r_error = ''
      try {
        const params = {
          page: p,
          page_size: this.r_page_size,
          q: this.rq || undefined,
          status: 'processing',
          order: 'earliest',
          owner_verified: this.rowner || undefined,
        }
        const r = await adminApi.listVideos(params)
        this.r_rows = r.results || []
        this.r_page = Number(r.page || p)
        this.r_page_size = Number(r.page_size || this.r_page_size)
        this.r_total = Number(r.total || 0)
        this.r_has_next = !!r.has_next
        // 清空选择（分页/筛选后）
        this.r_selected = []
      } catch (e) {
        this.r_error = (e && e.data && e.data.detail) || e.message || '加载失败'
        if (e && e.status === 403) this.$router.replace({ name: 'login' })
      } finally {
        this.r_loading = false
      }
    },
    toggleAll(ev) {
      const checked = !!(ev && ev.target && ev.target.checked)
      this.r_selected = checked ? this.r_rows.map(v => v.id) : []
    },
    async approve(v) {
      if (!v || !v.id || !(v.owner && v.owner.is_verified)) return
      try {
        this.r_acting = true
        await adminApi.patchVideo(v.id, { status: 'published' })
        this.fetchReview(this.r_page)
      } catch (e) {
        this.r_error = (e && e.data && e.data.detail) || e.message || '操作失败'
      } finally { this.r_acting = false }
    },
    async ban(v) {
      if (!v || !v.id) return
      try { this.r_acting = true; await adminApi.patchVideo(v.id, { status: 'banned' }); this.fetchReview(this.r_page) } catch (e) { this.r_error = (e && e.data && e.data.detail) || e.message || '操作失败' } finally { this.r_acting = false }
    },
    async toDraft(v) {
      if (!v || !v.id) return
      try { this.r_acting = true; await adminApi.patchVideo(v.id, { status: 'draft' }); this.fetchReview(this.r_page) } catch (e) { this.r_error = (e && e.data && e.data.detail) || e.message || '操作失败' } finally { this.r_acting = false }
    },
    async bulkPublish() {
      if (!this.r_selected.length) return
      try { this.r_acting = true; await adminApi.bulkUpdateVideos(this.r_selected, { status: 'published' }); this.fetchReview(this.r_page) } catch (e) { this.r_error = (e && e.data && e.data.detail) || e.message || '操作失败' } finally { this.r_acting = false }
    },
    async bulkBan() {
      if (!this.r_selected.length) return
      try { this.r_acting = true; await adminApi.bulkUpdateVideos(this.r_selected, { status: 'banned' }); this.fetchReview(this.r_page) } catch (e) { this.r_error = (e && e.data && e.data.detail) || e.message || '操作失败' } finally { this.r_acting = false }
    },
    async bulkDraft() {
      if (!this.r_selected.length) return
      try { this.r_acting = true; await adminApi.bulkUpdateVideos(this.r_selected, { status: 'draft' }); this.fetchReview(this.r_page) } catch (e) { this.r_error = (e && e.data && e.data.detail) || e.message || '操作失败' } finally { this.r_acting = false }
    },
  }
}
</script>

<style scoped>
.err { color: #dc2626; }
.tabs { display:flex; gap:8px; margin-bottom: 10px; }
.tab { padding:8px 12px; border:1px solid #e5e7eb; background:#fff; border-radius:8px; cursor:pointer; }
.tab.active { background:#111827; color:#fff; border-color:#111827; }
.dense { table-layout: fixed; overflow: visible; border-collapse: separate; border-spacing: 0; width: 100%; }
.dense th, .dense td { padding: 10px 5px; vertical-align: middle; }
.dense thead th { background: #f9fafb; color: #374151; border-bottom: 1px solid #e5e7eb; font-weight: 600; white-space: nowrap; }
.dense thead th:last-child, .dense tbody td:last-child { text-align: left; }
.dense tbody td { border-top: 1px solid #f3f4f6; }
.dense tbody tr:hover { background: #f9fafb; }
.ellipsis { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.time { color: #6b7280; font-size: 12px; line-height: 1.2; white-space: nowrap; }
.pagination { display:flex; justify-content:center; align-items:center; gap:10px; padding: 12px 0; }
.pill { display:inline-block; padding:2px 6px; border-radius:999px; border:1px solid #e5e7eb; color:#6b7280; font-size:12px; margin-left:6px; }
.pill.on { background:#dcfce7; border-color:#bbf7d0; color:#166534; }
.bulkbar { display:flex; align-items:center; gap:10px; padding: 6px 0; }
.title { font-weight: 600; }
.meta { color:#6b7280; font-size: 12px; }
</style>

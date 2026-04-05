<template>
  <div class="page">
    <div @click="actionOpenId=''" style="width: 100%;">
      <div class="toolbar">
        <input v-model.trim="q" placeholder="搜索 标题/描述/作者用户名" @keyup.enter="fetchList(1)" />
      <input v-model.trim="user_id" placeholder="用户ID (可选)" @keyup.enter="fetchList(1)" style="width: 260px;" />
      <select v-model="status" @change="fetchList(1)">
        <option value="">状态(全部)</option>
        <option value="draft">草稿</option>
        <option value="processing">审核中</option>
        <option value="published">已发布</option>
        <option value="banned">封禁</option>
      </select>
      <select v-model="visibility" @change="fetchList(1)">
        <option value="">可见性(全部)</option>
        <option value="public">公开</option>
        <option value="unlisted">未列出</option>
        <option value="private">私密</option>
      </select>
      <select v-model="owner_verified" @change="fetchList(1)">
        <option value="">作者邮箱(全部)</option>
        <option value="true">已验证</option>
        <option value="false">未验证</option>
      </select>
      <select v-model="order" @change="fetchList(1)">
        <option value="latest">最新创建</option>
        <option value="published">发布时间</option>
        <option value="earliest">最早创建</option>
        <option value="hot">热门</option>
      </select>
      <select v-model.number="page_size" @change="fetchList(1)">
        <option :value="10">10/页</option>
        <option :value="20">20/页</option>
        <option :value="50">50/页</option>
      </select>
      <button class="primary" @click="fetchList(1)" :disabled="loading">查询</button>
      <button @click="quickStatus('processing')" :disabled="loading">仅审核中</button>
      <button @click="quickStatus('published')" :disabled="loading">仅已发布</button>
      <button @click="quickStatus('')" :disabled="loading">清除状态</button>
      <button @click="fetchFailures(1)" :disabled="loading">仅转码失败</button>
    </div>

    <div class="toolbar" v-if="selected.length">
      <span>已选 {{ selected.length }} 项</span>
      <select v-model="bulk.category_id">
        <option value="">分类(不变)</option>
        <option :value="c.id" v-for="c in categories" :key="c.id">{{ c.name }}</option>
      </select>
      <select v-model="bulk.status">
        <option value="">状态(不变)</option>
        <option value="draft">草稿</option>
        <option value="processing">处理</option>
        <option value="published">已发布</option>
        <option value="banned">封禁</option>
      </select>
      <select v-model="bulk.visibility">
        <option value="">可见性(不变)</option>
        <option value="public">公开</option>
        <option value="unlisted">未列出</option>
        <option value="private">私密</option>
      </select>
      <select v-model="bulk.allow_comments">
        <option value="">允许评论(不变)</option>
        <option value="true">开启</option>
        <option value="false">关闭</option>
      </select>
      <select v-model="bulk.allow_download">
        <option value="">允许下载(不变)</option>
        <option value="true">开启</option>
        <option value="false">关闭</option>
      </select>
      <button class="primary" @click="bulkApply" :disabled="loading">应用</button>
      <button class="danger" @click="bulkRemove" :disabled="loading">批量删除</button>
      <button class="primary" @click="batchApprove('approve')" :disabled="loading">批量通过</button>
      <button class="danger" @click="batchApprove('reject')" :disabled="loading">批量拒绝</button>
      <button @click="clearSelection" :disabled="loading">清除选择</button>
      <span class="warn" v-if="bulk.status==='published' && selectedUnverifiedCount>0">含 {{ selectedUnverifiedCount }} 个作者未认证，发布将失败</span>
    </div>

    <table class="dense">
      <colgroup>
        <col style="width: 44px;" />
        <col style="width: 140px;" />
        <col style="width: 120px;" />
        <col style="width: 200px;" />
        <col style="width: 200px;" />
        <col style="width: 120px;" />
        <col style="width: 44px;" />
      </colgroup>
      <thead>
        <tr>
          <th><input type="checkbox" :checked="allChecked" @change="toggleAll($event)" /></th>
          <th>标题</th>
          <th>作者</th>
          <th>状态/可见性</th>
          <th>统计</th>
          <th>时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="v in rows" :key="v.id">
          <td><input type="checkbox" :value="v.id" v-model="selected" /></td>
          <td>
            <div class="titlecell">
              <img v-if="v.thumbnail_url" :src="v.thumbnail_url" class="thumb" alt="" />
              <div class="tinfo">
                <div class="t-title ellipsis" :title="v.title">{{ v.title }}</div>
                <div v-if="v.transcode_error" class="t-error">转码失败：{{ v.transcode_error }}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="usercell">
              <img v-if="v.owner && v.owner.avatar_url" :src="v.owner.avatar_url" class="avatar" alt="" />
              <span class="uname ellipsis" :title="v.owner && v.owner.username">{{ v.owner && v.owner.username }}</span>
            </div>
          </td>
          <td>
            <div class="statuscell">
              <div class="badges">
                <span :class="['badge','status','s-'+(v.status||'')]">{{ statusText(v.status) }}</span>
                <span :class="['badge','vis','v-'+(v.visibility||'')]">{{ visibilityText(v.visibility) }}</span>
                <span v-if="v.is_featured" class="badge opt">精选</span>
                <span v-if="v.owner && v.owner.is_verified===false" class="badge opt">作者未认证</span>
              </div>
            </div>
          </td>
          <td class="stats">播放 {{ v.view_count }} · 点赞 {{ v.like_count }} · 评论 {{ v.comment_count }}</td>
          <td class="time">
            <div class="t-row">创: {{ fmtTime(v && v.created_at) }}</div>
            <div class="t-row" v-if="(v && v.updated_at) || (v && v.published_at)">
              <template v-if="v && v.updated_at">更: {{ fmtTime(v.updated_at) }}</template>
              <template v-else>发: {{ fmtTime(v.published_at) }}</template>
            </div>
          </td>
          <td class="ops" @click.stop>
            <div class="dropdown" :class="{ open: actionOpenId===v.id }" :ref="'dd_'+v.id">
              <button class="dd-btn" @click="toggleActions(v)" title="更多">⋯</button>
              <ul v-if="actionOpenId===v.id" :class="['menu', { 'drop-up': dropUpId===v.id }]">
                <li class="row">
                  <span class="lab">状态</span>
                  <div class="btns">
                    <button class="seg" :class="{ active: v.status==='draft' }" @click="onSetStatusWrap(v,'draft')">草稿</button>
                    <button class="seg" :class="{ active: v.status==='processing' }" @click="onSetStatusWrap(v,'processing')">审核中</button>
                    <button class="seg" :class="{ active: v.status==='published' }" @click="onSetStatusWrap(v,'published')" :disabled="v.owner && v.owner.is_verified===false" :title="(v.owner && v.owner.is_verified===false) ? '作者未认证，不能发布' : ''">已发布</button>
                    <button class="seg" :class="{ active: v.status==='banned' }" @click="onSetStatusWrap(v,'banned')">封禁</button>
                  </div>
                </li>
                <li class="row">
                  <span class="lab">精选</span>
                  <div class="btns">
                    <button class="seg" :class="{ active: !!v.is_featured }" @click="onSetFeaturedWrap(v,true)">设为精选</button>
                    <button class="seg" :class="{ active: !v.is_featured }" @click="onSetFeaturedWrap(v,false)">取消精选</button>
                  </div>
                </li>
                <li class="row">
                  <span class="lab">转码</span>
                  <div class="btns">
                    <button class="seg" @click="onRetryTranscode(v)">重试转码</button>
                  </div>
                </li>
                <li class="row">
                  <span class="lab">可见</span>
                  <div class="btns">
                    <button class="seg" :class="{ active: v.visibility==='public' }" @click="onSetVisibilityWrap(v,'public')">公开</button>
                    <button class="seg" :class="{ active: v.visibility==='unlisted' }" @click="onSetVisibilityWrap(v,'unlisted')">未列出</button>
                    <button class="seg" :class="{ active: v.visibility==='private' }" @click="onSetVisibilityWrap(v,'private')">私密</button>
                  </div>
                </li>
                <li class="row">
                  <span class="lab">复制</span>
                  <div class="btns">
                    <button class="seg" @click="copyText(v.id)">视频ID</button>
                    <button class="seg" @click="copyText(v.title)">标题</button>
                    <button class="seg" @click="copyText(v.owner && v.owner.id)">作者ID</button>
                    <button class="seg" @click="copyText(webUrl(v.id))">前台路径</button>
                    <button class="seg" @click="copyText(featuredUrl(v.id))">精选路径</button>
                  </div>
                </li>
                <li class="row">
                  <span class="lab">打开</span>
                  <div class="btns">
                    <button class="seg" @click="openWebVideo(v.id)">打开前台</button>
                    <button class="seg" @click="openFeatured(v.id)">打开精选</button>
                  </div>
                </li>
                <li class="row">
                  <span class="lab">筛选</span>
                  <div class="btns">
                    <button class="seg" @click="onFilterByUserWrap(v)">看TA的作品</button>
                  </div>
                </li>
                <li class="row tail">
                  <div class="btns">
                    <button class="seg" @click="openEditDialog(v)">编辑设置</button>
                    <button class="seg danger" @click="onRemoveWrap(v)">删除</button>
                  </div>
                </li>
              </ul>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 轻量编辑弹窗：分类/开关/标签 -->
    <div v-if="editOpen" class="modal-overlay" @click.self="closeEditDialog">
      <div class="modal">
        <header class="modal-header">
          <h3>编辑设置</h3>
          <button class="close" @click="closeEditDialog">✕</button>
        </header>
        <div class="body">
          <div class="edit-grid">
            <div class="field">
              <label>分类</label>
              <select v-model="editForm.category_id">
                <option value="">无分类</option>
                <option :value="c.id" v-for="c in categories" :key="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="field">
              <label>允许评论</label>
              <select v-model="editForm.allow_comments">
                <option :value="true">启用</option>
                <option :value="false">禁用</option>
              </select>
            </div>
            <div class="field">
              <label>允许下载</label>
              <select v-model="editForm.allow_download">
                <option :value="false">禁用</option>
                <option :value="true">启用</option>
              </select>
            </div>
            <div class="field field-wide">
              <label>标签（逗号分隔）</label>
              <input v-model.trim="editForm.tagsText" placeholder="例如：旅行,风景" />
            </div>
          </div>
          <div v-if="error" class="error">{{ error }}</div>
        </div>
        <footer class="foot">
          <button class="btn" @click="closeEditDialog">取消</button>
          <button class="btn primary" :disabled="loading" @click="applyEditDialog">保存</button>
        </footer>
      </div>
    </div>

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
  name: 'AdminVideos',
  data() {
    return {
      q: '',
      user_id: '',
      status: '',
      visibility: '',
      owner_verified: '',
      order: 'latest',
      page: 1,
      page_size: 20,
      total: 0,
      has_next: false,
      rows: [],
      loading: false,
      error: '',
      selected: [],
      bulk: { category_id: '', status: '', visibility: '', allow_comments: '', allow_download: '' },
      categories: [],
      categoriesMap: {},
      tagsByName: {},
      actionOpenId: '',
      dropUpId: '',
      editOpen: false,
      editTarget: null,
      editForm: { category_id: '', allow_comments: true, allow_download: false, tagsText: '' },
    }
  },
  computed: {
    maxPage() { return Math.max(1, Math.ceil(this.total / this.page_size)) },
    allChecked() { return this.rows.length > 0 && this.rows.every(r => this.selected.includes(r.id)) },
    selectedUnverifiedCount(){
      try {
        if (!this.selected.length) return 0
        const set = new Set(this.selected)
        let n = 0
        for (const r of this.rows){ if (set.has(r.id) && r.owner && r.owner.is_verified===false) n++ }
        return n
      } catch (_) { return 0 }
    }
  },
  created() { this.fetchList(1); this.loadCategories(); this.loadTags(); },
  mounted() {
    document.addEventListener('click', this.handleGlobalClick)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleGlobalClick)
  },
  methods: {
    handleGlobalClick(e) {
      const dropdown = this.$refs['dd_' + this.actionOpenId]
      if (dropdown && !dropdown[0]?.contains(e.target)) {
        this.actionOpenId = ''
      }
    },
    toggleActions(v){
      this.actionOpenId = (this.actionOpenId===v.id ? '' : v.id)
      if (this.actionOpenId) {
        this.$nextTick(() => {
          try {
            const el = this.$refs['dd_'+v.id]
            if (!el) { this.dropUpId=''; return }
            const rect = el.getBoundingClientRect()
            const spaceBelow = (window.innerHeight || document.documentElement.clientHeight) - rect.bottom
            this.dropUpId = spaceBelow < 220 ? v.id : ''
          } catch (_) { this.dropUpId='' }
        })
      } else { this.dropUpId='' }
    },
    fmtTime,
    timeText(v){
      const c = this.fmtTime(v && v.created_at)
      const p = this.fmtTime(v && v.published_at)
      if (c && p && c !== '-' && p !== '-') return `创:${c} 发:${p}`
      if (c && c !== '-') return `创:${c}`
      if (p && p !== '-') return `发:${p}`
      return '-'
    },
    statusText(val){
      const map = { draft: '草稿', processing: '审核中', published: '已发布', banned: '封禁' }
      return map[val] || String(val || '-')
    },
    visibilityText(val){
      const map = { public: '公开', unlisted: '未列出', private: '私密' }
      return map[val] || String(val || '-')
    },
    categoryName(v){
      try {
        const id = String((v && (v.category_id || (v.category && v.category.id))) || '')
        if (!id) return ''
        const rec = this.categoriesMap[id]
        return (rec && rec.name) || (v && v.category && v.category.name) || ''
      } catch (_) { return '' }
    },
    async setStatus(v, s) {
      if (!v || !v.id || this.loading) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.patchVideo(v.id, { status: s })
        v.status = s
      } catch (e) {
        const d = (e && e.data) || {}
        this.error = d.detail || d.status || (Array.isArray(d.non_field_errors) && d.non_field_errors[0]) || (d && Object.values(d)[0]) || e.message || '更新失败'
      } finally { this.loading = false }
    },
    async onSetStatusWrap(v, s){ await this.setStatus(v, s); this.actionOpenId='' },
    async setVisibility(v, vis) {
      if (!v || !v.id || this.loading) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.patchVideo(v.id, { visibility: vis })
        v.visibility = vis
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '更新失败'
      } finally { this.loading = false }
    },
    async onSetVisibilityWrap(v, vis){ await this.setVisibility(v, vis); this.actionOpenId='' },
    async setFeatured(v, flag) {
      if (!v || !v.id || this.loading) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.patchVideo(v.id, { is_featured: !!flag })
        v.is_featured = !!flag
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '更新失败'
      } finally { this.loading = false }
    },
    async onSetFeaturedWrap(v, flag){ await this.setFeatured(v, flag); this.actionOpenId='' },
    async toggleComments(v) {
      if (!v || !v.id || this.loading) return
      this.loading = true
      this.error = ''
      try {
        const next = !v.allow_comments
        await adminApi.patchVideo(v.id, { allow_comments: next })
        v.allow_comments = next
      } catch (e) { this.error = (e && e.data && e.data.detail) || e.message || '更新失败' }
      finally { this.loading = false }
    },
    async onToggleCommentsWrap(v){ await this.toggleComments(v); this.actionOpenId='' },
    async toggleDownload(v) {
      if (!v || !v.id || this.loading) return
      this.loading = true
      this.error = ''
      try {
        const next = !v.allow_download
        await adminApi.patchVideo(v.id, { allow_download: next })
        v.allow_download = next
      } catch (e) { this.error = (e && e.data && e.data.detail) || e.message || '更新失败' }
      finally { this.loading = false }
    },
    async onToggleDownloadWrap(v){ await this.toggleDownload(v); this.actionOpenId='' },
    async copyText(text){
      try {
        const s = String(text || '')
        if (!s) return
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(s)
        } else {
          const ta = document.createElement('textarea')
          ta.value = s
          ta.style.position = 'fixed'
          ta.style.left = '-9999px'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
      } catch (e) { return }
    },
    quickStatus(s){
      try {
        this.status = s || ''
        this.fetchList(1)
      } catch (e) { return }
    },
    openWebVideo(id){
      try {
        const url = this.webUrl(id)
        window.open(url, '_blank')
      } catch (e) { return }
    },
    webOrigin(){
      try {
        const w = window
        if (w && w.__WEB_BASE__ && typeof w.__WEB_BASE__ === 'string') return w.__WEB_BASE__.replace(/\/$/, '')
        const loc = w && w.location ? w.location : {}
        let hostname = loc.hostname || ''
        const protocol = loc.protocol || 'http:'
        // 优先切换子域 admin./api. -> web.
        if (hostname.startsWith('admin.')) hostname = hostname.replace(/^admin\./, 'web.')
        else if (hostname.startsWith('api.')) hostname = hostname.replace(/^api\./, 'web.')
        // 本地环境统一用 8080 作为前台端口
        const port = hostname.endsWith('vidsprout.local') || hostname.endsWith('bs01.local') ? '8080' : (loc.port || '')
        const hostPort = port ? `${hostname}:${port}` : hostname
        return `${protocol}//${hostPort}`
      } catch (e) { try { return window.location.origin } catch (_) { return '' } }
    },
    webUrl(id){
      // 前台使用竖版 Feed 播放，跳到精选源的 feed-player
      try { return `${this.webOrigin()}/#/play/featured?id=${id}` } catch (e) { return `/#/play/featured?id=${id}` }
    },
    featuredUrl(id){
      try { return `${this.webOrigin()}/#/play/featured?id=${id}` } catch (e) { return `/#/play/featured?id=${id}` }
    },
    openFeatured(id){
      try {
        const url = this.featuredUrl(id)
        window.open(url, '_blank')
      } catch (e) { return }
    },
    async filterByUser(uid){
      try {
        const id = String(uid || '')
        if (!id) return
        this.user_id = id
        await this.fetchList(1)
      } catch (e) { return }
    },
    async onFilterByUserWrap(v){ await this.filterByUser(v && v.owner && v.owner.id); this.actionOpenId='' },
    openEditDialog(v){
      this.editTarget = v
      this.editForm.category_id = v.category_id || (v.category && v.category.id) || ''
      this.editForm.allow_comments = !!v.allow_comments
      this.editForm.allow_download = !!v.allow_download
      const tagNames = Array.isArray(v.tags) ? v.tags.map(t => t && t.name).filter(Boolean) : []
      this.editForm.tagsText = v._tagsText || tagNames.join(',')
      this.editOpen = true
      this.actionOpenId = ''
    },
    closeEditDialog(){ this.editOpen = false; this.editTarget = null },
    async applyEditDialog(){
      if (!this.editTarget) { this.editOpen = false; return }
      const v2 = {
        id: this.editTarget.id,
        status: this.editTarget.status,
        visibility: this.editTarget.visibility,
        allow_comments: this.editForm.allow_comments,
        allow_download: this.editForm.allow_download,
        category_id: this.editForm.category_id,
        _tagsText: this.editForm.tagsText || ''
      }
      if (v2.status === 'published' && this.editTarget && this.editTarget.owner && this.editTarget.owner.is_verified===false) {
        this.error = '作者未认证，不能发布'
        return
      }
      await this.save(v2)
      this.editOpen = false
    },
    async loadCategories() {
      try {
        let p = 1; let all = []; let more = true
        while (more) {
          const r = await adminApi.listCategories({ page: p, page_size: 50 })
          all = all.concat(r.results || [])
          more = !!r.has_next
          p += 1
        }
        this.categories = all
        const m = {}
        all.forEach(c => { if (c && c.id) m[String(c.id)] = c })
        this.categoriesMap = m
      } catch (e) { this.categories = [] }
    },
    async loadTags() {
      try {
        let p = 1; const map = {}; let more = true
        while (more) {
          const r = await adminApi.listTags({ page: p, page_size: 50 })
          const items = r.results || []
          items.forEach(t => { if (t && t.name) map[(t.name || '').toLowerCase()] = t.id })
          more = !!r.has_next
          p += 1
        }
        this.tagsByName = map
      } catch (e) { this.tagsByName = {} }
    },
    async fetchList(p) {
      this.loading = true
      this.error = ''
      try {
        const params = {
          page: p,
          page_size: this.page_size,
          q: this.q || undefined,
          user_id: this.user_id || undefined,
          status: this.status || undefined,
          visibility: this.visibility || undefined,
          owner_verified: this.owner_verified || undefined,
          order: this.order,
        }
        const r = await adminApi.listVideos(params)
        const arr = r.results || []
        // augment fields for editing
        arr.forEach(v => {
          v.category_id = (v.category && v.category.id) || ''
          const tagNames = Array.isArray(v.tags) ? v.tags.map(t => t && t.name).filter(Boolean) : []
          v._tagsText = tagNames.join(',')
        })
        this.rows = arr
        this.page = Number(r.page || p)
        this.page_size = Number(r.page_size || this.page_size)
        this.total = Number(r.total || 0)
        this.has_next = !!r.has_next
        this.selected = []
        this.bulk = { category_id: '', status: '', visibility: '', allow_comments: '', allow_download: '' }
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '加载失败'
        if (e && (e.status === 401 || e.status === 403)) this.$router.replace({ name: 'login' })
      } finally {
        this.loading = false
      }
    },
    async save(v) {
      this.loading = true
      this.error = ''
      try {
        // prepare tags: parse names -> ids, create missing
        const names = (v._tagsText || '').split(/[,，]/).map(s => (s || '').trim()).filter(Boolean)
        const nameMap = {}
        for (const nm of names) { const k = nm.toLowerCase(); if (!nameMap[k]) nameMap[k] = nm }
        const tagIds = []
        for (const n of Object.keys(nameMap)) {
          const original = nameMap[n]
          let tid = this.tagsByName[n]
          if (!tid) {
            try {
              const created = await adminApi.createTag({ name: original })
              tid = created && created.id
              if (tid) this.tagsByName[n] = tid
            } catch (e) {
              // 若创建失败，尝试搜索既有同名标签以避免重复或遗漏
              try {
                const r = await adminApi.listTags({ q: original, page_size: 1 })
                const first = (r && r.results && r.results[0]) || null
                if (first && first.name && first.name.toLowerCase() === n) {
                  tid = first.id
                  if (tid) this.tagsByName[n] = tid
                }
              } catch (_) { /* ignore */ }
            }
          }
          if (tid) tagIds.push(tid)
        }
        await adminApi.patchVideo(v.id, {
          status: v.status,
          visibility: v.visibility,
          allow_comments: !!v.allow_comments,
          allow_download: !!v.allow_download,
          category_id: v.category_id || '',
          tag_ids: tagIds,
        })
        await this.fetchList(this.page)
      } catch (e) {
        const d = (e && e.data) || {}
        this.error = d.detail || d.status || (Array.isArray(d.non_field_errors) && d.non_field_errors[0]) || (d && Object.values(d)[0]) || e.message || '保存失败'
      } finally {
        this.loading = false
      }
    },
    async onSaveWrap(v){ await this.save(v); this.actionOpenId='' },
    async remove(v) {
      if (!confirm('确认删除该视频？')) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.deleteVideo(v.id)
        await this.fetchList(1)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '删除失败'
      } finally {
        this.loading = false
      }
    },
    async onRemoveWrap(v){ await this.remove(v); this.actionOpenId='' },
    toggleAll(e) {
      if (e && e.target && e.target.checked) {
        this.selected = this.rows.map(v => v.id)
      } else {
        this.selected = []
      }
    },
    clearSelection() {
      this.selected = []
    },
    async bulkApply() {
      if (!this.selected.length) return
      const payload = {}
      if (this.bulk.category_id) payload.category_id = this.bulk.category_id
      if (this.bulk.status) payload.status = this.bulk.status
      if (this.bulk.visibility) payload.visibility = this.bulk.visibility
      if (this.bulk.allow_comments === 'true' || this.bulk.allow_comments === 'false') payload.allow_comments = this.bulk.allow_comments === 'true'
      if (this.bulk.allow_download === 'true' || this.bulk.allow_download === 'false') payload.allow_download = this.bulk.allow_download === 'true'
      if (Object.keys(payload).length === 0) { this.error = '未选择任何变更字段'; return }
      if (payload.status === 'published' && this.selectedUnverifiedCount > 0) {
        const ok = confirm(`所选中有 ${this.selectedUnverifiedCount} 个作者未认证，继续后将发布失败并返回错误，是否继续提交？`)
        if (!ok) return
      }
      this.loading = true
      this.error = ''
      try {
        await adminApi.bulkUpdateVideos(this.selected, payload)
        await this.fetchList(this.page)
      } catch (e) {
        const d = (e && e.data) || {}
        let msg = d.detail || d.status || e.message || '批量操作失败'
        if (Array.isArray(d.video_ids) && d.video_ids.length) {
          msg += ` (示例: ${d.video_ids.slice(0,3).join(',')})`
        }
        this.error = msg
      } finally {
        this.loading = false
      }
    },
    async bulkRemove() {
      if (!this.selected.length) return
      if (!confirm(`确认删除选中的 ${this.selected.length} 个视频？`)) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.bulkDeleteVideos(this.selected)
        await this.fetchList(1)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '批量删除失败'
      } finally {
        this.loading = false
      }
    },

    async fetchFailures(p) {
      this.loading = true
      this.error = ''
      try {
        const params = {
          page: p,
          page_size: this.page_size,
          q: this.q || undefined,
          user_id: this.user_id || undefined,
          status: this.status || undefined,
          visibility: this.visibility || undefined,
          owner_verified: this.owner_verified || undefined,
          order: this.order,
        }
        const r = await adminApi.listTranscodeFailures(params)
        const arr = r.results || []
        arr.forEach(v => {
          v.category_id = (v.category && v.category.id) || ''
          const tagNames = Array.isArray(v.tags) ? v.tags.map(t => t && t.name).filter(Boolean) : []
          v._tagsText = tagNames.join(',')
        })
        this.rows = arr
        this.page = Number(r.page || p)
        this.page_size = Number(r.page_size || this.page_size)
        this.total = Number(r.total || 0)
        this.has_next = !!r.has_next
        this.selected = []
        this.bulk = { category_id: '', status: '', visibility: '', allow_comments: '', allow_download: '' }
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '加载失败'
        if (e && (e.status === 401 || e.status === 403)) this.$router.replace({ name: 'login' })
      } finally {
        this.loading = false
      }
    },

    async batchApprove(action = 'approve') {
      if (!this.selected.length) return
      if (action !== 'approve' && action !== 'reject') {
        this.error = '未知操作'
        return
      }

      if (action === 'approve' && this.selectedUnverifiedCount > 0) {
        const ok = confirm(`所选中有 ${this.selectedUnverifiedCount} 个作者未认证，通过/发布可能失败，是否继续？`)
        if (!ok) return
      }

      const reason = action === 'reject' ? (prompt('拒绝原因（可选）', '') || '') : ''
      this.loading = true
      this.error = ''
      try {
        await adminApi.batchApproveVideos(this.selected, action, reason)
        await this.fetchList(this.page)
      } catch (e) {
        const d = (e && e.data) || {}
        this.error = d.detail || d.status || e.message || '批量审核失败'
      } finally {
        this.loading = false
      }
    },

    async onRetryTranscode(v) {
      if (!v || !v.id || this.loading) return
      const ok = confirm('确认重试该视频转码？')
      if (!ok) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.retryTranscode(v.id)
        await this.fetchList(this.page)
      } catch (e) {
        const d = (e && e.data) || {}
        this.error = d.detail || d.status || e.message || '重试转码失败'
      } finally {
        this.loading = false
      }
      this.actionOpenId = ''
    }
  }
}
</script>

<style scoped>
.err { color: #dc2626; }
.dense { table-layout: fixed; overflow: visible; border-collapse: separate; border-spacing: 0; width: 100%; }
.dense th, .dense td { padding: 10px 5px; vertical-align: middle; }
.dense thead th { background: #f9fafb; color: #374151; border-bottom: 1px solid #e5e7eb; font-weight: 600; white-space: nowrap; }
.dense thead th:last-child, .dense tbody td:last-child { text-align: right; }
.dense thead th:nth-last-child(2), .dense tbody td:nth-last-child(2) { padding-right: 6px; }
.dense thead th:last-child, .dense tbody td:last-child { padding-left: 4px; padding-right: 15px; }
.dense tbody td { border-top: 1px solid #f3f4f6; }
.dense tbody tr:hover { background: #f9fafb; }
.ellipsis { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ops { display:flex; justify-content:flex-end; align-items:center; white-space: nowrap; overflow: visible; min-height: 34px; }
.dropdown { position: relative; display: inline-block; }
.dd-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; border-radius: 8px; padding: 4px; font-size: 12px; cursor: pointer; line-height: 1.2; min-width: 28px; width: 28px; text-align:center; }
.dd-btn:hover { background: #f3f4f6; }
.menu { position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px; box-shadow: 0 8px 16px rgba(0,0,0,.12); z-index: 40; min-width: 260px; overflow: hidden; }
.menu.drop-up { top: auto; bottom: calc(100% + 6px); }
.menu::before { content: ""; position: absolute; top: -6px; right: 18px; border-width: 6px; border-style: solid; border-color: transparent transparent #ffffff transparent; filter: drop-shadow(0 -1px 0 rgba(0,0,0,.06)); }
.menu.drop-up::before { top: auto; bottom: -6px; right: 18px; transform: rotate(180deg); filter: drop-shadow(0 1px 0 rgba(0,0,0,.06)); }
.menu li { list-style: none; }
.menu > li > button { width: 100%; text-align: left; margin: 0; padding: 8px 10px; font-size: 12px; border-radius: 6px; }
.menu li.row { display:flex; align-items:center; gap: 8px; padding: 4px 2px; }
.menu li.row + li.row { border-top: 1px solid #f3f4f6; margin-top: 6px; padding-top: 10px; }
.menu .lab { font-size: 12px; color: #6b7280; flex: 0 0 34px; }
.menu .btns { display:flex; gap: 6px; flex-wrap: nowrap; }
.menu .btns .seg { width: auto !important; display:inline-flex; align-items:center; padding: 6px 8px; border: 1px solid #e5e7eb; background: #fff; border-radius: 6px; cursor: pointer; white-space: nowrap; }
.menu .btns .seg.active { background: #f3f4f6; border-color: #d1d5db; }
.menu .btns .seg.danger { color: #b91c1c; border-color: #fecaca; background: #fff; }
.menu button:hover { background: #f3f4f6; }
.ops button { margin-right: 0; }
.badges { display:flex; gap:4px; align-items:center; flex-wrap: nowrap; white-space: nowrap; }
.badge { display:inline-block; padding:2px 6px; border-radius:999px; font-size:12px; line-height:18px; border:1px solid #e5e7eb; color:#6b7280; background:#f9fafb; }
.badge.cat { background:#eef2ff; color:#4338ca; border-color:#e0e7ff; }
.badge.opt { background:#f3f4f6; color:#6b7280; }
.badge.opt.on { background:#dcfce7; color:#166534; border-color:#bbf7d0; }
.badge.status.s-draft { background:#f3f4f6; color:#6b7280; }
.badge.status.s-processing { background:#fff7ed; color:#c2410c; border-color:#fed7aa; }
.badge.status.s-published { background:#dcfce7; color:#166534; border-color:#bbf7d0; }
.badge.status.s-banned { background:#fee2e2; color:#991b1b; border-color:#fecaca; }
.badge.vis.v-public { background:#dbeafe; color:#1d4ed8; border-color:#bfdbfe; }
.badge.vis.v-unlisted { background:#f3f4f6; color:#6b7280; }
.badge.vis.v-private { background:#fae8ff; color:#7e22ce; border-color:#f5d0fe; }
.menu hr.sep { margin: 6px 0; border: 0; border-top: 1px solid #e5e7eb; }
.stats { color: #6b7280; white-space: nowrap; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; }
.time { color: #6b7280; font-size: 12px; line-height: 1.2; white-space: normal; }
.time .t-row { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.error { color: #dc2626; }
.titlecell { display:flex; gap:10px; align-items:center; min-width: 0; }
.thumb { width: 72px; height: 40px; border-radius: 6px; object-fit: cover; background: #f3f4f6; flex: 0 0 auto; }
.tinfo { min-width: 0; flex: 1; }
.t-title { font-weight: 600; color: #111827; }
.usercell { display:flex; gap:8px; align-items:center; min-width: 0; }
.avatar { width: 24px; height: 24px; border-radius: 999px; object-fit: cover; background:#e5e7eb; flex: 0 0 auto; }
.uname { color:#374151; }
.dense th:nth-child(2), .dense td:nth-child(2) { width: 140px; max-width: 140px; }
.dense th:nth-child(4), .dense td:nth-child(4) { width: 200px; max-width: 200px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index: 1000; }
.modal { width: min(720px, calc(100vw - 40px)); background: #fff; color: #111827; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.25); overflow:hidden; }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding: 12px 14px; border-bottom:1px solid #e5e7eb; }
.modal-header .close { background:transparent; border:none; font-size:18px; color:#6b7280; cursor:pointer; }
.body { padding: 12px 14px; }
.edit-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px 14px; }
.field { display:flex; flex-direction:column; gap:6px; }
.field-wide { grid-column: 1 / -1; }
.field label { font-size:12px; color:#6b7280; }
.field input, .field select { padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; outline:none; }
.foot { display:flex; justify-content:flex-end; gap:10px; padding: 0 14px 14px; border-top:1px solid #e5e7eb; }
.edit-btn { padding:8px 12px; border-radius:10px; border:1px solid #d1d5db; background:#fff; color:#374151; cursor:pointer; }
.edit-btn.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
.pagination { display:flex; justify-content:center; align-items:center; gap:10px; padding: 12px 0; }
.warn { color: #b45309; font-size: 12px; }
</style>

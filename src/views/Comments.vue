<template>
  <div>
    <div class="toolbar">
      <input v-model.trim="q" placeholder="搜索 评论内容" @keyup.enter="fetchList(1)" />
      <input v-model.trim="video_id" placeholder="视频ID (可选)" @keyup.enter="fetchList(1)" style="width: 240px;" />
      <input v-model.trim="user_id" placeholder="用户ID (可选)" @keyup.enter="fetchList(1)" style="width: 240px;" />
      <label>
        从
        <input type="date" v-model="from" />
      </label>
      <label>
        到
        <input type="date" v-model="to" />
      </label>
      <select v-model="order" @change="fetchList(1)">
        <option value="latest">最新</option>
        <option value="earliest">最早</option>
      </select>
      <select v-model.number="page_size" @change="fetchList(1)">
        <option :value="10">10/页</option>
        <option :value="20">20/页</option>
        <option :value="50">50/页</option>
      </select>
      <button class="primary" @click="fetchList(1)" :disabled="loading">查询</button>
    </div>

    <table class="dense">
      <colgroup>
        <col />
        <col style="width: 160px;" />
        <col style="width: 220px;" />
        <col style="width: 160px;" />
        <col style="width: 64px;" />
      </colgroup>
      <thead>
        <tr>
          <th>内容</th>
          <th>用户</th>
          <th>视频</th>
          <th>时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in rows" :key="c.id">
          <td>
            <div class="c-text ellipsis" :title="c.content">{{ c.content }}</div>
          </td>
          <td>
            <div class="usercell">
              <img v-if="c.user && c.user.avatar_url" :src="c.user.avatar_url" class="avatar" alt="" />
              <span class="uname ellipsis" :title="c.user && c.user.username">{{ c.user && c.user.username }}</span>
            </div>
          </td>
          <td>
            <div class="v-title ellipsis" :title="c.video && c.video.title">{{ c.video && c.video.title }}</div>
          </td>
          <td class="time">
            <div class="t-row">创: {{ fmtTime(c && c.created_at) }}</div>
            <div class="t-row" v-if="c && c.updated_at">更: {{ fmtTime(c.updated_at) }}</div>
          </td>
          <td class="ops" @click.stop>
            <div class="dropdown" :class="{ open: actionOpenId===c.id }" :ref="'dd_'+c.id">
              <button class="dd-btn" @click="toggleActions(c)" title="更多">⋯</button>
              <ul v-if="actionOpenId===c.id" :class="['menu', { 'drop-up': dropUpId===c.id }]">
                <li><button @click="copyText(c.id)">复制评论ID</button></li>
                <li><button @click="copyText(c.video && c.video.id)">复制视频ID</button></li>
                <li><button class="danger" @click="onRemoveWrap(c)" :disabled="loading">删除</button></li>
              </ul>
            </div>
          </td>
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
</template>

<script>
import { adminApi } from '../lib/admin'
import { fmtTime } from '../lib/utils'

export default {
  name: 'AdminComments',
  data() {
    return {
      q: '',
      video_id: '',
      user_id: '',
      from: '',
      to: '',
      order: 'latest',
      page: 1,
      page_size: 20,
      total: 0,
      has_next: false,
      rows: [],
      loading: false,
      error: '',
      actionOpenId: '',
      dropUpId: '',
    }
  },
  computed: {
    maxPage() { return Math.max(1, Math.ceil(this.total / this.page_size)) }
  },
  created() { this.fetchList(1) },
  methods: {
    fmtTime,
    toggleActions(c){
      this.actionOpenId = (this.actionOpenId===c.id ? '' : c.id)
      if (this.actionOpenId) {
        this.$nextTick(() => {
          try {
            const el = this.$refs['dd_'+c.id]
            if (!el) { this.dropUpId=''; return }
            const rect = el.getBoundingClientRect()
            const spaceBelow = (window.innerHeight || document.documentElement.clientHeight) - rect.bottom
            this.dropUpId = spaceBelow < 220 ? c.id : ''
          } catch (_) { this.dropUpId='' }
        })
      } else { this.dropUpId='' }
    },
    async fetchList(p) {
      this.loading = true
      this.error = ''
      try {
        const params = {
          page: p,
          page_size: this.page_size,
          q: this.q || undefined,
          video_id: this.video_id || undefined,
          user_id: this.user_id || undefined,
          order: this.order,
          from: this.from || undefined,
          to: this.to || undefined,
        }
        const r = await adminApi.listComments(params)
        this.rows = r.results || []
        this.page = Number(r.page || p)
        this.page_size = Number(r.page_size || this.page_size)
        this.total = Number(r.total || 0)
        this.has_next = !!r.has_next
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '加载失败'
        if (e && (e.status === 401 || e.status === 403)) this.$router.replace({ name: 'login' })
      } finally {
        this.loading = false
      }
    },
    async remove(c) {
      if (!confirm('确认删除该评论？')) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.deleteComment(c.id)
        await this.fetchList(1)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '删除失败'
      } finally {
        this.loading = false
      }
    }
    ,async onRemoveWrap(c){ await this.remove(c); this.actionOpenId='' }
    ,async copyText(text){
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
.usercell { display:flex; gap:8px; align-items:center; min-width: 0; }
.avatar { width: 24px; height: 24px; border-radius: 999px; object-fit: cover; background:#e5e7eb; flex: 0 0 auto; }
.uname { color:#374151; }
.time { color: #6b7280; font-size: 12px; line-height: 1.2; white-space: normal; }
.time .t-row { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ops { display:flex; justify-content:flex-end; align-items:center; white-space: nowrap; overflow: visible; min-height: 34px; }
.dropdown { position: relative; display: inline-block; }
.dd-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; border-radius: 8px; padding: 4px; font-size: 12px; cursor: pointer; line-height: 1.2; min-width: 28px; width: 28px; text-align:center; }
.dd-btn:hover { background: #f3f4f6; }
.menu { position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 6px; box-shadow: 0 8px 16px rgba(0,0,0,.12); z-index: 40; min-width: 160px; overflow-y: auto; max-height: 260px; }
.menu.drop-up { top: auto; bottom: calc(100% + 6px); }
.menu::before { content: ""; position: absolute; top: -6px; right: 18px; border-width: 6px; border-style: solid; border-color: transparent transparent #ffffff transparent; filter: drop-shadow(0 -1px 0 rgba(0,0,0,.06)); }
.menu.drop-up::before { top: auto; bottom: -6px; right: 18px; transform: rotate(180deg); filter: drop-shadow(0 1px 0 rgba(0,0,0,.06)); }
.menu li { list-style: none; }
.menu button { width: 100%; text-align: left; margin: 0; padding: 8px 10px; font-size: 12px; border-radius: 6px; cursor: pointer; }
.menu button:hover { background: #f3f4f6; }
.menu .danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fecdd3; }
.menu .danger:hover:not(:disabled) { background: #ef4444; color: #fff; border-color: #ef4444; }
.menu .danger:disabled { background: #f9fafb; color: #9ca3af; border: 1px solid #e5e7eb; cursor: not-allowed; }
.dense th:nth-child(2), .dense td:nth-child(2) { width: 160px; max-width: 160px; }
.dense th:nth-child(3), .dense td:nth-child(3) { width: 220px; max-width: 220px; }
.dense th:nth-child(4), .dense td:nth-child(4) { width: 160px; max-width: 160px; }
.dense th:nth-child(5), .dense td:nth-child(5) { width: 64px; max-width: 64px; }
.pagination { display:flex; justify-content:center; align-items:center; gap:10px; padding: 12px 0; }
.danger { background:#ef4444; color:#fff; border:1px solid #ef4444; border-radius:8px; padding:6px 10px; cursor:pointer; }
.danger:disabled { opacity: .6; cursor: not-allowed; }
</style>

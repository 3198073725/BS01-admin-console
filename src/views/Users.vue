<template>
  <div @click="actionOpenId=''">
    <div class="toolbar">
      <input v-model.trim="q" placeholder="搜索 用户名/昵称/邮箱" @keyup.enter="fetchList(1)" />
      <select v-model="order" @change="fetchList(1)">
        <option value="latest">最新注册</option>
        <option value="oldest">最早注册</option>
        <option value="popular">粉丝最多</option>
      </select>
      <select v-model="is_active" @change="fetchList(1)">
        <option :value="null">状态(全部)</option>
        <option :value="true">已启用</option>
        <option :value="false">已禁用</option>
      </select>
      <select v-model="is_verified" @change="fetchList(1)">
        <option :value="null">已验证(全部)</option>
        <option :value="true">已验证</option>
        <option :value="false">未验证</option>
      </select>
      <select v-model="is_creator" @change="fetchList(1)">
        <option :value="null">创作者(全部)</option>
        <option :value="true">是</option>
        <option :value="false">否</option>
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
        <col style="width: 200px;" />
        <col style="width: 260px;" />
        <col style="width: 260px;" />
        <col style="width: 260px;" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th>用户名</th>
          <th>邮箱</th>
          <th>统计</th>
          <th>标记</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in rows" :key="u.id">
          <td><span class="ellipsis" :title="u.username">{{ u.username }}</span></td>
          <td><span class="ellipsis" :title="u.email">{{ u.email }}</span></td>
          <td class="stats">
            粉丝 {{ u.followers_count }} · 关注 {{ u.following_count }} · 视频 {{ u.video_count }}
          </td>
          <td>
            <div class="tags">
              <span :class="{ tag: true, on: u.is_active }">启用</span>
              <span :class="{ tag: true, on: u.is_verified }">已验证</span>
              <span :class="{ tag: true, on: u.is_creator }">创作者</span>
              <span :class="{ tag: true, on: u.is_staff }">管理员</span>
            </div>
          </td>
          <td class="ops" @click.stop>
            <div class="dropdown" :class="{ open: actionOpenId===u.id }" :ref="'dd_'+u.id">
              <button class="dd-btn" @click="toggleActions(u)">更多 ▾</button>
              <ul v-if="actionOpenId===u.id" :class="['menu', { 'drop-up': dropUpId===u.id }]">
                <li><button @click="onToggleWrap(u,'is_active')">{{ u.is_active ? '禁用' : '启用' }}</button></li>
                <li><button @click="onToggleWrap(u,'is_verified')">{{ u.is_verified ? '取消已验证' : '标记已验证' }}</button></li>
                <li><button @click="onToggleWrap(u,'is_creator')">{{ u.is_creator ? '取消创作者' : '设为创作者' }}</button></li>
                <li v-if="isSuperuser"><button @click="onToggleWrap(u,'is_staff')">{{ u.is_staff ? '取消管理员' : '设为管理员' }}</button></li>
                <li><button @click="copyText(u.id)">复制用户ID</button></li>
                <li><button class="danger" @click="onForceLogoutWrap(u)" :disabled="loading">强制下线</button></li>
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

export default {
  name: 'AdminUsers',
  data() {
    return {
      q: '',
      order: 'latest',
      is_active: null,
      is_verified: null,
      is_creator: null,
      isSuperuser: false,
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
    maxPage() {
      return Math.max(1, Math.ceil(this.total / this.page_size))
    }
  },
  created() { this.fetchList(1); this.fetchAdminMe() },
  methods: {
    toggleActions(u){
      this.actionOpenId = (this.actionOpenId===u.id ? '' : u.id)
      if (this.actionOpenId) {
        this.$nextTick(() => {
          try {
            const el = this.$refs['dd_'+u.id]
            if (!el) { this.dropUpId=''; return }
            const rect = el.getBoundingClientRect()
            const spaceBelow = (window.innerHeight || document.documentElement.clientHeight) - rect.bottom
            this.dropUpId = spaceBelow < 220 ? u.id : ''
          } catch (_) { this.dropUpId='' }
        })
      } else { this.dropUpId='' }
    },
    async fetchAdminMe() {
      try {
        const me = await adminApi.adminMe()
        this.isSuperuser = !!(me && me.is_superuser)
      } catch (e) { this.isSuperuser = false }
    },
    async fetchList(p) {
      this.loading = true
      this.error = ''
      try {
        const params = {
          page: p,
          page_size: this.page_size,
          q: this.q || undefined,
          order: this.order,
        }
        if (this.is_active !== null) params.is_active = this.is_active
        if (this.is_verified !== null) params.is_verified = this.is_verified
        if (this.is_creator !== null) params.is_creator = this.is_creator
        const r = await adminApi.listUsers(params)
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
    async toggle(u, field) {
      if (this.loading) return
      if (field === 'is_staff' && !this.isSuperuser) { this.error = '仅超级管理员可修改管理员标记'; return }
      const next = !u[field]
      this.loading = true
      this.error = ''
      try {
        await adminApi.patchUser(u.id, { [field]: next })
        u[field] = next
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '更新失败'
      } finally {
        this.loading = false
      }
    },
    async onToggleWrap(u, field){ await this.toggle(u, field); this.actionOpenId='' },
    async forceLogout(u) {
      if (!u || !u.id || this.loading) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.forceLogoutUser(u.id)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '操作失败'
      } finally {
        this.loading = false
      }
    }
    ,async onForceLogoutWrap(u){ await this.forceLogout(u); this.actionOpenId='' }
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
.tag { display: inline-block; padding: 2px 6px; border-radius: 6px; background: #f3f4f6; color: #6b7280; margin-right: 6px; font-size: 12px; }
.tag.on { background: #dbeafe; color: #1d4ed8; }
.err { color: #dc2626; }
.dense { table-layout: fixed; overflow: visible; }
.dense th, .dense td { padding: 8px 10px; vertical-align: middle; }
.ellipsis { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.stats { white-space: nowrap; font-variant-numeric: tabular-nums; }
.tags { display: flex; gap: 6px; align-items: center; flex-wrap: nowrap; white-space: nowrap; overflow-x: auto; }
.tags .tag { margin: 0 6px 0 0; }
.ops { display: flex; gap: 6px; align-items: center; flex-wrap: nowrap; white-space: nowrap; overflow: visible; min-height: 34px; }
.ops button { margin: 0 6px 0 0; flex: 0 0 auto; padding: 6px 10px; font-size: 12px; }
.dropdown { position: relative; display: inline-block; }
.dd-btn { background: #fff; border: 1px solid #d1d5db; color: #374151; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; line-height: 1.2; min-width: 72px; }
.dd-btn:hover { background: #f3f4f6; }
.menu { position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 6px; box-shadow: 0 8px 16px rgba(0,0,0,.12); z-index: 40; min-width: 160px; overflow-y: auto; max-height: 260px; }
.menu.drop-up { top: auto; bottom: calc(100% + 6px); }
.menu::before { content: ""; position: absolute; top: -6px; right: 18px; border-width: 6px; border-style: solid; border-color: transparent transparent #ffffff transparent; filter: drop-shadow(0 -1px 0 rgba(0,0,0,.06)); }
.menu.drop-up::before { top: auto; bottom: -6px; right: 18px; transform: rotate(180deg); filter: drop-shadow(0 1px 0 rgba(0,0,0,.06)); }
.menu li { list-style: none; }
.menu li + li { margin-top: 2px; }
.menu button { width: 100%; text-align: left; margin: 0; padding: 8px 10px; font-size: 12px; border-radius: 6px; cursor: pointer; }
.menu button:hover { background: #f3f4f6; }
.menu .danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fecdd3; }
.menu .danger:hover:not(:disabled) { background: #ef4444; color: #fff; border-color: #ef4444; }
.menu .danger:disabled { background: #f9fafb; color: #9ca3af; border: 1px solid #e5e7eb; cursor: not-allowed; }
</style>

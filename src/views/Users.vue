<template>
  <div>
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
        <option :value="null">认证(全部)</option>
        <option :value="true">已认证</option>
        <option :value="false">未认证</option>
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

    <table>
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
          <td>{{ u.username }}</td>
          <td>{{ u.email }}</td>
          <td>
            粉丝 {{ u.followers_count }} · 关注 {{ u.following_count }} · 视频 {{ u.video_count }}
          </td>
          <td>
            <span :class="{ tag: true, on: u.is_active }">启用</span>
            <span :class="{ tag: true, on: u.is_verified }">认证</span>
            <span :class="{ tag: true, on: u.is_creator }">创作者</span>
            <span :class="{ tag: true, on: u.is_staff }">管理员</span>
          </td>
          <td class="ops">
            <button @click="toggle(u, 'is_active')">{{ u.is_active ? '禁用' : '启用' }}</button>
            <button @click="toggle(u, 'is_verified')">{{ u.is_verified ? '取消认证' : '认证' }}</button>
            <button @click="toggle(u, 'is_creator')">{{ u.is_creator ? '取消创作者' : '设为创作者' }}</button>
            <button @click="toggle(u, 'is_staff')">{{ u.is_staff ? '取消管理员' : '设为管理员' }}</button>
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
      page: 1,
      page_size: 20,
      total: 0,
      has_next: false,
      rows: [],
      loading: false,
      error: '',
    }
  },
  computed: {
    maxPage() {
      return Math.max(1, Math.ceil(this.total / this.page_size))
    }
  },
  created() { this.fetchList(1) },
  methods: {
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
        if (e && e.status === 403) this.$router.replace({ name: 'login' })
      } finally {
        this.loading = false
      }
    },
    async toggle(u, field) {
      if (this.loading) return
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
  }
}
</script>

<style scoped>
.tag { display: inline-block; padding: 2px 6px; border-radius: 6px; background: #f3f4f6; color: #6b7280; margin-right: 6px; font-size: 12px; }
.tag.on { background: #dbeafe; color: #1d4ed8; }
.err { color: #dc2626; }
.ops button { margin-right: 6px; }
</style>

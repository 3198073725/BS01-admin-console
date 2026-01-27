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

    <table>
      <thead>
        <tr>
          <th style="width: 50%">内容</th>
          <th>用户</th>
          <th>视频</th>
          <th>时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in rows" :key="c.id">
          <td>{{ c.content }}</td>
          <td>{{ c.user && c.user.username }}</td>
          <td>{{ c.video && c.video.title }}</td>
          <td>
            <div>创建: {{ c.created_at }}</div>
            <div>更新: {{ c.updated_at }}</div>
          </td>
          <td class="ops">
            <button class="danger" @click="remove(c)" :disabled="loading">删除</button>
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
    }
  },
  computed: {
    maxPage() { return Math.max(1, Math.ceil(this.total / this.page_size)) }
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
        if (e && e.status === 403) this.$router.replace({ name: 'login' })
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
  }
}
</script>

<style scoped>
.err { color: #dc2626; }
.ops button { margin-right: 6px; }
</style>

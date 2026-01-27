<template>
  <div>
    <div class="toolbar">
      <input v-model.trim="q" placeholder="搜索 标题/描述/作者用户名" @keyup.enter="fetchList(1)" />
      <input v-model.trim="user_id" placeholder="用户ID (可选)" @keyup.enter="fetchList(1)" style="width: 260px;" />
      <select v-model="status" @change="fetchList(1)">
        <option value="">状态(全部)</option>
        <option value="draft">草稿</option>
        <option value="processing">处理</option>
        <option value="published">已发布</option>
        <option value="banned">封禁</option>
      </select>
      <select v-model="visibility" @change="fetchList(1)">
        <option value="">可见性(全部)</option>
        <option value="public">公开</option>
        <option value="unlisted">未列出</option>
        <option value="private">私密</option>
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
    </div>

    <table>
      <thead>
        <tr>
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
          <td>{{ v.title }}</td>
          <td>{{ v.owner && v.owner.username }}</td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              <select v-model="v.status">
                <option value="draft">草稿</option>
                <option value="processing">处理</option>
                <option value="published">已发布</option>
                <option value="banned">封禁</option>
              </select>
              <select v-model="v.visibility">
                <option value="public">公开</option>
                <option value="unlisted">未列出</option>
                <option value="private">私密</option>
              </select>
            </div>
          </td>
          <td>
            播放 {{ v.view_count }} · 点赞 {{ v.like_count }} · 评论 {{ v.comment_count }}
          </td>
          <td>
            <div>创建: {{ v.created_at }}</div>
            <div>发布: {{ v.published_at || '-' }}</div>
          </td>
          <td class="ops">
            <button class="primary" @click="save(v)" :disabled="loading">保存</button>
            <button class="danger" @click="remove(v)" :disabled="loading">删除</button>
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
  name: 'AdminVideos',
  data() {
    return {
      q: '',
      user_id: '',
      status: '',
      visibility: '',
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
          user_id: this.user_id || undefined,
          status: this.status || undefined,
          visibility: this.visibility || undefined,
          order: this.order,
        }
        const r = await adminApi.listVideos(params)
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
    async save(v) {
      this.loading = true
      this.error = ''
      try {
        await adminApi.patchVideo(v.id, { status: v.status, visibility: v.visibility })
        await this.fetchList(this.page)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '保存失败'
      } finally {
        this.loading = false
      }
    },
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
    }
  }
}
</script>

<style scoped>
.err { color: #dc2626; }
.ops button { margin-right: 6px; }
</style>

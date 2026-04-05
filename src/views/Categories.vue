<template>
  <div class="page">
    <div class="toolbar">
      <input v-model.trim="q" placeholder="搜索 分类名称" @keyup.enter="fetchList(1)" />
      <select v-model.number="page_size" @change="fetchList(1)">
        <option :value="10">10/页</option>
        <option :value="20">20/页</option>
        <option :value="50">50/页</option>
      </select>
      <button class="primary" @click="fetchList(1)" :disabled="loading">查询</button>
      <div style="flex:1"></div>
      <input v-model.trim="new_name" placeholder="新分类名称" style="width:220px" />
      <input v-model.trim="new_desc" placeholder="描述(可选)" style="width:260px" />
      <button class="primary" @click="createOne" :disabled="loading || !new_name">新增</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>名称</th>
          <th>描述</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in rows" :key="c.id">
          <td>
            <input v-model.trim="c._name" />
          </td>
          <td>
            <input v-model="c._description" />
          </td>
          <td>{{ c.created_at }}</td>
          <td class="ops">
            <button class="primary" @click="save(c)" :disabled="loading">保存</button>
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
  name: 'AdminCategories',
  data() {
    return {
      q: '',
      page: 1,
      page_size: 20,
      total: 0,
      has_next: false,
      rows: [],
      loading: false,
      error: '',
      new_name: '',
      new_desc: '',
    }
  },
  computed: { maxPage() { return Math.max(1, Math.ceil(this.total / this.page_size)) } },
  created() { this.fetchList(1) },
  methods: {
    async fetchList(p) {
      this.loading = true
      this.error = ''
      try {
        const r = await adminApi.listCategories({ page: p, page_size: this.page_size, q: this.q || undefined })
        const rows = r.results || []
        this.rows = rows.map(x => ({ ...x, _name: x.name, _description: x.description }))
        this.page = Number(r.page || p)
        this.page_size = Number(r.page_size || this.page_size)
        this.total = Number(r.total || 0)
        this.has_next = !!r.has_next
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '加载失败'
        if (e && e.status === 403) this.$router.replace({ name: 'login' })
      } finally { this.loading = false }
    },
    async createOne() {
      if (!this.new_name || this.loading) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.createCategory({ name: this.new_name, description: this.new_desc || undefined })
        this.new_name = ''; this.new_desc = ''
        await this.fetchList(1)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '新增失败'
      } finally { this.loading = false }
    },
    async save(c) {
      if (!c || !c.id || this.loading) return
      this.loading = true
      this.error = ''
      try {
        const payload = {}
        if (c._name !== c.name) payload.name = c._name
        if (c._description !== c.description) payload.description = c._description
        if (Object.keys(payload).length === 0) return
        await adminApi.updateCategory(c.id, payload)
        await this.fetchList(this.page)
      } catch (e) { this.error = (e && e.data && e.data.detail) || e.message || '保存失败' }
      finally { this.loading = false }
    },
    async remove(c) {
      if (!c || !c.id || this.loading) return
      if (!confirm('确认删除该分类？')) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.deleteCategory(c.id)
        await this.fetchList(1)
      } catch (e) { this.error = (e && e.data && e.data.detail) || e.message || '删除失败' }
      finally { this.loading = false }
    }
  }
}
</script>

<style scoped>
.err { color: #dc2626; }
.ops button { margin-right: 6px; }
</style>

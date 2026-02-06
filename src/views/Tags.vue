<template>
  <div class="page">
    <div class="toolbar">
      <div class="row">
        <input v-model.trim="q" class="input" placeholder="搜索 标签名称" @keyup.enter="fetchList(1)" />
        <select v-model.number="page_size" class="select" @change="fetchList(1)">
          <option :value="10">10/页</option>
          <option :value="20">20/页</option>
          <option :value="50">50/页</option>
        </select>
        <button class="primary" @click="fetchList(1)" :disabled="loading">查询</button>
        <div class="spacer"></div>
        <input v-model.trim="new_name" class="input" placeholder="新标签名称" />
        <button class="primary" @click="createOne" :disabled="loading || !new_name">新增</button>
      </div>
      <div class="row gap">
        <div class="merge">
          <label>合并</label>
          <select v-model="mergeSource" class="select">
            <option disabled value="">源标签</option>
            <option v-for="t in rows" :key="'s'+t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <span>→</span>
          <select v-model="mergeTarget" class="select">
            <option disabled value="">目标标签</option>
            <option v-for="t in rows" :key="'t'+t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <button class="primary" @click="doMerge" :disabled="loading || !mergeSource || !mergeTarget || mergeSource===mergeTarget">合并</button>
        </div>
        <div class="actions">
          <button class="danger ghost" @click="bulkDelete" :disabled="loading || !selected.length">批量删除</button>
        </div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" :checked="allChecked" @change="toggleAll($event)" /></th>
            <th>名称</th>
            <th>使用次数</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td><input type="checkbox" :value="t.id" :checked="selected.includes(t.id)" @change="toggleOne(t.id, $event)" /></td>
            <td><input v-model.trim="t._name" class="input" /></td>
            <td><span class="badge">{{ t.usage_count || 0 }}</span></td>
            <td>{{ t.created_at }}</td>
            <td class="ops">
              <button class="primary ghost" @click="save(t)" :disabled="loading || !t._name">保存</button>
              <button class="danger ghost" @click="remove(t)" :disabled="loading">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
  name: 'AdminTags',
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
      selected: [],
      mergeSource: '',
      mergeTarget: '',
    }
  },
  computed: {
    maxPage() { return Math.max(1, Math.ceil(this.total / this.page_size)) },
    allChecked() {
      return this.rows.length > 0 && this.rows.every(r => this.selected.includes(r.id))
    }
  },
  created() { this.fetchList(1) },
  methods: {
    async fetchList(p) {
      this.loading = true
      this.error = ''
      try {
        const r = await adminApi.listTags({ page: p, page_size: this.page_size, q: this.q || undefined })
        const rows = r.results || []
        this.rows = rows.map(x => ({ ...x, _name: x.name }))
        this.page = Number(r.page || p)
        this.page_size = Number(r.page_size || this.page_size)
        this.total = Number(r.total || 0)
        this.has_next = !!r.has_next
        // 清理选择
        const ids = new Set(rows.map(r => r.id))
        this.selected = this.selected.filter(id => ids.has(id))
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '加载失败'
        if (e && e.status === 403) this.$router.replace({ name: 'login' })
      } finally { this.loading = false }
    },
    async createOne() {
      if (!this.new_name || this.loading) return
      const name = this.new_name.trim()
      if (!name) { this.error = '名称不能为空'; return }
      this.loading = true
      this.error = ''
      try {
        await adminApi.createTag({ name })
        this.new_name = ''
        await this.fetchList(1)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '新增失败'
      } finally { this.loading = false }
    },
    async save(t) {
      if (!t || !t.id || this.loading) return
      if (!t._name || !t._name.trim()) { this.error = '名称不能为空'; return }
      this.loading = true
      this.error = ''
      try {
        const payload = {}
        if (t._name !== t.name) payload.name = t._name
        if (Object.keys(payload).length === 0) return
        await adminApi.updateTag(t.id, payload)
        await this.fetchList(this.page)
      } catch (e) { this.error = (e && e.data && e.data.detail) || e.message || '保存失败' }
      finally { this.loading = false }
    },
    async remove(t) {
      if (!t || !t.id || this.loading) return
      if (!confirm('确认删除该标签？（已被使用的标签无法删除）')) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.deleteTag(t.id)
        await this.fetchList(1)
      } catch (e) { this.error = (e && e.data && e.data.detail) || e.message || '删除失败' }
      finally { this.loading = false }
    },
    toggleOne(id, ev) {
      if (ev && ev.target && ev.target.checked) {
        if (!this.selected.includes(id)) this.selected = [...this.selected, id]
      } else {
        this.selected = this.selected.filter(x => x !== id)
      }
    },
    toggleAll(ev) {
      const checked = ev && ev.target && ev.target.checked
      if (checked) {
        this.selected = this.rows.map(r => r.id)
      } else {
        this.selected = []
      }
    },
    async bulkDelete() {
      if (!this.selected.length || this.loading) return
      if (!confirm('确认批量删除选中的标签？已被使用的标签将被跳过')) return
      this.loading = true
      this.error = ''
      try {
        const r = await adminApi.bulkDeleteTags(this.selected)
        if (r && r.blocked && r.blocked.length) {
          this.error = `部分标签已被使用未删除：${r.blocked.join(', ')}`
        }
        this.selected = []
        await this.fetchList(1)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '批量删除失败'
      } finally { this.loading = false }
    },
    async doMerge() {
      if (!this.mergeSource || !this.mergeTarget || this.mergeSource === this.mergeTarget || this.loading) return
      if (!confirm('确认合并？源标签将被删除，视频引用迁移到目标标签。')) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.mergeTags({ source: this.mergeSource, target: this.mergeTarget })
        this.mergeSource = ''
        this.mergeTarget = ''
        this.selected = []
        await this.fetchList(this.page)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '合并失败'
      } finally { this.loading = false }
    },
  }
}
</script>

<style scoped>
.page { padding: 12px; }
.toolbar { display:flex; flex-direction:column; gap:10px; margin-bottom:12px; }
.row { display:flex; align-items:center; gap:8px; }
.row.gap { gap:12px; }
.spacer { flex:1; }
.input { padding:6px 8px; border:1px solid #dfe3ea; border-radius:6px; min-width:140px; }
.select { padding:6px 8px; border:1px solid #dfe3ea; border-radius:6px; background:white; }
.primary { background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; }
.primary:disabled, .danger:disabled { opacity:0.6; cursor:not-allowed; }
.danger { background:#dc2626; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; }
.ghost { background:transparent; border:1px solid #dfe3ea; color:#111; }
.table-wrap { border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; background:white; }
table { width:100%; border-collapse:collapse; }
th, td { padding:10px 12px; border-bottom:1px solid #f1f3f5; text-align:left; }
th:first-child, td:first-child { width:48px; }
.ops button { margin-right:6px; }
.pagination { display:flex; align-items:center; gap:12px; margin-top:12px; }
.err { color:#dc2626; margin-top:8px; }
.badge { display:inline-block; padding:2px 8px; background:#f3f4f6; border-radius:999px; font-size:12px; color:#111; }
.merge { display:flex; align-items:center; gap:6px; }
.actions { display:flex; align-items:center; gap:8px; }
</style>

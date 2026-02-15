<template>
  <div class="page" @click="editingId=''">
    <div class="toolbar">
      <input v-model.trim="q" placeholder="搜索 标题/内容" @keyup.enter="fetchList(1)" />
      <select v-model="is_active" @change="fetchList(1)">
        <option :value="''">状态(全部)</option>
        <option :value="'true'">已发布</option>
        <option :value="'false'">未发布</option>
      </select>
      <select v-model.number="page_size" @change="fetchList(1)">
        <option :value="10">10/页</option>
        <option :value="20">20/页</option>
        <option :value="50">50/页</option>
      </select>
      <button class="primary" @click="fetchList(1)" :disabled="loading">查询</button>
    </div>

    <div class="toolbar">
      <input v-model.trim="form.title" placeholder="标题" style="width: 260px;" />
      <input v-model.trim="form.content" placeholder="内容（简短）" style="flex: 1; min-width: 260px;" />
      <label style="display:flex; align-items:center; gap:6px;">
        <input type="checkbox" v-model="form.pinned" /> 置顶
      </label>
      <label style="display:flex; align-items:center; gap:6px;">
        <input type="checkbox" v-model="form.is_active" /> 立即发布
      </label>
      <button class="primary" @click="createOne" :disabled="loading || !form.title">发布</button>
    </div>

    <table class="dense">
      <colgroup>
        <col style="width: 260px;" />
        <col />
        <col style="width: 120px;" />
        <col style="width: 160px;" />
        <col style="width: 140px;" />
      </colgroup>
      <thead>
        <tr>
          <th>标题</th>
          <th>内容</th>
          <th>状态</th>
          <th>发布时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in rows" :key="a.id">
          <td>
            <template v-if="editingId===a.id">
              <input v-model.trim="edit.title" style="width: 100%;" />
            </template>
            <template v-else>
              <span class="ellipsis" :title="a.title">{{ a.title }}</span>
            </template>
          </td>
          <td>
            <template v-if="editingId===a.id">
              <input v-model.trim="edit.content" style="width: 100%;" />
            </template>
            <template v-else>
              <span class="ellipsis" :title="a.content">{{ a.content }}</span>
            </template>
          </td>
          <td>
            <div class="tags" v-if="editingId!==a.id">
              <span :class="{ tag: true, on: a.is_active }">发布</span>
              <span :class="{ tag: true, on: a.pinned }">置顶</span>
            </div>
            <div v-else class="tags">
              <label><input type="checkbox" v-model="edit.is_active" /> 发布</label>
              <label><input type="checkbox" v-model="edit.pinned" /> 置顶</label>
            </div>
          </td>
          <td class="time">
            {{ fmtTime(a.published_at || a.created_at) }}
          </td>
          <td class="ops" @click.stop>
            <template v-if="editingId===a.id">
              <button class="primary ghost" @click="saveEdit" :disabled="loading || !edit.title">保存</button>
              <button @click="cancelEdit" :disabled="loading">取消</button>
            </template>
            <template v-else>
              <button class="primary ghost" @click="startEdit(a)">编辑</button>
              <button class="danger ghost" @click="remove(a)" :disabled="loading">删除</button>
            </template>
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
  name: 'AdminAnnouncements',
  data() {
    return {
      q: '',
      is_active: '',
      page: 1,
      page_size: 20,
      total: 0,
      has_next: false,
      rows: [],
      loading: false,
      error: '',
      form: { title: '', content: '', pinned: false, is_active: true },
      editingId: '',
      edit: { id: '', title: '', content: '', pinned: false, is_active: true },
    }
  },
  computed: {
    maxPage() { return Math.max(1, Math.ceil(this.total / this.page_size)) }
  },
  created() { this.fetchList(1) },
  methods: {
    fmtTime,
    async fetchList(p) {
      this.loading = true
      this.error = ''
      try {
        const params = { page: p, page_size: this.page_size, q: this.q || undefined }
        if (this.is_active === 'true') params.is_active = true
        if (this.is_active === 'false') params.is_active = false
        const r = await adminApi.listAnnouncements(params)
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
    async createOne() {
      if (!this.form.title) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.createAnnouncement({
          title: this.form.title,
          content: this.form.content,
          pinned: !!this.form.pinned,
          is_active: !!this.form.is_active,
        })
        this.form.title = ''
        this.form.content = ''
        this.form.pinned = false
        this.form.is_active = true
        await this.fetchList(1)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '发布失败'
      } finally {
        this.loading = false
      }
    },
    startEdit(a) {
      this.editingId = a.id
      this.edit = { id: a.id, title: a.title || '', content: a.content || '', pinned: !!a.pinned, is_active: !!a.is_active }
    },
    cancelEdit() { this.editingId = ''; this.edit = { id: '', title: '', content: '', pinned: false, is_active: true } },
    async saveEdit() {
      if (!this.editingId || !this.edit.title) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.patchAnnouncement(this.edit.id, {
          title: this.edit.title,
          content: this.edit.content,
          pinned: !!this.edit.pinned,
          is_active: !!this.edit.is_active,
        })
        this.cancelEdit()
        await this.fetchList(this.page)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '保存失败'
      } finally {
        this.loading = false
      }
    },
    async remove(a) {
      if (!a || !a.id) return
      if (!confirm('确认删除该系统通知？')) return
      this.loading = true
      this.error = ''
      try {
        await adminApi.deleteAnnouncement(a.id)
        await this.fetchList(1)
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '删除失败'
      } finally {
        this.loading = false
      }
    },
  }
}
</script>

<style scoped>
.err { color: #dc2626; }
.dense { table-layout: fixed; overflow: visible; }
.ellipsis { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.tags { display: flex; gap: 6px; align-items: center; flex-wrap: nowrap; white-space: nowrap; }
.tag { display: inline-block; padding: 2px 6px; border-radius: 6px; background: #f3f4f6; color: #6b7280; font-size: 12px; }
.tag.on { background: #dbeafe; color: #1d4ed8; }
.time { color: #6b7280; font-size: 12px; white-space: nowrap; }
.ops { white-space: nowrap; display: flex; justify-content: flex-end; gap: 8px; align-items: center; }
.ops button { margin: 0; padding: 6px 10px; font-size: 12px; line-height: 1.2; }
</style>

<template>
  <div class="page">
    <div class="toolbar">
      <select v-model="status" @change="fetchList(1)">
        <option value="">全部状态</option>
        <option value="pending">待处理</option>
        <option value="resolved">已解决</option>
        <option value="escalated">已升级</option>
      </select>
      <select v-model="target_type" @change="fetchList(1)">
        <option value="">全部类型</option>
        <option value="video">视频</option>
        <option value="comment">评论</option>
        <option value="user">用户</option>
      </select>
      <input v-model.trim="reporter_id" placeholder="举报人ID (可选)" @keyup.enter="fetchList(1)" style="width: 180px;" />
      <input v-model.trim="target_id" placeholder="目标ID (可选)" @keyup.enter="fetchList(1)" style="width: 180px;" />
      <select v-model="order" @change="fetchList(1)">
        <option value="latest">最新</option>
        <option value="oldest">最早</option>
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
        <col style="width: 80px;" />
        <col />
        <col style="width: 120px;" />
        <col style="width: 140px;" />
        <col style="width: 100px;" />
        <col style="width: 160px;" />
        <col style="width: 64px;" />
      </colgroup>
      <thead>
        <tr>
          <th>类型</th>
          <th>目标信息</th>
          <th>举报人</th>
          <th>原因</th>
          <th>状态</th>
          <th>时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id">
          <td>
            <span class="badge" :class="r.target_type">{{ typeText(r.target_type) }}</span>
          </td>
          <td>
            <div v-if="r.target_info" class="target-info">
              <div v-if="r.target_type === 'video'" class="ellipsis" :title="r.target_info.title">
                {{ r.target_info.title || '未知视频' }}
              </div>
              <div v-else-if="r.target_type === 'comment'">
                <div class="ellipsis" :title="r.target_info.content">{{ r.target_info.content || '未知评论' }}</div>
                <div class="sub" v-if="r.target_info.video_title">视频: {{ r.target_info.video_title }}</div>
              </div>
              <div v-else-if="r.target_type === 'user'" class="ellipsis" :title="r.target_info.username">
                {{ r.target_info.nickname || r.target_info.username || '未知用户' }}
              </div>
            </div>
            <div v-else class="text-muted">目标不存在或已删除</div>
          </td>
          <td>
            <div class="usercell">
              <span class="uname ellipsis" :title="r.reporter?.username">{{ r.reporter?.nickname || r.reporter?.username || '-' }}</span>
            </div>
          </td>
          <td>
            <div class="ellipsis" :title="r.reason_code">{{ r.reason_code || '-' }}</div>
            <div v-if="r.description" class="sub ellipsis" :title="r.description">{{ r.description }}</div>
          </td>
          <td>
            <span class="badge" :class="r.status">{{ statusText(r.status) }}</span>
          </td>
          <td class="time">
            <div class="t-row">{{ fmtTime(r.created_at) }}</div>
          </td>
          <td class="ops" @click.stop>
            <div class="dropdown" :class="{ open: actionOpenId===r.id }" :ref="'dd_'+r.id">
              <button class="dd-btn" @click="toggleActions(r)" title="更多">⋯</button>
              <ul v-if="actionOpenId===r.id" :class="['menu', { 'drop-up': dropUpId===r.id }]">
                <li><button @click="viewDetail(r)">查看详情</button></li>
                <li v-if="r.status === 'pending'"><button @click="openHandle(r, 'dismiss')">驳回举报</button></li>
                <li v-if="r.status === 'pending'"><button @click="openHandle(r, 'warn')">记录警告</button></li>
                <li v-if="r.status === 'pending' && r.target_type !== 'user'"><button class="danger" @click="openHandle(r, 'delete_content')">删除内容</button></li>
                <li v-if="r.status === 'pending' && r.target_type === 'user'"><button class="danger" @click="openHandle(r, 'ban_user')">封禁用户</button></li>
                <li v-if="r.status === 'pending'"><button @click="openHandle(r, 'escalate')">升级处理</button></li>
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

    <!-- Handle Modal -->
    <div v-if="showHandleModal" class="modal-overlay" @click.self="closeHandleModal">
      <div class="modal">
        <h3>处理举报</h3>
        <p>举报ID: {{ handleReportData?.id }}</p>
        <p>动作: {{ actionText(handleAction) }}</p>
        <textarea v-model="handleNotes" placeholder="处理备注（可选）" rows="4"></textarea>
        <div class="modal-actions">
          <button @click="closeHandleModal">取消</button>
          <button class="primary" @click="confirmHandle" :disabled="handleLoading">确认</button>
        </div>
        <p v-if="handleError" class="err">{{ handleError }}</p>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal detail-modal">
        <h3>举报详情</h3>
        <div v-if="detailLoading" class="loading">加载中...</div>
        <div v-else-if="detailData" class="detail-content">
          <div class="section">
            <h4>基本信息</h4>
            <p><strong>ID:</strong> {{ detailData.id }}</p>
            <p><strong>类型:</strong> {{ typeText(detailData.target_type) }}</p>
            <p><strong>状态:</strong> <span class="badge" :class="detailData.status">{{ statusText(detailData.status) }}</span></p>
            <p><strong>举报原因:</strong> {{ detailData.reason_code || '-' }}</p>
            <p v-if="detailData.description"><strong>详细描述:</strong> {{ detailData.description }}</p>
            <p><strong>创建时间:</strong> {{ fmtTime(detailData.created_at) }}</p>
          </div>
          <div class="section">
            <h4>举报人</h4>
            <p><strong>用户名:</strong> {{ detailData.reporter?.username || '-' }}</p>
            <p><strong>昵称:</strong> {{ detailData.reporter?.nickname || '-' }}</p>
          </div>
          <div class="section" v-if="detailData.target_detail">
            <h4>目标详情</h4>
            <div v-if="detailData.target_type === 'video'">
              <p><strong>标题:</strong> {{ detailData.target_detail.title || '-' }}</p>
              <p v-if="detailData.target_detail.description"><strong>描述:</strong> {{ detailData.target_detail.description }}</p>
              <p><strong>作者:</strong> {{ detailData.target_detail.author?.username || '-' }}</p>
              <p><strong>状态:</strong> {{ detailData.target_detail.status || '-' }}</p>
            </div>
            <div v-else-if="detailData.target_type === 'comment'">
              <p><strong>内容:</strong> {{ detailData.target_detail.content || '-' }}</p>
              <p><strong>作者:</strong> {{ detailData.target_detail.author?.username || '-' }}</p>
              <p v-if="detailData.target_detail.video"><strong>所属视频:</strong> {{ detailData.target_detail.video.title || '-' }}</p>
            </div>
            <div v-else-if="detailData.target_type === 'user'">
              <p><strong>用户名:</strong> {{ detailData.target_detail.username || '-' }}</p>
              <p><strong>昵称:</strong> {{ detailData.target_detail.nickname || '-' }}</p>
              <p><strong>邮箱:</strong> {{ detailData.target_detail.email || '-' }}</p>
              <p><strong>账号状态:</strong> {{ detailData.target_detail.is_active ? '正常' : '已禁用' }}</p>
            </div>
          </div>
          <div class="section" v-if="detailData.actions && detailData.actions.length">
            <h4>处理记录</h4>
            <div v-for="a in detailData.actions" :key="a.id" class="action-item">
              <p><strong>动作:</strong> {{ actionText(a.action) }}</p>
              <p v-if="a.reason"><strong>原因:</strong> {{ a.reason }}</p>
              <p><strong>处理人:</strong> {{ a.moderator?.username || '-' }}</p>
              <p><strong>时间:</strong> {{ fmtTime(a.created_at) }}</p>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeDetailModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { adminApi } from '../lib/admin'
import { fmtTime } from '../lib/utils'

export default {
  name: 'AdminReports',
  data() {
    return {
      status: '',
      target_type: '',
      reporter_id: '',
      target_id: '',
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
      // Handle modal
      showHandleModal: false,
      handleReportData: null,
      handleAction: '',
      handleNotes: '',
      handleLoading: false,
      handleError: '',
      // Detail modal
      showDetailModal: false,
      detailData: null,
      detailLoading: false,
    }
  },
  computed: {
    maxPage() { return Math.max(1, Math.ceil(this.total / this.page_size)) }
  },
  created() { this.fetchList(1) },
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
    fmtTime,
    typeText(type) {
      const map = { video: '视频', comment: '评论', user: '用户' }
      return map[type] || type
    },
    statusText(status) {
      const map = { pending: '待处理', resolved: '已解决', escalated: '已升级' }
      return map[status] || status
    },
    actionText(action) {
      const map = {
        dismiss: '驳回',
        warn: '警告',
        delete_content: '删除内容',
        ban_user: '封禁用户',
        ban_temp: '暂时封禁',
        escalate: '升级',
      }
      return map[action] || action
    },
    toggleActions(r){
      this.actionOpenId = (this.actionOpenId===r.id ? '' : r.id)
      if (this.actionOpenId) {
        this.$nextTick(() => {
          try {
            const el = this.$refs['dd_'+r.id]
            if (!el) { this.dropUpId=''; return }
            const rect = el.getBoundingClientRect()
            const spaceBelow = (window.innerHeight || document.documentElement.clientHeight) - rect.bottom
            this.dropUpId = spaceBelow < 220 ? r.id : ''
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
          order: this.order,
        }
        if (this.status) params.status = this.status
        if (this.target_type) params.target_type = this.target_type
        if (this.reporter_id) params.reporter_id = this.reporter_id
        if (this.target_id) params.target_id = this.target_id
        const r = await adminApi.listReports(params)
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
    openHandle(r, action) {
      this.handleReportData = r
      this.handleAction = action
      this.handleNotes = ''
      this.handleError = ''
      this.showHandleModal = true
      this.actionOpenId = ''
    },
    closeHandleModal() {
      this.showHandleModal = false
      this.handleReportData = null
      this.handleAction = ''
      this.handleNotes = ''
      this.handleError = ''
    },
    async confirmHandle() {
      if (!this.handleReportData) return
      this.handleLoading = true
      this.handleError = ''
      try {
        await adminApi.handleReport(this.handleReportData.id, this.handleAction, this.handleNotes)
        this.closeHandleModal()
        await this.fetchList(this.page)
      } catch (e) {
        this.handleError = (e && e.data && e.data.detail) || e.message || '处理失败'
      } finally {
        this.handleLoading = false
      }
    },
    async viewDetail(r) {
      this.showDetailModal = true
      this.detailLoading = true
      this.detailData = null
      this.actionOpenId = ''
      try {
        this.detailData = await adminApi.getReport(r.id)
      } catch (e) {
        this.detailData = null
      } finally {
        this.detailLoading = false
      }
    },
    closeDetailModal() {
      this.showDetailModal = false
      this.detailData = null
    },
  }
}
</script>

<style scoped>
.err { color: #dc2626; }
.loading { text-align: center; padding: 20px; color: #6b7280; }
.text-muted { color: #9ca3af; }
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
.pagination { display:flex; justify-content:center; align-items:center; gap:10px; padding: 12px 0; }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.badge.video { background: #dbeafe; color: #1d4ed8; }
.badge.comment { background: #dcfce7; color: #15803d; }
.badge.user { background: #f3e8ff; color: #7c3aed; }
.badge.pending { background: #fef3c7; color: #b45309; }
.badge.resolved { background: #d1fae5; color: #065f46; }
.badge.escalated { background: #fee2e2; color: #991b1b; }

.target-info { min-width: 0; }
.target-info .sub { color: #6b7280; font-size: 12px; margin-top: 2px; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}
.modal.detail-modal {
  max-width: 600px;
}
.modal h3 { margin: 0 0 16px; font-size: 18px; }
.modal h4 { margin: 16px 0 8px; font-size: 14px; color: #374151; }
.modal textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  resize: vertical;
  margin-top: 12px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.modal-actions button {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
}
.modal-actions button.primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.modal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-content .section {
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
  margin-top: 12px;
}
.detail-content .section:first-child {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
.detail-content p {
  margin: 6px 0;
  font-size: 14px;
}
.action-item {
  border-top: 1px solid #f3f4f6;
  padding-top: 8px;
  margin-top: 8px;
}
</style>

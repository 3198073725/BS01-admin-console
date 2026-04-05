<template>
  <div id="app">
    <header class="topbar" v-if="!isLogin">
      <div class="brand">VidSprout 管理后台</div>
      <div class="spacer"></div>
      <span v-if="isSwitched" class="switch-badge">已切换用户</span>
      <button class="btn secondary" v-if="canSwitchUser && !isSwitched" @click="openSwitchUser">切换用户</button>
      <button class="btn secondary" v-if="isSwitched" @click="exitSwitchUser">退出切换</button>
      <button class="btn" @click="onLogout">退出</button>
    </header>
    <div v-if="!isLogin" class="layout">
      <aside class="sidenav">
        <router-link to="/analytics">主页面</router-link>
        <router-link to="/users">用户</router-link>
        <router-link to="/videos">视频</router-link>
        <router-link to="/comments">评论</router-link>
        <router-link to="/reports">举报管理</router-link>
        <router-link to="/announcements">系统通知</router-link>
        <router-link to="/audit">审计</router-link>
        <router-link to="/categories">分类</router-link>
        <router-link to="/tags">标签</router-link>
        <router-link to="/system">系统管理</router-link>
        <router-link v-if="showApiBase" to="/api-base">API 地址</router-link>
      </aside>
      <main class="container content">
        <router-view />
      </main>
    </div>
    <main v-else class="container">
      <router-view />
    </main>

    <!-- Switch User Modal -->
    <div v-if="showSwitchModal" class="modal-mask" @click.self="showSwitchModal = false">
      <div class="modal">
        <!-- Step 1: Admin Auth -->
        <div v-if="switchStep === 'auth'">
          <h3>切换用户 - 验证管理员身份</h3>
          <p class="hint">请输入您的管理员凭据</p>
          <div class="form">
            <label>管理员用户名</label>
            <input v-model="switchAdminUsername" placeholder="请输入管理员用户名" />
            <label>管理员密码</label>
            <input v-model="switchAdminPassword" type="password" placeholder="请输入管理员密码" />
            <button class="btn primary" :disabled="switchLoading" @click="confirmSwitchAuth">
              {{ switchLoading ? '验证中...' : '下一步' }}
            </button>
            <button class="btn secondary" @click="showSwitchModal = false">取消</button>
          </div>
        </div>
        
        <!-- Step 2: Select User -->
        <div v-else-if="switchStep === 'select'">
          <h3>选择要切换到的用户</h3>
          <p class="hint">共 {{ switchUsers.length }} 个用户可切换</p>
          <div class="user-list">
            <div v-for="u in switchUsers" :key="u.id" class="user-item" @click="doSwitchUser(u.id)">
              <span class="username">{{ u.username }}</span>
              <span v-if="u.nickname" class="nickname">({{ u.nickname }})</span>
              <span v-if="u.is_staff" class="badge">管理员</span>
            </div>
          </div>
          <div class="form" style="margin-top: 12px;">
            <button class="btn secondary" @click="switchStep = 'auth'">返回</button>
            <button class="btn secondary" @click="showSwitchModal = false">取消</button>
          </div>
        </div>
        <p v-if="switchError" class="err">{{ switchError }}</p>
      </div>
    </div>
  </div>
  
</template>

<script>
import { http } from './lib/http'
import { adminApi } from './lib/admin'

export default {
  name: 'App',
  data() {
    return {
      me: null,
      showSwitchModal: false,
      switchStep: 'auth', // 'auth' | 'select'
      switchAdminUsername: '',
      switchAdminPassword: '',
      switchUsers: [],
      switchLoading: false,
      switchError: '',
    }
  },
  computed: {
    isLogin() {
      try { return this.$route && this.$route.name === 'login' } catch (e) { return false }
    },
    isSwitched() {
      try {
        return localStorage.getItem('admin:switched') === '1'
      } catch (e) { return false }
    },
    canSwitchUser() {
      try {
        return this.me && this.me.admin_role === 'super_admin'
      } catch (e) { return false }
    },
    showApiBase() {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('admin:show_api_base') : null
        if (saved !== null && saved !== undefined && String(saved).length) {
          return !['0', 'false', 'no', 'off'].includes(String(saved).trim().toLowerCase())
        }
        const v = (process && process.env && process.env.VUE_APP_SHOW_API_BASE) ? String(process.env.VUE_APP_SHOW_API_BASE) : 'true'
        return !['0', 'false', 'no', 'off'].includes(v.trim().toLowerCase())
      } catch (e) {
        return true
      }
    }
  },
  created() {
    this.loadMe()
  },
  methods: {
    async loadMe() {
      try {
        this.me = await adminApi.adminMe()
      } catch (e) {
        this.me = null
      }
    },
    onLogout() {
      http.clearTokens()
      localStorage.removeItem('admin:switched')
      localStorage.removeItem('admin:original_token')
      this.$router.replace({ name: 'login' })
    },
    openSwitchUser() {
      this.switchStep = 'auth'
      this.switchAdminUsername = ''
      this.switchAdminPassword = ''
      this.switchUsers = []
      this.switchError = ''
      this.showSwitchModal = true
    },
    async confirmSwitchAuth() {
      if (!this.switchAdminUsername || !this.switchAdminPassword) {
        this.switchError = '请输入管理员用户名和密码'
        return
      }
      this.switchLoading = true
      this.switchError = ''
      try {
        // 验证管理员凭据并获取可切换用户列表
        const res = await adminApi.switchUser({
          admin_username: this.switchAdminUsername,
          admin_password: this.switchAdminPassword
        })
        this.switchUsers = res.users || []
        this.switchStep = 'select'
      } catch (e) {
        this.switchError = (e && e.data && e.data.detail) || e.message || '验证失败'
      } finally {
        this.switchLoading = false
      }
    },
    async doSwitchUser(userId) {
      this.switchLoading = true
      this.switchError = ''
      try {
        // 保存当前token
        const currentToken = http.getTokens()
        localStorage.setItem('admin:original_token', JSON.stringify(currentToken))
        
        // 执行切换
        const res = await adminApi.switchUser({
          admin_username: this.switchAdminUsername,
          admin_password: this.switchAdminPassword,
          target_user_id: userId
        })
        
        // 设置新token
        http.setTokens({ access: res.access, refresh: res.refresh })
        localStorage.setItem('admin:switched', '1')
        
        this.showSwitchModal = false
        alert(`已切换到用户: ${res.user.username}`)
        window.location.reload()
      } catch (e) {
        this.switchError = (e && e.data && e.data.detail) || e.message || '切换失败'
      } finally {
        this.switchLoading = false
      }
    },
    exitSwitchUser() {
      try {
        // 恢复原始管理员token
        const originalToken = localStorage.getItem('admin:original_token')
        if (originalToken) {
          const tokens = JSON.parse(originalToken)
          http.setTokens(tokens)
        }
        localStorage.removeItem('admin:switched')
        localStorage.removeItem('admin:original_token')
        alert('已退出切换用户模式')
        window.location.reload()
      } catch (e) {
        alert('退出失败，请重新登录')
        this.onLogout()
      }
    }
  }
}
</script>

<style>
* { box-sizing: border-box; }
body { margin: 0; background: #f3f4f6; overflow-y: scroll; }
#app { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif; color: #111827; }
.topbar { display: flex; align-items: center; gap: 16px; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; background: linear-gradient(180deg, #ffffff, #fafafa); position: sticky; top: 0; z-index: 20; backdrop-filter: saturate(120%) blur(4px); height: 56px; box-sizing: border-box; }
.brand { font-weight: 700; letter-spacing: .2px; color: #111827; }
.nav a { margin-right: 8px; text-decoration: none; color: #374151; padding: 6px 10px; border-radius: 8px; }
.nav a:hover { background: #eef2ff; color: #1d4ed8; }
.nav a.router-link-active { background: #dbeafe; color: #1d4ed8; font-weight: 600; }
.spacer { flex: 1; }
.btn { background: #ef4444; border: none; color: #fff; padding: 8px 14px; border-radius: 8px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
.btn:hover { background: #dc2626; }
.btn.secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.btn.secondary:hover { background: #e5e7eb; }
.switch-badge { background: #dbeafe; color: #1d4ed8; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }

/* Modal styles */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 90%; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); max-height: 80vh; overflow-y: auto; }
.modal h3 { margin: 0 0 8px; font-size: 18px; }
.modal .hint { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
.modal .form { display: flex; flex-direction: column; gap: 12px; }
.modal .form label { font-size: 13px; font-weight: 500; color: #374151; }
.modal .form input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
.modal .form .btn { width: 100%; margin-top: 8px; }
.modal .err { color: #dc2626; font-size: 13px; margin-top: 12px; }

/* User list in modal */
.user-list { max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
.user-item { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.user-item:hover { background: #f9fafb; }
.user-item:last-child { border-bottom: none; }
.user-item .username { font-weight: 500; color: #111827; }
.user-item .nickname { color: #6b7280; font-size: 13px; }
.user-item .badge { background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: auto; }

.container { padding: 20px; max-width: 1200px; margin: 0 auto; }

/* Cards */
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; background: #fff; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }

/* Inputs */
input, select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; }
input:focus, select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }

/* Buttons */
button { padding: 8px 12px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; transition: all .15s ease; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
button:hover { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,.06); }
button:disabled { opacity: .6; cursor: not-allowed; transform: none; box-shadow: none; }
button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
button.primary:hover { background: #1e40af; border-color: #1e40af; }
button.secondary { background: #f3f4f6; color: #4b5563; border-color: #e5e7eb; }
button.secondary:hover { background: #e5e7eb; border-color: #d1d5db; }
button.danger { background: #ef4444; color: #fff; border-color: #ef4444; }
button.danger:hover { background: #b91c1c; border-color: #b91c1c; }

/* Tables */
table { border-collapse: separate; border-spacing: 0; width: 100%; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
thead th { background: #f9fafb; color: #374151; text-transform: none; letter-spacing: 0; font-weight: 600; }
th, td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: left; }
tbody tr:hover { background: #f8fafc; }
tbody tr:last-child td { border-bottom: 0; }

/* Pagination */
.pagination { margin-top: 14px; display: flex; justify-content: center; align-items: center; gap: 10px; padding: 12px 0; }

/* 隐藏所有滚动条 */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
*::-webkit-scrollbar {
  display: none;
}

/* Layout with sidebar */
.layout { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: start; max-width: 1400px; margin: 16px auto; padding: 0 16px; }
.sidenav { position: sticky; top: 72px; align-self: start; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,.04); max-height: calc(100vh - 88px); }
.sidenav a { display: block; padding: 10px 12px; border-radius: 8px; color: #374151; text-decoration: none; margin: 4px 0; }
.sidenav a:hover { background: #eef2ff; color: #1d4ed8; }
.sidenav a.router-link-active { background: #dbeafe; color: #1d4ed8; font-weight: 600; }
.content { max-width: unset; width: 100%; }
.page { width: 100%; }
</style>

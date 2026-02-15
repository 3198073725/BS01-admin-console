<template>
  <div id="app">
    <header class="topbar" v-if="!isLogin">
      <div class="brand">VidSprout 管理后台</div>
      <div class="spacer"></div>
      <button class="btn" @click="onLogout">退出</button>
    </header>
    <div v-if="!isLogin" class="layout">
      <aside class="sidenav">
        <router-link to="/analytics">主页面</router-link>
        <router-link to="/users">用户</router-link>
        <router-link to="/videos">视频</router-link>
        <router-link to="/comments">评论</router-link>
        <router-link to="/announcements">系统通知</router-link>
        <router-link to="/audit">审计</router-link>
        <router-link to="/categories">分类</router-link>
        <router-link to="/tags">标签</router-link>
      </aside>
      <main class="container content">
        <router-view />
      </main>
    </div>
    <main v-else class="container">
      <router-view />
    </main>
  </div>
  
</template>

<script>
import { http } from './lib/http'
export default {
  name: 'App',
  computed: {
    isLogin() {
      try { return this.$route && this.$route.name === 'login' } catch (e) { return false }
    }
  },
  methods: {
    onLogout() {
      http.clearTokens()
      this.$router.replace({ name: 'login' })
    }
  }
}
</script>

<style>
* { box-sizing: border-box; }
body { margin: 0; background: #f3f4f6; }
#app { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif; color: #111827; }
.topbar { display: flex; align-items: center; gap: 16px; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; background: linear-gradient(180deg, #ffffff, #fafafa); position: sticky; top: 0; z-index: 20; backdrop-filter: saturate(120%) blur(4px); }
.brand { font-weight: 700; letter-spacing: .2px; color: #111827; }
.nav a { margin-right: 8px; text-decoration: none; color: #374151; padding: 6px 10px; border-radius: 8px; }
.nav a:hover { background: #eef2ff; color: #1d4ed8; }
.nav a.router-link-active { background: #dbeafe; color: #1d4ed8; font-weight: 600; }
.spacer { flex: 1; }
.btn { background: #ef4444; border: none; color: #fff; padding: 8px 14px; border-radius: 8px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
.btn:hover { background: #dc2626; }
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

/* Layout with sidebar */
.layout { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: start; max-width: 1400px; margin: 16px auto; padding: 0 16px; }
.sidenav { position: sticky; top: 64px; align-self: start; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.sidenav a { display: block; padding: 10px 12px; border-radius: 8px; color: #374151; text-decoration: none; margin: 4px 0; }
.sidenav a:hover { background: #eef2ff; color: #1d4ed8; }
.sidenav a.router-link-active { background: #dbeafe; color: #1d4ed8; font-weight: 600; }
.content { max-width: unset; width: 100%; }
</style>

<template>
  <div id="app">
    <header class="topbar">
      <div class="brand">BS01 管理后台</div>
      <nav class="nav">
        <router-link to="/users">用户</router-link>
        <router-link to="/videos">视频</router-link>
        <router-link to="/comments">评论</router-link>
      </nav>
      <div class="spacer"></div>
      <button class="btn" @click="onLogout">退出</button>
    </header>
    <main class="container">
      <router-view />
    </main>
  </div>
  
</template>

<script>
import { http } from './lib/http'
export default {
  name: 'App',
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
body { margin: 0; }
#app { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif; color: #1f2937; }
.topbar { display: flex; align-items: center; gap: 16px; padding: 10px 16px; border-bottom: 1px solid #e5e7eb; background: #fff; position: sticky; top: 0; z-index: 10; }
.brand { font-weight: 600; }
.nav a { margin-right: 12px; text-decoration: none; color: #374151; }
.nav a.router-link-active { color: #2563eb; font-weight: 600; }
.spacer { flex: 1; }
.btn { background: #ef4444; border: none; color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
.btn:hover { background: #dc2626; }
.container { padding: 16px; }
table { border-collapse: collapse; width: 100%; }
th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
input, select { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
button { padding: 6px 10px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
button.danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.pagination { margin-top: 12px; display: flex; gap: 8px; align-items: center; }
</style>

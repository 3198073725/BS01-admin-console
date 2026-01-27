<template>
  <div class="login-wrap">
    <h2>管理员登录</h2>
    <form @submit.prevent="onSubmit" class="form">
      <label>
        用户名
        <input v-model.trim="username" placeholder="用户名" autocomplete="username" />
      </label>
      <label>
        密码
        <input v-model="password" type="password" placeholder="密码" autocomplete="current-password" />
      </label>
      <button class="primary" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
      <p v-if="error" class="err">{{ error }}</p>
    </form>
  </div>
</template>

<script>
import { adminApi } from '../lib/admin'
import { http } from '../lib/http'

export default {
  name: 'AdminLogin',
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      error: '',
    }
  },
  methods: {
    async onSubmit() {
      this.error = ''
      if (!this.username || !this.password) {
        this.error = '请输入用户名与密码'
        return
      }
      this.loading = true
      try {
        const r = await adminApi.login(this.username, this.password)
        http.setTokens(r.access, r.refresh)
        // 校验管理员
        const ok = await adminApi.isAdmin()
        if (!ok) {
          this.error = '当前账户不是管理员'
          http.clearTokens()
          return
        }
        const redirect = this.$route.query.redirect || '/users'
        this.$router.replace(String(redirect))
      } catch (e) {
        this.error = (e && e.data && e.data.detail) || e.message || '登录失败'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-wrap { max-width: 360px; margin: 80px auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 10px; background: #fff; }
.form { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 6px; text-align: left; }
.err { color: #dc2626; margin: 6px 0 0; }
</style>

<template>
  <div class="login-wrap">
    <div class="login-card">
      <!-- 头部图标与标题 -->
      <div class="login-header">
        <div class="icon-circle">
          <!-- 锁图标 SVG -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2.5" />
            <path d="M8 11V7a4 4 0 1 1 8 0v4" />
            <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h2>管理员登录</h2>
        <p class="subtitle">请输入您的凭据以继续</p>
      </div>

      <!-- 登录表单（与原版完全一致的事件与方法绑定） -->
      <form @submit.prevent="onSubmit" class="form">
        <label>
          用户名
          <input v-model.trim="username" placeholder="请输入用户名" autocomplete="username" />
        </label>
        <label>
          密码
          <input v-model="password" type="password" placeholder="请输入密码" autocomplete="current-password" />
        </label>
        <button class="primary" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <p v-if="error" class="err">{{ error }}</p>
      </form>
    </div>
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
        const redirect = this.$route.query.redirect || '/analytics'
        this.$router.replace(String(redirect))
      } catch (e) {
        const st = Number(e && e.status || 0)
        if (st === 401) {
          this.error = '用户名或密码错误'
        } else if (st === 429) {
          const cd = (e && e.data && (e.data.cool_down_seconds || e.data.cooldown || e.data.cool_down))
          this.error = cd ? `尝试过于频繁，请${cd}s后再试` : '尝试过于频繁，请稍后再试'
        } else {
          this.error = (e && e.data && e.data.detail) || e.message || '登录失败'
        }
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
/* ========== 全屏背景容器 ========== */
.login-wrap {
  min-height: 100vh;
   min-height: 100dvh; /*移动端动态视口 */
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0; 
  padding: 20px;
  box-sizing: border-box;
  /* 柔和渐变背景 + 光斑装饰 */
  /* background:
    radial-gradient(ellipse at 15% 40%, rgba(99, 102, 241, 0.1) 0%, transparent 55%),
    radial-gradient(ellipse at 78% 65%, rgba(79, 70, 229, 0.07) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 20%, rgba(129, 140, 248, 0.06) 0%, transparent 50%),
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 40%, #e8ecf3 100%); */
  position: relative;
  overflow: hidden;
}

/* 背景装饰网格点阵 */
.login-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(148, 163, 184, 0.18) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
}

/* ========== 登录卡片 ========== */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 20px;
  padding: 40px 36px 36px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 6px 24px rgba(0, 0, 0, 0.06),
    0 20px 50px rgba(0, 0, 0, 0.05);
  animation: cardEnter 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  transition: box-shadow 0.4s ease;
}

.login-card:hover {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.05),
    0 8px 30px rgba(0, 0, 0, 0.08),
    0 24px 58px rgba(0, 0, 0, 0.06);
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ========== 卡片头部 ========== */
.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-header .icon-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  margin-bottom: 16px;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.12);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.login-card:hover .icon-circle {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.18);
}

.login-header .icon-circle svg {
  width: 26px;
  height: 26px;
  color: #4f46e5;
}

.login-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.01em;
  margin: 0;
}

.login-header .subtitle {
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 6px;
  font-weight: 400;
}

/* ========== 表单 ========== */
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.01em;
  transition: color 0.2s ease;
}

.form label:focus-within {
  color: #4f46e5;
}

/* 输入框 */
.form input {
  width: 100%;
  padding: 13px 16px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #1e293b;
  background: #f8fafc;
  border: 2px solid #e8ecf1;
  border-radius: 10px;
  outline: none;
  transition: all 0.25s ease;
  letter-spacing: 0.01em;
  line-height: 1.5;
}

.form input::placeholder {
  color: #bcc5d1;
  font-weight: 400;
  transition: color 0.25s ease;
}

.form input:hover {
  border-color: #cbd5e1;
  background: #fafbfc;
}

.form input:focus {
  border-color: #4f46e5;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
}

.form input:focus::placeholder {
  color: #c7d2de;
}

/* 覆盖浏览器自动填充样式 */
.form input:-webkit-autofill,
.form input:-webkit-autofill:hover,
.form input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 30px #f8fafc inset !important;
  box-shadow: 0 0 0 30px #f8fafc inset !important;
  -webkit-text-fill-color: #1e293b !important;
  border-color: #e8ecf1 !important;
  transition: background-color 5000s ease-in-out 0s;
}
.form input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
  box-shadow: 0 0 0 30px #ffffff inset !important;
  border-color: #4f46e5 !important;
}

/* ========== 登录按钮 ========== */
.form button.primary {
  margin-top: 6px;
  padding: 14px 20px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 0.02em;
  color: #ffffff;
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3), 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
  position: relative;
  overflow: hidden;
  line-height: 1.4;
}

/* 按钮光泽扫过效果 */
.form button.primary::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.13) 45%,
    rgba(255, 255, 255, 0.18) 50%,
    rgba(255, 255, 255, 0.13) 55%,
    transparent 100%
  );
  transition: left 0.7s ease;
}

.form button.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #5b52f0 0%, #4a40d9 100%);
  box-shadow: 0 7px 22px rgba(79, 70, 229, 0.38), 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.form button.primary:hover:not(:disabled)::after {
  left: 100%;
}

.form button.primary:active:not(:disabled) {
  transform: translateY(0) scale(0.985);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.28), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.1s ease;
}

.form button.primary:disabled {
  background: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transform: none;
  animation: pulseDisabled 1.8s ease-in-out infinite;
}

.form button.primary:disabled::after {
  display: none;
}

@keyframes pulseDisabled {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 0.55; }
}

/* ========== 错误提示 ========== */
.err {
  background: #fef2f2;
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 11px 15px;
  border-radius: 8px;
  margin: 4px 0 0;
  border-left: 3px solid #f87171;
  animation: errShake 0.45s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.5;
}

/* 错误图标 */
.err::before {
  content: '⚠';
  font-size: 1rem;
  flex-shrink: 0;
}

@keyframes errShake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-6px); }
  30% { transform: translateX(5px); }
  45% { transform: translateX(-4px); }
  60% { transform: translateX(3px); }
  75% { transform: translateX(-1px); }
  90% { transform: translateX(1px); }
}

/* ========== 响应式适配 ========== */
@media (max-width: 480px) {
  .login-card {
    padding: 30px 22px 28px;
    border-radius: 16px;
    max-width: 100%;
  }
  .login-header h2 {
    font-size: 1.3rem;
  }
  .login-header .icon-circle {
    width: 48px;
    height: 48px;
  }
  .login-header .icon-circle svg {
    width: 22px;
    height: 22px;
  }
  .form input {
    padding: 12px 14px;
    font-size: 0.9rem;
    border-radius: 8px;
  }
  .form button.primary {
    padding: 13px 18px;
    font-size: 0.95rem;
    border-radius: 8px;
  }
  .err {
    font-size: 0.8rem;
    padding: 10px 12px;
  }
}

@media (max-width: 360px) {
  .login-wrap {
    padding: 12px;
  }
  .login-card {
    padding: 24px 16px 22px;
    border-radius: 14px;
  }
  .form {
    gap: 14px;
  }
}
</style>
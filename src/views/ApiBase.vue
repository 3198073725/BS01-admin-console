<template>
  <div>
    <div class="toolbar">
      <div style="font-weight:600">API 地址</div>
      <div style="flex:1"></div>
      <button @click="reload">刷新页面</button>
    </div>

    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;box-shadow:0 1px 2px rgba(0,0,0,.04)">
      <div style="display:grid;grid-template-columns:160px 1fr;gap:12px;align-items:center">
        <div>当前生效 API_BASE</div>
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;color:#111827">
          {{ effectiveBase || '-' }}
        </div>

        <div>自定义 api_base</div>
        <input v-model.trim="apiBase" placeholder="例如 http://127.0.0.1:8000" />

        <div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="primary" :disabled="!apiBase" @click="save">保存并刷新</button>
          <button :disabled="!hasSaved" @click="reset">重置为自动推导并刷新</button>
        </div>

        <div>说明</div>
        <div style="color:#6b7280;line-height:1.6">
          保存后会写入浏览器 localStorage 的 <span style="font-family:ui-monospace">api_base</span>，优先级高于 window.__API_BASE__ 与域名推导。
          用于在虚拟机与服务器之间快速切换后端。
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { http } from '../lib/http'

export default {
  name: 'ApiBaseSettings',
  data() {
    return {
      apiBase: '',
      effectiveBase: '',
      hasSaved: false,
    }
  },
  created() {
    try {
      this.apiBase = localStorage.getItem('api_base') || ''
      this.hasSaved = !!this.apiBase
    } catch (e) {
      this.apiBase = ''
      this.hasSaved = false
    }
    this.effectiveBase = http.API_BASE || ''
  },
  methods: {
    save() {
      const v = String(this.apiBase || '').trim()
      if (!/^https?:\/\//i.test(v)) {
        alert('请输入以 http:// 或 https:// 开头的完整地址')
        return
      }
      try {
        localStorage.setItem('api_base', v.replace(/\/$/, ''))
      } catch (e) {
        alert('保存失败：无法写入 localStorage')
        return
      }
      this.reload()
    },
    reset() {
      try {
        localStorage.removeItem('api_base')
      } catch (e) {
        void e
      }
      this.reload()
    },
    reload() {
      try {
        location.reload()
      } catch (e) {
        void e
      }
    }
  }
}
</script>

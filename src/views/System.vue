<template>
  <div class="page system-settings">
    <div class="toolbar">
      <div class="page-title">系统设置</div>
      <div class="spacer"></div>
      <button class="secondary" :disabled="loading" @click="fetchConfig">
        <span class="icon">↻</span> 刷新
      </button>
      <button class="primary" :disabled="loading || !changed" @click="saveConfig">
        <span class="icon">✓</span> 保存修改
      </button>
    </div>

    <div v-if="loading" class="loading-box">加载中...</div>

    <div v-else class="settings-container">
      <!-- 左侧分类导航 -->
      <div class="settings-sidebar">
        <div
          v-for="(cat, key) in categories"
          :key="key"
          class="nav-item"
          :class="{ active: activeCategory === key }"
          @click="activeCategory = key"
        >
          {{ cat.label }}
        </div>
        <div class="nav-divider"></div>
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'featured' }"
          @click="activeCategory = 'featured'"
        >
          热门推荐
        </div>
      </div>

      <!-- 右侧设置表单 -->
      <div class="settings-content">
        <div v-for="(cat, catKey) in categories" :key="catKey" v-show="activeCategory === catKey">
          <h2>{{ cat.label }}</h2>
          
          <div class="settings-form">
            <div
              v-for="(setting, key) in cat.settings"
              :key="key"
              class="form-item"
            >
              <label class="form-label">
                {{ setting.label }}
                <span v-if="setting.help" class="help-icon" :title="setting.help">?</span>
              </label>
              
              <!-- 布尔类型 -->
              <div v-if="setting.type === 'bool'" class="form-control">
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="values[key]"
                    @change="markChanged"
                  />
                  <span class="slider"></span>
                </label>
                <span class="switch-label">{{ values[key] ? '开启' : '关闭' }}</span>
              </div>
              
              <!-- 选择类型 -->
              <select
                v-else-if="setting.type === 'select'"
                v-model="values[key]"
                @change="markChanged"
                class="form-control"
              >
                <option v-for="opt in setting.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              
              <!-- 数字类型 -->
              <input
                v-else-if="setting.type === 'int'"
                type="number"
                v-model.number="values[key]"
                @input="markChanged"
                class="form-control"
                :placeholder="setting.default"
              />
              
              <!-- 字符串类型 -->
              <input
                v-else
                type="text"
                v-model="values[key]"
                @input="markChanged"
                class="form-control"
                :placeholder="setting.default"
              />
              
              <p v-if="setting.help" class="form-help">{{ setting.help }}</p>
            </div>
          </div>
        </div>

        <!-- 热门推荐设置 -->
        <div v-show="activeCategory === 'featured'">
          <h2>热门推荐</h2>
          <div class="settings-form">
            <div class="form-item">
              <label class="form-label">推荐视频ID列表</label>
              <div class="form-control">
                <textarea
                  v-model="featuredVideoIds"
                  rows="5"
                  placeholder="每行一个视频ID，例如：&#10;abc123&#10;def456&#10;ghi789"
                  class="form-textarea"
                ></textarea>
              </div>
              <p class="form-help">输入要展示在热门推荐区的视频ID，每行一个，按优先级排序</p>
            </div>
            <div class="form-item">
              <label class="form-label">显示数量</label>
              <div class="form-control">
                <input
                  type="number"
                  v-model.number="featuredLimit"
                  min="1"
                  max="20"
                  class="form-input"
                />
              </div>
              <p class="form-help">热门推荐区最多显示的视频数量（1-20）</p>
            </div>
          </div>
        </div>

        <!-- 版本信息 -->
        <div class="version-box">
          <p>当前配置版本: <code>{{ version || '未发布' }}</code></p>
          <p class="hint">配置变更即时生效，完整功能请刷新页面后体验。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { adminApi } from '../lib/admin'

export default {
  name: 'SystemSettings',
  data() {
    return {
      loading: false,
      activeCategory: 'site',
      categories: {},
      values: {},
      originalValues: {},
      version: 0,
      changed: false,
      // 热门推荐设置
      featuredVideoIds: '',
      featuredLimit: 10
    }
  },
  created() {
    this.fetchConfig()
  },
  methods: {
    async fetchConfig() {
      this.loading = true
      try {
        const data = await adminApi.getSystemSettings()
        this.categories = data
        
        // 提取所有配置值
        const values = {}
        Object.values(data).forEach(cat => {
          Object.entries(cat.settings).forEach(([key, setting]) => {
            values[key] = setting.value !== undefined ? setting.value : setting.default
          })
        })
        this.values = { ...values }
        this.originalValues = { ...values }
        this.changed = false
      } catch (e) {
        console.error('Fetch config failed:', e)
        alert('加载配置失败：' + (e.message || '未知错误'))
      } finally {
        this.loading = false
      }
    },
    markChanged() {
      this.changed = true
    },
    async saveConfig() {
      if (!confirm('确定要保存所有修改吗？')) return
      
      this.loading = true
      try {
        const res = await adminApi.updateSystemSettings(this.values)
        if (res.status === 'ok') {
          this.version = res.version
          this.originalValues = { ...this.values }
          this.changed = false
          alert('设置已保存！版本号: ' + res.version)
        }
      } catch (e) {
        console.error('Save config failed:', e)
        alert('保存失败：' + (e.message || '未知错误'))
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.system-settings {
  width: 100%;
}
.system-settings .page-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.5px;
}
.system-settings .spacer {
  flex: 1;
}

.system-settings .toolbar button.secondary {
  background: #f3f4f6;
  color: #4b5563;
  margin-right: 10px;
  border: none;
}
.system-settings .toolbar button.secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

/* 主按钮 - 保存 */
.system-settings .toolbar button.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  border: none;
}
.system-settings .toolbar button.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}
.system-settings .toolbar button.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 按钮加载动画 */
.system-settings .toolbar button:disabled .icon {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 设置容器布局 */
.settings-container {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  height: calc(100vh - 300px);
}

/* 左侧边栏 */
.settings-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 0;
}

/* 右侧内容 - 独立滚动 */
.settings-content {
  flex: 1;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  overflow-y: auto;
}

/* 左侧菜单 */
.nav-item {
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #4b5563;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}
.nav-item:hover {
  background: #f9fafb;
  color: #2563eb;
}
.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  border-left-color: #2563eb;
  font-weight: 500;
}

/* 右侧内容 */
.settings-content {
  flex: 1;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  min-height: 500px;
}
.settings-content h2 {
  margin: 0 0 24px 0;
  font-size: 18px;
  color: #1f2937;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

/* 表单样式 */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.help-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
}
.form-control {
  display: flex;
  align-items: center;
  gap: 12px;
}
.form-control input[type="text"],
.form-control input[type="number"],
.form-control select {
  flex: 1;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}
.form-control input:focus,
.form-control select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.form-help {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #6b7280;
}

/* Switch 开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
  transition: .3s;
  border-radius: 24px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
}
input:checked + .slider {
  background-color: #3b82f6;
}
input:checked + .slider:before {
  transform: translateX(20px);
}
.switch-label {
  font-size: 14px;
  color: #4b5563;
}

/* 版本信息 */
.version-box {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
}
.version-box code {
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  color: #2563eb;
  font-family: monospace;
}
.version-box .hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 8px;
}

.loading-box {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

/* 响应式 */
@media (max-width: 768px) {
  .settings-container {
    flex-direction: column;
  }
  .settings-sidebar {
    width: 100%;
    display: flex;
    overflow-x: auto;
    padding: 8px;
  }
  .nav-item {
    white-space: nowrap;
    border-left: none;
    border-bottom: 3px solid transparent;
  }
  .nav-item.active {
    border-left-color: transparent;
    border-bottom-color: #2563eb;
  }
}
</style>

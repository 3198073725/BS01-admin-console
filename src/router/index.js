import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Users from '../views/Users.vue'
import Videos from '../views/Videos.vue'
import Comments from '../views/Comments.vue'
import AuditLogs from '../views/AuditLogs.vue'
import Categories from '../views/Categories.vue'
import Tags from '../views/Tags.vue'
import Analytics from '../views/Analytics.vue'
import Announcements from '../views/Announcements.vue'
import { adminApi } from '../lib/admin'

const routes = [
  { path: '/login', name: 'login', component: Login },
  { path: '/', redirect: '/analytics' },
  { path: '/users', name: 'users', component: Users, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/videos', name: 'videos', component: Videos, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/comments', name: 'comments', component: Comments, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/audit', name: 'audit', component: AuditLogs, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/categories', name: 'categories', component: Categories, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/tags', name: 'tags', component: Tags, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/analytics', name: 'analytics', component: Analytics, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/announcements', name: 'announcements', component: Announcements, meta: { requiresAuth: true, requiresAdmin: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let adminChecked = false
let isAdminCache = false

router.beforeEach(async (to, from, next) => {
  const { getTokens } = await import('../lib/http')
  const hasToken = !!getTokens().access
  // 当进入登录页或未携带 token 时，重置 admin 校验缓存
  if (!hasToken || to.name === 'login') { adminChecked = false; isAdminCache = false }

  // 若已登录管理员，访问登录页则直接进入主页面
  if (to.name === 'login' && hasToken) {
    try {
      const ok = await adminApi.isAdmin()
      if (ok) return next({ name: 'analytics' })
    } catch (e) { void e }
  }
  if (to.meta.requiresAuth && !hasToken) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }
  if (to.meta.requiresAdmin) {
    try {
      if (!adminChecked) {
        isAdminCache = await adminApi.isAdmin()
        adminChecked = true
      }
      if (!isAdminCache) return next({ name: 'login', query: { reason: 'not_admin' } })
    } catch (e) {
      // 网络或 401 情况，回登录
      return next({ name: 'login' })
    }
  }
  return next()
})

export default router

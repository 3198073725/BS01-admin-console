import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Users from '../views/Users.vue'
import Videos from '../views/Videos.vue'
import Comments from '../views/Comments.vue'
import { adminApi } from '../lib/admin'

const routes = [
  { path: '/login', name: 'login', component: Login },
  { path: '/', redirect: '/users' },
  { path: '/users', name: 'users', component: Users, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/videos', name: 'videos', component: Videos, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/comments', name: 'comments', component: Comments, meta: { requiresAuth: true, requiresAdmin: true } },
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

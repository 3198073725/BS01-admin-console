import { http } from './http'

export const adminApi = {
  // Auth
  login(username, password) {
    return http.request('/api/token/', {
      method: 'POST',
      body: { username, password },
    });
  },
  me() {
    return http.request('/api/users/me/');
  },
  adminMe() {
    return http.request('/api/admin/me/');
  },
  // Admin probe: small request to verify IsAdminUser
  async isAdmin() {
    try {
      const me = await http.request('/api/admin/me/');
      return !!(me && (me.is_staff || me.is_superuser));
    } catch (e) {
      if (e && e.status === 403) return false;
      throw e;
    }
  },
  // Users
  listUsers(params) {
    return http.request('/api/admin/users/', { query: params || {} });
  },
  patchUser(id, payload) {
    return http.request(`/api/admin/users/${id}/`, { method: 'PATCH', body: payload });
  },
  forceLogoutUser(id) {
    return http.request(`/api/admin/users/${id}/force-logout/`, { method: 'POST' });
  },
  // Videos
  listVideos(params) {
    return http.request('/api/admin/videos/', { query: params || {} });
  },
  batchApproveVideos(ids, action = 'approve', reason = '') {
    return http.request('/api/admin/videos/batch-approve/', { method: 'POST', body: { video_ids: ids, action, reason } });
  },
  listTranscodeFailures(params) {
    return http.request('/api/admin/videos/transcode-failures/', { query: params || {} });
  },
  videosMetricsTrend(params) {
    return http.request('/api/admin/videos/metrics-trend/', { query: params || {} });
  },
  analyticsOverview(params) {
    return http.request('/api/admin/analytics/overview/', { query: params || {} });
  },
  retryTranscode(id) {
    return http.request(`/api/admin/videos/${id}/retry-transcode/`, { method: 'POST' });
  },
  getVideo(id) {
    return http.request(`/api/admin/videos/${id}/`);
  },
  patchVideo(id, payload) {
    return http.request(`/api/admin/videos/${id}/`, { method: 'PATCH', body: payload });
  },
  deleteVideo(id) {
    return http.request(`/api/admin/videos/${id}/`, { method: 'DELETE' });
  },
  bulkUpdateVideos(ids, payload) {
    return http.request('/api/admin/videos/bulk-update/', { method: 'POST', body: { video_ids: ids, ...(payload || {}) } });
  },
  bulkDeleteVideos(ids) {
    return http.request('/api/admin/videos/bulk-delete/', { method: 'POST', body: { video_ids: ids } });
  },
  // Comments
  listComments(params) {
    return http.request('/api/admin/comments/', { query: params || {} });
  },
  deleteComment(id) {
    return http.request(`/api/admin/comments/${id}/`, { method: 'DELETE' });
  },
  // Audit Logs
  listAuditLogs(params) {
    return http.request('/api/admin/audit-logs/', { query: params || {} });
  },
  // Categories
  listCategories(params) {
    return http.request('/api/admin/categories/', { query: params || {} });
  },
  createCategory(payload) {
    return http.request('/api/admin/categories/', { method: 'POST', body: payload });
  },
  updateCategory(id, payload) {
    return http.request(`/api/admin/categories/${id}/`, { method: 'PATCH', body: payload });
  },
  deleteCategory(id) {
    return http.request(`/api/admin/categories/${id}/`, { method: 'DELETE' });
  },
  // Tags
  listTags(params) {
    return http.request('/api/admin/tags/', { query: params || {} });
  },
  createTag(payload) {
    return http.request('/api/admin/tags/', { method: 'POST', body: payload });
  },
  updateTag(id, payload) {
    return http.request(`/api/admin/tags/${id}/`, { method: 'PATCH', body: payload });
  },
  deleteTag(id) {
    return http.request(`/api/admin/tags/${id}/`, { method: 'DELETE' });
  },
  bulkDeleteTags(ids) {
    return http.request('/api/admin/tags/bulk-delete/', { method: 'POST', body: { ids } });
  },
  mergeTags(payload) {
    return http.request('/api/admin/tags/merge/', { method: 'POST', body: payload });
  },
  // System Settings
  getSystemSettings() {
    return http.request('/api/configs/admin/list/');
  },
  updateSystemSettings(payload) {
    return http.request('/api/configs/admin/update/', { method: 'POST', body: payload });
  },
  listAnnouncements(params) {
    return http.request('/api/admin/announcements/', { query: params || {} });
  },
  createAnnouncement(payload) {
    return http.request('/api/admin/announcements/', { method: 'POST', body: payload || {} });
  },
  patchAnnouncement(id, payload) {
    return http.request(`/api/admin/announcements/${id}/`, { method: 'PATCH', body: payload || {} });
  },
  deleteAnnouncement(id) {
    return http.request(`/api/admin/announcements/${id}/`, { method: 'DELETE' });
  },
  // Reports
  listReports(params) {
    return http.request('/api/admin/reports/', { query: params || {} });
  },
  getReport(id) {
    return http.request(`/api/admin/reports/${id}/`);
  },
  handleReport(id, action, notes) {
    return http.request(`/api/admin/reports/${id}/handle/`, { method: 'POST', body: { action, notes } });
  },
  // Switch User - 直接登录到目标管理员账号
  switchUser({ target_username, target_password }) {
    return http.request('/api/admin/switch-user/', { 
      method: 'POST', 
      body: { 
        target_username, 
        target_password 
      } 
    });
  },
};

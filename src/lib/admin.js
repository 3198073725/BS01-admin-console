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
  // Admin probe: small request to verify IsAdminUser
  async isAdmin() {
    try {
      await http.request('/api/admin/users/', { query: { page_size: 1 } });
      return true;
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
  // Videos
  listVideos(params) {
    return http.request('/api/admin/videos/', { query: params || {} });
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
  // Comments
  listComments(params) {
    return http.request('/api/admin/comments/', { query: params || {} });
  },
  deleteComment(id) {
    // staff 可删除评论
    return http.request(`/api/interactions/comments/${id}/`, { method: 'DELETE' });
  },
};

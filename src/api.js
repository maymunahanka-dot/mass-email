const BASE = import.meta.env.VITE_BACKEND_URL;

function csHeaders() {
  const token = localStorage.getItem('csToken');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function req(path, options = {}) {
  const res  = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!data.success) {
    const err = new Error(data.error || 'Request failed');
    err.noPasswordSet = !!data.noPasswordSet;
    throw err;
  }
  return data;
}

// Auth
export const csGetStatus    = ()         => req('/api/cs-auth/status');
export const csSetPassword  = (password) => req('/api/cs-auth/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
export const csLogin        = (password) => req('/api/cs-auth/login',        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });

// Tickets
export const csGetTickets   = (status)   => req(`/api/admin/support-tickets/list${status ? `?status=${status}` : ''}`, { headers: csHeaders() });
export const csGetTicket    = (id)       => req(`/api/admin/support-tickets/${id}`,                                      { headers: csHeaders() });
export const csReply        = (id, text) => req(`/api/admin/support-tickets/${id}/messages`, { method: 'POST', headers: csHeaders(), body: JSON.stringify({ text }) });
export const csUpdateStatus = (id, status) => req(`/api/admin/support-tickets/${id}/status`, { method: 'PATCH', headers: csHeaders(), body: JSON.stringify({ status }) });

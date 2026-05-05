const API = '/api';

// ─── Token & User storage ──────────────────────────────────────────────────────
export const saveToken = (t) => localStorage.setItem('intdoc_token', t);
export const getToken = () => localStorage.getItem('intdoc_token');
export const removeToken = () => localStorage.removeItem('intdoc_token');
export const saveUser = (u) => localStorage.setItem('intdoc_user', JSON.stringify(u));
export const getUser = () => {
  const u = localStorage.getItem('intdoc_user');
  return u ? JSON.parse(u) : null;
};
export const removeUser = () => localStorage.removeItem('intdoc_user');

export const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const register = async (name, email, password) => {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed.');
  saveToken(data.token);
  saveUser(data.user);
  return data.user;
};

export const login = async (email, password) => {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed.');
  saveToken(data.token);
  saveUser(data.user);
  return data.user;
};

export const logout = () => {
  removeToken();
  removeUser();
};

export const fetchMe = async () => {
  if (!getToken()) return null;
  const res = await fetch(`${API}/auth/me`, { headers: authHeader() });
  if (!res.ok) {
    logout();
    return null;
  }
  const data = await res.json();
  saveUser(data.user);
  return data.user;
};

// ─── Document Analysis ─────────────────────────────────────────────────────────
export const analyzeDocument = async (textToAnalyze, filename, fileType, signal) => {
  const res = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ textToAnalyze, filename, fileType }),
    signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Analysis failed.');
  return data;
};

export const stopActivity = async () => {
  const res = await fetch(`${API}/activity/stop`, {
    method: 'PATCH',
    headers: authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to stop.');
  return data;
};


// ─── History ───────────────────────────────────────────────────────────────────
export const fetchHistory = async () => {
  const res = await fetch(`${API}/history`, { headers: authHeader(), cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch history.');
  return data.history;
};

export const saveQuizScore = async (historyId, score) => {
  const res = await fetch(`${API}/history/${historyId}/score`, {
    method: 'PATCH',
    headers: authHeader(),
    body: JSON.stringify({ score })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save score.');
  return data;
};

export const deleteHistory = async (id) => {
  const res = await fetch(`${API}/history/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete.');
  return data;
};

// ─── AI Chat ───────────────────────────────────────────────────────────────────
export const chatWithAI = async (question, context) => {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ question, context }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Chat failed.');
  return data.answer;
};

// ─── YouTube transcript ────────────────────────────────────────────────────────
export const extractVideo = async (videoUrl) => {
  const res = await fetch(`${API}/extract-video`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ videoUrl }),
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`Server returned an invalid response (Status: ${res.status}). Please try again later.`);
  }
  if (!res.ok) throw new Error(data.error || 'Operation failed.');
  return data.transcript;
};

// ─── Admin ─────────────────────────────────────────────────────────────────────
export const fetchAdminActivity = async () => {
  const res = await fetch(`${API}/admin/activity`, { headers: authHeader(), cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch activity.');
  return data.activities;
};

export const fetchAdminStats = async () => {
  const res = await fetch(`${API}/admin/stats`, { headers: authHeader(), cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch stats.');
  return data;
};

export const fetchAdminUsers = async (page = 1, limit = 20, search = '') => {
  const res = await fetch(`${API}/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, { 
    headers: authHeader(),
    cache: 'no-store'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch users.');
  return data; // Returns { users, total, page, pages }
};

export const fetchAllUserHistories = async () => {
  const res = await fetch(`${API}/admin/history`, { headers: authHeader(), cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch history.');
  return data.histories;
};

export const fetchAllChats = async () => {
  const res = await fetch(`${API}/admin/chats`, { headers: authHeader(), cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch chats.');
  return data.chats;
};

export const deleteAdminUser = async (id) => {
  const res = await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: authHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete user.');
  return data;
};

export const deleteAdminHistory = async (id) => {
  const res = await fetch(`${API}/admin/history/${id}`, { method: 'DELETE', headers: authHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete history.');
  return data;
};

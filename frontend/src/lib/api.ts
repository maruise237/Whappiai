import NProgress from 'nprogress';

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08
});

const getApiBaseUrl = () => {
  // Always prioritize environment variable for API URL (crucial for Dokploy/Production)
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (envApiUrl && envApiUrl.includes('://') && !envApiUrl.includes('://:')) {
    return envApiUrl.endsWith('/') 
      ? envApiUrl.slice(0, -1) 
      : envApiUrl;
  }

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    
    // If we are on port 3011 (Production Frontend), we need to point to port 3010 (Production Backend)
    if (port === '3011' && hostname) {
      return `${protocol}//${hostname}:3010`;
    }

    // Handle Dokploy/Production domains
    if (hostname) {
      // If we are on port 3011 (SaaS Frontend), we likely need port 3010 (SaaS Backend)
      if (port === '3011') return `${protocol}//${hostname}:3010`;

      // Subdomain routing (app -> api)
      if (hostname.startsWith('app.')) return `${protocol}//${hostname.replace('app.', 'api.')}`;
      if (hostname.startsWith('dashboard.')) return `${protocol}//${hostname.replace('dashboard.', 'api.')}`;

      // If there is NO port, we are on standard 80/443.
      // In same-domain setup (backend serving frontend), we just use the current origin.
      if (!port) return `${protocol}//${hostname}`;

      // If we have a port but it's not a known frontend dev port,
      // we assume the backend is on the same port (same-domain production).
      if (port !== '3005' && port !== '3001' && port !== '3000') {
          return `${protocol}//${hostname}:${port}`;
      }
    }

    // If we are on port 3005 or 3001 (Next.js dev server), we need to point to the backend (3000)
    if ((port === '3005' || port === '3001') && hostname) {
      return `${protocol}//${hostname}:3000`;
    }
  }

  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  if (typeof window !== 'undefined') {
    try { NProgress.start(); } catch (e) {}
  }
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    // We get the token from Clerk if available (this should be handled by the caller or a hook)
    // but for now we'll just allow passing it in options.headers
    
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...options.headers,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Unauthorized - handle redirect to login if needed
        // but Clerk middleware usually handles this
      }
      let errorMessage = res.statusText || "An error occurred";
      try {
        const error = await res.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {
        // If not JSON, use status text or default
      }
      throw new Error(errorMessage);
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      // If response is not JSON, but was ok, just return empty object
      return {};
    }
    return (data && data.data !== undefined) ? data.data : data;
  } finally {
    if (typeof window !== 'undefined') {
      try { NProgress.done(); } catch (e) {}
    }
  }
}

export const api = {
  get: (endpoint: string, token?: string) => fetchApi(endpoint, {
    method: "GET",
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  }),
  post: (endpoint: string, body: any, token?: string) => fetchApi(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  }),
  auth: {
    check: (token?: string) => fetchApi("/api/v1/me", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getWsToken: (token?: string) => fetchApi("/api/v1/ws-token", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  },
  credits: {
    get: (token?: string) => fetchApi("/api/v1/credits", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  },
  sessions: {
    list: (token?: string) => fetchApi("/api/v1/sessions", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    create: (sessionId: string, phoneNumber?: string, token?: string) => fetchApi("/api/v1/sessions", {
      method: "POST",
      body: JSON.stringify({ sessionId, phoneNumber }),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    delete: (sessionId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    resumeAI: (sessionId: string, jid: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/inbox/${jid}/resume`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    qr: (sessionId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/qr`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getAI: (sessionId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/ai`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    updateAI: (sessionId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/ai`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    testAI: (sessionId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/ai/test`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getGroups: (sessionId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getGroupSettings: (sessionId: string, groupId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups/${groupId}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    updateGroupSettings: (sessionId: string, groupId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups/${groupId}`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getEngagementTasks: (sessionId: string, groupId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups/${groupId}/engagement`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    addEngagementTask: (sessionId: string, groupId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups/${groupId}/engagement`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    updateEngagementTask: (taskId: number, data: any, token?: string) => fetchApi(`/api/v1/moderation/engagement/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    deleteEngagementTask: (taskId: number, token?: string) => fetchApi(`/api/v1/moderation/engagement/${taskId}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getEngagementHistory: (sessionId: string, groupId: string, params: any = {}, token?: string) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups/${groupId}/engagement/history?${query}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
    },
    // New Group Management Endpoints
    getGroupProfile: (sessionId: string, groupId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/groups/${groupId}/profile`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    updateGroupProfile: (sessionId: string, groupId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/groups/${groupId}/profile`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getGroupLinks: (sessionId: string, groupId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/groups/${groupId}/links`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    updateGroupLinks: (sessionId: string, groupId: string, links: any[], token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/groups/${groupId}/links`, {
      method: "POST",
      body: JSON.stringify({ links }),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    generateGroupMessage: (sessionId: string, groupId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/groups/${groupId}/ai-generate`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getKnowledge: (sessionId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/knowledge`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    addKnowledge: (sessionId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/knowledge`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    deleteKnowledge: (sessionId: string, docId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/knowledge/${docId}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getInbox: (sessionId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/inbox`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getChatHistory: (sessionId: string, jid: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/inbox/${jid}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    deleteChat: (sessionId: string, jid: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/inbox/${jid}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    deleteMessage: (sessionId: string, jid: string, messageId: number, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/inbox/${jid}/${messageId}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getWebhooks: (sessionId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/webhooks`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    addWebhook: (sessionId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/webhooks`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    deleteWebhook: (sessionId: string, webhookId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/webhooks/${webhookId}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getKeywords: (sessionId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/keywords`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    addKeyword: (sessionId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/keywords`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    updateKeyword: (sessionId: string, ruleId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/keywords/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    deleteKeyword: (sessionId: string, ruleId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/keywords/${ruleId}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  },
  messages: {
    send: (sessionId: string, data: any, token?: string) => fetchApi(`/api/v1/messages?sessionId=${sessionId}`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    upload: async (file: File, token?: string) => {
      NProgress.start();
      try {
        const formData = new FormData();
        formData.append("file", file);
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE_URL}/api/v1/media`, {
          method: "POST",
          body: formData,
          headers: headers,
          credentials: "include",
          // Don't set Content-Type, let the browser do it with boundary
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Upload failed");
        }
        return await res.json();
      } finally {
        NProgress.done();
      }
    },
  },
  users: {
    list: (token?: string) => fetchApi("/admin/users", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    create: (data: any, token?: string) => fetchApi("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    update: (email: string, data: any, token?: string) => fetchApi(`/admin/users/${email}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    delete: (id: string, token?: string) => fetchApi(`/admin/users/${id}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getProfile: (token?: string) => fetchApi("/admin/users/profile", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    updateProfile: (data: any, token?: string) => fetchApi("/admin/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    updateAIConfig: (data: any, token?: string) => fetchApi("/admin/users/profile/ai", {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  },
  payments: {
    getPlans: (token?: string) => fetchApi("/api/v1/payments/plans", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    checkout: (planId: string, token?: string) => fetchApi("/api/v1/payments/checkout", {
      method: "POST",
      body: JSON.stringify({ planId }),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  },
  ai: {
    listModels: (token?: string) => fetchApi("/api/v1/ai-models", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    admin: {
      list: (token?: string) => fetchApi("/api/v1/admin/ai-models", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      }),
      create: (data: any, token?: string) => fetchApi("/api/v1/admin/ai-models", {
        method: "POST",
        body: JSON.stringify(data),
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      }),
      update: (id: string, data: any, token?: string) => fetchApi(`/api/v1/admin/ai-models/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      }),
      delete: (id: string, token?: string) => fetchApi(`/api/v1/admin/ai-models/${id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      }),
    },
    getTemplates: (token?: string) => fetchApi("/api/v1/ai/templates", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  },
  activities: {
    list: (limit = 50, offset = 0, token?: string) => fetchApi(`/api/v1/activities?limit=${limit}&offset=${offset}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    summary: (days = 7, token?: string) => fetchApi(`/api/v1/activities/summary?days=${days}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    stats: (token?: string) => fetchApi("/api/v1/stats", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    analytics: (days = 7, token?: string) => fetchApi(`/api/v1/analytics?days=${days}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  },
  notifications: {
    list: (unreadOnly = false, token?: string) => fetchApi(`/api/v1/notifications?unread=${unreadOnly}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    markAsRead: (id: string, token?: string) => fetchApi(`/api/v1/notifications/${id}/read`, {
      method: "PUT",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    markAllAsRead: (token?: string) => fetchApi("/api/v1/notifications/read-all", {
      method: "PUT",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  }
};

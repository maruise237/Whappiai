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
    // We check for hostname to be valid (not empty)
    if (port === '3011' && hostname) {
      return `${protocol}//${hostname}:3010`;
    }

    // If we are on port 3005 or 3001 (Next.js dev server), we need to point to the backend (3000)
    if ((port === '3005' || port === '3001') && hostname) {
      return `${protocol}//${hostname}:3000`;
    }
    
    // Fallback: If we have a hostname but no specific port match, try current origin
    if (hostname) {
      return `${protocol}//${hostname}:3010`; // Default to 3010 for our production setup
    }
  }

  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  NProgress.start();
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

    const data = await res.json();
    return data.data !== undefined ? data.data : data;
  } finally {
    NProgress.done();
  }
}

export const api = {
  auth: {
    check: (token?: string) => fetchApi("/api/v1/me", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getWsToken: (token?: string) => fetchApi("/api/v1/ws-token", {
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
    updateGroupSettings: (sessionId: string, groupId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups/${groupId}`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getAnimatorTasks: (sessionId: string, groupId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups/${groupId}/animator`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    addAnimatorTask: (sessionId: string, groupId: string, data: any, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups/${groupId}/animator`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    updateAnimatorTask: (taskId: number, data: any, token?: string) => fetchApi(`/api/v1/moderation/animator/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    deleteAnimatorTask: (taskId: number, token?: string) => fetchApi(`/api/v1/moderation/animator/${taskId}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    getAnimatorHistory: (sessionId: string, groupId: string, params: any = {}, token?: string) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/api/v1/sessions/${sessionId}/moderation/groups/${groupId}/animator/history?${query}`, {
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
  },
  activities: {
    list: (token?: string) => fetchApi("/api/v1/activities", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    summary: (days = 7, token?: string) => fetchApi(`/api/v1/activities/summary?days=${days}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    stats: (token?: string) => fetchApi("/api/v1/stats", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  },
  campaigns: {
    list: (token?: string) => fetchApi("/api/v1/campaigns", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    get: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    create: (data: any, token?: string) => fetchApi("/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    update: (id: string, data: any, token?: string) => fetchApi(`/api/v1/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    delete: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    start: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}/send`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    pause: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}/pause`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    resume: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}/resume`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    retry: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}/retry`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    status: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}/status`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    stats: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}/stats`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    history: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}/history`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    overdue: (token?: string) => fetchApi("/api/v1/campaigns/overdue", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    checkScheduled: (token?: string) => fetchApi("/api/v1/campaigns/check-scheduled", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    clone: (id: string, token?: string) => fetchApi(`/api/v1/campaigns/${id}/clone`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    previewCsv: async (formData: FormData, token?: string) => {
      NProgress.start();
      try {
        const headers: any = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/api/v1/campaigns/preview-csv`, {
          method: "POST",
          body: formData,
          headers,
          credentials: "include",
        });
        return await res.json();
      } finally {
        NProgress.done();
      }
    },
  },
  recipientLists: {
    list: (token?: string) => fetchApi("/api/v1/recipient-lists", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    get: (id: string, token?: string) => fetchApi(`/api/v1/recipient-lists/${id}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    create: (data: any, token?: string) => fetchApi("/api/v1/recipient-lists", {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    delete: (id: string, token?: string) => fetchApi(`/api/v1/recipient-lists/${id}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    addRecipient: (id: string, recipient: any, token?: string) => fetchApi(`/api/v1/recipient-lists/${id}/recipients`, {
      method: "POST",
      body: JSON.stringify(recipient),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    removeRecipient: (id: string, number: string, token?: string) => fetchApi(`/api/v1/recipient-lists/${id}/recipients/${number}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    search: (query: string, token?: string) => fetchApi(`/api/v1/recipient-lists/search/${query}`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    stats: (token?: string) => fetchApi("/api/v1/recipient-lists-stats", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
  }
};

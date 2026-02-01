export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(endpoint, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
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
}

export const api = {
  auth: {
    login: (data: any) => fetchApi("/admin/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    logout: () => fetchApi("/admin/logout", {
      method: "POST",
    }),
    check: () => fetchApi("/admin/me"),
    getWsToken: () => fetchApi("/admin/ws-token"),
  },
  sessions: {
    list: () => fetchApi("/api/v1/sessions"),
    create: (sessionId: string) => fetchApi("/api/v1/sessions", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),
    delete: (sessionId: string, token?: string) => fetchApi(`/api/v1/sessions/${sessionId}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    qr: (sessionId: string) => fetchApi(`/api/v1/sessions/${sessionId}/qr`),
  },
  messages: {
    send: (sessionId: string, data: any, token?: string) => fetchApi(`/api/v1/messages?sessionId=${sessionId}`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    }),
    upload: (file: File, token?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      const headers: any = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      return fetch("/api/v1/media", {
        method: "POST",
        body: formData,
        headers: headers,
        // Don't set Content-Type, let the browser do it with boundary
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Upload failed");
        }
        return res.json();
      });
    },
  },
  users: {
    list: () => fetchApi("/admin/users"),
    create: (data: any) => fetchApi("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (email: string, data: any) => fetchApi(`/admin/users/${email}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/admin/users/${id}`, {
      method: "DELETE",
    }),
  },
  activities: {
    list: () => fetchApi("/api/v1/activities"),
    summary: (days = 7) => fetchApi(`/api/v1/activities/summary?days=${days}`),
    stats: () => fetchApi("/api/v1/stats"),
  },
  campaigns: {
    list: () => fetchApi("/api/v1/campaigns"),
    get: (id: string) => fetchApi(`/api/v1/campaigns/${id}`),
    create: (data: any) => fetchApi("/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/api/v1/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/api/v1/campaigns/${id}`, {
      method: "DELETE",
    }),
    start: (id: string) => fetchApi(`/api/v1/campaigns/${id}/send`, {
      method: "POST",
    }),
    pause: (id: string) => fetchApi(`/api/v1/campaigns/${id}/pause`, {
      method: "POST",
    }),
    resume: (id: string) => fetchApi(`/api/v1/campaigns/${id}/resume`, {
      method: "POST",
    }),
    retry: (id: string) => fetchApi(`/api/v1/campaigns/${id}/retry`, {
      method: "POST",
    }),
    status: (id: string) => fetchApi(`/api/v1/campaigns/${id}/status`),
    overdue: () => fetchApi("/api/v1/campaigns/overdue"),
    checkScheduled: () => fetchApi("/api/v1/campaigns/check-scheduled"),
    previewCsv: (formData: FormData) => fetch("/api/v1/campaigns/preview-csv", {
      method: "POST",
      body: formData,
      credentials: "include",
    }).then(res => res.json()),
  },
  recipientLists: {
    list: () => fetchApi("/api/v1/recipient-lists"),
    get: (id: string) => fetchApi(`/api/v1/recipient-lists/${id}`),
    create: (data: any) => fetchApi("/api/v1/recipient-lists", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/api/v1/recipient-lists/${id}`, {
      method: "DELETE",
    }),
    addRecipient: (id: string, recipient: any) => fetchApi(`/api/v1/recipient-lists/${id}/recipients`, {
      method: "POST",
      body: JSON.stringify(recipient),
    }),
    removeRecipient: (id: string, number: string) => fetchApi(`/api/v1/recipient-lists/${id}/recipients/${number}`, {
      method: "DELETE",
    }),
    search: (query: string) => fetchApi(`/api/v1/recipient-lists/search/${query}`),
    stats: () => fetchApi("/api/v1/recipient-lists-stats"),
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth")) {
      return handleAuth(request, env, url);
    }
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      try {
        return await env.ASSETS.fetch(request);
      } catch {
        return new Response("Not found", { status: 404 });
      }
    }
  }
}
async function handleAuth(request, env, url) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      const { email, password } = await request.json();
      const existing = await env.AUTH_KV.get(`user:${email}`);
      if (existing) return json({ error: "Deja existe" }, 400, cors);
      const hash = await sha256(password);
      await env.AUTH_KV.put(`user:${email}`, JSON.stringify({ email, hash }));
      const token = crypto.randomUUID();
      await env.AUTH_KV.put(`session:${token}`, email, { expirationTtl: 604800 });
      return json({ token, email }, 200, cors);
    }
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const { email, password } = await request.json();
      const data = await env.AUTH_KV.get(`user:${email}`);
      if (!data) return json({ error: "Introuvable" }, 401, cors);
      const user = JSON.parse(data);
      const hash = await sha256(password);
      if (user.hash !== hash) return json({ error: "Mauvais mdp" }, 401, cors);
      const token = crypto.randomUUID();
      await env.AUTH_KV.put(`session:${token}`, email, { expirationTtl: 604800 });
      return json({ token, email }, 200, cors);
    }
    return json({ error: "Route not found" }, 404, cors);
  } catch (err) {
    return json({ error: err.message }, 500, cors);
  }
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors } });
}
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

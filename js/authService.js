/**
 * authService.js
 * -----------------------------------------------------------------------
 * Fase 3: autenticação real via API (FastAPI + PostgreSQL + Argon2 +
 * JWT — ver backend/app/routers/auth.py). O localStorage aqui guarda
 * SÓ o token JWT e uma cópia do usuário público retornado no login/
 * cadastro (para leitura síncrona por AuthService.getCurrentUser(),
 * usada nos guards de acesso no <head> de cada página) — nunca dado
 * acadêmico permanente, que agora vive inteiramente no PostgreSQL.
 * -----------------------------------------------------------------------
 */

const API_BASE_URL = "http://localhost:8000/api";
const AUTH_SESSION_KEY = "ufrb_estagio_sessao_v1";

function authReadSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function authWriteSession(session) {
  try {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn("Não foi possível salvar a sessão localmente.", err);
  }
}

/**
 * Cliente HTTP central da API — usado por authService.js e por
 * dataService.js (via `AuthService.apiFetch`), para que só exista um
 * lugar montando a URL base, o header de autenticação e o parsing de
 * erro. Nunca chamar `fetch` diretamente em outro arquivo do frontend.
 */
async function authApiFetch(path, { method = "GET", body } = {}) {
  const session = authReadSession();
  const headers = { "Content-Type": "application/json" };
  if (session && session.token) {
    headers["Authorization"] = "Bearer " + session.token;
  }

  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return { ok: false, status: 0, data: null, networkError: true };
  }

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (response.status === 401) {
    // Token ausente/expirado/inválido: a sessão não serve mais para nada.
    authWriteSession(null);
  }

  return { ok: response.ok, status: response.status, data };
}

/** Upload de arquivo (multipart/form-data) — não pode usar authApiFetch
 * porque ali o Content-Type é sempre "application/json"; aqui o
 * navegador precisa montar o Content-Type com boundary sozinho. */
async function authApiUpload(path, file, fieldName = "file") {
  const session = authReadSession();
  const headers = {};
  if (session && session.token) {
    headers["Authorization"] = "Bearer " + session.token;
  }

  const formData = new FormData();
  formData.append(fieldName, file);

  let response;
  try {
    response = await fetch(API_BASE_URL + path, { method: "POST", headers, body: formData });
  } catch (err) {
    return { ok: false, status: 0, data: null, networkError: true };
  }

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (response.status === 401) {
    authWriteSession(null);
  }

  return { ok: response.ok, status: response.status, data };
}

/** Download de arquivo binário (ex.: PDF) — a resposta não é JSON,
 * então authApiFetch não serve aqui. Extrai o nome do arquivo do
 * header Content-Disposition quando o backend o envia. */
async function authApiDownload(path) {
  const session = authReadSession();
  const headers = {};
  if (session && session.token) {
    headers["Authorization"] = "Bearer " + session.token;
  }

  let response;
  try {
    response = await fetch(API_BASE_URL + path, { method: "GET", headers });
  } catch (err) {
    return { ok: false, status: 0, blob: null, filename: null, networkError: true };
  }

  if (!response.ok) {
    let detail = null;
    try {
      detail = await response.json();
    } catch (err) {
      detail = null;
    }
    return { ok: false, status: response.status, blob: null, filename: null, detail };
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : null;
  const blob = await response.blob();
  return { ok: true, status: response.status, blob, filename };
}

const AuthService = {
  apiFetch: authApiFetch,
  apiUpload: authApiUpload,
  apiDownload: authApiDownload,

  async register({ matricula, email, password, confirmPassword }) {
    if (!password || password.length < 6) {
      return { ok: false, error: "A senha deve ter pelo menos 6 caracteres." };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: "A confirmação de senha não coincide com a senha." };
    }

    const { ok, data, networkError } = await authApiFetch("/auth/cadastro", {
      method: "POST",
      body: { matricula: (matricula || "").trim(), email: (email || "").trim(), password },
    });

    if (networkError) return { ok: false, error: "Não foi possível conectar ao servidor. Tente novamente." };
    if (!ok) return { ok: false, error: (data && data.detail) || "Não foi possível criar a conta." };

    authWriteSession({ token: data.access_token, usuario: data.usuario });
    return { ok: true, user: data.usuario };
  },

  async login({ matricula, password }) {
    const { ok, data, networkError } = await authApiFetch("/auth/login", {
      method: "POST",
      body: { matricula: (matricula || "").trim(), password },
    });

    if (networkError) return { ok: false, error: "Não foi possível conectar ao servidor. Tente novamente." };
    if (!ok) return { ok: false, error: (data && data.detail) || "Matrícula ou senha incorretos." };

    authWriteSession({ token: data.access_token, usuario: data.usuario });
    return { ok: true, user: data.usuario };
  },

  /** Ainda não existe endpoint de recuperação de senha no backend
   * (fora do escopo das Fases 1-3) — mensagem honesta em vez de
   * fingir que funciona. */
  async resetPassword() {
    return {
      ok: false,
      error: "Recuperação de senha ainda não está disponível nesta versão do sistema. Fale com a administração.",
    };
  },

  /** Síncrono de propósito: os guards de acesso no <head> de cada
   * página chamam isso antes de qualquer requisição à API. */
  getCurrentUser() {
    const session = authReadSession();
    return session ? session.usuario : null;
  },

  logout() {
    authWriteSession(null);
  },
};

/**
 * authService.js
 * -----------------------------------------------------------------------
 * Camada de autenticação. Nesta etapa (somente frontend, sem backend)
 * a "base de usuários" é o localStorage do navegador — por isso isto
 * NÃO é segurança real: quem tem acesso ao navegador tem acesso aos
 * dados. Mesmo assim, a senha nunca é guardada em texto puro (usamos
 * hash SHA-256 com salt por usuário, via Web Crypto API), para que o
 * CONTRATO do código já corresponda ao que o backend real fará —
 * quando o Postgres existir, o corpo de `register`/`login` passa a
 * chamar a API (ex.: Supabase Auth, que já faz hash+salt no servidor),
 * sem mudar a assinatura usada por login.html/cadastro.html/perfil.js.
 *
 * Esquema correspondente no PostgreSQL:
 *
 *   usuarios                     — autenticação (separada dos dados acadêmicos)
 *     id            uuid PK default gen_random_uuid()
 *     matricula     text UNIQUE NOT NULL
 *     email         text UNIQUE NOT NULL
 *     senha_hash    text NOT NULL   (hash+salt — nunca texto puro)
 *     created_at    timestamptz default now()
 *
 *   alunos.usuario_id  uuid FK -> usuarios.id UNIQUE
 *     (o restante da tabela `alunos`, documentado em dataService.js,
 *     passa a pendurar num usuário autenticado em vez de existir solto)
 *
 * A "sessão" (usuário logado agora) fica em localStorage também, só
 * com o id do usuário — equivalente ao cookie/JWT que a API real usaria.
 * -----------------------------------------------------------------------
 */

const AUTH_USERS_KEY = "ufrb_estagio_usuarios_v1";
const AUTH_SESSION_KEY = "ufrb_estagio_sessao_v1";

/**
 * Conta única do administrador. Não é um cadastro de estudante — não
 * vive em AUTH_USERS_KEY, não aparece em AuthService.listUsers() (que
 * alimenta a lista "Novos Usuários" do painel admin) e não tem perfil
 * acadêmico. É a mesma tela de login (matrícula + senha) de todo mundo,
 * mas só quem souber esta matrícula e senha entra como administrador.
 *
 * Para trocar a senha: gere um novo par salt/hash com
 *   python3 -c "import hashlib,secrets; s=secrets.token_hex(16); print(s, hashlib.sha256((s+':NOVASENHA').encode()).hexdigest())"
 * e substitua passwordSalt/passwordHash abaixo.
 *
 * Limitação importante (ver seção de segurança em dataService.js):
 * como não existe servidor nesta etapa, este gate é só um obstáculo —
 * qualquer pessoa com DevTools pode ler este arquivo ou chamar
 * localStorage.setItem(...) diretamente. Quando o Postgres/Supabase
 * existir, isto DEVE virar uma coluna `role` em `usuarios`, validada
 * no servidor (RLS), nunca uma verificação só no navegador.
 */
const ADMIN_ACCOUNT = {
  id: "admin-ufrb-cetec",
  matricula: "admin.cetec",
  passwordSalt: "5bcc3d81b85572b353e7c7cf43e8a92b",
  passwordHash: "020f6fd1538d0e2edcf1d63ecc3de97ecd02b17e84f1e02cd7ceae56206eab96",
};

function authReadUsers() {
  try {
    const raw = window.localStorage.getItem(AUTH_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function authWriteUsers(users) {
  try {
    window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn("Não foi possível salvar os usuários localmente.", err);
  }
}

function authGenerateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "user-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function authGenerateSalt() {
  const bytes = new Uint8Array(16);
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash SHA-256 (salt + senha) via Web Crypto. Sem crypto.subtle
 * disponível (contexto não seguro), cai num hash simples só para o
 * protótipo não travar — nunca use este fallback como segurança real. */
async function authHashPassword(password, salt) {
  const input = salt + ":" + password;
  if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
    const bytes = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return "fallback-" + hash.toString(16);
}

function authNormalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function authIsValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

function authPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    matricula: user.matricula,
    email: user.email,
    created_at: user.created_at,
    role: "student",
  };
}

const AuthService = {
  /**
   * Cria uma nova conta. Valida matrícula/e-mail/senha e unicidade
   * (contra usuários já cadastrados NESTE navegador + os perfis
   * fictícios do painel admin, para a demonstração ter casos prontos
   * de "matrícula/e-mail já cadastrados"). Já efetua login ao final.
   */
  async register({ matricula, email, password, confirmPassword }) {
    const trimmedMatricula = (matricula || "").trim();
    const normalizedEmail = authNormalizeEmail(email);

    if (!trimmedMatricula) return { ok: false, error: "Informe sua matrícula." };
    if (!normalizedEmail || !authIsValidEmail(normalizedEmail)) {
      return { ok: false, error: "Informe um e-mail institucional válido." };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: "A senha deve ter pelo menos 6 caracteres." };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: "A confirmação de senha não coincide com a senha." };
    }

    const users = authReadUsers();
    const mockProfiles = typeof ADMIN_MOCK_PROFILES !== "undefined" ? ADMIN_MOCK_PROFILES : [];

    const matriculaTaken =
      trimmedMatricula.toLowerCase() === ADMIN_ACCOUNT.matricula.toLowerCase() ||
      users.some((u) => u.matricula === trimmedMatricula) ||
      mockProfiles.some((entry) => entry.profile.registration_number === trimmedMatricula);
    if (matriculaTaken) {
      return { ok: false, error: "Já existe um cadastro para esta matrícula." };
    }

    const emailTaken =
      users.some((u) => u.email === normalizedEmail) ||
      mockProfiles.some((entry) => authNormalizeEmail(entry.profile.email) === normalizedEmail);
    if (emailTaken) {
      return { ok: false, error: "Já existe um cadastro para este e-mail institucional." };
    }

    const salt = authGenerateSalt();
    const passwordHash = await authHashPassword(password, salt);

    const user = {
      id: authGenerateId(),
      matricula: trimmedMatricula,
      email: normalizedEmail,
      password_hash: passwordHash,
      password_salt: salt,
      created_at: new Date().toISOString(),
    };

    users.push(user);
    authWriteUsers(users);

    // Semeia o perfil acadêmico deste usuário já com matrícula/e-mail
    // preenchidos, para "Meu Perfil" nunca pedir esses dados de novo.
    if (typeof DataService !== "undefined" && typeof DataService.initProfileForUser === "function") {
      await DataService.initProfileForUser(user.id, { registration_number: trimmedMatricula, email: normalizedEmail });
    }

    window.localStorage.setItem(AUTH_SESSION_KEY, user.id);
    return { ok: true, user: authPublicUser(user) };
  },

  /** Autentica por matrícula + senha (os dois campos pedidos na tela
   * de login). Erro genérico de propósito, sem indicar qual campo
   * está incorreto. */
  async login({ matricula, password }) {
    const trimmedMatricula = (matricula || "").trim();

    if (!trimmedMatricula || !password) {
      return { ok: false, error: "Preencha matrícula e senha." };
    }

    if (trimmedMatricula.toLowerCase() === ADMIN_ACCOUNT.matricula.toLowerCase()) {
      const hash = await authHashPassword(password, ADMIN_ACCOUNT.passwordSalt);
      if (hash !== ADMIN_ACCOUNT.passwordHash) {
        return { ok: false, error: "Matrícula ou senha incorretos." };
      }
      window.localStorage.setItem(AUTH_SESSION_KEY, ADMIN_ACCOUNT.id);
      return {
        ok: true,
        user: { id: ADMIN_ACCOUNT.id, matricula: ADMIN_ACCOUNT.matricula, email: "", role: "admin" },
      };
    }

    const users = authReadUsers();
    const user = users.find((u) => u.matricula === trimmedMatricula);
    if (!user) {
      return { ok: false, error: "Matrícula ou senha incorretos." };
    }

    const hash = await authHashPassword(password, user.password_salt);
    if (hash !== user.password_hash) {
      return { ok: false, error: "Matrícula ou senha incorretos." };
    }

    window.localStorage.setItem(AUTH_SESSION_KEY, user.id);
    return { ok: true, user: authPublicUser(user) };
  },

  /** Define uma nova senha mediante confirmação de matrícula + e-mail
   * (sem envio real de e-mail — não há backend de e-mail nesta etapa,
   * então não fingimos "enviar um link"; o próprio formulário já pede
   * a nova senha após confirmar a identidade). */
  async resetPassword({ matricula, email, newPassword, confirmNewPassword }) {
    const trimmedMatricula = (matricula || "").trim();
    const normalizedEmail = authNormalizeEmail(email);

    if (!trimmedMatricula || !normalizedEmail) {
      return { ok: false, error: "Informe matrícula e e-mail institucional." };
    }
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: "A nova senha deve ter pelo menos 6 caracteres." };
    }
    if (newPassword !== confirmNewPassword) {
      return { ok: false, error: "A confirmação da nova senha não coincide." };
    }

    const users = authReadUsers();
    const idx = users.findIndex((u) => u.matricula === trimmedMatricula && u.email === normalizedEmail);
    if (idx === -1) {
      return { ok: false, error: "Não encontramos uma conta com essa matrícula e e-mail." };
    }

    const salt = authGenerateSalt();
    users[idx].password_salt = salt;
    users[idx].password_hash = await authHashPassword(newPassword, salt);
    authWriteUsers(users);

    return { ok: true };
  },

  /** Usuário autenticado na sessão atual (ou null). Síncrono de
   * propósito: várias telas precisam checar isso antes de renderizar. */
  getCurrentUser() {
    const id = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!id) return null;
    if (id === ADMIN_ACCOUNT.id) {
      return { id: ADMIN_ACCOUNT.id, matricula: ADMIN_ACCOUNT.matricula, email: "", role: "admin" };
    }
    const user = authReadUsers().find((u) => u.id === id);
    return user ? authPublicUser(user) : null;
  },

  logout() {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  },

  /** USO DO PAINEL ADMINISTRATIVO: lista pública de todas as contas
   * reais já cadastradas neste navegador. */
  listUsers() {
    return authReadUsers().map(authPublicUser);
  },
};

/**
 * dataService.js
 * -----------------------------------------------------------------------
 * Camada de acesso a dados do formulário de cadastro do estudante.
 *
 * Cada estudante tem sua própria conta (ver authService.js) e seus
 * próprios dados: o perfil é guardado sob uma chave por usuário
 * (id da conta autenticada), nunca numa chave global compartilhada.
 * Nesta etapa (somente frontend) os dados são persistidos no
 * localStorage do navegador. Toda função pública é assíncrona (retorna
 * Promise) e recebe/retorna os mesmos formatos que as tabelas abaixo
 * terão no PostgreSQL — a ideia é que, quando o backend/API existir,
 * baste reescrever o CORPO de cada função (trocando localStorage por
 * chamadas HTTP à API, que por sua vez fala com o Postgres — o
 * navegador nunca acessa o banco diretamente) sem alterar ui.js/perfil.js.
 *
 * Esquema de banco de dados planejado para o PostgreSQL (nomes conforme
 * definidos para o projeto):
 *
 *   centros                     — centros acadêmicos (CETEC, CCAAB, ...)
 *     id text PK, nome text
 *
 *   cursos                      — cursos, normalizados por centro
 *     id serial PK, centro_id FK -> centros.id, nome text
 *     (hoje o app usa uma constante local — UFRB_COURSES em ui.js —
 *     espelhando exatamente estas duas tabelas; adicionar um centro/curso
 *     novo não exige mudar o componente de autocomplete, só os dados)
 *
 *   usuarios                    — autenticação (ver detalhes em authService.js)
 *     id uuid PK, matricula text UNIQUE, email text UNIQUE,
 *     senha_hash text (hash+salt, nunca texto puro), created_at timestamptz
 *
 *   alunos                      — dados acadêmicos, 1:1 com um usuário
 *     id                     uuid PK default gen_random_uuid()
 *     usuario_id             uuid FK -> usuarios.id UNIQUE (dono do cadastro)
 *     matricula              text UNIQUE NOT NULL  (espelha usuarios.matricula; identificador principal)
 *     nome_completo          text   (extraído do XML do Lattes)
 *     lattes_id              text   (NUMERO-IDENTIFICADOR do Lattes)
 *     email                  text   (e-mail institucional; raramente vem no
 *                                    Lattes — confirmado/preenchido pelo aluno)
 *     telefone               text   (idem — completado manualmente quando ausente)
 *     linkedin_url           text   (validado como URL no formulário)
 *     curso_id               int  FK -> cursos.id  (valor realmente salvo — não texto livre)
 *     instituicao            text   (instituição da formação, via Lattes)
 *     nivel_formacao         text   (Graduação, Mestrado, ... via Lattes)
 *     status_formacao        text   (Em andamento, Concluído, ... via Lattes)
 *     ano_inicio_formacao    text
 *     ano_fim_formacao       text
 *     semestre_atual         text
 *     previsao_conclusao     text
 *     possui_experiencia     boolean
 *     idiomas                jsonb  ([{nome, leitura, fala, escrita, compreensao}], via Lattes)
 *     created_at             timestamptz default now()
 *     updated_at             timestamptz default now()
 *
 *   tccs                        — 1:1 com alunos (situação e dados do TCC)
 *     id            uuid PK, aluno_id FK -> alunos.id UNIQUE
 *     situacao      text   ('nao_iniciou' | 'em_andamento' | 'concluido')
 *     titulo        text  (só quando situacao != 'nao_iniciou')
 *     resumo        text
 *     orientador    text
 *     palavras_chave text[]  (facilita busca/matching por tema)
 *
 *   tecnologias / conhecimentos          — catálogo padronizado (evita
 *     id, nome text UNIQUE                  duplicidade tipo "IA" vs "Inteligência Artificial")
 *   aluno_tecnologias / aluno_conhecimentos — associativas aluno <-> item
 *     id, aluno_id FK, tecnologia_id ou conhecimento_id FK, nivel text
 *     (hoje a UI trata os dois como um único campo "tecnologia ou
 *     conhecimento"; a classificação em uma tabela ou outra pode ficar
 *     a cargo do backend/import, sem mudar a experiência de preenchimento)
 *
 *   areas_projeto / tipos_projeto        — catálogos padronizados
 *     id, nome text UNIQUE
 *
 *   projetos
 *     id                uuid PK
 *     aluno_id          uuid FK -> alunos.id
 *     nome              text
 *     descricao         text
 *     centro_id         FK -> centros.id  (contexto do projeto; pode
 *                                          diferir do curso do estudante)
 *     curso_id          FK -> cursos.id
 *     area_projeto_id   FK -> areas_projeto.id
 *     tipo_projeto_id   FK -> tipos_projeto.id
 *     link              text nullable
 *     created_at        timestamptz
 *
 *   projeto_tecnologias          — associativa projeto <-> tecnologia
 *     id, projeto_id FK, tecnologia_id FK (ou nome text, se não padronizado)
 *
 *   experiencias_profissionais
 *     id            uuid PK
 *     aluno_id      uuid FK -> alunos.id
 *     empresa       text
 *     cargo         text
 *     data_inicio   date
 *     data_fim      date nullable
 *     atual         boolean
 *     area_atuacao  text
 *     descricao     text
 *     tecnologias   text[]
 *     created_at    timestamptz
 *
 *   areas_interesse              — catálogo padronizado e EXPANSÍVEL
 *     id serial PK, nome text UNIQUE
 *     (o autocomplete de "Áreas de interesse" busca aqui; se o estudante
 *     não encontrar a área, o próprio formulário oferece "+ Adicionar
 *     nova área", que insere aqui após normalizar e checar duplicidade)
 *
 *   aluno_areas_interesse        — associativa aluno <-> área de interesse
 *     id, aluno_id FK -> alunos.id, area_interesse_id FK -> areas_interesse.id
 *
 * A sessão (usuário logado agora) não é uma tabela — equivale a um
 * cookie/JWT emitido pela API de autenticação (ver authService.js).
 *
 * -----------------------------------------------------------------------
 * Lado das oportunidades (fora do escopo desta tela, mas planejado para
 * o motor de recomendação em Python cruzar aluno x vaga futuramente):
 *
 *   empresas, convenios, vagas, historico_estagios
 *   (estrutura análoga: cada vaga terá requisitos/tecnologias/área para
 *   comparar com o perfil do aluno já coletado aqui)
 *
 * Fluxo real (quando o backend existir): Formulário (este frontend) ->
 * API/Backend -> PostgreSQL. O navegador NUNCA fala direto com o banco;
 * DataService é hoje o "dublê" local desse contrato de API.
 * -----------------------------------------------------------------------
 * SEGURANÇA — revisão para a migração ao Postgres/Supabase:
 *
 * O que já está OK e pode continuar como está:
 *   - HTML de terceiros (nomes de projeto, tecnologias, experiências,
 *     interesses etc.) sempre passa por UI.escapeHtml antes de virar
 *     innerHTML no admin.js — não há XSS armazenado no painel admin,
 *     mesmo agregando dados de vários estudantes.
 *   - Senhas nunca são salvas em texto puro: authService.js aplica
 *     SHA-256 com salt por usuário antes de gravar qualquer coisa.
 *   - Cada estudante só lê/escreve sua própria chave de localStorage
 *     (por usuário, ver STORAGE_KEY_PREFIX abaixo) — sem essa separação,
 *     um estudante poderia ver o rascunho de outro no mesmo navegador.
 *
 * O que é uma limitação ESTRUTURAL deste protótipo (sem servidor) e
 * PRECISA virar validação no backend antes de ir para produção:
 *   - Toda "autenticação" roda no navegador: qualquer pessoa com o
 *     DevTools aberto pode chamar AuthService/DataService diretamente
 *     e ignorar qualquer checagem de senha ou papel (role). Isso só se
 *     resolve de verdade com Supabase Auth + Row Level Security (RLS)
 *     validando no servidor quem pode ler/escrever cada linha.
 *   - Unicidade de matrícula/e-mail (authService.js) é checada só
 *     client-side; no Postgres isso precisa ser uma constraint UNIQUE
 *     real, senão dois cadastros simultâneos poderiam colidir.
 *   - Não há limite de tentativas de login nem expiração de sessão —
 *     o backend deve aplicar rate limiting e tokens de curta duração.
 *   - O hash de senha (SHA-256+salt) roda no cliente só para não gravar
 *     texto puro; não substitui um hash lento (bcrypt/Argon2) feito no
 *     servidor, que é o que realmente dificulta força bruta.
 * -----------------------------------------------------------------------
 */

const STORAGE_KEY_PREFIX = "ufrb_estagio_perfil_v1";
const INTEREST_CATALOG_KEY = "ufrb_estagio_areas_interesse_v1";

/**
 * Limpeza de migração: antes de existir conta por usuário, o perfil
 * inteiro (inclusive um currículo Lattes já importado em algum teste)
 * ficava numa única chave global, sem sufixo de usuário. Ela é lixo
 * agora — qualquer navegador que ainda a tenha salva NUNCA deve
 * herdar aqueles dados para uma conta nova. Roda uma única vez, ao
 * carregar este arquivo.
 */
(function cleanupLegacyGlobalProfile() {
  try {
    window.localStorage.removeItem(STORAGE_KEY_PREFIX);
  } catch (err) {
    // localStorage indisponível (ex.: modo privado) — nada a limpar.
  }
})();

/**
 * Chave de armazenamento do perfil do usuário autenticado no momento.
 * Cada conta (ver authService.js) tem sua própria chave, então os
 * dados de um estudante nunca se misturam com os de outro no mesmo
 * navegador. Sem sessão ativa, cai numa chave "anônima" (não deveria
 * ocorrer em uso normal, já que index.html exige login).
 */
function currentStorageKey() {
  const user = typeof AuthService !== "undefined" ? AuthService.getCurrentUser() : null;
  return user ? `${STORAGE_KEY_PREFIX}__${user.id}` : `${STORAGE_KEY_PREFIX}__anon`;
}

/** Remove espaços duplicados/nas pontas e normaliza para comparação. */
function normalizeAreaName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function readCustomInterestAreas() {
  try {
    const raw = window.localStorage.getItem(INTEREST_CATALOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeCustomInterestAreas(list) {
  try {
    window.localStorage.setItem(INTEREST_CATALOG_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Não foi possível salvar a nova área de interesse localmente.", err);
  }
}

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function defaultState() {
  return {
    profile: {
      id: generateId(),
      full_name: "",
      lattes_id: "",
      course: "",
      course_id: null,
      institution: "",
      education_level: "",
      education_status: "",
      education_start_year: "",
      education_end_year: "",
      email: "",
      phone: "",
      registration_number: "",
      linkedin_url: "",
      semester: "",
      expected_graduation: "",
      has_experience: false,
      tcc_status: "nao_iniciou",
      tcc_title: "",
      tcc_summary: "",
      tcc_advisor: "",
      tcc_keywords: [],
      languages: [],
      updated_at: nowIso(),
    },
    technologies: [],
    projects: [],
    experiences: [],
    interests: [],
  };
}

function readStore(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (err) {
    console.warn("Não foi possível ler o perfil salvo localmente.", err);
    return null;
  }
}

function writeStore(state, key) {
  try {
    window.localStorage.setItem(key || currentStorageKey(), JSON.stringify(state));
  } catch (err) {
    console.warn("Não foi possível salvar o perfil localmente.", err);
  }
}

function getState() {
  const key = currentStorageKey();
  let state = readStore(key);
  if (!state) {
    state = defaultState();
    writeStore(state, key);
  }
  return state;
}

function resolve(value) {
  return Promise.resolve(value);
}

const DataService = {
  /**
   * Cria o perfil acadêmico (vazio) de uma conta recém-cadastrada, já
   * com matrícula/e-mail preenchidos a partir do cadastro — chamado por
   * authService.js logo após `register`, antes da sessão existir, por
   * isso recebe o id do usuário diretamente em vez de usar
   * currentStorageKey() (que dependeria de uma sessão já ativa).
   */
  initProfileForUser(userId, overrides) {
    const key = `${STORAGE_KEY_PREFIX}__${userId}`;
    const state = defaultState();
    state.profile = { ...state.profile, ...overrides, updated_at: nowIso() };
    writeStore(state, key);
    return resolve({ ...state.profile });
  },

  /** Retorna os dados acadêmicos do perfil. */
  getProfile() {
    return resolve({ ...getState().profile });
  },

  /** Atualiza (parcialmente) os dados acadêmicos do perfil. */
  saveProfile(changes) {
    const state = getState();
    state.profile = { ...state.profile, ...changes, updated_at: nowIso() };
    writeStore(state);
    return resolve({ ...state.profile });
  },

  /** Lista as tecnologias/conhecimentos cadastrados. */
  listTechnologies() {
    return resolve([...getState().technologies]);
  },

  /** Adiciona uma tecnologia { name, level }. */
  addTechnology({ name, level }) {
    const state = getState();
    const tech = {
      id: generateId(),
      name: name.trim(),
      level: level || "Básico",
      created_at: nowIso(),
    };
    state.technologies.push(tech);
    writeStore(state);
    return resolve({ ...tech });
  },

  /** Atualiza campos de uma tecnologia (ex.: nível). */
  updateTechnology(id, changes) {
    const state = getState();
    const idx = state.technologies.findIndex((t) => t.id === id);
    if (idx === -1) return resolve(null);
    state.technologies[idx] = { ...state.technologies[idx], ...changes };
    writeStore(state);
    return resolve({ ...state.technologies[idx] });
  },

  /** Remove uma tecnologia pelo id. */
  removeTechnology(id) {
    const state = getState();
    state.technologies = state.technologies.filter((t) => t.id !== id);
    writeStore(state);
    return resolve(true);
  },

  /** Lista os projetos cadastrados. */
  listProjects() {
    return resolve([...getState().projects]);
  },

  /** Adiciona um projeto. */
  addProject(project) {
    const state = getState();
    const record = {
      id: generateId(),
      name: project.name.trim(),
      description: project.description.trim(),
      academic_center: project.academic_center || "",
      course: project.course || "",
      area: project.area || "",
      type: project.type || "",
      technologies: project.technologies || [],
      link: project.link ? project.link.trim() : "",
      created_at: nowIso(),
    };
    state.projects.push(record);
    writeStore(state);
    return resolve({ ...record });
  },

  /** Atualiza um projeto existente. */
  updateProject(id, changes) {
    const state = getState();
    const idx = state.projects.findIndex((p) => p.id === id);
    if (idx === -1) return resolve(null);
    state.projects[idx] = { ...state.projects[idx], ...changes };
    writeStore(state);
    return resolve({ ...state.projects[idx] });
  },

  /** Exclui um projeto pelo id. */
  deleteProject(id) {
    const state = getState();
    state.projects = state.projects.filter((p) => p.id !== id);
    writeStore(state);
    return resolve(true);
  },

  /** Lista experiências profissionais/acadêmicas. */
  listExperiences() {
    return resolve([...getState().experiences]);
  },

  /** Adiciona uma experiência. */
  addExperience(experience) {
    const state = getState();
    const record = {
      id: generateId(),
      company: experience.company.trim(),
      role: experience.role.trim(),
      work_area: experience.work_area || "",
      start_date: experience.start_date || "",
      end_date: experience.end_date || "",
      is_current: Boolean(experience.is_current),
      description: experience.description ? experience.description.trim() : "",
      technologies: experience.technologies || [],
      created_at: nowIso(),
    };
    state.experiences.push(record);
    writeStore(state);
    return resolve({ ...record });
  },

  /** Remove uma experiência pelo id. */
  deleteExperience(id) {
    const state = getState();
    state.experiences = state.experiences.filter((e) => e.id !== id);
    writeStore(state);
    return resolve(true);
  },

  /** Lista as áreas de interesse selecionadas. */
  listInterests() {
    return resolve([...getState().interests]);
  },

  /** Substitui o conjunto de áreas de interesse selecionadas. */
  setInterests(areas) {
    const state = getState();
    state.interests = [...areas];
    writeStore(state);
    return resolve([...state.interests]);
  },

  /**
   * Catálogo de áreas de interesse para o autocomplete: a lista semente
   * (INTEREST_AREAS_SEED, em ui.js) + áreas criadas pelo próprio
   * estudante via "+ Adicionar nova área" (equivalente à tabela
   * `areas_interesse` no Postgres).
   */
  listInterestAreaCatalog() {
    const seed = typeof INTEREST_AREAS_SEED !== "undefined" ? INTEREST_AREAS_SEED : [];
    const custom = readCustomInterestAreas();
    return resolve([...new Set([...seed, ...custom])]);
  },

  /**
   * Adiciona uma nova área de interesse ao catálogo, normalizando e
   * verificando duplicidade (case-insensitive) antes de gravar — evita
   * "Inteligência Artificial", "inteligencia artificial" e "IA" como
   * três registros diferentes quando já existe uma correspondência.
   * Retorna a área já existente (se encontrada) ou a recém-criada.
   */
  async addInterestAreaToCatalog(rawName) {
    const name = normalizeAreaName(rawName || "");
    if (!name) return resolve(null);

    const catalog = await this.listInterestAreaCatalog();
    const existing = catalog.find((area) => area.toLowerCase() === name.toLowerCase());
    if (existing) return resolve(existing);

    const custom = readCustomInterestAreas();
    custom.push(name);
    writeCustomInterestAreas(custom);
    return resolve(name);
  },

  /** Retorna o estado completo (usado para calcular o progresso). */
  getFullState() {
    const state = getState();
    return resolve(JSON.parse(JSON.stringify(state)));
  },

  /** Remove os dados salvos localmente do usuário atual (usado apenas para demonstração). */
  clearAll() {
    window.localStorage.removeItem(currentStorageKey());
    return resolve(true);
  },

  /**
   * USO EXCLUSIVO DO PAINEL ADMINISTRATIVO.
   * Retorna todos os perfis conhecidos: o perfil de CADA conta real já
   * cadastrada neste navegador (uma por usuário, ver authService.js) +
   * os perfis fictícios de demonstração de `adminMockProfiles.js`.
   *
   * Quando o Supabase estiver conectado, o corpo desta função vira uma
   * query única, por exemplo:
   *   supabase.from('alunos').select(`
   *     *,
   *     aluno_tecnologias(*), aluno_conhecimentos(*),
   *     projetos(*), experiencias_profissionais(*),
   *     aluno_areas_interesse(*)
   *   `)
   * restrita pela policy de RLS que só libera leitura de todos os
   * registros para o papel "admin".
   */
  listAllProfilesForAdmin() {
    const entries = [];
    const users = typeof AuthService !== "undefined" ? AuthService.listUsers() : [];

    users.forEach((user) => {
      const state = readStore(`${STORAGE_KEY_PREFIX}__${user.id}`);
      if (!state) return;
      const hasData =
        state.profile.course ||
        state.profile.full_name ||
        state.technologies.length > 0 ||
        state.projects.length > 0;
      if (!hasData) return;
      entries.push({
        source: "real",
        account: { matricula: user.matricula, email: user.email },
        profile: { ...state.profile },
        technologies: [...state.technologies],
        projects: [...state.projects],
        experiences: [...state.experiences],
        interests: [...state.interests],
      });
    });

    const mockProfiles = typeof ADMIN_MOCK_PROFILES !== "undefined" ? ADMIN_MOCK_PROFILES : [];
    mockProfiles.forEach((entry) => {
      entries.push({ source: "mock", ...JSON.parse(JSON.stringify(entry)) });
    });

    return resolve(entries);
  },
};

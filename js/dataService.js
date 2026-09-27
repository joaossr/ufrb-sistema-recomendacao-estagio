/**
 * dataService.js
 * -----------------------------------------------------------------------
 * Camada de acesso a dados do estudante. Fase 3: os dados permanentes
 * NÃO vivem mais no localStorage — cada método aqui chama a API
 * FastAPI (ver backend/app/routers/), que por sua vez fala com o
 * PostgreSQL. O navegador nunca acessa o banco diretamente.
 *
 * A assinatura pública de cada função é a mesma de antes (perfil.js/
 * ui.js/admin.js não precisaram mudar) — só o CORPO trocou de
 * localStorage para `AuthService.apiFetch(...)`, exatamente como
 * planejado.
 *
 * Backend (ver backend/alembic/versions/0001_initial_schema.py para o
 * schema completo): usuarios, centros, cursos, alunos, tccs,
 * tecnologias/aluno_tecnologias, conhecimentos/aluno_conhecimentos,
 * idiomas_aluno, formacoes_complementares, areas_projeto/tipos_projeto,
 * projetos/projeto_tecnologias, experiencias_profissionais,
 * areas_interesse/aluno_areas_interesse, empresas, convenios, vagas,
 * embeddings, recomendacoes, importacoes.
 *
 * Autenticação e segurança: ver o comentário dedicado no topo de
 * backend/app/core/config.py e backend/app/core/security.py.
 * -----------------------------------------------------------------------
 */

/** Datas de experiência chegam do formulário como "AAAA-MM" (<input
 * type="month">), mas a coluna do banco é DATE (exige dia) — completa
 * com "-01" na ida; a volta não precisa de tratamento (formatMonthYear
 * em ui.js já ignora qualquer coisa depois do mês). */
function toApiMonthDate(value) {
  if (!value) return null;
  return /^\d{4}-\d{2}$/.test(value) ? value + "-01" : value;
}

function resolve(value) {
  return Promise.resolve(value);
}

async function apiGet(path) {
  const { data } = await AuthService.apiFetch(path);
  return data;
}

async function apiSend(path, method, body) {
  const { ok, data } = await AuthService.apiFetch(path, { method, body });
  if (!ok) {
    const message = (data && data.detail) || "Não foi possível completar a operação.";
    throw new Error(message);
  }
  return data;
}

const DataService = {
  /** Retorna os dados acadêmicos do perfil. */
  getProfile() {
    return apiGet("/perfil");
  },

  /** Atualiza (parcialmente) os dados acadêmicos do perfil. */
  saveProfile(changes) {
    return apiSend("/perfil", "PUT", changes);
  },

  /** Lista as tecnologias/conhecimentos cadastrados. */
  listTechnologies() {
    return apiGet("/perfil/tecnologias");
  },

  /** Adiciona uma tecnologia { name, level }. */
  addTechnology({ name, level }) {
    return apiSend("/perfil/tecnologias", "POST", { name: name.trim(), level: level || "Básico" });
  },

  /** Atualiza campos de uma tecnologia (ex.: nível). */
  updateTechnology(id, changes) {
    return apiSend(`/perfil/tecnologias/${id}`, "PUT", { level: changes.level });
  },

  /** Remove uma tecnologia pelo id. */
  async removeTechnology(id) {
    await apiSend(`/perfil/tecnologias/${id}`, "DELETE");
    return true;
  },

  /** Lista os projetos cadastrados. */
  listProjects() {
    return apiGet("/perfil/projetos");
  },

  /** Adiciona um projeto. */
  addProject(project) {
    return apiSend("/perfil/projetos", "POST", project);
  },

  /** Atualiza um projeto existente. */
  updateProject(id, changes) {
    return apiSend(`/perfil/projetos/${id}`, "PUT", changes);
  },

  /** Exclui um projeto pelo id. */
  async deleteProject(id) {
    await apiSend(`/perfil/projetos/${id}`, "DELETE");
    return true;
  },

  /** Lista experiências profissionais/acadêmicas. */
  listExperiences() {
    return apiGet("/perfil/experiencias");
  },

  /** Adiciona uma experiência. */
  addExperience(experience) {
    return apiSend("/perfil/experiencias", "POST", {
      company: experience.company.trim(),
      role: experience.role.trim(),
      work_area: experience.work_area || null,
      start_date: toApiMonthDate(experience.start_date),
      end_date: toApiMonthDate(experience.end_date),
      is_current: Boolean(experience.is_current),
      description: experience.description ? experience.description.trim() : null,
      technologies: experience.technologies || [],
    });
  },

  /** Remove uma experiência pelo id. */
  async deleteExperience(id) {
    await apiSend(`/perfil/experiencias/${id}`, "DELETE");
    return true;
  },

  /** Lista as áreas de interesse selecionadas. */
  listInterests() {
    return apiGet("/perfil/areas-interesse");
  },

  /** Substitui o conjunto de áreas de interesse selecionadas. */
  setInterests(areas) {
    return apiSend("/perfil/areas-interesse", "PUT", { areas: [...areas] });
  },

  /** Catálogo de áreas de interesse para o autocomplete (tabela
   * `areas_interesse`, compartilhada entre todos os alunos). */
  async listInterestAreaCatalog() {
    const catalogo = await apiGet("/areas-interesse");
    return (catalogo || []).map((area) => area.nome);
  },

  /** Adiciona uma nova área de interesse ao catálogo (normalizada e
   * deduplicada no backend). Retorna o nome já existente ou o recém-criado. */
  async addInterestAreaToCatalog(rawName) {
    const nome = (rawName || "").trim().replace(/\s+/g, " ");
    if (!nome) return resolve(null);
    const area = await apiSend("/areas-interesse", "POST", { nome });
    return area.nome;
  },

  /** Retorna o estado completo (usado para calcular o progresso). Não
   * existe um endpoint único para isso — orquestra as chamadas já
   * existentes, igual a `Promise.all` fazia antes com o localStorage. */
  async getFullState() {
    const [profile, technologies, projects, interests] = await Promise.all([
      this.getProfile(),
      this.listTechnologies(),
      this.listProjects(),
      this.listInterests(),
    ]);
    return { profile, technologies, projects, interests };
  },

  /** Envia o XML do Lattes para o backend processar (Fase 4) e
   * retorna a prévia (nome, ID Lattes, formações, idiomas, formações
   * complementares) — nada é gravado no banco ainda. */
  async previewLattes(file) {
    const { ok, data, networkError } = await AuthService.apiUpload("/perfil/lattes/preview", file);
    if (networkError) throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
    if (!ok) throw new Error((data && data.detail) || "Não foi possível processar o arquivo do Lattes.");
    return data;
  },

  /** Confirma a importação: grava no perfil os dados escolhidos pelo
   * usuário na prévia. Retorna { perfil, course_matched }. */
  confirmarLattes(payload) {
    return apiSend("/perfil/lattes/confirmar", "POST", payload);
  },

  /** Dispara o pipeline completo (Fase 8/9): busca vetorial -> regras
   * objetivas -> Qwen3 -> recomendações de vaga + prospecção de
   * empresas. Pode demorar (o Qwen3 analisa candidato por candidato)
   * — quem chama deve mostrar um estado de carregamento. */
  gerarRecomendacoes() {
    return apiSend("/perfil/recomendacoes/gerar", "POST");
  },

  /** Lista as recomendações/prospecções já geradas anteriormente. */
  listarRecomendacoes() {
    return apiGet("/perfil/recomendacoes");
  },

  /**
   * USO EXCLUSIVO DO PAINEL ADMINISTRATIVO.
   * A Fase 3 ainda não trouxe um endpoint de "listar todos os alunos"
   * (isso é a Fase 10 — melhoria do painel administrativo). Por ora,
   * mostra só os perfis fictícios de demonstração, sem quebrar a tela.
   */
  async listAllProfilesForAdmin() {
    const mockProfiles = typeof ADMIN_MOCK_PROFILES !== "undefined" ? ADMIN_MOCK_PROFILES : [];
    return mockProfiles.map((entry) => ({ source: "mock", ...JSON.parse(JSON.stringify(entry)) }));
  },
};

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

  /** Lista as recomendações/prospecções já geradas anteriormente.
   * Fase 12: o aluno NUNCA dispara a geração — só visualiza o que o
   * admin já gerou (ver `gerarRecomendacoesParaTodos` mais abaixo). */
  listarRecomendacoes() {
    return apiGet("/perfil/recomendacoes");
  },

  /* -----------------------------------------------------------------
   * USO EXCLUSIVO DO PAINEL ADMINISTRATIVO (Fase 10, passo 27).
   * Antes disso, esta seção mostrava só os perfis fictícios de
   * `adminMockProfiles.js` porque não existia endpoint nenhum para
   * listar alunos reais. Agora todo o painel fala com o backend.
   * --------------------------------------------------------------- */

  /** Lista resumida de todos os alunos cadastrados (para a tabela). */
  listStudents() {
    return apiGet("/admin/alunos");
  },

  /** Detalhe completo de um aluno (perfil + tecnologias + projetos +
   * experiências + áreas de interesse) — usado no modal "Ver detalhes". */
  getStudentDetail(alunoId) {
    return apiGet(`/admin/alunos/${alunoId}`);
  },

  /** Lista todas as empresas cadastradas. */
  listCompanies() {
    return apiGet("/admin/empresas");
  },

  /** Cadastra uma nova empresa (nome obrigatório, CNPJ opcional). */
  createCompany(payload) {
    return apiSend("/admin/empresas", "POST", payload);
  },

  /** Detalhe de uma empresa (nome, CNPJ, área, segmento, cidade, UF). */
  getCompanyDetail(empresaId) {
    return apiGet(`/admin/empresas/${empresaId}`);
  },

  /** Lista os convênios de uma empresa. */
  listConvenios(empresaId) {
    return apiGet(`/admin/empresas/${empresaId}/convenios`);
  },

  /** Registra um convênio para uma empresa. */
  createConvenio(empresaId, payload) {
    return apiSend(`/admin/empresas/${empresaId}/convenios`, "POST", payload);
  },

  /** Lista vagas. `statusFiltro` é opcional ("ativa" | "encerrada"). */
  listVagas(statusFiltro) {
    const query = statusFiltro ? `?status_filtro=${encodeURIComponent(statusFiltro)}` : "";
    return apiGet(`/admin/vagas${query}`);
  },

  /** Lista as vagas de uma empresa específica. */
  listVagasDaEmpresa(empresaId) {
    return apiGet(`/admin/empresas/${empresaId}/vagas`);
  },

  /** Cria uma vaga vinculada a uma empresa. */
  createVaga(empresaId, payload) {
    return apiSend(`/admin/empresas/${empresaId}/vagas`, "POST", payload);
  },

  /** Atualiza o status de uma vaga ("ativa" | "encerrada"). Ao encerrar,
   * o backend também some com ela das buscas de recomendação. */
  updateVagaStatus(vagaId, status) {
    return apiSend(`/admin/vagas/${vagaId}/status`, "PUT", { status });
  },

  /** Exclui uma vaga. */
  async deleteVaga(vagaId) {
    await apiSend(`/admin/vagas/${vagaId}`, "DELETE");
  },

  /** Caminho inverso (Fase 9): dado uma vaga, gera/atualiza as
   * recomendações de quais alunos são compatíveis com ela. */
  gerarRecomendacoesParaVaga(vagaId) {
    return apiSend(`/admin/vagas/${vagaId}/recomendacoes/gerar`, "POST");
  },

  /** Caminho inverso (Fase 9): dado uma empresa sem vaga ativa, gera
   * as recomendações de prospecção (quais alunos combinam com ela). */
  gerarRecomendacoesParaEmpresa(empresaId) {
    return apiSend(`/admin/empresas/${empresaId}/recomendacoes/gerar`, "POST");
  },

  /** Fase 12: dispara o pipeline completo (busca vetorial -> regras ->
   * Qwen3) para TODOS os alunos cadastrados de uma vez — substitui o
   * botão que existia na área do aluno. Pode demorar bastante (um
   * aluno de cada vez, um candidato de cada vez); quem chama deve
   * mostrar um estado de carregamento. Retorna um resumo por aluno. */
  gerarRecomendacoesParaTodos() {
    return apiSend("/admin/recomendacoes/gerar", "POST");
  },

  /** Fase 13: relatório consolidado — todas as recomendações de todos
   * os alunos, com o aluno já incluído em cada item. `filtros` aceita
   * { tipo, nivel } opcionais. */
  listarTodasRecomendacoes(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.tipo) params.set("tipo", filtros.tipo);
    if (filtros.nivel) params.set("nivel", filtros.nivel);
    const query = params.toString();
    return apiGet(`/admin/recomendacoes${query ? "?" + query : ""}`);
  },

  /** Fase 14: baixa o PDF de compatibilidade de uma recomendação (dados
   * do estudante + análise) e dispara o download no navegador — para
   * o admin enviar esse arquivo à empresa. */
  async baixarPdfRecomendacao(recomendacaoId) {
    const { ok, blob, filename, networkError, detail } = await AuthService.apiDownload(
      `/admin/recomendacoes/${recomendacaoId}/pdf`
    );
    if (networkError) throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
    if (!ok) throw new Error((detail && detail.detail) || "Não foi possível gerar o PDF.");

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `compatibilidade_${recomendacaoId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** Histórico de importações (PDF de convênios, planilha de
   * empresas/vagas, e futuramente COOPC). */
  listImportacoes() {
    return apiGet("/admin/importacoes");
  },

  /** Envia o PDF de convênios da UFRB para o backend processar
   * (PyMuPDF) e gravar empresas/convênios — retorna o relatório da
   * importação (total de linhas, sucesso, erros por linha). */
  async importarConveniosPdf(file) {
    const { ok, data, networkError } = await AuthService.apiUpload("/admin/importacoes/convenios-pdf", file);
    if (networkError) throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
    if (!ok) throw new Error((data && data.detail) || "Não foi possível processar o arquivo.");
    return data;
  },

  /** Fase 12: envia uma planilha (CSV ou XLSX) de empresas + convênios
   * + vagas para o backend interpretar linha a linha e gravar cada
   * dado no campo correto (nunca como blob de texto). */
  async importarEmpresasVagasPlanilha(file) {
    const { ok, data, networkError } = await AuthService.apiUpload("/admin/importacoes/empresas-vagas", file);
    if (networkError) throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
    if (!ok) throw new Error((data && data.detail) || "Não foi possível processar o arquivo.");
    return data;
  },
};

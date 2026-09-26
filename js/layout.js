/**
 * layout.js
 * Interações do cabeçalho e da barra lateral compartilhadas por todas
 * as páginas: no mobile, o botão de menu ABRE a barra lateral como uma
 * sobreposição; no desktop/web, o mesmo botão RECOLHE a barra lateral
 * (que já vem visível), expandindo o conteúdo no espaço liberado.
 */
(function () {
  const DESKTOP_BREAKPOINT = "(min-width: 861px)";

  function initLayout() {
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");

    if (!menuToggle || !sidebar || !backdrop) return;

    function isDesktop() {
      return window.matchMedia(DESKTOP_BREAKPOINT).matches;
    }

    // ---- Mobile: sidebar começa escondida; o botão a exibe por cima ----
    function openMobileMenu() {
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
    }

    function closeMobileMenu() {
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
    }

    // ---- Desktop: sidebar começa visível; o botão a recolhe ----
    function collapseDesktopSidebar() {
      sidebar.classList.add("is-collapsed");
    }

    function expandDesktopSidebar() {
      sidebar.classList.remove("is-collapsed");
    }

    menuToggle.addEventListener("click", function () {
      if (isDesktop()) {
        if (sidebar.classList.contains("is-collapsed")) {
          expandDesktopSidebar();
        } else {
          collapseDesktopSidebar();
        }
      } else if (sidebar.classList.contains("is-open")) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    backdrop.addEventListener("click", closeMobileMenu);

    sidebar.querySelectorAll(".sidebar__link").forEach(function (link) {
      link.addEventListener("click", function () {
        if (!isDesktop()) closeMobileMenu();
      });
    });

    // Ao redimensionar (ex.: girar o dispositivo ou ajustar a janela),
    // garante que o estado de uma visão não vaze para a outra.
    window.addEventListener("resize", function () {
      if (isDesktop()) {
        closeMobileMenu();
      } else {
        expandDesktopSidebar();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initLayout);
})();

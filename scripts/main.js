(() => {
  const config = globalThis.SITE_CONFIG || {};
  const translate = (key, values) => globalThis.SITE_I18N.t(key, values);
  const safeUrl = (value, allowLocal = false) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      if (["https:", "http:"].includes(url.protocol)) return url.href;
      if (allowLocal && url.protocol === "file:" && !/^[a-z]+:/i.test(value)) return url.href;
    } catch {
      return null;
    }
    return null;
  };

  document.documentElement.classList.add("js");
  document.querySelectorAll("[data-social]").forEach((link) => {
    const url = safeUrl(config[link.dataset.social], link.dataset.social === "cv");
    link.hidden = !url;
    if (url) link.href = url;
    else link.removeAttribute("href");
  });
  if (typeof config.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) {
    document.querySelectorAll("[data-email-link]").forEach((link) => {
      link.href = `mailto:${config.email}`;
    });
    document.querySelectorAll("[data-email-text]").forEach((element) => {
      element.textContent = config.email;
    });
  }

  const portraitUrl = safeUrl(config.photo, true);
  if (portraitUrl) {
    const portrait = document.querySelector("[data-portrait]");
    const placeholder = document.querySelector(".portrait-placeholder");
    portrait.addEventListener("load", () => {
      portrait.hidden = false;
      placeholder.hidden = true;
    });
    portrait.addEventListener("error", () => {
      portrait.hidden = true;
      placeholder.hidden = false;
    });
    portrait.src = portraitUrl;
  }

  const projects = Array.isArray(config.projects)
    ? config.projects.filter((project) => project && typeof project.title === "string" && project.title.trim() && safeUrl(project.url))
    : [];
  if (config.showProjects && projects.length) {
    const projectList = document.querySelector("[data-project-list]");
    projects.forEach((project) => {
      const article = document.createElement("article");
      article.className = "project-item";
      const imageUrl = safeUrl(project.image, true);
      if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = project.imageAlt || project.title;
        image.loading = "lazy";
        article.append(image);
      }
      const heading = document.createElement("h3");
      heading.textContent = project.title;
      const description = document.createElement("p");
      description.textContent = project.description || "";
      const link = document.createElement("a");
      link.className = "text-link";
      link.href = safeUrl(project.url);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `${translate("viewProject")} `;
      const icon = document.createElement("i");
      icon.dataset.lucide = "arrow-up-right";
      icon.setAttribute("aria-hidden", "true");
      link.append(icon);
      article.append(heading, description, link);
      projectList.append(article);
    });
    document.querySelector("#projects").hidden = false;
    document.querySelector("[data-project-nav]").hidden = false;
  }

  const navigation = document.querySelector("#main-nav");
  const menuToggle = document.querySelector(".menu-toggle");
  const closeMenu = () => {
    navigation.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", translate("openMenu"));
  };
  menuToggle.hidden = false;
  menuToggle.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", translate(isOpen ? "closeMenu" : "openMenu"));
  });
  navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navigation.classList.contains("is-open")) {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });

  const publications = [...document.querySelectorAll("[data-category]")];
  document.querySelector(".filters").hidden = false;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      publications.forEach((publication) => {
        publication.hidden = filter !== "all" && publication.dataset.category !== filter;
      });
      document.querySelector(".publication-grid").hidden = filter === "systems";
      document.querySelector(".systems-publications").hidden = filter === "documents";
      document.querySelector("[data-author-note]").hidden = filter === "systems";
      const count = publications.filter((publication) => !publication.hidden).length;
      document.querySelector("#filter-status").textContent = translate("results", { count });
    });
  });

  const dialog = document.querySelector(".figure-dialog");
  let activeFigure;
  if (typeof dialog.showModal === "function") {
    document.querySelectorAll("[data-lightbox]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        activeFigure = link;
        const image = dialog.querySelector(".dialog-image");
        image.src = link.href;
        image.alt = link.querySelector("img").alt;
        dialog.querySelector("#figure-caption").textContent = link.dataset.caption;
        dialog.querySelector(".original-image").href = link.href;
        dialog.showModal();
      });
    });
    dialog.querySelector(".close-dialog").addEventListener("click", () => dialog.close());
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dialog.close();
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  }

  const copyButton = document.querySelector(".copy-email");
  if (navigator.clipboard?.writeText) {
    copyButton.hidden = false;
    let copyTimeout;
    copyButton.addEventListener("click", async () => {
      const status = document.querySelector("#copy-status");
      clearTimeout(copyTimeout);
      try {
        await navigator.clipboard.writeText(document.querySelector("[data-email-text]").textContent);
        status.dataset.message = "copied";
      } catch {
        status.dataset.message = "copyFailed";
      }
      status.textContent = translate(status.dataset.message);
      copyTimeout = setTimeout(() => {
        status.textContent = "";
        delete status.dataset.message;
      }, 5000);
    });
  }

  const updateLanguage = () => {
    menuToggle.setAttribute("aria-label", translate(navigation.classList.contains("is-open") ? "closeMenu" : "openMenu"));
    const filterStatus = document.querySelector("#filter-status");
    if (filterStatus.textContent) filterStatus.textContent = translate("results", { count: publications.filter((publication) => !publication.hidden).length });
    const copyStatus = document.querySelector("#copy-status");
    if (copyStatus.dataset.message) copyStatus.textContent = translate(copyStatus.dataset.message);
    if (dialog.open && activeFigure) {
      dialog.querySelector("#figure-caption").textContent = activeFigure.dataset.caption;
      dialog.querySelector(".dialog-image").alt = activeFigure.querySelector("img").alt;
    }
    document.querySelectorAll(".project-item").forEach((article, index) => {
      const project = projects[index];
      const chinese = globalThis.SITE_I18N.language === "zh";
      article.querySelector("h3").textContent = chinese && project.titleZh ? project.titleZh : project.title;
      article.querySelector("p").textContent = chinese && project.descriptionZh ? project.descriptionZh : project.description || "";
      article.querySelector("a").firstChild.textContent = `${translate("viewProject")} `;
    });
  };
  document.addEventListener("languagechange", updateLanguage);
  updateLanguage();

  const navLinks = [...navigation.querySelectorAll(".nav-link")];
  if ("IntersectionObserver" in globalThis) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const isActive = link.hash === `#${entry.target.id}`;
          link.classList.toggle("active", isActive);
          if (isActive) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-10% 0px -65% 0px", threshold: 0 });
    navLinks.forEach((link) => {
      const section = document.querySelector(link.hash);
      if (section && !section.hidden) observer.observe(section);
    });
  }
  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
  globalThis.lucide?.createIcons();
})();
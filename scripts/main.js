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
  const emailDropdown = document.querySelector(".email-dropdown");
  const emailTrigger = document.querySelector(".email-trigger");
  const emailPanel = document.querySelector(".email-panel");
  let emailPinned = false;
  let copyingWithSelection = false;
  const setEmailOpen = (open) => {
    emailPanel.hidden = !open;
    emailTrigger.setAttribute("aria-expanded", String(open));
  };
  const closeEmails = (restoreFocus = false) => {
    if (restoreFocus && emailPanel.contains(document.activeElement)) emailTrigger.focus({ preventScroll: true });
    emailPinned = false;
    setEmailOpen(false);
  };
  emailDropdown.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch") setEmailOpen(true);
  });
  emailDropdown.addEventListener("pointerleave", () => {
    if (!emailPinned && !emailPanel.contains(document.activeElement)) setEmailOpen(false);
  });
  emailTrigger.addEventListener("click", () => {
    emailPinned = !emailPinned;
    setEmailOpen(emailPinned);
  });
  emailDropdown.addEventListener("focusin", () => setEmailOpen(true));
  emailDropdown.addEventListener("focusout", (event) => {
    if (!copyingWithSelection && event.relatedTarget && !emailDropdown.contains(event.relatedTarget)) closeEmails();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!emailDropdown.contains(event.target)) closeEmails();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !emailPanel.hidden) {
      event.preventDefault();
      closeEmails(true);
    }
  });

  const copyAddress = async (address) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(address);
        return;
      } catch {}
    }
    if (typeof document.execCommand !== "function") throw new Error("Clipboard unavailable");
    const previousFocus = document.activeElement;
    const selection = globalThis.getSelection();
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
    const buffer = document.createElement("textarea");
    buffer.className = "clipboard-buffer";
    buffer.value = address;
    buffer.readOnly = true;
    buffer.tabIndex = -1;
    copyingWithSelection = true;
    try {
      document.body.append(buffer);
      buffer.focus({ preventScroll: true });
      buffer.select();
      if (!document.execCommand("copy")) throw new Error("Copy was denied");
    } finally {
      buffer.remove();
      previousFocus?.focus({ preventScroll: true });
      if (selection) {
        selection.removeAllRanges();
        ranges.forEach((range) => selection.addRange(range));
      }
      copyingWithSelection = false;
    }
  };

  const knownEmails = new Set();
  const emails = (Array.isArray(config.emails) ? config.emails : []).filter((entry) => {
    if (!entry || typeof entry.address !== "string") return false;
    const address = entry.address.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || knownEmails.has(address.toLowerCase())) return false;
    knownEmails.add(address.toLowerCase());
    return true;
  });
  const emailRows = [];
  const updateEmailRow = ({ button, status }) => {
    const label = translate("copyEmail", { email: button.dataset.copyEmail });
    button.setAttribute("aria-label", label);
    button.title = label;
    status.textContent = status.dataset.message ? translate(status.dataset.message) : "";
    button.classList.toggle("is-copied", status.dataset.message === "copied");
  };
  document.querySelectorAll("[data-email-list]").forEach((list) => {
    list.replaceChildren();
    emails.forEach((entry) => {
      const row = document.createElement("li");
      row.className = "email-row";
      const info = document.createElement("div");
      info.className = "email-info";
      const label = document.createElement("span");
      label.className = "email-label";
      label.textContent = typeof entry.label === "string" ? entry.label : "";
      const address = document.createElement("span");
      address.className = "email-address";
      address.dir = "ltr";
      address.textContent = entry.address.trim();
      info.append(label, address);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "icon-button copy-email";
      button.dataset.copyEmail = address.textContent;
      for (const [name, className] of [["copy", "copy-glyph"], ["check", "copy-check"]]) {
        const icon = document.createElement("i");
        icon.dataset.lucide = name;
        icon.className = className;
        icon.setAttribute("aria-hidden", "true");
        button.append(icon);
      }
      const status = document.createElement("span");
      status.className = "email-copy-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      const state = { button, status };
      let timeout;
      button.addEventListener("click", async () => {
        if (button.getAttribute("aria-disabled") === "true") return;
        clearTimeout(timeout);
        button.setAttribute("aria-disabled", "true");
        button.setAttribute("aria-busy", "true");
        try {
          await copyAddress(button.dataset.copyEmail);
          status.dataset.message = "copied";
        } catch {
          status.dataset.message = "copyFailed";
        } finally {
          button.removeAttribute("aria-disabled");
          button.removeAttribute("aria-busy");
        }
        updateEmailRow(state);
        timeout = setTimeout(() => {
          delete status.dataset.message;
          updateEmailRow(state);
        }, 5000);
      });
      updateEmailRow(state);
      emailRows.push(state);
      row.append(info, button, status);
      list.append(row);
    });
  });
  emailDropdown.hidden = emails.length === 0;

  const portraitUrl = safeUrl(config.photo, true);
  if (portraitUrl) {
    const portrait = document.querySelector("[data-portrait]");
    const portraitLink = document.querySelector(".portrait-link");
    const placeholder = document.querySelector(".portrait-placeholder");
    portrait.addEventListener("load", () => {
      portrait.hidden = false;
      portraitLink.href = portraitUrl;
      portraitLink.hidden = false;
      placeholder.hidden = true;
    });
    portrait.addEventListener("error", () => {
      portrait.hidden = true;
      portraitLink.hidden = true;
      portraitLink.removeAttribute("href");
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
        if (!link.getAttribute("href")) return;
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

  const updateLanguage = () => {
    menuToggle.setAttribute("aria-label", translate(navigation.classList.contains("is-open") ? "closeMenu" : "openMenu"));
    const filterStatus = document.querySelector("#filter-status");
    if (filterStatus.textContent) filterStatus.textContent = translate("results", { count: publications.filter((publication) => !publication.hidden).length });
    emailRows.forEach(updateEmailRow);
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
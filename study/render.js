(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.createStudyRenderer = factory;
})(typeof globalThis === "object" ? globalThis : this, function (libraries) {
  "use strict";
  const errors = [];
  const engine = {
    renderToString(formula, options) {
      try {
        return libraries.katex.renderToString(formula, { ...options, trust: false, throwOnError: true, strict: "ignore" });
      } catch (error) {
        errors.push({ formula, message: error.message });
        throw error;
      }
    }
  };
  const markdown = libraries.markdownit({ html: false, linkify: false, typographer: false, breaks: false });
  markdown.use(libraries.texmath, { engine, delimiters: ["dollars", "brackets"], katexOptions: { trust: false, throwOnError: true, strict: "ignore" } });
  markdown.validateLink = address => address.startsWith("#/") || /^https:\/\//i.test(address);
  const defaultLink = markdown.renderer.rules.link_open || ((tokens, index, options, environment, renderer) => renderer.renderToken(tokens, index, options));
  markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
    if (/^https:\/\//i.test(tokens[index].attrGet("href") || "")) {
      tokens[index].attrSet("target", "_blank");
      tokens[index].attrSet("rel", "noopener noreferrer");
      tokens[index].attrSet("referrerpolicy", "no-referrer");
    }
    return defaultLink(tokens, index, options, environment, renderer);
  };

  function render(text) {
    const html = markdown.render(String(text || ""));
    return libraries.purifier.sanitize(html, {
      USE_PROFILES: { html: true, mathMl: true, svg: true },
      ADD_TAGS: ["eq", "eqn"],
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
      ALLOW_DATA_ATTR: false
    });
  }

  return { render, errors };
});
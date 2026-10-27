(() => {
  const entries = [];
  const register = (selector, chinese, mode = "text") => {
    document.querySelectorAll(selector).forEach((element) => {
      const textNodes = [...element.childNodes].filter((node) => node.nodeType === 3 && node.textContent.trim());
      const english = mode === "html" ? element.innerHTML : mode === "text" ? textNodes.map((node) => node.textContent).join("") : element.getAttribute(mode);
      entries.push({ element, chinese, english, mode, textNodes });
    });
  };

  register(".skip-link", "跳转到正文");
  register(".wordmark", "汪元喆");
  register(".wordmark", "汪元喆，返回顶部", "aria-label");
  register("#intro-title", "汪元喆");
  register("[data-owner-name]", "汪元喆");
  register("#main-nav", "主导航", "aria-label");
  register(".language-switch", "语言", "aria-label");
  register(".nav-link[href='#about']", "关于");
  register(".nav-link[href='#publications']", "研究成果");
  register(".nav-link[href='#experience']", "科研实习");
  register(".nav-link[href='#education']", "教育背景");
  register(".nav-link[href='#projects']", "项目");
  register(".intro-eyebrow", "中国科学院计算技术研究所 · 硕士研究生");
  register(".intro-location", "中国 · 北京");
  register(".profile-affiliation", "中国科学院计算技术研究所<br>中国科学院大学", "html");
  register(".portrait-placeholder", "个人照片预留位置：Yuanzhe Wang 姓名缩写", "aria-label");
  register("[data-portrait]", "汪元喆的个人照片", "alt");
  register(".intro-lead", "关于我");
  register(".bio p:nth-child(2)", "我目前是<a href='https://www.ict.ac.cn/' target='_blank' rel='noopener noreferrer'>中国科学院计算技术研究所</a>的硕士研究生，就读于中国科学院大学，师从高性能中心的<strong>元国军高级工程师</strong>。此前，我于<a href='https://www.ustc.edu.cn/' target='_blank' rel='noopener noreferrer'>中国科学技术大学</a>获得信息安全专业工学学士学位。", "html");
  register(".bio p:nth-child(3)", "在计算所，我参与<strong>面向分子动力学模拟的 AI4S 计算加速芯片研发</strong>，负责验证工作，并参与部分设计。在此前的科研实习中，我的研究与实践涉及大语言模型智能体框架的设计、搭建与训练，智能体能力评测数据集的构建，以及预训练数据处理与算法研究。", "html");
  register(".bio p:nth-child(4)", "目前，我的研究兴趣主要集中在<strong>大语言模型训练中的数据科学</strong>，包括数据配比、数据质量、数据利用与训练效率，以及同一数据在多轮训练中的效果。此外，我也关注<strong>后训练算法</strong>与<strong>面向长程智能体后训练的数据构建</strong>。", "html");
  register(".research-note", "研究兴趣", "aria-label");
  register(".research-note .eyebrow", "当前研究兴趣");
  register(".research-note li:nth-child(1)", "大语言模型训练中的数据科学");
  register(".research-note li:nth-child(2)", "后训练算法");
  register(".research-note li:nth-child(3)", "长程智能体数据构建");
  register(".social-links", "个人链接", "aria-label");
  register(".email-trigger", "邮箱");
  register(".email-panel", "邮箱地址", "aria-label");
  register("[data-social=scholar]", "谷歌学术");
  register("[data-social=cv]", "简历");
  register("#publications .section-index", "研究成果");
  register("#publications-title", "论文与海报");
  register("#publications .section-side-note", "谷歌学术");
  register(".filters", "筛选研究成果", "aria-label");
  register("[data-filter=all]", "全部");
  register("[data-filter=documents]", "文档智能");
  register("[data-filter=systems]", "AI4S 芯片");
  register("#docatlas .publication-type, #xl-docbench .publication-type, #triooo .publication-type", "海报");
  register("#wavecc .publication-type", "会议论文");
  register("#docatlas .paper-subtitle", "基于可变状态交互的长文档理解");
  register("#xl-docbench .paper-subtitle", "面向证据溯源的超长文档理解评测");
  register("#docatlas .paper-description", "通过搜索、阅读与证据回写，让文档结构和智能体记忆随交互持续更新的文档框架。");
  register("#xl-docbench .paper-description", "经过人工核验的超长文档基准，既评测答案，也追踪跨越数千页上下文的支撑证据。");
  register("#docatlas .paper-result > span:nth-child(2)", "GPT-5.4 在 MMLongBench-Doc<br>上的准确率", "html");
  register("#xl-docbench .paper-result > span:nth-child(2)", "最长上下文页数<br>1,519 道专家核验问题", "html");
  register(".contribution summary", "个人贡献");
  register("#docatlas .contribution p", "共同设计 SEARCH / READ / NOTE / REVIEW 工具框架及证据更新的树结构记忆，使用 GRPO / DAPO 训练智能体。强化学习后的 Qwen3.5-4B 达到 63.7% 准确率，直接输入基线为 54.4%。");
  register("#xl-docbench .contribution p", "共同开发树结构引导的问题合成、路径依赖检查和五阶段过滤流程，协调 194 位专家核验六个领域的数据，并从 12 类推理任务评估 27 个系统。");
  register(".paper-links a[href*='arxiv.org'], .paper-links a[href*='doi.org']", "论文");
  register(".paper-links a[href*='officeintelligence']", "项目主页");
  register(".paper-links a[href*='github.com']", "代码");
  register(".paper-links a[href*='huggingface.co']", "数据集");
  register("#triooo .paper-subtitle", "面向机器学习分子动力学的可扩展专用加速器框架");
  register("#triooo .authors", "中科院计算所 · AI4S 加速芯片");
  register("#triooo .paper-description", "面向机器学习分子动力学的可扩展 AI4S 加速芯片框架，结合可复用计算模块、分层查找表存储与三级乱序调度。");
  register("#triooo .contribution p", "构建分子动力学优化策略的验证数据集，并参与 NNMD 加速器框架中的多项式优化实现。");
  register("#triooo .paper-availability span", "论文尚未公开。");
  register("#triooo .figure-credit", "图 5，提取自参考稿。");
  register("#wavecc .paper-subtitle", "面向分子动力学的晶圆级片上网络信用引导拥塞控制");
  register("#wavecc .paper-description", "面向晶圆级 AI4S 芯片上分子动力学负载的信用引导拥塞控制。WaveCC 利用路由器信用反馈，动态调节通信步长与各处理单元的注入速率，无需修改路由器微架构。");
  register("#wavecc .contribution p", "基于 BookSim2 和 LAMMPS 收集基线测量结果与包级轨迹，支持评估晶圆级芯片上面向分子动力学负载的信用引导拥塞控制。");
  register("#wavecc .figure-credit > span", "图 7，裁取自");
  register(".author-note", "* 共同贡献。所列成果来自科研实习及在中科院计算所参与的研究工作。");
  register("#experience .section-index", "科研经历");
  register("#experience-title", "科研实习");
  register(".experience-item:nth-child(1) .experience-date > span:first-child", "2026.06 — 2026.09");
  register(".experience-item:nth-child(2) .experience-date > span:first-child", "2025.10 — 2026.05");
  register(".experience-item:nth-child(1) .role", "研究实习生 <span>/</span> Backbone 团队", "html");
  register(".xyz-mark", "XYZ AI Lab 官方网站", "aria-label");
  register(".experience-item:nth-child(2) h3", "微软亚洲研究院");
  register(".experience-item:nth-child(2) .role", "研究实习生 <span>/</span> <a href='https://officeintelligence.github.io/' target='_blank' rel='noopener noreferrer'>Office Intelligence</a>", "html");
  register(".experience-item:nth-child(1) .experience-summary", "面向大语言模型预训练的文档数据处理与基础设施。");
  register(".experience-item:nth-child(2) .experience-summary", "长文档理解、证据溯源与智能体强化学习。");
  register(".experience-item:nth-child(1) .experience-points li:nth-child(1)", "搭建<strong>千卡规模分布式 OCR 流水线</strong>，用于大语言模型预训练数据处理。", "html");
  register(".experience-item:nth-child(1) .experience-points li:nth-child(2)", "开发 OCR 输出后处理流程，支持下游预训练数据准备。");
  register(".experience-item:nth-child(1) .experience-points li:nth-child(3)", "执行预训练算法实验并分析结果，辅助评估算法表现。");
  register(".experience-item:nth-child(2) .experience-points li:nth-child(1)", "作为核心贡献者参与 <a href='#publications'>DocAtlas 和 XL-DocBench</a>，两项工作均为 NeurIPS 2026 Poster。", "html");
  register(".experience-item:nth-child(2) .experience-points li:nth-child(2)", "构建 STEM PDF 到问答数据的处理流水线，涵盖文档树解析、带证据的问答抽取，以及规则校验与大模型评审，用于强化学习训练数据。");
  register(".experience-item:nth-child(1) .tags span:nth-child(1)", "分布式 OCR");
  register(".experience-item:nth-child(1) .tags span:nth-child(2)", "预训练数据");
  register(".experience-item:nth-child(1) .tags span:nth-child(3)", "基础设施");
  register(".experience-item:nth-child(2) .tags span:nth-child(1)", "文档理解");
  register(".experience-item:nth-child(2) .tags span:nth-child(2)", "智能体强化学习");
  register(".experience-item:nth-child(2) .tags span:nth-child(3)", "数据构建");
  register(".research-footnote p", "<strong>中科院计算所 · AI4S 计算加速芯片</strong><span>2025.07 — 至今</span><br>参与 DPMD 项目，围绕分子动力学计算开展 AI for Science（AI4S）加速芯片相关研究，包括 TriOoO、WaveCC，以及基于 gem5 的周期精确加速器模拟器，涉及原子存储、处理单元阵列和分组交换路由器。", "html");
  register("#education .section-index", "教育经历");
  register("#education-title", "教育背景");
  register(".education-item:nth-child(1) .education-date", "2025 — 2028 <span>预计</span>", "html");
  register(".education-item:nth-child(1) h3", "中国科学院大学", "html");
  register(".education-item:nth-child(2) h3", "中国科学技术大学", "html");
  register(".education-item:nth-child(1) .degree", "电子信息 · 工程硕士");
  register(".education-item:nth-child(2) .degree", "信息安全 · 工学学士");
  register(".education-item:nth-child(1) .education-detail", "中国科学院计算技术研究所<br>中国 · 北京", "html");
  register(".education-item:nth-child(2) .education-detail", "网络空间安全学院<br>中国 · 合肥", "html");
  register(".education-item:nth-child(1) .text-link", "中国科学院大学");
  register(".education-item:nth-child(2) .text-link", "中国科学技术大学");
  register("#projects .section-index", "开源项目");
  register("#projects-title", "项目");
  register(".site-footer > a", "返回顶部");
  register(".close-dialog", "关闭图片", "aria-label");
  register(".close-dialog", "关闭图片", "title");
  register(".original-image", "打开原图");
  register("#docatlas [data-lightbox]", "DocAtlas：可变状态文档框架", "data-caption");
  register("#xl-docbench [data-lightbox]", "XL-DocBench：树结构引导合成与人工核验", "data-caption");
  register("#docatlas [data-lightbox]", "放大 DocAtlas 框架图", "aria-label");
  register("#xl-docbench [data-lightbox]", "放大 XL-DocBench 构建流程图", "aria-label");
  register("#docatlas .publication-image img", "DocAtlas 框架：智能体搜索与阅读文档树，记录有据可循的笔记并回顾记忆。", "alt");
  register("#xl-docbench .publication-image img", "XL-DocBench 流程：文档树、分支依赖问题合成、质量过滤与专家核验。", "alt");
  register("#triooo [data-lightbox]", "TriOoO：架构与三级乱序调度（图 5）", "data-caption");
  register("#wavecc [data-lightbox]", "WaveCC：信用引导的注入控制与路由器接口（图 7）", "data-caption");
  register("#triooo [data-lightbox]", "放大 TriOoO 架构图", "aria-label");
  register("#wavecc [data-lightbox]", "放大 WaveCC 总览图", "aria-label");
  register("#triooo .publication-image img", "TriOoO 架构：三级乱序调度、可复用计算模块与共享片上查找表。", "alt");
  register("#wavecc .publication-image img", "WaveCC 总览：信用采样引擎、步长计算、注入速率控制及处理单元与路由器接口。", "alt");
  register("meta[name=description]", "汪元喆，中国科学院计算技术研究所硕士研究生，就读于中国科学院大学，关注大语言模型训练中的数据科学、后训练算法及长程智能体数据构建。", "content");
  register("meta[property='og:description']", "汪元喆的学术主页：大语言模型训练中的数据科学、后训练算法与长程智能体。中国科学院计算技术研究所硕士研究生。", "content");

  const messages = {
    en: { pageTitle: "Yuanzhe Wang | Personal Homepage", openMenu: "Open navigation", closeMenu: "Close navigation", copyEmail: "Copy {email}", copied: "Email copied!", copyFailed: "Could not copy. You can select the address instead.", results: "Showing {count} publications.", viewProject: "View project" },
    zh: { pageTitle: "汪元喆 | 个人主页", openMenu: "展开导航", closeMenu: "收起导航", copyEmail: "复制 {email}", copied: "邮箱已复制", copyFailed: "复制失败，请选中邮箱地址手动复制。", results: "当前显示 {count} 项研究成果。", viewProject: "查看项目" }
  };
  let language = "en";
  const translate = (key, values = {}) => {
    let text = messages[language][key] || key;
    Object.entries(values).forEach(([name, value]) => { text = text.replace(`{${name}}`, value); });
    return text;
  };
  const setLanguage = (next, persist = true) => {
    language = next === "zh" ? "zh" : "en";
    entries.forEach(({ element, chinese, english, mode, textNodes }) => {
      const value = language === "zh" ? chinese : english;
      if (mode === "html") element.innerHTML = value;
      else if (mode === "text") {
        textNodes.forEach((node, index) => { node.textContent = index === 0 ? value : ""; });
      } else element.setAttribute(mode, value);
    });
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = translate("pageTitle");
    document.querySelector("meta[property='og:title']").content = translate("pageTitle");
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });
    if (persist) {
      try { localStorage.setItem("homepage-language", language); } catch {}
    }
    globalThis.lucide?.createIcons();
    document.dispatchEvent(new CustomEvent("languagechange", { detail: { language } }));
  };
  globalThis.SITE_I18N = { t: translate, setLanguage, get language() { return language; } };
  document.querySelector(".language-switch").hidden = false;
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
  });
  let preferred;
  try { preferred = localStorage.getItem("homepage-language"); } catch {}
  const requested = new URLSearchParams(location.search).get("lang");
  setLanguage(["en", "zh"].includes(requested) ? requested : preferred, false);
})();
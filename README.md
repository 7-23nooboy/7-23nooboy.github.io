# Yuanzhe Wang · Personal Homepage

静态学术主页，支持中英切换、论文分类筛选、贡献说明展开和论文图片放大。可直接打开 [index.html](index.html)，不需要启动服务器或构建项目。

## 修改个人信息

个人链接、照片、简历和项目开关集中在 [site.config.js](site.config.js)。

### 个人照片

当前已启用个人照片，配置如下：

```js
photo: "assets/images/portrait.webp",
```

原始 `assets/images/portrait.jpg` 保留在本地且已加入 Git 忽略，不随网站发布。网页使用单独生成的 WebP 展示副本：840 × 1008 像素、约 148 KB，保留面部和上半身构图，不包含原图 EXIF 信息。

本地更换照片：

1. 将新原图放到 `assets/images/portrait.jpg`，不改动原始文件内容。
2. 在仓库目录运行 `node scripts/prepare-portrait.cjs`，重新生成 `portrait.webp`。当前裁剪区域针对这张照片设置；换成不同构图时，需调整脚本中的 `crop` 并检查预览。
3. 刷新本地主页。确认后，将生成的 `portrait.webp` 和必要的配置改动一起提交、推送，GitHub Pages 部署后线上生效；原始 JPG 不需提交。

也可以在网站文件已推送到 GitHub 后，进入仓库的 `assets/images` 目录，选择 **Add file → Upload files** 上传已处理好的展示照片并提交，再按需编辑根目录的 `site.config.js`。注意将网页端改动同步回本地。若继续使用 `portrait.webp` 这个文件名，则无需更改配置。

也支持 PNG、WebP 等格式，路径及大小写应与实际文件名完全一致，不要仅修改文件扩展名。推荐约 5:6 的竖版照片，例如 800 × 960 像素；显示区域会居中裁剪。桌面照片区域为 210 × 252 像素，小屏幕会自动缩小。未配置或图片加载失败时显示姓名缩写，不会使用 GitHub 头像。

照片发布后是公开可访问的静态文件。建议上传前移除不希望公开的 EXIF 信息（如拍摄地点）。

### 自我介绍与双语

- 英文介绍：修改 [index.html](index.html) 中 `#about` 下的 `.bio` 段落。
- 中文介绍：修改 [scripts/i18n.js](scripts/i18n.js) 中 `.bio p:nth-child(2)`（教育与导师）、`.bio p:nth-child(3)`（科研与实习经历）和 `.bio p:nth-child(4)`（当前研究兴趣）对应的中文内容。
- 研究兴趣：英文在 `.research-note`，中文在相同选择器的翻译配置中。
- 更新英文内容后，需要同步维护中文翻译。翻译层会读取页面中的英文原文，不需要维护第二份英文词典。
- 页面默认英文，记住访客主动选择的语言；`?lang=zh` 和 `?lang=en` 可直接指定语言。
- 中文模式的页眉、首屏主标题和页脚显示“汪元喆”，英文模式显示“Yuanzhe Wang”；中文模式不重复显示同名副标题。
- 论文名、作者姓名、会议名与技术名词保留原文。图中文字来自原论文，未改动。

`scripts/i18n.js` 中的 HTML 翻译是受控的静态内容，不应接入未清理的外部输入。新增段落或调整结构时，同步更新翻译选择器。

### 社交链接与简历

邮箱、GitHub、Google Scholar 和 LinkedIn 已配置。邮箱使用 [site.config.js](site.config.js) 中的 `emails` 数组，每项包含 `label` 与 `address`，目前包括 USTC、Gmail 和 UCAS 三个地址。

联系方式统一放在 About 下方，不再保留独立 Contact 区域或导航入口。“邮箱”支持鼠标悬停、键盘聚焦或点击展开，弹层带有 180 毫秒的淡入下移动画，每个地址旁有独立的复制按钮。Escape、点击外部或将焦点移到外部控件可关闭列表。地址是可选取的普通文本，不使用 `mailto:` 链接。

复制优先使用 Clipboard API，失败或不可用时尝试兼容复制；如果浏览器仍拒绝，会显示手动选择地址的提示。编辑 `emails` 后，也请同步 [index.html](index.html) 中 `noscript` 内的静态邮箱列表，作为禁用 JavaScript 时的可展开后备内容。

像素装饰分置于页眉和页脚：狗狗从页眉姓名旁的分隔线探头，鼠标悬停时笑着抬爪挥手，移开恢复常态；挥爪每 800 毫秒播放四帧，仅悬停时循环。页脚使用短身、大头、白爪的橘色虎斑猫，四帧步行动画每 14 秒完成一次往返；鼠标悬停在猫身上时，它会在当前位置停下并转向正面，移开后继续走。活动范围随屏幕宽度缩小，系统开启“减少动态效果”时停止自动移动和挥爪循环，但静态抬爪、正面表情仍可见。

将 `cv` 设置为实际 PDF 的相对路径即可显示简历入口。可选社交链接留空会隐藏，不产生占位死链。

页面不公开简历中的手机号。

### 项目

目前 `showProjects: false`，项目区和导航入口均隐藏。以后有项目时，填写 `projects` 并启用开关：

```js
showProjects: true,
projects: [
  {
    title: "Project name",
    titleZh: "项目名称",
    description: "A short project description.",
    descriptionZh: "项目简述。",
    url: "https://github.com/7-23nooboy/your-project",
    image: "assets/images/your-project.webp",
    imageAlt: "Project overview"
  }
],
```

`image`、`imageAlt`、`titleZh`、`descriptionZh` 为可选项。没有有效项目时，即使开关打开也不会显示空栏目。

## GitHub Pages 发布

1. 在本地确认个人信息与照片，再将需要公开的文件提交并推送到本仓库的 `main` 分支。
2. 打开 GitHub 仓库的 **Settings → Pages**。
3. Source 选择 **Deploy from a branch**，分支选择 **main**，目录选择 **/(root)**。
4. 等待 GitHub Pages 部署完成，访问 https://7-23nooboy.github.io/。

这是纯静态站点，不需要上传 `node_modules`，也不需要在 GitHub 上执行 npm 构建。`.nojekyll` 禁用不需要的 Jekyll 处理。测试截图已被 Git 忽略。

## 开发与验证

在仓库目录下执行：

```sh
npm ci
npm test
```

重新生成原创像素猫狗 PNG 和压缩的论文预览图：

```sh
node scripts/generate-assets.cjs
```

网站运行不依赖 npm 包或外部 CDN；开发依赖仅用于测试和素材生成。

## 素材来源

- XYZ AI Lab 标识取自[官方站点](https://xyz-lab.ai/)的[透明背景深色字标](https://xyz-lab.ai/assets/logo-sources/derivatives/logo-derived-014-transparent-bg-black-text-xyz-ai-lab-wordmark.svg)，于 2026-10-27 原样下载至 `assets/images/xyz-ai-lab.svg`，仅用于标明实习机构，不表示官方背书。
- DocAtlas 框架图来自 [官方项目主页](https://officeintelligence.github.io/docatlas/)，对应原始论文内容。
- XL-DocBench 流程图来自 [官方项目主页](https://officeintelligence.github.io/xl-docbench/)。
- TriOoO 架构图提取自用户提供的本地参考稿第 6 页 Figure 5，只保留图像区域，不含页眉、审稿行号或正文。参考稿尚未公开，主页不提供 PDF、占位 DOI 或未核实的作者名单；MICRO 2026 Poster 信息沿用用户简历。发布前应确认这张图本身可以公开展示。
- WaveCC 总览图提取自正式论文第 8 页（印刷页码 1568）的 Figure 7，来源为 Tao Jiang 等人的 [Credit-Guided Congestion Control on Wafer-Scale On-Chip Networks for Molecular Dynamics](https://doi.org/10.1145/3789240.3829210)，SIGCOMM 2026，按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 使用。对原页面仅做了图像区域裁剪与预览压缩，来源和许可证保留在点击放大的弹窗中，列表不显示图号或图注。作者顺序依据本地正式论文，并与 [SIGCOMM 官方录用列表](https://conferences.sigcomm.org/sigcomm/2026/accepted/)核对。
- 原始高清 PNG 保留用于放大查看，页面预览使用生成的 WebP。
- 像素猫狗由 [scripts/generate-assets.cjs](scripts/generate-assets.cjs) 中的像素矩阵原创生成。猫猫使用 `pixel-cat-walk.png` 中的四个 96 × 96 像素步行帧以及 `pixel-cat-front.png` 正面表情，网页上按 64 × 64 像素显示；狗狗的常态和四帧挥爪素材分别为 `pixel-dog-peek.png` 与 `pixel-dog-wave.png`，每帧为 96 × 72 像素。
- Lucide 图标库已本地化，许可证位于 [assets/vendor/LICENSE](assets/vendor/LICENSE)。
- Bricolage Grotesque 与 DM Sans 字体已本地化，分别附有 [Bricolage 字体许可证](assets/fonts/bricolage-OFL.txt) 与 [DM Sans 字体许可证](assets/fonts/dm-sans-OFL.txt)。

四篇论文均采用配图、简介和可展开的个人贡献说明。翻译使用 `#docatlas`、`#xl-docbench`、`#triooo`、`#wavecc` 等稳定 ID，调整顺序不会改变对应的翻译。论文稿件的版本状态与会议展示类型分别标注，未将 TriOoO 参考稿误标为公开论文。

## 本地论文处理

四份原始 PDF 留在站点仓库之外，不随网站发布。`.work/` 用于临时整页渲染，已被 Git 忽略。主页仅包含所选图像及对应的 WebP 预览；未公开稿件原文不应放入 `assets`。

当前裁图使用 `pdftoppm`，以 216 DPI 渲染，再裁取以下像素区域：

| 配图 | PDF 页码 | 左上角 (x, y) | 宽 × 高 |
| --- | --- | --- | --- |
| TriOoO Figure 5 | 6 | 168, 237 | 1500 × 537 |
| WaveCC Figure 7 | 8 | 150, 240 | 1536 × 315 |

输出分别为 `assets/images/triooo.png` 和 `assets/images/wavecc.png`；随后运行 `node scripts/generate-assets.cjs` 更新预览。正式版本若重新排版，需重新确认页码和裁图边界。
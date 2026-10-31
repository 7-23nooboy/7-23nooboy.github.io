(function (root, factory) {
  const formulas = factory();
  if (typeof module === "object" && module.exports) module.exports = formulas;
  else root.STUDY_FORMULAS = formulas;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";
  return [
    {
      id: "loss", title: "NLL、PPL 与字节归一化", category: "数据与目标", note: "data-02", question: "Q25",
      symbols: [["$p_\\theta(x_t\\mid x_{<t})$", "模型给真实下一个token的概率"], ["$m_t$", "目标位置的二值mask，参与监督为1"], ["$T$", "实际被监督的目标数量"], ["$B$", "同一原始文本的字节数，不是batch大小"]],
      body: String.raw`### 1. 从概率到损失
自回归联合概率是条件概率的乘积。取负自然对数，把乘积变成可求和的损失：
$$-\log p_\theta(x)=\sum_t-\log p_\theta(x_t\mid x_{<t}).$$
对同一组有效目标，先求loss总和，再除目标数：
$$L=\frac{\sum_t m_t[-\log p_\theta(x_t\mid x_{<t})]}{\sum_t m_t},\qquad T=\sum_t m_t>0.$$
### 2. 为什么PPL要取指数
PPL把平均负对数变回概率尺度，可解释为模型对真实目标概率的几何平均的倒数：
$$\mathrm{PPL}=e^L=\left(\prod_{t:m_t=1}\frac1{p_\theta(x_t\mid x_{<t})}\right)^{1/T}.$$
若使用以2为底的对数，反变换应为$2^L$，不能混用自然对数和底数2。
### 3. 怎样实际计算
三个真实目标的预测概率分别为$0.5,0.25,0.25$，先算$L=(\log2+\log4+\log4)/3$，再取$e^L=32^{1/3}\approx3.175$。不要先对每个文档算PPL再算术平均。
跨tokenizer可补充同一原始字节内容的$\mathrm{BPB}=\mathrm{NLL}_{\mathrm{sum}}/(B\ln2)$。必须固定目标文本、边界及计分上下文；BPB也不是任务能力分数。`,
      boundary: "不同tokenizer、上下文、切窗和mask下的每token PPL不能直接横比。prompt不直接计loss，不代表它不参与上下文计算或没有梯度。"
    },
    {
      id: "mixture", title: "文档概率怎样变成token配比", category: "数据与目标", note: "data-04", question: "Q13",
      symbols: [["$s_i$", "先选择第i个域的概率"], ["$\\mu_i$", "该域每次抽样的平均有效长度"], ["$p_i$", "长期累计token份额"], ["$U_i,D,E_i$", "独立库存、总曝光预算、平均重复轮数"]],
      body: String.raw`### 1. 先求各域的期望总量
独立抽取$n$篇文档，域$i$预计贡献$n s_i\mu_i$个tokens；所有域预计贡献$n\sum_j s_j\mu_j$。大样本累计份额因此趋近：
$$p_i=\frac{s_i\mu_i}{\sum_j s_j\mu_j}.$$
若想反求给定token配比$p_i$的域抽样概率，可取：
$$s_i=\frac{p_i/\mu_i}{\sum_jp_j/\mu_j},\qquad\mu_i>0.$$
### 2. 代入长度，不只看采样配置
代码文档平均4000 tokens、文本平均1000，文档各抽一半，长期代码份额为$2000/(2000+500)=80\%$。若代码只监督一半而文本全监督，改用有效目标长度2000与1000，长期监督份额变为$2/3$。
让累计监督各占一半，解$2000s=1000(1-s)$，得到$s=1/3$。
### 3. 再核对库存是否支撑该配比
$$D_i=p_iD,\qquad E_i=\frac{p_iD}{U_i},\qquad p_i\le\frac{E_{i,\max}U_i}{D}.$$
总预算100B、某域库存2B、最多平均4轮，该域最多8%。若要求至少15%，约束无解，需要改库存、重复上限或预算。`,
      boundary: "这是期望总量之比与长期累计比例，不是有限batch比例的期望。每batch只抽一篇时，代码占比只为0或1，其期望仍为50%。累计曝光比例也不能代替每步梯度目标。"
    },
    {
      id: "sampling", title: "软选择的预算、波动与无偏性", category: "数据与目标", note: "data-03", question: "Q14",
      symbols: [["$\\pi_x$", "文档x的纳入概率"], ["$q_x,\\tau,T_s$", "质量分、阈值、正温度"], ["$\\ell_x,U,B$", "文档长度、全池token总量、保留预算"], ["$\\varepsilon$", "满足底线后的探索保底概率"]],
      body: String.raw`### 1. 把质量分映射为概率
$$\pi_x=\varepsilon+(1-\varepsilon)\sigma\left(\frac{q_x-\tau}{T_s}\right),\qquad T_s>0.$$
固定温度、保底率和有限质量分时，提高阈值会降低保留量。目标方程是$\sum_x\ell_x\pi_x=B$，不是让保留文档数相同。
### 2. 二分阈值之前先检查有无解
阈值趋向两端时，期望保留量趋向$\varepsilon U$和$U$。因此至少要满足：
$$\varepsilon U\le B\le U.$$
端点一般只能在极限达到，也可以显式用常数概率或全保留。100B池、2%保底的下限就是2B，1B预算不能靠继续二分解决。
### 3. 期望满足不等于每次都满足
独立按文档Bernoulli抽样时：
$$\operatorname{Var}(B_{\rm actual})=\sum_x\ell_x^2\pi_x(1-\pi_x).$$
长文档按长度平方贡献波动；相关抽样另有协方差项。事后顺序截断还会改变最终纳入概率。
### 4. 重要性采样必须说清分母
目标文档分布$p$、实际分布$q$，令$S_\theta(x)$为文档loss和，$Z_p=\mathbb E_p[T_x]$。若$Z_p$已知固定，可用：
$$\widehat L_p=\frac1{nZ_p}\sum_{j=1}^n\frac{p(x_j)}{q(x_j)}S_\theta(x_j).$$
支持集、可积和求导条件满足时才讨论无偏。改除本批随机token数，一般仍有比值偏差；$p/q$本身不消除它。`,
      boundary: "不要给确定损坏、无授权或不满足治理底线的内容分配探索保底。采样概率、loss权重与实际token归一化是三个不同决策。"
    },
    {
      id: "utility", title: "为什么梯度方向能近似数据效用", category: "数据与目标", note: "data-01", question: "Q02",
      symbols: [["$g_x$", "当前样本训练梯度"], ["$g_v,H_v$", "固定目标验证loss的梯度与Hessian"], ["$\\eta$", "一步学习率"], ["$P$", "分析时冻结的预条件矩阵"]],
      body: String.raw`### 1. 定义一步改善
SGD更新为$\theta'=\theta-\eta g_x$，验证改善为$u(x)=L_v(\theta)-L_v(\theta')$。对$L_v$在当前点做Taylor展开：
$$u(x)\approx\eta g_v^\top g_x-\frac{\eta^2}{2}g_x^\top H_vg_x.$$
一阶项是方向对齐；样本loss大或梯度范数大，并不能决定内积的正负。
### 2. 步长为什么会改变结论
对固定方向$d$，记$a=g_v^\top d>0$、$b=d^\top H_vd>0$。二次近似给$u\approx\eta a-\eta^2b/2$，所以在余项可控的局部区域，$0<\eta<2a/b$才预测改善。
### 3. 换Adam怎么分析
若仅为分析冻结$P$，更新方向为$Pg_x$，一阶项变成$\eta g_v^\top Pg_x$。真实Adam的矩、动量与bias correction都随历史变化，不能把裸梯度内积当实际一步收益。
先在相同checkpoint、optimizer状态与独立dev批次上，比较少量候选的小步预测和实际loss变化，再考虑规模迁移。`,
      boundary: "这是局部近似，不是长期课程最优性或泛化保证。多个训练步骤、随机性、遗忘、目标分布及模型容量都可能改变样本价值。"
    },
    {
      id: "scaling", title: "从Scaling law推导最优N与D", category: "算力与优化", note: "compute-02", question: "Q31",
      symbols: [["$N,D,C$", "参数量、训练tokens、累计FLOPs"], ["$A,B,\\alpha,\\beta$", "固定数据/模型家族下拟合的正参数"], ["$E$", "该拟合的loss底项"], ["$N_*,D_*$", "连续、无额外约束的计算最优点"]],
      body: String.raw`### 1. 写清目标与约束
$$L(N,D)=E+AN^{-\alpha}+BD^{-\beta},\qquad C\approx6ND.$$
这里假设模型架构与数据预算连续可调，并采用dense模型6ND计数。
### 2. 消去一个变量
代入$D=C/(6N)$，得到：
$$L(N)=E+AN^{-\alpha}+B(6N/C)^\beta.$$
对$N$求导，令导数为零并乘以$N$：
$$\alpha AN^{-\alpha}=\beta BD^{-\beta}.$$
### 3. 解出两个最优量
$$N_* =\left(\frac{\alpha A}{\beta B}\right)^{1/(\alpha+\beta)}\left(\frac C6\right)^{\beta/(\alpha+\beta)},$$
$$D_* =\left(\frac{\beta B}{\alpha A}\right)^{1/(\alpha+\beta)}\left(\frac C6\right)^{\alpha/(\alpha+\beta)}.$$
当$\alpha\approx\beta$时，两者随计算预算近似平方根增长。即使$\alpha=\beta$，$D/N=(B/A)^{1/\alpha}$，也不能推导出普适常数20。
### 4. 如何用于真实决策
先用多个模型/数据预算拟合并留出外推点，再检查离散架构、库存、显存与部署约束。若部署模型固定7B，$N$不再自由，20N不是训练上限。`,
      boundary: "MoE主算量可参考激活参数，不意味着dense损失拟合的N也可直接换成激活参数。更换参数单位时拟合系数也应变换，不能沿用旧A/B。"
    },
    {
      id: "compute", title: "6ND、attention与训练时间怎么推", category: "算力与优化", note: "compute-13", question: "Q34",
      symbols: [["$N$", "dense模型中按矩阵运算口径统计的参数量"], ["$L,S,h_q,d_h$", "层数、序列长度、查询头数、每头宽度"], ["$G,P$", "GPU数量、同精度单卡dense峰值FLOP/s"], ["$m,a$", "训练窗口MFU、额外运行可用率"], ["$D$", "与MFU分子口径一致的token量"]],
      body: String.raw`### 1. 每个参数为何约6次运算
矩阵线性层前向每个参数每token约一次乘法加一次加法，计2 FLOPs；输入梯度和权重梯度各约2，合计约6，所以主项为$6ND$。
### 2. 补上参数主项未覆盖的注意力
完整方阵的QK和AV每层前向各约$2S^2h_qd_h$，训练前后向近似3倍，按tokens除以S：
$$C_{\rm model}\approx D(6N+12LSh_qd_h).$$
相对主项的比例$\epsilon=2LSh_qd_h/N$。固定总tokens时，S变8倍，attention每token项约变8倍，不是整次训练变64倍。
### 3. 算量除实际吞吐能力
$$t_{\rm active}=\frac C{GPm},\qquad t_{\rm wall}=\frac C{GPma}.$$
7B、1T、256卡、每卡989TFLOP/s、MFU40%，忽略attention补项时先算$C=4.2\times10^{22}$，再除$256\times989\times10^{12}\times0.4$，约414718秒，即4.80天；若额外可用率90%，约5.33天。
### 4. 检查有没有重复扣损耗
同一作业若MFU分子由6ND改为完整模型算量，则$m_{\rm full}=(1+\epsilon)m_{6N}$，相除的时间应不变。重算、padding或停顿若已进入所用MFU，不能再无条件乘损耗系数。`,
      boundary: "公式不保证显存可容纳或集群MFU达到假设。FlashAttention主要改物化/访存；GQA的KV头减少不等于所有查询的QK/AV按同比例减少。稀疏峰值不能代入dense预算。"
    },
    {
      id: "memory", title: "训练显存与ZeRO分片怎样记账", category: "算力与优化", note: "compute-14", question: "Q33",
      symbols: [["$N$", "该并行分区管理的参数数"], ["$z$", "对应状态的实际分片度，不必是总GPU数"], ["$b,S,d,L$", "microbatch、序列长、隐层宽、层数"]],
      body: String.raw`### 1. 先按dtype列常驻状态
一个常见全参数Adam设定为：BF16权重2bytes、BF16梯度2、FP32主权重4、两个FP32 moments共8，合计16bytes/参数。
### 2. 逐类判断复制还是分片
$$M_{\rm DDP}=16N,\quad M_{\rm Z1}=4N+12N/z,$$
$$M_{\rm Z2}=2N+14N/z,\quad M_{\rm Z3}=16N/z.$$
ZeRO-1分片optimizer（本设定含主权重）；ZeRO-2再分梯度；ZeRO-3再分参数。7B、z=8时分别为38.5、26.25、14GB，均是静态平均，不是峰值。
### 3. 激活另算
单个BF16$[b,S,d]$张量为$2bSd$bytes。b=2、S=d=4096、L=32，每层只保存一个就累计2GiB；若每层还保存$[b,32,S,S]$，单这一类再需64GiB。
### 4. 峰值按张量生命周期核验
临时all-gather、预取、通信bucket、workspace与激活可能同时存在。按forward/backward/optimizer/checkpoint分别测allocated与reserved峰值；总状态除卡数不够回答能否运行。`,
      boundary: "主权重副本、梯度dtype、offload与optimizer压缩均会改公式。MoE总状态受总参数影响，LoRA微调的显存经验不能直接用于全参数预训练。GB与GiB必须分清。"
    },
    {
      id: "ddp", title: "DDP与梯度累积的全局token均值", category: "算力与优化", note: "training-16", question: "Q27",
      symbols: [["$s_{r,k},n_{r,k}$", "rank r、microbatch k的loss和与有效target数"], ["$T$", "完整累积窗口的全局有效target数"], ["$q$", "梯度规约实际除数，默认DDP为DP副本数"]],
      body: String.raw`### 1. 先定义这一个batch的目标
$$L=\frac{\sum_{r,k}s_{r,k}}{T},\qquad T=\sum_{r,k}n_{r,k}>0.$$
不能平均各microbatch的local mean，那会让target少的部分权重过大。
### 2. 补偿规约除数
若$\mathcal R(g)=q^{-1}\sum_r g_r$，每microbatch反传$q s_{r,k}/T$：
$$\mathcal R\left(\sum_k\nabla\frac{q s_{r,k}}T\right)=\frac1T\sum_{r,k}\nabla s_{r,k}.$$
因此不能再除一次accumulation steps。TP/PP不增加独立数据副本，q不是总GPU数量。
### 3. 用不等长度检查实现
有效数为(1,3,2,4)，loss和为(2,3,6,4)，正确loss为15/10=1.5，local means的平均为1.75。把多卡梯度与单进程合并同一批数据的梯度逐参数对照。
### 4. 未知T和零目标
若窗口结束才知道T，条件允许时先反传s/C，规约后乘$qC/T$，并放在unscale后、clip前。T=0时不算CE均值；是否仍优化独立辅助目标由预先约定的协议一致决定，不能各rank自行退出通信。`,
      boundary: "这个证明只保证同一batch的梯度等价，不保证变长随机batch对总体token风险无偏。独立辅助loss、框架额外缩放、FSDP的buffer与全局norm都应另核。"
    },
    {
      id: "passk", title: "pass@k从组合概率怎样得到", category: "评测与证据", note: "data-17", question: "Q37",
      symbols: [["$n$", "某题生成的同设置候选数"], ["$c$", "通过固定测试的候选数"], ["$k$", "考虑的尝试次数，1≤k≤n"]],
      body: String.raw`### 1. 先算全部失败
从n个候选均匀无放回选k个，共$\binom nk$种；全部落在n−c个失败答案中的组合为$\binom{n-c}k$。
### 2. 用补事件得到至少一次成功
$$\widehat{\mathrm{pass@k}}=1-\frac{\binom{n-c}k}{\binom nk}.$$
当n−c<k时失败组合为0，估计为1。每题分别计算，再按预设题目权重平均。
### 3. 不用巨大阶乘也能算
当n−c≥k时可写为：
$$1-\prod_{j=0}^{k-1}\frac{n-c-j}{n-j}.$$
n=10、c=2、k=3时为$1-56/120\approx53.33\%$；不是简单$3\times20\%=60\%$。
### 4. 解释成功概率与选择能力
固定候选池可直接作组合解释；若解释成模型k次独立生成的成功概率估计，要满足相应同分布独立采样条件。存在正确候选不代表系统知道选择哪一个答案。`,
      boundary: "beam、去重、重排和验证器改变生成/选择协议；不同k、温度、候选预算和测试集不能直接比。训练seed与解码seed的不确定性也不同。"
    },
    {
      id: "statistics", title: "配对差异、置信区间与检验功效", category: "评测与证据", note: "data-17", question: "Q39",
      symbols: [["$d_j=A_j-B_j$", "同一题两个模型的二元成功差，取−1/0/1"], ["$\\Delta$", "平均准确率差，计算时用比例而非百分数"], ["$q,n$", "分歧率与独立题目数"], ["$\\delta$", "预先想检测的改善幅度"]],
      body: String.raw`### 1. 为什么方差是q减Δ平方
因为$d_j^2$只有模型分歧时为1，所以$\mathbb E[d^2]=q$，而$\mathbb E[d]=\Delta$：
$$\operatorname{Var}(d)=q-\Delta^2,\quad\mathrm{SE}(\widehat\Delta)\approx\sqrt{\frac{q-\Delta^2}{n}}.$$
### 2. 粗95%区间
$$\widehat\Delta\pm1.96\mathrm{SE}.$$
n=1000、q=.20、Δ=.02，SE约1.41个百分点，区间约[−0.77,4.77]个百分点。提升2个百分点仍可能不足以稳定区分。
### 3. 先估功效再安排评测
双侧5%、80%功效的粗样本量为：
$$n\approx\frac{(1.96+0.84)^2q}{\delta^2}.$$
q=.20、δ=.02得到3920个独立题；同源改写题不能直接算成独立3920题。
### 4. 非劣效是另一问题
若允许回退ε，要检验增益是否高于−ε，不能以p>0.05证明相等。固定方案要求所有预设域都通过时是IUT：有真实违规域j，则$P(全部通过)\le P(j误通过)\le\alpha$。多方案选择、各域分别声明与同时区间应按相应目标处理。`,
      boundary: "小样本、极端成功率或零分歧不适合直接拿零宽正态区间当保证。此处不包含训练seed方差；题目强相关时应按家族重采样。3920不是联合非劣效样本量。"
    },
    {
      id: "cvar", title: "CVaR为什么不等于任意阈值均值", category: "评测与证据", note: "data-13", question: "Q02",
      symbols: [["$z_i$", "n个损失观测值"], ["$\\alpha$", "风险置信水平，尾部质量为1−α"], ["$\\tau$", "被优化的分位阈值"], ["$w_i$", "对偶中的非负、受上界约束的概率权重"]],
      body: String.raw`### 1. 先用严格经验定义
$$\mathrm{CVaR}_{\alpha}(z)=\min_\tau\left[\tau+\frac{1}{(1-\alpha)n}\sum_i(z_i-\tau)_+\right].$$
只计算超过τ的损失差，再按尾部概率归一化并加回τ。
### 2. 有并列值时怎么算
loss=(1,1,1,9)、α=.5，尾部需要总质量一半。一个9加一个1的均值为5；取τ=1代公式也是$1+8/2=5$。
如果简单保留所有≥1的观测再平均，会得到3。并列分位点必须分配恰当尾部质量，不能把任意硬阈值均值称为CVaR。
### 3. 最坏分布为何需要权重上限
$$\max_{w}\sum_iw_i z_i,\qquad\sum_iw_i=1,\quad0\le w_i\le\frac1{(1-\alpha)n}.$$
本例每个权重最多.5，所以最多给9一半质量，最优为5。若只限制支持集而没有权重上界，全部质量可以放在9上，得到9而非CVaR。
### 4. 风险目标不自动是数据效用
高loss也可能是噪声；按熵选样与按loss优化CVaR不是同一目标。分布鲁棒解释需要明确不确定集合，不能把一个动态mask当通用OOD保证。`,
      boundary: "ESLM原文有解释式与估算计数需要澄清，其实测wall time还慢于CLM。这里给标准数学定义和反例，不把论文标题当严格证明。"
    },
    {
      id: "cost", title: "生成、筛选与复用成本怎样合计", category: "算力与优化", note: "compute-17", question: "Q45",
      symbols: [["$c_g,c_v,a$", "单候选生成/验证成本与通过概率"], ["$K_f,K_a,R$", "一次性研发费、每次应用费、复用次数"], ["$S$", "每次达到同目标可节省的训练费"], ["$N_r,r$", "重写教师参数量与重写token比例"]],
      body: String.raw`### 1. 合格样本要支付被拒绝候选的费用
固定候选成本、独立且通过率稳定的近似下，平均需1/a次尝试才得到合格样本：
$$c_{\rm accepted}\approx(c_g+c_v)/a.$$
通过率从80%降到20%，每条合格成本增4倍；变长、超时、重试依赖与标准变化需要实际累计计算。
### 2. 复用几次才能回本
$$K_f/R+K_a<S.$$
若$S\le K_a$，增加复用次数也不能回本；否则$R>K_f/(S-K_a)$。研发10000、每次用200、每次省3000，至少4次。换来源或tokenizer可能重训，不能假设永久复用。
### 3. 合成重写与学生训练一起计费
在源文与重写近等长、每token前向约2N的简化条件下：
$$C=6ND+2N_rrD+2N_rrD=6ND+4N_rrD.$$
两个2Nr项分别是源prefill与输出decode。已有教师的这笔边际费用不含教师训练/调优，也不一定包含验证、筛选和搜索。
固定N和D比较不同r，学生训练成本相同，但总成本不相同。先明确比较哪个预算，再谈最优比例。`,
      boundary: "公开论文的训练FLOPs、GPU小时、美元与独立自然数据效率不能直接放进一个倍率榜。原始教师训练、失败生成和额外搜索是否计入必须明确。"
    }
  ];
});
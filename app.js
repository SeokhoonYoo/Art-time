(function () {
  const $app = document.getElementById("app");
  const state = {
    me: null, activities: [], notices: [], loaded: false, adminTab: "activity",
    sel: {},        // 선택형 활동의 현재 선택 { activityId: [optionId] }
    draft: {},      // 작품 제출 임시 입력 { activityId: {title, note, photos} }
    noticeImgs: [], // 공지 작성 중 첨부 사진
    sig: "",
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = (msg) => {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2400);
  };

  // ---------- 시간 ----------
  const DAY = ["일", "월", "화", "수", "목", "금", "토"];
  function fmt(iso) {
    const d = new Date(iso);
    const h = d.getHours(), m = d.getMinutes();
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY[d.getDay()]}) ${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(m).padStart(2, "0")}`;
  }
  const fmtDay = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
  function left(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "마감";
    const h = Math.floor(ms / 3600000);
    if (h < 1) return "곧 마감";
    if (h < 24) return `${h}시간 후 마감`;
    return `${Math.floor(h / 24)}일 후 마감`;
  }
  // 서버가 준 시각으로 매번 계산하므로 모집 시작/마감 순간에 화면이 알아서 바뀝니다.
  const closed = (a) => a.status === "closed" || Date.now() > new Date(a.deadline).getTime();
  const upcoming = (a) => !!a.opensAt && Date.now() < new Date(a.opensAt).getTime();
  const phase = (a) => (upcoming(a) ? "up" : closed(a) ? "closed" : "open");

  const TYPE = { first: "선착순", vote: "참여 조사", party: "개강총회 참여 조사", choice: "선택형", survey: "수요 조사", exhibit: "외부 전시회 조사", visit: "외부 전시회 관람 신청", submit: "작품 제출" };
  const TYPE_INFO = [
    { k: "first", desc: "정원이 있는 신청. 차면 대기로 등록" },
    { k: "vote", desc: "참석 / 불참을 답해요" },
    { k: "choice", desc: "시간·역할 중 고르기 (복수 가능)" },
    { k: "party", desc: "참석 · 개강총회만 · 뒤풀이만 · 불참" },
    { k: "survey", desc: "MT·총회 등 대략적인 인원 확인" },
    { k: "exhibit", desc: "가고 싶은 외부 전시회 모으기" },
    { k: "visit", desc: "전시회 최대 2개와 가능한 시간 고르기" },
    { k: "submit", desc: "작품 수를 정하고 작품별 제목·재료·사진(1장) 받기" },
  ];
  const isMulti = (a) => !!a.multi;
  const PARTY = { all: "참석", main: "개강총회만", after: "뒤풀이만", no: "불참" };
  const VOTE3 = { yes: "갈게요", maybe: "고민 중", no: "못 가요" };

  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/></svg>',
    check: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    cog: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
  };

  // ---------- 사진 ----------
  // 폰 사진은 용량이 크므로 올리기 전에 줄입니다.
  function resizeImage(file) {
    const max = api.isDemo ? 640 : 1600, q = api.isDemo ? 0.7 : 0.82;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("사진을 열 수 없어요.")); };
      img.src = url;
    });
  }
  async function uploadAll(list) {
    const out = [];
    for (const p of list) out.push(p.startsWith("data:") ? (await api("upload", { dataUrl: p })).url : p);
    return out;
  }
  const photoList = (key) => {
    if (key === "notice") return state.noticeImgs;
    const [, aid, i] = key.split(":");
    return state.draft[aid].works[Number(i)].photos;
  };
  function previews(key, max) {
    const list = photoList(key);
    return `<div class="photos">
      ${list.map((p, i) => `<div class="thumb"><img src="${esc(p)}" alt=""><button type="button" class="rm" data-rmphoto="${key}:${i}" aria-label="사진 삭제">×</button></div>`).join("")}
      ${list.length < max ? `<label class="addphoto"><input type="file" accept="image/*" multiple hidden data-pick="${key}" data-max="${max}"><span>+</span>사진 추가</label>` : ""}
    </div>`;
  }
  const gallery = (imgs) => (imgs && imgs.length
    ? `<div class="gallery n${Math.min(imgs.length, 3)}">${imgs.map((u) => `<img src="${esc(u)}" alt="" loading="lazy" data-zoom="${esc(u)}">`).join("")}</div>` : "");

  // ---------- 라우팅 ----------
  const route = () => location.hash.replace(/^#/, "") || "/";
  const go = (p) => { location.hash = p; };

  async function refresh() {
    const data = await api("home");
    if (data.token) localStorage.setItem("token", data.token); // 접속할 때마다 로그인 유지 기간 연장
    Object.assign(state, { me: data.me, activities: data.activities, notices: data.notices, semester: data.semester || "", history: data.history || [], loaded: true });
    state.sig = signature();
  }
  const signature = () => state.activities.map((a) => a.id + phase(a)).join();

  async function render() {
    const r = route();
    if (!localStorage.getItem("token")) return renderLogin();
    if (!state.loaded) {
      $app.innerHTML = '<div class="page no-tab"></div>';
      try { await refresh(); }
      catch (e) { return e.code === "auth" ? logout() : renderRetry(e.message); }
    }
    if (r.startsWith("/a/")) return renderDetail(r.slice(3));
    if (r === "/notices") return renderTabs(renderNotices(), "notices");
    if (r === "/my") return renderTabs(renderMy(), "my");
    if (r === "/admin" && state.me.role === "admin") return renderTabs(renderAdmin(), "admin");
    return renderTabs(renderHome(), "home");
  }

  function renderRetry(msg) {
    $app.innerHTML = `<div class="page no-tab"><div class="empty"><b>${esc(msg)}</b></div><button class="btn" style="width:100%" data-retry>다시 시도</button></div>`;
  }

  const latestNotice = () => Math.max(0, ...state.notices.map((n) => n.createdAt));
  const hasNewNotice = () => latestNotice() > Number(localStorage.getItem("seenNotice") || 0);

  function renderTabs(html, cur) {
    if (cur === "notices") localStorage.setItem("seenNotice", String(latestNotice()));
    const tab = (id, href, icon, label, dot) =>
      `<a href="#${href}" class="${cur === id ? "on" : ""}">${icon}${label}${dot ? '<i class="dot"></i>' : ""}</a>`;
    $app.innerHTML = `
      ${html}
      <nav class="tabs">
        ${tab("home", "/", ICON.home, "홈")}
        ${tab("notices", "/notices", ICON.bell, "공지", cur !== "notices" && hasNewNotice())}
        ${state.me.role === "admin" ? tab("admin", "/admin", ICON.cog, "관리") : ""}
        ${tab("my", "/my", ICON.user, "내 정보")}
      </nav>`;
    window.scrollTo(0, 0);
    const form = $app.querySelector('[data-form="activity"]');
    if (form) applyType(form);
  }

  // ---------- 로그인 ----------
  function renderLogin() {
    $app.innerHTML = `
      <form class="login" data-form="login">
        <img src="icons/logo.jpg" alt="미술시간 로고">
        <h1>미술시간</h1>
        <p>학번과 개인 코드로 들어와요.<br>한 번 로그인하면 이 기기에서는 계속 유지돼요.</p>
        <label class="field"><span>학번</span><input name="studentId" inputmode="numeric" autocomplete="username" placeholder="예) 20240001" required></label>
        <label class="field"><span>개인 코드</span><input name="code" type="password" autocomplete="current-password" placeholder="임원에게 받은 코드" required></label>
        <div class="err" id="err"></div>
        <button class="btn" style="width:100%">들어가기</button>
        <p class="hint">코드를 모르면 임원에게 물어봐 주세요.${api.isDemo ? "<br><br>체험 모드 · 학번 20240001 / 코드 1234 (임원), 20240002 / 1234 (회원)" : ""}</p>
      </form>`;
  }

  function logout() {
    localStorage.removeItem("token");
    Object.assign(state, { me: null, loaded: false, sel: {}, draft: {} });
    renderLogin();
  }

  // ---------- 공통 조각 ----------
  const header = () => `
    <div class="top"><img src="icons/logo.jpg" alt=""><span class="brand">미술시간</span><span class="who">${esc(state.me.name)}</span></div>
    ${api.isDemo ? '<div class="demo-flag">체험 모드예요. 데이터는 이 기기에만 저장돼요.</div>' : ""}`;

  const full = (cap, n) => cap > 0 && n >= cap;

  function statusOf(a) {
    const m = a.mine, p = phase(a);
    if (p === "up") return [`${fmt(a.opensAt)} 오픈`, "wait"];
    if (m) {
      if (a.type === "vote") return m.choice === "yes" ? ["참석으로 답함", "ok"] : ["불참으로 답함", "late"];
      if (a.type === "choice") return [`${m.count}개 선택함`, "ok"];
      if (a.type === "party") return [PARTY[m.choice] + "(으)로 답함", m.choice === "no" ? "late" : "ok"];
      if (a.type === "survey") return [VOTE3[m.choice] + "(으)로 답함", m.choice === "no" ? "late" : "ok"];
      if (a.type === "exhibit") return ["추천 완료", "ok"];
      if (a.type === "visit") return ["신청 완료", "ok"];
      if (a.type === "submit") return ["제출 완료", "ok"];
      return m.status === "waitlist" ? [`대기 ${m.waitNo}번`, "wait"] : ["신청 완료", "ok"];
    }
    if (p === "closed") return ["마감", "late"];
    if (a.type === "first" && full(a.capacity, a.confirmed)) return ["대기 신청 가능", "wait"];
    return [left(a.deadline), a.type === "first" && a.capacity && a.capacity - a.confirmed <= 3 ? "hot" : ""];
  }

  function summary(a) {
    if (state.me.role !== "admin" && a.type !== "first" && a.type !== "choice") return "";
    if (a.type === "first") return a.capacity ? `${a.confirmed}/${a.capacity}명` : `${a.confirmed}명 신청`;
    if (a.type === "vote") return `참석 ${a.yes}명 · 불참 ${a.no}명`;
    if (a.type === "choice") return `${a.options.length}개 중 ${a.multi ? "복수 선택" : "하나 선택"}`;
    if (a.type === "party") return `참석 ${a.all} · 개강총회만 ${a.main} · 뒤풀이만 ${a.after} · 불참 ${a.no}`;
    if (a.type === "survey") return `갈게요 ${a.yes} · 고민 중 ${a.maybe} · 못 가요 ${a.no}`;
    if (a.type === "exhibit") return `${a.count}건 추천됨`;
    if (a.type === "visit") return `${a.count}명 신청`;
    return `${a.count}명 제출`;
  }

  function activityCard(a) {
    const [txt, cls] = statusOf(a);
    const sub = [a.date && fmt(a.date), a.place].filter(Boolean).join(" · ");
    const showBar = a.type === "first" && a.capacity > 0;
    const pct = showBar ? Math.min(100, Math.round((a.confirmed / a.capacity) * 100)) : 0;
    return `
      <button class="card" data-go="/a/${a.id}">
        <span class="tag ${phase(a) === "open" ? a.type : "done"}">${TYPE[a.type]}</span>
        <h3>${esc(a.title)}</h3>
        ${sub ? `<div class="meta">${esc(sub)}</div>` : ""}
        ${showBar ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ""}
        <div class="row"><span class="meta">${summary(a)}</span><span class="status ${cls}">${txt}</span></div>
      </button>`;
  }

  // ---------- 홈 ----------
  function renderHome() {
    const by = (p) => state.activities.filter((a) => phase(a) === p);
    const open = by("open").sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const soon = by("up").sort((a, b) => new Date(a.opensAt) - new Date(b.opensAt));
    const done = by("closed");
    const pending = open.filter((a) => !a.mine).length;
    const pinned = state.notices.find((n) => n.pinned);
    return `<div class="page">
      ${header()}
      <h2 class="hello">${pending ? `참여할 수 있는 활동이<br><em>${pending}개</em> 있어요` : "지금은 새로 참여할<br>활동이 없어요"}</h2>
      ${pinned ? `<button class="card notice" data-go="/notices"><div class="head"><i class="pin"></i><h3>${esc(pinned.title)}</h3></div><div class="when">고정 공지</div></button>` : ""}
      <div class="section-title">진행 중인 활동</div>
      ${open.map(activityCard).join("") || '<div class="empty"><b>열려 있는 활동이 없어요</b>새 활동이 열리면 여기에 나타나요.</div>'}
      ${soon.length ? `<div class="section-title">곧 열려요</div>${soon.map(activityCard).join("")}` : ""}
      ${done.length ? `<div class="section-title">완료된 활동</div>${done.map(activityCard).join("")}` : ""}
    </div>`;
  }

  // ---------- 상세 ----------
  const origSel = (a) => a.options.filter((o) => o.mine).map((o) => o.id);
  const curSel = (a) => (state.sel[a.id] ||= origSel(a));
  const sameSet = (x, y) => x.length === y.length && x.every((v) => y.includes(v));

  function optionRow(a, o, locked) {
    const on = curSel(a).includes(o.id);
    const isFull = full(o.capacity, o.confirmed);
    const survey = a.type === "survey";
    let note = survey ? "" : o.capacity ? `${o.confirmed}/${o.capacity}명` : `${o.confirmed}명`;
    if (isFull) note += ` · 대기 ${o.waitlist}명`;
    let badge = "";
    if (survey) badge = "";
    else if (o.mine) badge = o.mine.status === "waitlist" ? `<em class="wait">대기 ${o.mine.waitNo}번</em>` : '<em class="okk">신청됨</em>';
    else if (on && isFull) badge = '<em class="wait">대기로 신청돼요</em>';
    return `<button class="opt ${on ? "on" : ""}" data-opt="${a.id}:${o.id}" ${locked ? "disabled" : ""}>
      <span class="box ${isMulti(a) ? "sq" : ""}"></span>
      <span class="lbl">${esc(o.label)}${note ? `<small>${note}</small>` : ""}</span>${badge}
    </button>`;
  }

  const worksOf = (data) => (!data ? [] : data.works || [{ title: data.title, material: "", note: data.note, photos: data.photos || [], anonymous: false }]);
  const newWork = () => ({ title: "", material: "", note: "", photos: [], anonymous: false });
  const workView = (w, i) => `<div class="submit-view"><h3>${i + 1}. ${esc(w.title)}${w.anonymous ? ' <em class="okk">익명 전시</em>' : ""}</h3>
    ${w.material ? `<p class="meta">재료 · ${esc(w.material)}</p>` : ""}<p class="desc">${esc(w.note)}</p>${gallery(w.photos)}</div>`;

  function submitDraft(a) {
    if (!state.draft[a.id]) {
      const works = worksOf(a.mine?.data).map((w) => ({ ...newWork(), ...w, photos: [...(w.photos || [])] }));
      state.draft[a.id] = { works, n: Math.max(1, works.length) };
    }
    const d = state.draft[a.id];
    while (d.works.length < d.n) d.works.push(newWork());
    return d;
  }

  function submitBlock(a, locked) {
    if (locked) return worksOf(a.mine?.data).map(workView).join("");
    const d = submitDraft(a), max = Math.max(1, a.capacity || 1);
    const cards = d.works.slice(0, d.n).map((w, i) => `<div class="work">
      <h4>작품 ${i + 1}</h4>
      <label class="field"><span>제목</span><input data-work="${i}:title" value="${esc(w.title)}" maxlength="100" placeholder="작품 제목"></label>
      <label class="field"><span>재료</span><input data-work="${i}:material" value="${esc(w.material)}" maxlength="100" placeholder="예: 캔버스에 아크릴"></label>
      <label class="field"><span>설명 (선택)</span><textarea data-work="${i}:note" maxlength="1000" placeholder="작품에 대해 알려 주세요">${esc(w.note)}</textarea></label>
      <div class="field"><span>사진 (1장)</span><div data-previews="submit:${a.id}:${i}">${previews(`submit:${a.id}:${i}`, 1)}</div></div>
      <label class="check"><input type="checkbox" data-work="${i}:anonymous" ${w.anonymous ? "checked" : ""}> 익명으로 전시할래요</label>
    </div>`).join("");
    return `<div class="section-title">제출할 작품 수 (최대 ${max}점)</div>
      <div class="chips wrapchips">${Array.from({ length: max }, (_, k) => `<button type="button" class="${d.n === k + 1 ? "on" : ""}" data-wn="${a.id}:${k + 1}">${k + 1}점</button>`).join("")}</div>
      ${cards}`;
  }

  function renderDetail(id) {
    const a = state.activities.find((x) => x.id === id);
    if (!a) return go("/");
    const p = phase(a), locked = p !== "open";
    const dock = dockFor(a);
    const [stxt] = statusOf(a), m = a.mine;
    const facts = [
      a.date && ["일시", fmt(a.date)],
      a.place && ["장소", esc(a.place)],
      a.type === "first" && a.capacity && ["정원", `${a.confirmed}/${a.capacity}명${a.waitlist ? ` · 대기 ${a.waitlist}명` : ""}`],
      p === "up" && ["모집 시작", fmt(a.opensAt)],
      ["신청 마감", fmt(a.deadline)],
      p !== "up" && ["내 상태", m ? stxt : "아직 신청 전"],
    ].filter(Boolean);
    $app.innerHTML = `
      <div class="page no-tab detail">
        <button class="back" data-go="/">‹ 목록</button>
        <span class="tag ${p === "open" ? a.type : "done"}">${TYPE[a.type]}</span>
        <h1>${esc(a.title)}</h1>
        <div class="facts">${facts.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>
        <p class="desc">${esc(a.desc)}</p>
        ${a.type === "vote" && state.me.role === "admin" ? `<div class="tally"><div>참석<b>${a.yes}</b></div><div>불참<b>${a.no}</b></div></div>` : ""}
        ${a.type === "party" && state.me.role === "admin" ? `<div class="tally">${Object.entries(PARTY).map(([k, v]) => `<div>${v}<b>${a[k]}</b></div>`).join("")}</div>` : ""}
        ${a.type === "survey" && state.me.role === "admin" ? `<div class="tally"><div>갈게요<b>${a.yes}</b></div><div>고민 중<b>${a.maybe}</b></div><div>못 가요<b>${a.no}</b></div></div>` : ""}
        ${a.type === "choice" ? `<div class="section-title">${a.multi ? "여러 개 선택할 수 있어요" : "하나를 골라 주세요"}</div>${a.options.map((o) => optionRow(a, o, locked)).join("")}` : ""}
        ${a.type === "exhibit" ? exhibitBlock(a, locked) : ""}
        ${a.type === "visit" ? visitBlock(a, locked) : ""}
        ${a.type === "submit" ? submitBlock(a, locked) : ""}
      </div>
      <div class="dock" id="dock" ${dock ? "" : "hidden"}>${dock}</div>`;
    window.scrollTo(0, 0);
  }

  const visitDraft = (a) => (state.draft[a.id] ||= { exhibits: [...(a.mine?.data?.exhibits || [])], slots: [...(a.mine?.data?.slots || [])] });
  function visitBlock(a, locked) {
    const d = visitDraft(a);
    const exhibits = a.options.filter((o) => o.group === "exhibit").map((o) =>
      `<button class="opt ${d.exhibits.includes(o.id) ? "on" : ""}" data-vopt="${a.id}:exhibits:${o.id}" ${locked ? "disabled" : ""}><span class="box sq"></span><span class="lbl">${esc(o.label)}</span></button>`).join("");
    const days = [];
    a.options.filter((o) => o.group === "slot").forEach((o) => {
      let g = days.find((x) => x.day === o.day);
      if (!g) days.push((g = { day: o.day, list: [] }));
      g.list.push(o);
    });
    const slots = days.map((g) => `<div class="day-block"><h4>${esc(g.day)}</h4><div class="times">${g.list.map((o) =>
      `<button class="time ${d.slots.includes(o.id) ? "on" : ""}" data-vopt="${a.id}:slots:${o.id}" ${locked ? "disabled" : ""}>${esc(o.label)}</button>`).join("")}</div></div>`).join("");
    return `<div class="section-title">가고 싶은 전시회 (최대 2개 · ${d.exhibits.length}개 선택)</div>${exhibits}
      <div class="section-title">관람 가능한 요일·시간 (여러 개 가능 · ${d.slots.length}개 선택)</div>${slots}`;
  }

  // 같은 요일에 이어진 시간은 "월 14:00–17:00"처럼 합쳐서 보여줌
  function mergeSlots(a, ids) {
    const byDay = new Map();
    a.options.filter((o) => o.group === "slot" && ids.includes(o.id)).forEach((o) => {
      const [s0, e0] = o.label.split("–"), runs = byDay.get(o.day) || [];
      const last = runs[runs.length - 1];
      if (last && last[1] === s0) last[1] = e0; else runs.push([s0, e0]);
      byDay.set(o.day, runs);
    });
    return [...byDay].map(([d, runs]) => `${d} ${runs.map((r) => r.join("–")).join(", ")}`).join(" / ");
  }

  function exhibitBlock(a, locked) {
    const m = a.mine?.data;
    const d = (state.draft[a.id] ||= { name: m?.name || "", place: m?.place || "", url: m?.url || "" });
    if (locked) return m ? `<div class="section-title">내 추천</div><p class="desc"><b>${esc(m.name)}</b><br>${esc(m.place)}<br><a href="${esc(m.url)}" target="_blank" rel="noopener">예매 사이트</a></p>` : "";
    return `<div class="section-title">가고 싶은 전시회</div>
      <label class="field"><span>전시회 이름</span><input data-draft="name" value="${esc(d.name)}" maxlength="100"></label>
      <label class="field"><span>전시회 장소</span><input data-draft="place" value="${esc(d.place)}" maxlength="100" placeholder="예: 서울시립미술관"></label>
      <label class="field"><span>예매 사이트</span><input data-draft="url" type="url" inputmode="url" value="${esc(d.url)}" maxlength="500" placeholder="https://"></label>`;
  }

  function dockFor(a) {
    const p = phase(a), locked = p !== "open", m = a.mine;
    let dock = "";
    if (p === "up") dock = `<button class="btn sub" disabled>${fmt(a.opensAt)}에 열려요</button>`;
    else if (a.type === "vote") {
      dock = p === "closed" ? '<button class="btn sub" disabled>마감됐어요</button>' :
        `<button class="btn ${m?.choice === "yes" ? "on" : "ghost"}" data-apply="${a.id}" data-choice="yes">참석할게요</button>
         <button class="btn ${m?.choice === "no" ? "on" : "ghost"}" data-apply="${a.id}" data-choice="no">못 가요</button>`;
    } else if (a.type === "survey" || a.type === "party") {
      dock = p === "closed" ? '<button class="btn sub" disabled>마감됐어요</button>' :
        Object.entries(a.type === "party" ? PARTY : VOTE3).map(([k, v]) => `<button class="btn ${m?.choice === k ? "on" : "ghost"}" data-apply="${a.id}" data-choice="${k}">${v}</button>`).join("");
    } else if (a.type === "visit") {
      const d = visitDraft(a), ok = d.exhibits.length >= 1 && d.slots.length >= 1;
      if (locked) dock = m ? "" : '<button class="btn sub" disabled>마감됐어요</button>';
      else dock = `${m ? `<button class="btn sub" data-cancel="${a.id}">신청 취소</button>` : ""}<button class="btn" data-visit="${a.id}" ${ok ? "" : "disabled"}>${ok ? (m ? "수정하기" : "신청하기") : "전시회와 시간을 골라 주세요"}</button>`;
    } else if (a.type === "exhibit") {
      if (locked) dock = m ? "" : '<button class="btn sub" disabled>마감됐어요</button>';
      else dock = `${m ? `<button class="btn sub" data-cancel="${a.id}">추천 취소</button>` : ""}<button class="btn" data-submit="${a.id}">${m ? "수정하기" : "추천하기"}</button>`;
    } else if (a.type === "choice") {
      const sel = curSel(a), orig = origSel(a);
      if (locked) dock = '<button class="btn sub" disabled>마감됐어요</button>';
      else if (!sel.length) dock = orig.length ? `<button class="btn sub" data-save="${a.id}">신청 취소</button>` : '<button class="btn" disabled>선택해 주세요</button>';
      else if (sameSet(sel, orig)) dock = '<button class="btn sub" disabled>신청 완료</button>';
      else dock = `<button class="btn" data-save="${a.id}">${orig.length ? "변경 저장" : "신청하기"}</button>`;
    } else if (a.type === "submit") {
      if (locked) dock = m ? "" : '<button class="btn sub" disabled>마감됐어요</button>';
      else dock = `${m ? `<button class="btn sub" data-cancel="${a.id}">제출 취소</button>` : ""}<button class="btn" data-submit="${a.id}">${m ? "수정해서 다시 제출" : "제출하기"}</button>`;
    } else if (m) {
      dock = locked ? "" : `<button class="btn sub" data-cancel="${a.id}">${m.status === "waitlist" ? "대기 취소" : "신청 취소"}</button>`;
    } else if (locked) dock = '<button class="btn sub" disabled>마감됐어요</button>';
    else dock = `<button class="btn" data-apply="${a.id}" data-choice="join">${full(a.capacity, a.confirmed) ? "대기로 신청하기" : "신청하기"}</button>`;

    return dock;
  }

  // ---------- 공지 / 내 활동 ----------
  function renderNotices() {
    return `<div class="page">
      <h1 class="page-title">공지</h1>
      ${state.notices.map((n) => `
        <div class="card notice" data-toggle>
          <div class="head">${n.pinned ? '<i class="pin"></i>' : ""}<h3>${esc(n.title)}</h3></div>
          <div class="when">${fmtDay(n.createdAt)}${n.images && n.images.length ? " · 사진 " + n.images.length : ""}</div>
          <div class="body">${esc(n.body)}${gallery(n.images)}</div>
        </div>`).join("") || '<div class="empty"><b>아직 공지가 없어요</b></div>'}
    </div>`;
  }

  function renderMy() {
    const HIDE_MY = ["survey", "exhibit"];
    const mine = state.activities.filter((a) => a.mine && !HIDE_MY.includes(a.type));
    const history = state.history.filter((h) => !HIDE_MY.includes(h.type));
    return `<div class="page">
      <h1 class="page-title">내 정보</h1>
      <div class="card profile"><b>${esc(state.me.name)}</b><span class="meta">${esc(state.me.studentId)}${state.me.role === "admin" ? " · 임원" : ""}</span></div>
      <div class="section-title">언어</div>
      <div class="seg" role="group">
        <button type="button" class="${I18N.lang === "ko" ? "on" : ""}" data-lang="ko">한국어</button>
        <button type="button" class="${I18N.lang === "en" ? "on" : ""}" data-lang="en">English</button>
      </div>
      <div class="section-title">내 활동</div>
      ${mine.map(activityCard).join("") || '<div class="empty"><b>참여한 활동이 없어요</b>홈에서 마음에 드는 활동을 골라 보세요.</div>'}
      ${history.length ? `<div class="section-title">지난 학기 활동</div>${history.map((h) => `<div class="card hist"><span class="tag done">${TYPE[h.type] || ""}</span><h3>${esc(h.title)}</h3><div class="row"><span class="meta">${esc(h.semester)}</span><span class="status ok">${esc(h.label)}</span></div></div>`).join("")}` : ""}
      <button class="btn ghost" style="width:100%;margin-top:24px" data-logout>로그아웃</button>
    </div>`;
  }

  // ---------- 관리 ----------
  const localDT = (offsetH) => {
    const d = new Date(Date.now() + offsetH * 3600000);
    d.setMinutes(0, 0, 0);
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const HOURS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, "0") + ":00");
  const toLocalInput = (iso) => { const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const atDay = (days, hour) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return toLocalInput(d); };

  function applyType(form) {
    const t = form.querySelector('[name="type"]').value;
    form.querySelectorAll("[data-for]").forEach((el) => el.classList.toggle("hide", !el.dataset.for.split(" ").includes(t)));
    form.querySelectorAll("[data-type]").forEach((el) => el.classList.toggle("on", el.dataset.type === t));
  }

  // 매학기 반복되는 활동 템플릿. 불러온 뒤 날짜·정원은 꼭 확인하세요.
  const TEMPLATES = [
    { name: "개강총회 참여 조사", type: "party", title: "개강총회 참여 조사", dateDays: 14, hour: 18, deadlineDays: 7,
      desc: "개강총회와 뒤풀이 참석 여부를 알려 주세요. 참석, 개강총회만, 뒤풀이만, 불참 중에서 골라 주세요." },
    { name: "참여 조사", type: "vote", title: "참여 조사", dateDays: 14, hour: 14, deadlineDays: 7,
      desc: "참석 또는 불참을 알려 주세요. (MT, 야외 드로잉 등 행사 참석 확인)" },
    { name: "수요 조사", type: "survey", title: "수요 조사", dateDays: 14, hour: 18, deadlineDays: 7,
      desc: "대략적인 인원만 확인해요. (MT, 개강총회, 종강총회 등) 정확한 신청은 따로 받을게요." },
    { name: "동아리 박람회 운영진 모집", type: "choice", title: "동아리 박람회 운영진 모집", place: "", multi: true, deadlineDays: 7,
      desc: "동아리 박람회를 함께 운영할 부원을 모집해요. 가능한 시간대를 모두 골라 주세요.",
      options: "오전 운영 | 5\n오후 운영 | 5\n설치·철수 | 3" },
    { name: "정기 소모임", type: "choice", title: "정기 소모임", place: "동아리방", multi: false, deadlineDays: 7,
      desc: "가능한 시간 하나를 골라 주세요. 인원이 차면 대기로 등록돼요.",
      options: "수요일 오후 6시 | 8\n목요일 오후 7시 | 8\n토요일 오후 2시 | 8" },
    { name: "외부 전시회 조사", type: "exhibit", title: "가고 싶은 외부 전시회", deadlineDays: 14,
      desc: "가고 싶은 전시회의 이름, 장소, 예매 사이트를 알려 주세요. 많이 나온 전시회로 단체 관람을 추진해요." },
    { name: "외부 전시회 관람 신청", type: "visit", title: "외부 전시회 관람 신청", deadlineDays: 10,
      desc: "가고 싶은 전시회를 최대 2개 고르고, 관람 가능한 요일·시간을 모두 골라 주세요. 많이 겹치는 시간으로 일정을 잡을게요.",
      exhibits: "전시회 1\n전시회 2\n전시회 3", days: ["월", "화", "수", "목", "금", "토", "일"], from: "06:00", to: "22:00", step: "60" },
    { name: "전시회 작품 제출", type: "submit", title: "전시회 작품 제출", maxWorks: 3, deadlineDays: 14,
      desc: "제출할 작품 수를 고르고, 작품마다 제목·재료·설명·사진을 올려 주세요. 익명 전시 여부도 작품별로 정할 수 있어요. 마감 전까지 수정할 수 있어요." },
    { name: "전시회 지킴이", type: "choice", title: "전시회 지킴이", place: "전시장", multi: true, deadlineDays: 10,
      desc: "전시장을 지켜 줄 시간대를 골라 주세요. 여러 개 선택해도 좋아요.",
      options: "첫째 날 오전 | 2\n첫째 날 오후 | 2\n둘째 날 오전 | 2\n둘째 날 오후 | 2" },
  ];

  function fillForm(form, t) {
    form.type.value = t.type;
    form.title.value = t.title || "";
    form.desc.value = t.desc || "";
    form.place.value = t.place || "";
    form.capacity.value = t.capacity || "";
    form.maxWorks.value = t.maxWorks || t.capacity || 3;
    form.options.value = t.options || "";
    form.exhibits.value = t.exhibits || "";
    const days = t.days || [];
    form.days.value = days.join(",");
    form.querySelectorAll("[data-day]").forEach((b) => b.classList.toggle("on", days.includes(b.dataset.day)));
    form.from.value = t.from || "06:00"; form.to.value = t.to || "22:00"; form.step.value = t.step || "60";
    form.multi.checked = !!t.multi;
    form.date.value = t.dateDays != null ? atDay(t.dateDays, t.hour || 14) : "";
    form.deadline.value = atDay(t.deadlineDays || 7, 23);
    form.opensAt.value = "";
    applyType(form);
  }

  function renderAdmin() {
    const tab = state.adminTab;
    const seg = `<div class="seg"><button data-admintab="activity" class="${tab === "activity" ? "on" : ""}">활동</button><button data-admintab="notice" class="${tab === "notice" ? "on" : ""}">공지</button></div>`;
    if (tab === "notice") {
      return `<div class="page"><h1 class="page-title">관리</h1>${seg}
        <form data-form="notice">
          <label class="field"><span>제목</span><input name="title" required></label>
          <label class="field"><span>내용</span><textarea name="body" required></textarea></label>
          <div class="field"><span>사진 (최대 20장)</span><div data-previews="notice">${previews("notice", 20)}</div></div>
          <label class="check"><input type="checkbox" name="pinned"> 상단에 고정</label>
          <button class="btn" style="width:100%">공지 올리기</button>
        </form></div>`;
    }
    return `<div class="page"><h1 class="page-title">관리</h1>${seg}
      <div class="card semester"><div><span class="meta">현재 학기</span><b>${esc(state.semester || "미설정")}</b></div><button type="button" class="btn small ghost" data-newsem>새 학기 시작</button></div>
      <div class="section-title" style="margin-top:0">템플릿으로 시작하기</div>
      <div class="chips">${TEMPLATES.map((t, i) => `<button type="button" data-tpl="${i}">${esc(t.name)}</button>`).join("")}</div>
      <form data-form="activity">
        <label class="field"><span>활동 이름</span><input name="title" required></label>
        <div class="field"><span>부원이 하는 일</span>
          <input type="hidden" name="type" value="first">
          <div class="tgrid">${TYPE_INFO.map((t) => `<button type="button" class="tcard" data-type="${t.k}"><b>${TYPE[t.k]}</b><small>${t.desc}</small></button>`).join("")}</div>
        </div>
        <label class="field" data-for="submit"><span>제출 가능한 작품 수 (1인당)</span><input name="maxWorks" type="number" min="1" max="10" inputmode="numeric" value="3"></label>
        <label class="field" data-for="first"><span>정원 (비우면 제한 없음)</span><input name="capacity" type="number" min="1" inputmode="numeric" placeholder="20"></label>
        <div data-for="choice">
          <label class="field"><span>선택지 (한 줄에 하나)</span>
            <textarea name="options" placeholder="수요일 오후 6시 | 8&#10;목요일 오후 7시 | 8&#10;토요일 오후 2시"></textarea></label>
          <p class="hint" style="margin:-6px 0 14px">정원은 줄 끝에 ‘| 숫자’로 적어요. 정원이 차면 자동으로 대기 신청을 받아요.</p>
          <label class="check"><input type="checkbox" name="multi"> 여러 개 선택 가능</label>
        </div>
        <div data-for="visit">
          <label class="field"><span>전시회 후보 (한 줄에 하나)</span><textarea name="exhibits" placeholder="모네전&#10;샤갈전&#10;현대미술 특별전"></textarea></label>
          <div class="field"><span>관람 가능한 요일 후보</span>
            <div class="daypick">${["월", "화", "수", "목", "금", "토", "일"].map((d) => `<button type="button" data-day="${d}">${d}</button>`).join("")}</div>
            <input type="hidden" name="days"></div>
          <div class="field-row">
            <label class="field"><span>시작</span><select name="from">${HOURS.map((h) => `<option ${h === "06:00" ? "selected" : ""}>${h}</option>`).join("")}</select></label>
            <label class="field"><span>종료</span><select name="to">${HOURS.map((h) => `<option ${h === "22:00" ? "selected" : ""}>${h}</option>`).join("")}</select></label>
            <label class="field"><span>간격</span><select name="step"><option value="60">1시간</option><option value="120">2시간</option></select></label>
          </div>
          <p class="hint" style="margin:-6px 0 14px">고른 요일마다 시간 단위 칸이 만들어져요. (예: 10:00–12:00)</p>
        </div>
        <label class="field" data-for="first vote party choice survey"><span>활동 일시 (선착순·참여 조사는 필수)</span><input name="date" type="datetime-local"></label>
        <label class="field" data-for="first vote party choice survey"><span>장소</span><input name="place"></label>
        <label class="field"><span>모집 시작 (비우면 바로 열려요)</span><input name="opensAt" type="datetime-local"></label>
        <label class="field"><span>신청 마감</span><input name="deadline" type="datetime-local" value="${localDT(24 * 5)}" required></label>
        <label class="field"><span>설명</span><textarea name="desc"></textarea></label>
        <button class="btn" style="width:100%">활동 만들기</button>
      </form>
      <div class="section-title">만든 활동</div>
      ${state.activities.map((a) => {
        const p = phase(a);
        return `<div class="card">
          <h3>${esc(a.title)}</h3>
          <div class="meta">${TYPE[a.type]} · ${p === "up" ? `모집 전 · ${fmt(a.opensAt)} 오픈` : p === "closed" ? "마감됨" : left(a.deadline)} · ${summary(a)}</div>
          <div class="row wrap"><button class="btn small ghost" data-list="${a.id}">신청 현황</button>
          <button class="btn small ghost" data-sched="${a.id}">일정 수정</button>
          <button class="btn small ghost" data-copy="${a.id}">복사</button>
          ${p === "up" ? `<button class="btn small sub" data-opennow="${a.id}">지금 열기</button>` : ""}
          ${p === "open" ? `<button class="btn small sub" data-close="${a.id}">지금 마감</button>` : ""}</div>
        </div>`;
      }).join("")}
    </div>`;
  }

  async function showApplicants(id) {
    const a = state.activities.find((x) => x.id === id);
    const rows = await api("applicants", { activityId: id });
    const label = (p) => {
      if (a.type === "party") return PARTY[p.choice];
      if (a.type === "survey") return VOTE3[p.choice];
      if (a.type === "exhibit") return "추천";
      if (a.type === "visit") return "신청";
      if (a.type === "vote") return p.choice === "yes" ? "참석" : "불참";
      if (a.type === "choice") return esc((a.options.find((o) => o.id === p.choice) || {}).label || "") + (p.status === "waitlist" ? " (대기)" : "");
      if (a.type === "submit") return "제출";
      return p.status === "waitlist" ? "대기" : "확정";
    };
    const row = (p) => `<div class="list-row"><span>${esc(p.name || "-")} <span class="meta">${esc(p.studentId)}</span></span><b>${label(p)}</b></div>
      ${a.type === "visit" && p.data ? `<div class="sub-item"><p class="meta">전시회: ${esc(p.data.exhibits.map((id) => (a.options.find((o) => o.id === id) || {}).label).join(", "))}<br>가능 시간: ${esc(mergeSlots(a, p.data.slots))}</p></div>` : ""}
      ${a.type === "exhibit" && p.data ? `<div class="sub-item"><b>${esc(p.data.name)}</b><p class="meta">${esc(p.data.place)} · <a href="${esc(p.data.url)}" target="_blank" rel="noopener">예매 사이트</a></p></div>` : ""}
      ${a.type === "submit" && p.data ? worksOf(p.data).map((w, i) => `<div class="sub-item"><b>${i + 1}. ${esc(w.title)}</b>${w.anonymous ? " · 익명 전시" : ""}<p class="meta">${esc(w.material || "")}${w.material && w.note ? " · " : ""}${esc(w.note)}</p>${gallery(w.photos)}</div>`).join("") : ""}`;
    const bg = document.createElement("div");
    bg.className = "sheet-bg";
    bg.innerHTML = `<div class="sheet"><h3>${esc(a.title)}</h3>
      ${rows.map(row).join("") || '<div class="empty">아직 신청자가 없어요</div>'}</div>`;
    bg.addEventListener("click", (e) => { if (e.target === bg) bg.remove(); });
    document.body.appendChild(bg);
  }

  function showSheet(html) {
    const bg = document.createElement("div");
    bg.className = "sheet-bg";
    bg.innerHTML = `<div class="sheet">${html}</div>`;
    bg.addEventListener("click", (e) => { if (e.target === bg) bg.remove(); });
    document.body.appendChild(bg);
    return bg;
  }

  function showSchedule(a) {
    const bg = showSheet(`<h3>일정 수정</h3><p class="meta" style="margin-bottom:14px">${esc(a.title)}</p>
      <label class="field"><span>모집 시작 (비우면 바로 열려요)</span><input type="datetime-local" id="s-opens" value="${a.opensAt ? toLocalInput(a.opensAt) : ""}"></label>
      <label class="field"><span>신청 마감</span><input type="datetime-local" id="s-deadline" value="${toLocalInput(a.deadline)}"></label>
      <div class="chips" style="margin-bottom:6px">${[1, 3, 7].map((n) => `<button type="button" data-extend="${n}">마감 +${n}일</button>`).join("")}</div>
      <p class="hint" style="margin:0 0 16px">마감된 활동도 마감 시각을 미래로 바꾸면 다시 열려요.</p>
      <button class="btn" style="width:100%" data-savesched="${a.id}">저장</button>`);
    return bg;
  }

  function copyToForm(a) {
    state.adminTab = "activity";
    render();
    const form = $app.querySelector('[data-form="activity"]');
    fillForm(form, {
      type: a.type, title: a.title, desc: a.desc, place: a.place, capacity: a.capacity, multi: a.multi,
      options: a.type === "visit" ? "" : (a.options || []).map((o) => (o.capacity ? `${o.label} | ${o.capacity}` : o.label)).join("\n"),
      exhibits: (a.options || []).filter((o) => o.group === "exhibit").map((o) => o.label).join("\n"),
      days: [...new Set((a.options || []).filter((o) => o.group === "slot").map((o) => o.day))],
      dateDays: a.date ? 7 : null, deadlineDays: 7,
    });
    form.scrollIntoView({ block: "start" });
    toast("복사했어요. 날짜를 확인해 주세요.");
  }

  // ---------- 이벤트 ----------
  async function run(fn, okMsg) {
    try { const r = await fn(); if (okMsg) toast(okMsg); return r; }
    catch (e) {
      if (e.code === "auth") return logout();
      toast(e.message);
    }
  }
  const apply = (d, msg) => { Object.assign(state, { activities: d.activities, notices: d.notices, semester: d.semester || "", history: d.history || [], sig: "" }); state.sig = signature(); if (msg) toast(msg); render(); };

  const SEL = "[data-go],[data-apply],[data-cancel],[data-toggle],[data-logout],[data-lang],[data-newsem],[data-admintab],[data-list],[data-close],[data-opennow],[data-type],[data-tpl],[data-copy],[data-sched],[data-savesched],[data-extend],[data-opt],[data-vopt],[data-wn],[data-day],[data-visit],[data-save],[data-submit],[data-rmphoto],[data-zoom],[data-retry]";
  document.addEventListener("click", async (e) => {
    const t = e.target.closest(SEL);
    if (!t) return;
    const d = t.dataset;
    if (d.zoom !== undefined) {
      const bg = document.createElement("div");
      bg.className = "lightbox"; bg.innerHTML = `<img src="${esc(d.zoom)}" alt="">`;
      bg.onclick = () => bg.remove(); document.body.appendChild(bg); return;
    }
    if (d.go) return go(d.go);
    if (t.hasAttribute("data-retry")) return render();
    if (t.hasAttribute("data-toggle")) return t.classList.toggle("open");
    if (t.hasAttribute("data-logout")) return logout();
    if (d.lang) { I18N.set(d.lang); return; }
    if (t.hasAttribute("data-newsem")) {
      const label = (prompt("새 학기 이름을 입력해 주세요. (예: 2027-1)") || "").trim();
      if (!label) return;
      if (!confirm(`'${label}' 학기를 시작할까요?\n지금 활동은 홈에서 사라지고, 부원의 내 정보에만 기록으로 남아요.`)) return;
      const r = await run(() => api("startSemester", { label }), "새 학기를 시작했어요");
      if (r) apply(r);
      return;
    }
    if (d.admintab) { state.adminTab = d.admintab; return render(); }
    if (d.list) return run(() => showApplicants(d.list));
    if (d.type) { const form = t.closest("form"); form.type.value = d.type; return applyType(form); }
    if (d.tpl !== undefined) {
      const form = $app.querySelector('[data-form="activity"]');
      fillForm(form, TEMPLATES[Number(d.tpl)]);
      form.scrollIntoView({ block: "start", behavior: "smooth" });
      return toast("템플릿을 불러왔어요. 날짜를 확인해 주세요.");
    }
    if (d.copy) return copyToForm(state.activities.find((x) => x.id === d.copy));
    if (d.sched) return showSchedule(state.activities.find((x) => x.id === d.sched));
    if (d.extend) {
      const el = document.getElementById("s-deadline");
      const base = new Date(el.value || Date.now());
      if (base < new Date()) base.setTime(Date.now());
      base.setDate(base.getDate() + Number(d.extend));
      el.value = toLocalInput(base); return;
    }
    if (d.savesched) {
      const deadline = document.getElementById("s-deadline").value, opensAt = document.getElementById("s-opens").value;
      if (!deadline) return toast("마감 시각을 입력해 주세요.");
      const r = await run(() => api("updateSchedule", { activityId: d.savesched, opensAt: toISO(opensAt), deadline: toISO(deadline) }), "일정을 바꿨어요");
      if (r) { document.querySelector(".sheet-bg")?.remove(); apply(r); }
      return;
    }
    if (d.rmphoto) {
      const [key, i] = d.rmphoto.split(/:(?=\d+$)/);
      photoList(key).splice(Number(i), 1);
      const box = document.querySelector(`[data-previews="${key}"]`);
      box.innerHTML = previews(key, key === "notice" ? 20 : 1); return;
    }
    if (d.wn) {
      const [aid, n] = d.wn.split(":"), a = state.activities.find((x) => x.id === aid);
      submitDraft(a).n = Number(n);
      const y = window.scrollY; renderDetail(aid); window.scrollTo(0, y); return;
    }
    if (d.day) {
      const form = t.closest("form"), set = new Set((form.days.value || "").split(",").filter(Boolean));
      set.has(d.day) ? set.delete(d.day) : set.add(d.day);
      form.days.value = [...set].join(","); t.classList.toggle("on"); return;
    }
    if (d.vopt) {
      const [aid, key, oid] = d.vopt.split(":");
      const a = state.activities.find((x) => x.id === aid), dr = visitDraft(a), list = dr[key];
      if (list.includes(oid)) dr[key] = list.filter((x) => x !== oid);
      else if (key === "exhibits" && list.length >= 2) return toast("전시회는 최대 2개까지 고를 수 있어요.");
      else list.push(oid);
      const y = window.scrollY; renderDetail(aid); window.scrollTo(0, y); return;
    }
    if (d.visit) {
      const a = state.activities.find((x) => x.id === d.visit), dr = visitDraft(a);
      t.disabled = true;
      const r = await run(() => api("apply", { activityId: a.id, exhibits: dr.exhibits, slots: dr.slots }));
      if (r) { delete state.draft[a.id]; apply(r, "신청이 완료됐어요"); } else t.disabled = false;
      return;
    }
    if (d.opt) {
      const [aid, oid] = d.opt.split(":");
      const a = state.activities.find((x) => x.id === aid), sel = curSel(a);
      state.sel[aid] = sel.includes(oid) ? sel.filter((x) => x !== oid) : isMulti(a) ? [...sel, oid] : [oid];
      const y = window.scrollY; renderDetail(aid); window.scrollTo(0, y); return;
    }
    if (d.close) {
      if (!confirm("지금 바로 마감할까요?")) return;
      const r = await run(() => api("closeActivity", { activityId: d.close }), "마감했어요");
      return r && apply(r);
    }
    if (d.opennow) {
      const r = await run(() => api("openNow", { activityId: d.opennow }), "모집을 시작했어요");
      return r && apply(r);
    }
    if (d.save) {
      const a = state.activities.find((x) => x.id === d.save), sel = curSel(a);
      const empty = !sel.length;
      if (empty && !confirm("신청을 모두 취소할까요?")) return;
      t.disabled = true;
      const r = await run(() => (empty ? api("cancel", { activityId: a.id }) : api("apply", { activityId: a.id, choices: sel })));
      if (r) { delete state.sel[a.id]; delete state.draft[a.id]; apply(r, empty ? "취소했어요" : "저장했어요"); } else t.disabled = false;
      return;
    }
    if (d.submit) {
      const a = state.activities.find((x) => x.id === d.submit), dr = state.draft[a.id];
      if (a.type === "exhibit") {
        const name = dr.name.trim(), place = dr.place.trim(), url = dr.url.trim();
        if (!name || !place) return toast("전시회 이름과 장소를 입력해 주세요.");
        if (!/^https?:\/\//i.test(url)) return toast("예매 사이트 주소를 https://로 시작해 입력해 주세요.");
        t.disabled = true;
        const r = await run(() => api("apply", { activityId: a.id, name, place, url }));
        if (r) { delete state.draft[a.id]; apply(r, "추천했어요"); } else t.disabled = false;
        return;
      }
      const works = dr.works.slice(0, dr.n);
      for (const [i, w] of works.entries()) {
        if (!w.title.trim()) return toast(`작품 ${i + 1}의 제목을 입력해 주세요.`);
        if (!w.photos.length) return toast(`작품 ${i + 1}의 사진을 한 장 이상 올려 주세요.`);
      }
      t.disabled = true; t.textContent = "올리는 중…";
      const r = await run(async () => {
        const out = [];
        for (const w of works) out.push({ title: w.title.trim(), material: w.material.trim(), note: w.note.trim(), anonymous: !!w.anonymous, photos: await uploadAll(w.photos) });
        return api("apply", { activityId: a.id, works: out });
      });
      if (r) { delete state.draft[a.id]; apply(r, "제출했어요"); } else { t.disabled = false; t.textContent = "제출하기"; }
      return;
    }
    if (d.apply) {
      const a = state.activities.find((x) => x.id === d.apply);
      const wasFull = a.type === "first" && full(a.capacity, a.confirmed);
      const r = await run(() => api("apply", { activityId: a.id, choice: d.choice }));
      if (r) apply(r, a.type === "vote" || a.type === "survey" || a.type === "party" ? "답변을 저장했어요" : wasFull ? "대기로 등록했어요" : "신청이 완료됐어요");
      return;
    }
    if (d.cancel) {
      const a = state.activities.find((x) => x.id === d.cancel);
      if (!confirm(a.type === "submit" ? "제출한 작품을 취소할까요?" : a.type === "exhibit" ? "추천을 취소할까요?" : "신청을 취소할까요?")) return;
      const r = await run(() => api("cancel", { activityId: d.cancel }));
      if (r) { delete state.draft[a.id]; delete state.sel[a.id]; apply(r, "취소했어요"); }
    }
  });

  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.matches("[data-pick]")) {
      const key = el.dataset.pick, max = Number(el.dataset.max), list = photoList(key);
      const files = [...el.files].slice(0, max - list.length);
      el.value = "";
      try {
        for (const f of files) list.push(await resizeImage(f));
      } catch (err) { toast(err.message); }
      document.querySelector(`[data-previews="${key}"]`).innerHTML = previews(key, max);
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.dataset.work) {
      const aid = route().slice(3), [i, field] = e.target.dataset.work.split(":");
      const w = state.draft[aid]?.works[Number(i)];
      if (w) w[field] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      return;
    }
    const f = e.target.dataset.draft;
    if (!f) return;
    const aid = route().slice(3);
    if (!state.draft[aid]) return;
    state.draft[aid][f] = e.target.value;
  });

  const parseOptions = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.lastIndexOf("|");
    return i < 0 ? { label: l, capacity: 0 } : { label: l.slice(0, i).trim(), capacity: Number(l.slice(i + 1)) || 0 };
  });
  const toISO = (v) => (v ? new Date(v).toISOString() : "");

  document.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const btn = form.querySelector("button.btn");
    btn.disabled = true;
    try {
      if (form.dataset.form === "login") {
        const r = await api("login", { studentId: f.studentId.trim(), code: f.code.trim() });
        localStorage.setItem("token", r.token);
        state.loaded = false;
        navigator.storage?.persist?.();
        go("/"); return render();
      }
      if (form.dataset.form === "activity") {
        if (f.type === "visit") {
          const lines = (t) => (t || "").split("\n").map((l) => l.trim()).filter(Boolean);
          const ex = lines(f.exhibits), order = ["월", "화", "수", "목", "금", "토", "일"];
          const days = order.filter((d) => (f.days || "").split(",").includes(d));
          const toMin = (v) => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };
          const hhmm = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
          const from = toMin(f.from || "0:0"), to = toMin(f.to || "0:0"), step = Number(f.step) || 60, times = [];
          for (let t0 = from; t0 + step <= to; t0 += step) times.push(`${hhmm(t0)}–${hhmm(t0 + step)}`);
          if (!ex.length) throw new Error("전시회 후보를 입력해 주세요.");
          if (!days.length) throw new Error("관람 가능한 요일 후보를 선택해 주세요.");
          if (!times.length) throw new Error("시작·종료 시각과 간격을 확인해 주세요.");
          f.options = [...ex.map((label) => ({ label, group: "exhibit" })),
            ...days.flatMap((day) => times.map((label) => ({ label, group: "slot", day })))];
        }
        if ((f.type === "first" || f.type === "vote") && !f.date) throw new Error("일시를 입력해 주세요.");
        if (f.opensAt && f.opensAt >= f.deadline) throw new Error("모집 시작은 마감보다 앞이어야 해요.");
        const payload = { title: f.title, type: f.type, desc: f.desc, place: f.place || "", capacity: f.type === "submit" ? Math.max(1, Number(f.maxWorks) || 1) : f.capacity || 0,
          date: toISO(f.date), opensAt: toISO(f.opensAt), deadline: toISO(f.deadline) };
        if (f.type === "visit") payload.options = f.options;
        if (f.type === "choice") {
          payload.options = parseOptions(f.options || "");
          payload.multi = !!f.multi;
          if (payload.options.length < 2) throw new Error("선택지를 2개 이상 입력해 주세요.");
        }
        return apply(await api("createActivity", payload), "활동을 만들었어요");
      }
      if (form.dataset.form === "notice") {
        const images = await uploadAll(state.noticeImgs);
        const d = await api("createNotice", { title: f.title, body: f.body, pinned: !!f.pinned, images });
        state.noticeImgs = [];
        apply(d, "공지를 올렸어요");
      }
    } catch (err) {
      if (err.code === "auth") return logout();
      const el = document.getElementById("err");
      if (el) el.textContent = err.message; else toast(err.message);
      btn.disabled = false;
    }
  });

  window.addEventListener("hashchange", render);

  // 앱으로 돌아올 때 최신 데이터로 갱신 (작성 중인 화면은 건드리지 않음)
  window.addEventListener("focus", async () => {
    const r = route();
    if (!state.loaded || !localStorage.getItem("token") || r === "/admin" || (r.startsWith("/a/") && state.draft[r.slice(3)])) return;
    try { await refresh(); render(); } catch (err) { if (err.code === "auth") logout(); }
  });

  // 모집 시작·마감 시각이 지나면 화면을 자동 갱신
  setInterval(() => {
    if (!state.loaded || document.querySelector(".sheet-bg,.lightbox")) return;
    if (signature() !== state.sig) { state.sig = signature(); if (!/^\/(admin|a\/)/.test(route()) || route().startsWith("/a/")) render(); }
  }, 15000);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js");
  render();
})();

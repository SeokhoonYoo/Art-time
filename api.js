// 서버 통신 계층. API_URL이 있으면 Apps Script, 없으면 로컬 데모 데이터를 사용합니다.
(function () {
  const URL_ = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || "";
  const isDemo = !URL_;

  function fail(msg, code) { const e = new Error(msg); e.code = code; return e; }

  async function remote(action, payload) {
    const token = localStorage.getItem("token") || "";
    let res;
    try {
      res = await fetch(URL_, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, token, ...payload }),
      });
    } catch (e) {
      throw fail("네트워크 연결을 확인해 주세요.", "network");
    }
    let json;
    try { json = await res.json(); } catch (e) { throw fail("서버 응답을 읽지 못했어요.", "network"); }
    if (!json.ok) throw fail(json.error || "문제가 생겼어요.", json.code);
    return json.data;
  }

  // ---------- 데모 모드 ----------
  const KEY = "demo-db-v6";
  const H = 3600 * 1000;
  const wait = () => new Promise((r) => setTimeout(r, 180));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const iso = (ms) => new Date(Date.now() + ms).toISOString();

  function seed() {
    const now = Date.now();
    const app = (activityId, studentId, choice, status = "confirmed", data = null) =>
      ({ id: uid(), activityId, studentId, choice, status, data, createdAt: now - Math.random() * 5 * H });
    return {
      members: [
        { studentId: "20240001", name: "김미술", code: "1234", role: "admin" },
        { studentId: "20240002", name: "이그림", code: "1234", role: "member" },
        { studentId: "20240005", name: "박수채", code: "1234", role: "member" },
        { studentId: "20240006", name: "최유화", code: "1234", role: "member" },
      ],
      semester: "2026-2",
      activities: [
        { id: "p1", title: "봄 MT", type: "vote", status: "closed", opensAt: null, semester: "2026-1", desc: "", date: iso(-200 * 24 * H), place: "", capacity: 0, deadline: iso(-210 * 24 * H) },
        { id: "a1", title: "한강 야외 드로잉", type: "first", status: "open", opensAt: null,
          desc: "한강공원에서 함께 스케치해요. 스케치북과 연필만 챙겨 오시면 돼요.\n우천 시 다음 주로 미뤄집니다.",
          date: iso(72 * H), place: "여의도 한강공원", capacity: 12, deadline: iso(40 * H) },
        { id: "a4", title: "정기 소모임", type: "choice", multi: false, status: "open", opensAt: null,
          desc: "가능한 시간 하나를 골라 주세요. 인원이 차면 대기로 등록돼요.",
          date: "", place: "동아리방", capacity: 0, deadline: iso(5 * 24 * H),
          options: [
            { id: "o1", label: "수요일 오후 6시", capacity: 8 },
            { id: "o2", label: "목요일 오후 7시", capacity: 8 },
            { id: "o3", label: "토요일 오후 2시", capacity: 8 },
          ] },
        { id: "a5", title: "가을 전시회 지킴이", type: "choice", multi: true, status: "open", opensAt: null,
          desc: "전시장을 지켜 줄 시간대를 골라 주세요. 여러 개 선택해도 좋아요.",
          date: "", place: "학생회관 1층 갤러리", capacity: 0, deadline: iso(9 * 24 * H),
          options: [
            { id: "o1", label: "12/1 (화) 오전 10시–12시", capacity: 2 },
            { id: "o2", label: "12/1 (화) 오후 1시–3시", capacity: 2 },
            { id: "o3", label: "12/2 (수) 오전 10시–12시", capacity: 2 },
            { id: "o4", label: "12/2 (수) 오후 1시–3시", capacity: 2 },
          ] },
        { id: "a6", title: "가을 전시회 작품 제출", type: "submit", status: "open", opensAt: null,
          desc: "전시할 작품의 사진과 제목을 올려 주세요. 마감 전까지 다시 수정할 수 있어요.",
          date: "", place: "", capacity: 3, deadline: iso(7 * 24 * H) },
        { id: "a2", title: "외부 전시회 관람 조사", type: "vote", status: "open", opensAt: null,
          desc: "학기말 정기 전시회에 참석 가능한지 알려 주세요.",
          date: iso(24 * 24 * H), place: "학생회관 1층 갤러리", capacity: 0, deadline: iso(10 * 24 * H) },
        { id: "a3", title: "수채화 원데이 클래스", type: "first", status: "open", opensAt: null,
          desc: "초보도 괜찮아요. 재료는 동아리에서 준비합니다.",
          date: iso(6 * 24 * H), place: "동아리방", capacity: 3, deadline: iso(4 * 24 * H) },
        { id: "a8", title: "겨울 MT 수요 조사", type: "survey", status: "open", opensAt: null,
          desc: "대략적인 인원만 확인해요. 가볼까 고민 중이면 '고민 중'을 눌러 주세요.",
          date: iso(40 * 24 * H), place: "", capacity: 0, deadline: iso(14 * 24 * H) },
        { id: "a9", title: "가고 싶은 외부 전시회", type: "exhibit", status: "open", opensAt: null,
          desc: "가고 싶은 전시회를 알려 주세요. 많이 나온 전시회로 단체 관람을 추진해요.",
          date: "", place: "", capacity: 0, deadline: iso(10 * 24 * H) },
        { id: "a7", title: "겨울 MT 신청", type: "first", status: "open", opensAt: iso(26 * H),
          desc: "내일 저녁에 모집을 시작해요.",
          date: iso(40 * 24 * H), place: "가평", capacity: 30, deadline: iso(12 * 24 * H) },
      ],
      applications: [
        app("p1", "20240002", "yes"), app("a1", "20240005", "join"), app("a1", "20240006", "join"),
        app("a3", "20240005", "join"), app("a3", "20240006", "join"), app("a3", "20240002x", "join"),
        app("a2", "20240005", "yes"),
        app("a5", "20240005", "o1"), app("a5", "20240006", "o1"),
      ],
      notices: [
        { id: "n1", title: "이번 학기 활동 일정 안내", pinned: true, createdAt: now - 48 * H, images: [],
          body: "이번 학기 활동은 앱에서 신청받아요. 선착순 활동은 정원이 차면 대기자로 등록됩니다.\n궁금한 점은 임원에게 편하게 물어봐 주세요." },
        { id: "n2", title: "동아리방 사용 규칙", pinned: false, createdAt: now - 20 * H, images: [],
          body: "사용 후 정리와 환기를 부탁드려요. 마지막으로 나가는 사람은 불을 꺼 주세요." },
      ],
    };
  }

  const save = (db) => { localStorage.setItem(KEY, JSON.stringify(db)); return db; };
  const load = () => JSON.parse(localStorage.getItem(KEY) || "null") || save(seed());

  function authed(db, needAdmin) {
    const sid = (localStorage.getItem("token") || "").split(".")[0];
    const m = db.members.find((x) => x.studentId === sid);
    if (!m) throw fail("다시 로그인해 주세요.", "auth");
    if (needAdmin && m.role !== "admin") throw fail("임원만 사용할 수 있어요.");
    return m;
  }

  const isClosed = (a) => a.status === "closed" || Date.now() > new Date(a.deadline).getTime();
  const isUpcoming = (a) => !!a.opensAt && Date.now() < new Date(a.opensAt).getTime();
  const active = (db, aid) => db.applications.filter((p) => p.activityId === aid && p.status !== "canceled");
  const byTime = (x, y) => x.createdAt - y.createdAt;

  // 정원 0은 제한 없음
  function capOf(a, choice) {
    if (a.type === "first") return a.capacity;
    if (a.type === "choice") return (a.options.find((o) => o.id === choice) || {}).capacity || 0;
    return 0; // 그 외 방식은 정원 없음
  }
  const hasRoom = (db, a, choice) => {
    const cap = capOf(a, choice);
    return !cap || active(db, a.id).filter((p) => p.choice === choice && p.status === "confirmed").length < cap;
  };
  function promote(db, a, choice) {
    const next = active(db, a.id).filter((p) => p.choice === choice && p.status === "waitlist").sort(byTime)[0];
    if (next && hasRoom(db, a, choice)) next.status = "confirmed";
  }
  const waitNo = (list, mine) => list.filter((p) => p.choice === mine.choice && p.status === "waitlist").sort(byTime).findIndex((p) => p.id === mine.id) + 1;

  function historyLabel(a, rowsOf) {
    const p = rowsOf[0], d = p.data || {};
    if (a.type === "vote") return p.choice === "yes" ? "참석" : "불참";
    if (a.type === "party") return { all: "참석", main: "개강총회만", after: "뒤풀이만", no: "불참" }[p.choice] || "";
    if (a.type === "survey") return { yes: "갈게요", maybe: "고민 중", no: "못 가요" }[p.choice] || "";
    if (a.type === "choice") return rowsOf.map((x) => (a.options.find((o) => o.id === x.choice) || {}).label).filter(Boolean).join(", ");
    if (a.type === "exhibit") return d.name || "추천 완료";
    if (a.type === "visit") return "신청 완료";
    if (a.type === "submit") return `${(d.works || [d]).length}점 제출`;
    return p.status === "waitlist" ? "대기" : "신청 완료";
  }
  const inSemester = (db, a) => !a.semester || a.semester === db.semester;

  function view(db, m) {
    const history = db.activities.filter((a) => !inSemester(db, a)).map((a) => {
      const mine = active(db, a.id).filter((p) => p.studentId === m.studentId);
      return mine.length ? { id: a.id, title: a.title, type: a.type, semester: a.semester, label: historyLabel(a, mine), at: mine[0].createdAt } : null;
    }).filter(Boolean).sort((x, y) => y.at - x.at);
    return {
      semester: db.semester, history,
      me: { studentId: m.studentId, name: m.name, role: m.role },
      token: m.studentId,
      activities: db.activities.filter((a) => inSemester(db, a)).map((a) => {
        const list = active(db, a.id);
        const mineRows = list.filter((p) => p.studentId === m.studentId);
        const out = { ...a, opensAt: a.opensAt || null, count: list.length, mine: null };
        if (a.type === "first") {
          out.confirmed = list.filter((p) => p.status === "confirmed").length;
          out.waitlist = list.length - out.confirmed;
          const mp = mineRows[0];
          if (mp) out.mine = { status: mp.status, waitNo: waitNo(list, mp) };
        } else if (a.type === "vote" || a.type === "survey" || a.type === "party") {
          out.all = list.filter((p) => p.choice === "all").length;
          out.main = list.filter((p) => p.choice === "main").length;
          out.after = list.filter((p) => p.choice === "after").length;
          out.yes = list.filter((p) => p.choice === "yes").length;
          out.maybe = list.filter((p) => p.choice === "maybe").length;
          out.no = list.filter((p) => p.choice === "no").length;
          if (mineRows[0]) out.mine = { choice: mineRows[0].choice, status: "confirmed" };
        } else if (a.type === "choice") {
          out.options = a.options.map((o) => {
            const ol = list.filter((p) => p.choice === o.id);
            const mp = mineRows.find((p) => p.choice === o.id);
            return { ...o, confirmed: ol.filter((p) => p.status === "confirmed").length,
              waitlist: ol.filter((p) => p.status === "waitlist").length,
              mine: mp ? { status: mp.status, waitNo: waitNo(list, mp) } : null };
          });
          if (mineRows.length) out.mine = { count: mineRows.length };
        } else if (a.type === "visit") {
          const rowsData = list.map((p) => p.data || {});
          out.options = a.options.map((o) => ({ ...o, count: rowsData.filter((d) => (d.exhibits || []).includes(o.id) || (d.slots || []).includes(o.id)).length }));
          if (mineRows[0]) out.mine = { status: "confirmed", data: mineRows[0].data };
        } else if (a.type === "submit" || a.type === "exhibit") {
          if (mineRows[0]) out.mine = { status: "confirmed", data: mineRows[0].data };
        }
        return out;
      }),
      notices: [...db.notices].sort((x, y) => (y.pinned - x.pinned) || (y.createdAt - x.createdAt)),
    };
  }

  const demo = {
    async login({ studentId, code }) {
      await wait();
      const m = load().members.find((x) => x.studentId === studentId && x.code === code);
      if (!m) throw fail("학번 또는 코드가 맞지 않아요.");
      return { token: m.studentId };
    },
    async home() { await wait(); const db = load(); return view(db, authed(db)); },

    async apply(r) {
      await wait(); const db = load(); const m = authed(db);
      const a = db.activities.find((x) => x.id === r.activityId);
      if (!a || isClosed(a)) throw fail("마감된 활동이에요.");
      if (isUpcoming(a)) throw fail("아직 모집 전이에요.");
      const mine = active(db, a.id).filter((p) => p.studentId === m.studentId);
      const add = (choice, status, data) => db.applications.push({ id: uid(), activityId: a.id, studentId: m.studentId, choice, status, data: data || null, createdAt: Date.now() });

      if (a.type === "first") {
        if (mine.length) throw fail("이미 신청했어요.");
        add("join", hasRoom(db, a, "join") ? "confirmed" : "waitlist");
      } else if (a.type === "vote" || a.type === "survey" || a.type === "party") {
        const ok = a.type === "survey" ? ["yes", "maybe", "no"] : a.type === "party" ? ["all", "main", "after", "no"] : ["yes", "no"];
        if (!ok.includes(r.choice)) throw fail("잘못된 선택이에요.");
        if (mine[0]) mine[0].choice = r.choice; else add(r.choice, "confirmed");
      } else if (a.type === "choice") {
        const want = [...new Set(r.choices || [])].filter((id) => a.options.some((o) => o.id === id));
        if (a.type === "choice" && !a.multi && want.length > 1) throw fail("하나만 고를 수 있어요.");
        const mineOpts = mine.filter((p) => p.choice !== "_comment");
        mineOpts.filter((p) => !want.includes(p.choice)).forEach((p) => { p.status = "canceled"; promote(db, a, p.choice); });
        want.filter((id) => !mineOpts.some((p) => p.choice === id)).forEach((id) => add(id, hasRoom(db, a, id) ? "confirmed" : "waitlist"));
      } else if (a.type === "visit") {
        const pick = (g, ids) => [...new Set(ids || [])].filter((id) => a.options.some((o) => o.id === id && o.group === g));
        const data = { exhibits: pick("exhibit", r.exhibits), slots: pick("slot", r.slots) };
        if (!data.exhibits.length || data.exhibits.length > 2) throw fail("전시회를 1~2개 골라 주세요.");
        if (!data.slots.length) throw fail("관람 가능한 시간을 골라 주세요.");
        if (mine[0]) mine[0].data = data; else add("visit", "confirmed", data);
      } else if (a.type === "exhibit") {
        const name = String(r.name || "").trim(), place = String(r.place || "").trim(), url = String(r.url || "").trim();
        if (!name || !place || !/^https?:\/\//i.test(url)) throw fail("전시회 이름, 장소, 예매 사이트(http로 시작)를 입력해 주세요.");
        const data = { name: name.slice(0, 100), place: place.slice(0, 100), url: url.slice(0, 500) };
        if (mine[0]) mine[0].data = data; else add("exhibit", "confirmed", data);
      } else if (a.type === "submit") {
        const works = (r.works || []).slice(0, a.capacity || 1);
        if (!works.length) throw fail("작품을 1개 이상 입력해 주세요.");
        works.forEach((w, i) => { if (!String(w.title || "").trim() || !(w.photos || []).length) throw fail(`${i + 1}번째 작품의 제목과 사진을 입력해 주세요.`); });
        const data = { works: works.map((w) => ({ ...w, photos: w.photos.slice(0, 1) })) };
        if (mine[0]) mine[0].data = data; else add("submit", "confirmed", data);
      }
      save(db); return view(db, m);
    },

    async cancel({ activityId }) {
      await wait(); const db = load(); const m = authed(db);
      const a = db.activities.find((x) => x.id === activityId);
      active(db, activityId).filter((p) => p.studentId === m.studentId).forEach((p) => { p.status = "canceled"; promote(db, a, p.choice); });
      save(db); return view(db, m);
    },

    async upload({ dataUrl }) { await wait(); authed(load()); return { url: dataUrl }; },

    async applicants({ activityId }) {
      await wait(); const db = load(); authed(db, true);
      return active(db, activityId).sort(byTime).map((p) => ({
        studentId: p.studentId, choice: p.choice, status: p.status, data: p.data,
        name: (db.members.find((m) => m.studentId === p.studentId) || {}).name || "",
      }));
    },

    async createActivity(f) {
      await wait(); const db = load(); const m = authed(db, true);
      const options = (f.options || []).map((o, i) => ({ ...o, id: "o" + (i + 1) }));
      db.activities.unshift({ id: uid(), status: "open", opensAt: f.opensAt || null, ...f, options, capacity: Number(f.capacity) || 0, semester: db.semester });
      save(db); return view(db, m);
    },
    async updateSchedule({ activityId, opensAt, deadline }) {
      await wait(); const db = load(); const m = authed(db, true);
      const a = db.activities.find((x) => x.id === activityId);
      if (!deadline) throw fail("마감 시각을 입력해 주세요.");
      if (opensAt && new Date(opensAt) >= new Date(deadline)) throw fail("모집 시작은 마감보다 앞이어야 해요.");
      a.opensAt = opensAt || null; a.deadline = deadline;
      a.status = new Date(deadline) > Date.now() ? "open" : "closed";
      save(db); return view(db, m);
    },
    async startSemester({ label }) {
      await wait(); const db = load(); const m = authed(db, true);
      label = String(label || "").trim();
      if (!label) throw fail("새 학기 이름을 입력해 주세요.");
      if (label === db.semester) throw fail("이미 현재 학기예요.");
      db.activities.forEach((a) => { if (!a.semester) a.semester = db.semester; });
      db.semester = label; save(db); return view(db, m);
    },
    async closeActivity({ activityId }) {
      await wait(); const db = load(); const m = authed(db, true);
      db.activities.find((x) => x.id === activityId).status = "closed";
      save(db); return view(db, m);
    },
    async deleteNotice({ id }) {
      await wait(); const db = load(); const m = authed(db, true);
      db.notices = db.notices.filter((n) => n.id !== id);
      save(db); return view(db, m);
    },
    async deleteActivity({ activityId }) {
      await wait(); const db = load(); const m = authed(db, true);
      db.activities = db.activities.filter((a) => a.id !== activityId);
      db.applications = db.applications.filter((p) => p.activityId !== activityId);
      save(db); return view(db, m);
    },
    async openNow({ activityId }) {
      await wait(); const db = load(); const m = authed(db, true);
      db.activities.find((x) => x.id === activityId).opensAt = null;
      save(db); return view(db, m);
    },
    async createNotice(f) {
      await wait(); const db = load(); const m = authed(db, true);
      db.notices.push({ id: uid(), createdAt: Date.now(), images: [], ...f });
      try { save(db); } catch (e) { throw fail("사진 용량이 커서 체험 모드에선 저장할 수 없어요."); }
      return view(db, m);
    },
  };

  const guard = async (fn) => {
    try { return await fn(); }
    catch (e) { if (e.name === "QuotaExceededError") throw fail("사진 용량이 커서 체험 모드에선 저장할 수 없어요."); throw e; }
  };

  window.api = (action, payload = {}) => (isDemo ? guard(() => demo[action](payload)) : remote(action, payload));
  window.api.isDemo = isDemo;
})();

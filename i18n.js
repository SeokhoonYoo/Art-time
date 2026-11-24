// 한국어 ↔ English. 화면은 한국어로 그린 뒤, 영어 모드일 때 글자만 바꿔 줍니다.
// 임원이 직접 쓴 활동 제목·공지 같은 내용은 번역하지 않아요.
(function () {
  const EN_DAY = { 일: "Sun", 월: "Mon", 화: "Tue", 수: "Wed", 목: "Thu", 금: "Fri", 토: "Sat" };
  const HANGUL = /[가-힣]/;

  const EXACT = {
    "미술시간": "Art Time", "참여할 수 있는 활동이": "Open for you:", "지금은 새로 참여할": "Nothing new to join", "활동이 없어요": "right now",
    "있어요": "available", "지난 학기 활동": "Past semesters", "현재 학기": "Current semester", "새 학기 시작": "Start new semester", "미설정": "Not set",
    "새 학기를 시작했어요": "New semester started", "새 학기 이름을 입력해 주세요.": "Enter a name for the new semester.", "이미 현재 학기예요.": "That's already the current semester.",
    "새 학기 이름을 입력해 주세요. (예: 2027-1)": "Enter the new semester name (e.g. 2027-1)", "추천 완료": "Suggested", "신청 완료": "Signed up",
    "개강총회 참여 조사": "Kick-off party poll", "개강총회만": "Meeting only", "뒤풀이만": "After-party only",
    "참석 · 개강총회만 · 뒤풀이만 · 불참": "Attend all · Meeting only · After-party only · Can't attend",
    "동아리 박람회 운영진 모집": "Club fair staff recruitment",
    "개강총회와 뒤풀이 참석 여부를 알려 주세요. 참석, 개강총회만, 뒤풀이만, 불참 중에서 골라 주세요.": "Let us know if you're coming to the kick-off meeting and the after-party.",
    "홈": "Home", "공지": "Notices", "관리": "Admin", "내 정보": "Profile", "내 활동": "My activities", "언어": "Language",
    "로그아웃": "Log out", "들어가기": "Log in", "학번": "Student ID", "개인 코드": "Personal code",
    "임원": "Officer", "미술시간 로고": "Art Time logo", "임원에게 받은 코드": "Code from an officer", "예) 20240001": "e.g. 20240001",
    "다시 시도": "Retry", "‹ 목록": "‹ Back",
    "선착순": "First come", "참여 조사": "Attendance poll", "선택형": "Choice", "수요 조사": "Interest check",
    "외부 전시회 조사": "Exhibition suggestions", "외부 전시회 관람 신청": "Exhibition visit sign-up", "작품 제출": "Artwork submission",
    "정기 소모임": "Regular meetup", "전시회 작품 제출": "Exhibition artwork submission", "전시회 지킴이": "Exhibition guard",
    "참석": "Attend all", "불참": "Not going", "갈게요": "I'm in", "고민 중": "Maybe", "못 가요": "Can't make it",
    "참석할게요": "I'll attend", "참석으로 답함": "Replied: going", "불참으로 답함": "Replied: not going",
    "마감": "Closed", "곧 마감": "Closing soon", "마감됨": "Closed", "마감됐어요": "Closed", "곧 열려요": "Opening soon",
    "신청": "Sign up", "신청하기": "Sign up", "신청 취소": "Cancel sign-up", "신청됨": "Signed up", "신청 완료": "Signed up",
    "대기": "Waitlist", "대기 취소": "Leave waitlist", "대기로 신청하기": "Join waitlist", "대기 신청 가능": "Waitlist open",
    "신청 마감": "Deadline", "일시": "Date & time", "장소": "Place", "정원": "Capacity", "내 상태": "My status", "아직 신청 전": "Not signed up",
    "모집 시작": "Opens", "제출": "Submit", "제출하기": "Submit", "제출 완료": "Submitted", "제출 취소": "Cancel submission",
    "수정하기": "Edit", "수정해서 다시 제출": "Edit & resubmit", "변경 저장": "Save changes", "선택해 주세요": "Select an option",
    "추천": "Suggest", "추천하기": "Suggest", "추천 완료": "Suggested", "추천 취소": "Cancel suggestion", "내 추천": "My suggestion",
    "전시회 이름": "Exhibition name", "전시회 장소": "Exhibition venue", "예매 사이트": "Booking site", "가고 싶은 전시회": "Exhibition I want to see",
    "가고 싶은 외부 전시회": "Exhibitions I want to see",
    "제목": "Title", "재료": "Materials", "설명": "Description", "설명 (선택)": "Description (optional)", "작품 제목": "Artwork title",
    "작품에 대해 알려 주세요": "Tell us about the work", "예: 캔버스에 아크릴": "e.g. Acrylic on canvas", "예: 서울시립미술관": "e.g. Seoul Museum of Art",
    "사진 (1장)": "Photo (1)", "사진 (최대 20장)": "Photos (up to 20)", "사진 추가": "Add photo", "사진 삭제": "Remove photo",
    "익명 전시": "Anonymous", "익명으로 전시할래요": "Display my work anonymously", "올리는 중…": "Uploading…",
    "하나를 골라 주세요": "Choose one", "여러 개 선택할 수 있어요": "Choose as many as you like", "여러 개 선택 가능": "Multiple choice", "복수 선택": "Multiple choice", "하나 선택": "Choose one",
    "전시회와 시간을 골라 주세요": "Choose exhibitions and times",
    "아직 공지가 없어요": "No notices yet", "고정 공지": "Pinned", "공지 올리기": "Post notice", "내용": "Content",
    "진행 중인 활동": "Open activities", "완료된 활동": "Completed activities", "열려 있는 활동이 없어요": "No open activities",
    "새 활동이 열리면 여기에 나타나요.": "New activities will appear here.",
    "참여한 활동이 없어요": "No activities yet", "홈에서 마음에 드는 활동을 골라 보세요.": "Pick one from Home.",
    "활동": "Activity", "활동 만들기": "Create activity", "만든 활동": "Activities", "활동 이름": "Activity name",
    "템플릿으로 시작하기": "Start from a template", "복사": "Copy", "저장": "Save", "일정 수정": "Edit schedule",
    "모집 시작 (비우면 바로 열려요)": "Opens at (leave empty to open now)", "마감 시각": "Deadline",
    "지금 열기": "Open now", "지금 마감": "Close now", "부원이 하는 일": "What members do",
    "정원 (비우면 제한 없음)": "Capacity (empty = unlimited)", "제출 가능한 작품 수 (1인당)": "Max works per member",
    "선택지 (한 줄에 하나)": "Options (one per line)", "전시회 후보 (한 줄에 하나)": "Exhibition candidates (one per line)",
    "관람 가능한 요일 후보": "Available days", "시작": "Start", "종료": "End", "간격": "Interval", "1시간": "1 hour", "2시간": "2 hours",
    "신청 현황": "Applicants", "아직 신청자가 없어요": "No applicants yet", "확정": "Confirmed", "상단에 고정": "Pin to top",
    "월": "Mon", "화": "Tue", "수": "Wed", "목": "Thu", "금": "Fri", "토": "Sat", "일": "Sun",
    "오전": "AM", "오후": "PM", "동아리방": "Club room", "전시장": "Exhibition hall",
    "정원이 있는 신청. 차면 대기로 등록": "Limited spots. Full means waitlist",
    "참석 / 불참을 답해요": "Answer going / not going",
    "시간·역할 중 고르기 (복수 가능)": "Pick times or roles (multiple allowed)",
    "MT·총회 등 대략적인 인원 확인": "Rough headcount for MT, general meetings, etc.",
    "가고 싶은 외부 전시회 모으기": "Collect exhibitions members want to see",
    "전시회 최대 2개와 가능한 시간 고르기": "Pick up to 2 exhibitions and available times",
    "작품 수를 정하고 작품별 제목·재료·사진(1장) 받기": "Set the number of works; collect title, materials and 1 photo each",
    "체험 모드예요. 데이터는 이 기기에만 저장돼요.": "Demo mode. Data is stored only on this device.",
    "체험 모드 · 학번 20240001 / 코드 1234 (임원), 20240002 / 1234 (회원)": "Demo mode · ID 20240001 / code 1234 (officer), 20240002 / 1234 (member)",
    "학번과 개인 코드로 들어와요.": "Log in with your student ID and personal code.",
    "한 번 로그인하면 이 기기에서는 계속 유지돼요.": "You'll stay logged in on this device.",
    "코드를 모르면 임원에게 물어봐 주세요.": "Ask an officer if you don't know your code.",
    "공지를 올렸어요": "Notice posted", "활동을 만들었어요": "Activity created", "저장했어요": "Saved", "제출했어요": "Submitted",
    "추천했어요": "Suggested", "취소했어요": "Cancelled", "신청이 완료됐어요": "You're signed up", "대기로 등록했어요": "Added to the waitlist",
    "대기로 신청돼요": "You'll be waitlisted", "답변을 저장했어요": "Answer saved", "마감했어요": "Closed", "모집을 시작했어요": "Recruitment started",
    "일정을 바꿨어요": "Schedule updated", "복사했어요. 날짜를 확인해 주세요.": "Copied. Please check the dates.",
    "템플릿을 불러왔어요. 날짜를 확인해 주세요.": "Template loaded. Please check the dates.",
    "신청을 취소할까요?": "Cancel your sign-up?", "신청을 모두 취소할까요?": "Cancel all your sign-ups?",
    "제출한 작품을 취소할까요?": "Cancel your submission?", "추천을 취소할까요?": "Cancel your suggestion?", "지금 바로 마감할까요?": "Close it now?",
    "마감 시각을 입력해 주세요.": "Please enter a deadline.", "일시를 입력해 주세요.": "Please enter a date and time.",
    "모집 시작은 마감보다 앞이어야 해요.": "The start must be before the deadline.",
    "선택지를 2개 이상 입력해 주세요.": "Enter at least 2 options.", "전시회 후보를 입력해 주세요.": "Enter exhibition candidates.",
    "전시회 이름과 장소를 입력해 주세요.": "Enter the exhibition name and venue.",
    "예매 사이트 주소를 https://로 시작해 입력해 주세요.": "Enter the booking site URL starting with https://",
    "전시회는 최대 2개까지 고를 수 있어요.": "You can choose up to 2 exhibitions.",
    "시작·종료 시각과 간격을 확인해 주세요.": "Check the start, end and interval.",
    "관람 가능한 요일 후보를 선택해 주세요.": "Select the available days.",
    "사진을 열 수 없어요.": "Couldn't open the photo.",
    "네트워크 연결을 확인해 주세요.": "Check your network connection.", "서버 응답을 읽지 못했어요.": "Couldn't read the server response.",
    "문제가 생겼어요.": "Something went wrong.", "다시 로그인해 주세요.": "Please log in again.", "임원만 사용할 수 있어요.": "Officers only.",
    "학번 또는 코드가 맞지 않아요.": "Wrong student ID or code.", "마감된 활동이에요.": "This activity is closed.",
    "아직 모집 전이에요.": "Not open yet.", "이미 신청했어요.": "You've already signed up.", "잘못된 선택이에요.": "Invalid choice.",
    "하나만 고를 수 있어요.": "You can choose only one.", "전시회를 1~2개 골라 주세요.": "Choose 1–2 exhibitions.",
    "관람 가능한 시간을 골라 주세요.": "Choose the times you're available.",
    "전시회 이름, 장소, 예매 사이트(http로 시작)를 입력해 주세요.": "Enter the exhibition name, venue and booking site (starting with http).",
    "작품을 1개 이상 입력해 주세요.": "Enter at least 1 work.",
    "사진 용량이 커서 체험 모드에선 저장할 수 없어요.": "Photos are too large to save in demo mode.",
    "참석 또는 불참을 알려 주세요. (MT, 야외 드로잉 등 행사 참석 확인)": "Let us know if you're going. (MT, outdoor drawing, etc.)",
    "대략적인 인원만 확인해요. (MT, 개강총회, 종강총회 등) 정확한 신청은 따로 받을게요.": "Just a rough headcount (MT, semester kick-off/wrap-up party, etc.). Official sign-ups come separately.",
    "가능한 시간 하나를 골라 주세요. 인원이 차면 대기로 등록돼요.": "Pick one time. If it's full, you'll join the waitlist.",
    "전시장을 지켜 줄 시간대를 골라 주세요. 여러 개 선택해도 좋아요.": "Pick the time slots you can guard the exhibition. Multiple choices are fine.",
    "가고 싶은 전시회를 최대 2개 고르고, 관람 가능한 요일·시간을 모두 골라 주세요. 많이 겹치는 시간으로 일정을 잡을게요.": "Pick up to 2 exhibitions and every day and time you're free. We'll schedule the most popular slot.",
    "가고 싶은 전시회의 이름, 장소, 예매 사이트를 알려 주세요. 많이 나온 전시회로 단체 관람을 추진해요.": "Tell us the name, venue and booking site of an exhibition you'd like to see. We'll organize a group visit for the most popular ones.",
    "제출할 작품 수를 고르고, 작품마다 제목·재료·설명·사진을 올려 주세요. 익명 전시 여부도 작품별로 정할 수 있어요. 마감 전까지 수정할 수 있어요.": "Choose how many works to submit, then add a title, materials, description and photo for each. You can choose anonymity per work and edit until the deadline.",
    "고른 요일마다 시간 단위 칸이 만들어져요. (예: 10:00–12:00)": "Each selected day gets time slots (e.g. 10:00–12:00).",
    "정원은 줄 끝에 ‘| 숫자’로 적어요. 정원이 차면 자동으로 대기 신청을 받아요.": "Add ‘| number’ at the end of a line for capacity. Full options automatically take a waitlist.",
    "마감된 활동도 마감 시각을 미래로 바꾸면 다시 열려요.": "A closed activity reopens if you move the deadline to the future.",
    "활동 일시 (선착순·참여 조사는 필수)": "Date & time (required for first-come and attendance polls)",
  };

  // 숫자가 들어간 문장
  const RULES = [
    [/^(\d+)개$/g, "$1"],
    [/(\d+)월 (\d+)일 \(([일월화수목금토])\) (오전|오후) (\d+:\d\d)/g, (m, mo, d, w, ap, t) => `${EN_DAY[w]}, ${mo}/${d} ${t} ${ap === "오전" ? "AM" : "PM"}`],
    [/(\d+)월 (\d+)일/g, "$1/$2"],
    [/(\d+)시간 후 마감/g, "Closes in $1h"],
    [/(\d+)일 후 마감/g, "Closes in $1d"],
    [/(\w{3}, \d+\/\d+ \d+:\d\d [AP]M) 오픈/g, "Opens $1"],
    [/(\w{3}, \d+\/\d+ \d+:\d\d [AP]M)에 열려요/g, "Opens $1"],
    [/모집 전 · /g, "Not open yet · "],
    [/(\d+)\/(\d+)명/g, "$1/$2"],
    [/(\d+)명 신청/g, "$1 signed up"],
    [/(\d+)명 제출/g, "$1 submitted"],
    [/(\d+)건 추천됨/g, "$1 suggested"],
    [/참석 (\d+)명 · 불참 (\d+)명/g, "Going $1 · Not going $2"],
    [/갈게요 (\d+) · 고민 중 (\d+) · 못 가요 (\d+)/g, "In $1 · Maybe $2 · Can't $3"],
    [/대기 (\d+)번/g, "Waitlist #$1"],
    [/대기 (\d+)명/g, "$1 waitlisted"],
    [/대기 (\d+)/g, "Waitlist $1"],
    [/(\d+)개 선택함/g, "$1 selected"],
    [/(\d+)개 중 복수 선택/g, "Choose multiple of $1"],
    [/(\d+)개 중 하나 선택/g, "Choose 1 of $1"],
    [/\(최대 (\d+)개 · (\d+)개 선택\)/g, "(up to $1 · $2 selected)"],
    [/\(여러 개 가능 · (\d+)개 선택\)/g, "(multiple · $1 selected)"],
    [/제출할 작품 수 \(최대 (\d+)점\)/g, "Number of works (up to $1)"],
    [/^(\d+)점$/g, "$1"],
    [/작품 (\d+)의 제목을 입력해 주세요\./g, "Enter a title for work $1."],
    [/작품 (\d+)의 사진을 한 장 이상 올려 주세요\./g, "Add a photo for work $1."],
    [/(\d+)번째 작품의 제목과 사진을 입력해 주세요\./g, "Enter a title and photo for work $1."],
    [/작품 (\d+)/g, "Work $1"],
    [/마감 \+(\d+)일/g, "Deadline +$1d"],
    [/· 사진 (\d+)/g, "· $1 photos"],
    [/'(.+)' 학기를 시작할까요\?\n지금 활동은 홈에서 사라지고, 부원의 내 정보에만 기록으로 남아요\./g, "Start '$1'?\nCurrent activities will disappear from Home and stay only in members' profiles."],
    [/참석 (\d+) · 개강총회만 (\d+) · 뒤풀이만 (\d+) · 불참 (\d+)/g, "All $1 · Meeting only $2 · After-party only $3 · No $4"],
    [/(\d+)점 제출/g, "$1 submitted"],
    [/ · 임원$/g, " · Officer"],
    [/재료 · /g, "Materials · "],
    [/전시회: /g, "Exhibitions: "],
    [/가능 시간: /g, "Available: "],
    [/^(.+)\(으\)로 답함$/g, (m, x) => "Replied: " + tr(x)],
    [/\(대기\)/g, "(waitlist)"],
    [/(^|[ /])([일월화수목금토]) (\d\d:\d\d)/g, (m, pre, w, t) => `${pre}${EN_DAY[w]} ${t}`],
    [/(\d+)개 선택/g, "$1 selected"],
    [/(\d+)명/g, "$1"],
  ];

  function tr(str) {
    if (!HANGUL.test(str)) return str;
    const lead = str.match(/^\s*/)[0], tail = str.match(/\s*$/)[0], core = str.trim();
    if (EXACT[core]) return lead + EXACT[core] + tail;
    let out = core;
    for (const [re, to] of RULES) out = out.replace(re, to);
    return lead + out + tail;
  }

  const ATTRS = ["placeholder", "aria-label", "alt", "title"];
  function walk(root) {
    if (root.nodeType === 3) { const v = tr(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(root.tagName)) return;
    for (const a of ATTRS) if (root.hasAttribute(a)) { const v = tr(root.getAttribute(a)); if (v !== root.getAttribute(a)) root.setAttribute(a, v); }
    root.childNodes.forEach(walk);
  }

  const I18N = (window.I18N = {
    lang: localStorage.getItem("lang") || "ko",
    tr,
    set(lang) { localStorage.setItem("lang", lang); location.reload(); },
  });

  document.documentElement.lang = I18N.lang;
  if (I18N.lang !== "en") return;
  document.title = "Art Time";
  const run = () => {
    obs.disconnect();
    ["app", "toast"].forEach((id) => walk(document.getElementById(id)));
    document.querySelectorAll(".sheet-bg").forEach(walk);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  const obs = new MutationObserver(() => run());
  document.addEventListener("DOMContentLoaded", run);
  // confirm()/alert() 같은 기본 대화상자 문구도 영어로
  const _confirm = window.confirm.bind(window);
  window.confirm = (m) => _confirm(tr(m));
  const _prompt = window.prompt.bind(window);
  window.prompt = (m, d) => _prompt(tr(m), d);
})();

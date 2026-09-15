import { writable, derived, get } from "svelte/store";

export type Lang = "en" | "ko";

export interface Messages {
  loading: string;
  errorConfig: string;
  rotors: string;
  reflector: string;
  ringSetting: string;
  startPosition: string;
  plugboard: string;
  xray: string;
  lid: string;
  rotorCover: string;
  lockView: string;
  unlockView: string;
  viewOverview: string;
  viewKeys: string;
  viewPlugboard: string;
  viewRotors: string;
  input: string;
  output: string;
  copy: string;
  copied: string;
  share: string;
  clear: string;
  group5: string;
  quality: string;
  qAuto: string;
  qHigh: string;
  qLow: string;
  guide: string;
  crack: string;
  guideTitle: string;
  guideIntro: string;
  guideUseTitle: string;
  guideUse: string[];
  guideHowTitle: string;
  guideHow: string[];
  guideXrayTitle: string;
  guideXray: string[];
  crackTitle: string;
  crackIntro: string;
  crackPlaceholder: string;
  crackScopePos: string;
  crackScopeFull: string;
  crackStart: string;
  crackCancel: string;
  crackTooShort: string;
  crackRunning: string;
  crackUse: string;
  crackUseOutput: string;
  crackResultEmpty: string;
  challenges: string;
  challengesTitle: string;
  challengesIntro: string;
  challengeDecrypt: string;
  challengeCrack: string;
  challengeMeaning: string;
  challengeCrackCrib: string;
  crackModeStat: string;
  crackModeCrib: string;
  crackCribPlaceholder: string;
  crackCribOffsetPh: string;
  crackCribImpossible: string;
  crackCribTooShort: string;
  crackPreparing: string;
  crackWorkerError: string;
  tryMe: string;
  demoCancel: string;
  replay: string;
}

const dict: Record<Lang, Messages> = {
  en: {
    loading: "Loading engine…",
    errorConfig: "Invalid configuration — check the rotor and plugboard values",
    rotors: "Rotors (L·M·R)",
    reflector: "Reflector",
    ringSetting: "Ring setting",
    startPosition: "Start position",
    plugboard: "Plugboard",
    xray: "X-ray",
    lid: "Lid",
    rotorCover: "Rotor cover",
    lockView: "Lock view",
    unlockView: "Unlock view",
    viewOverview: "Overview",
    viewKeys: "Keys",
    viewPlugboard: "Plugboard",
    viewRotors: "Rotors",
    input: "IN",
    output: "OUT",
    copy: "Copy",
    copied: "Copied",
    share: "Share",
    clear: "Clear",
    group5: "Groups of 5",
    quality: "Quality",
    qAuto: "Auto",
    qHigh: "High",
    qLow: "Low",
    guide: "Guide",
    crack: "Crack",
    guideTitle: "How it works",
    guideIntro:
      "The Enigma I was Germany's rotor cipher machine of WWII. This is a working simulation",
    guideUseTitle: "Using the machine",
    guideUse: [
      "Type on your physical keyboard, or click the 3D keys. The lampboard lights up with the encrypted letter.",
      "Drag a cable from one plugboard socket to another to swap those two letters before anything else happens. Tap a plugged socket to pull its cable out.",
      "Open the lid and rotor cover with the buttons on the right. X-ray makes the wooden case transparent and exposes all 26 internal wires.",
      "The view buttons at the bottom jump the camera. Lock view stops the scene from rotating while you type.",
    ],
    guideHowTitle: "How the cipher works",
    guideHow: [
      "Signal path: key → plugboard → entry wheel → rotors R·M·L → reflector → rotors L·M·R → plugboard → lamp.",
      "The right rotor steps on every keypress. When it reaches its notch it kicks the middle rotor, and the middle rotor can kick the left one — including the famous double-step anomaly.",
      "The reflector makes the machine reciprocal: the same settings encrypt and decrypt. Restore the rotors, rings and start positions, type the ciphertext, and the plaintext comes back out.",
      "A letter never encrypts to itself. That single flaw helped the Allies break Enigma.",
    ],
    guideXrayTitle: "Reading the X-ray view",
    guideXray: [
      "Dim lines — all 26 possible wires at each stage.",
      "Bright tube with the moving spark — the exact path the current took for your last keypress.",
    ],
    crackTitle: "Crack mode",
    crackIntro:
      "Paste a ciphertext and the cracker brute-forces every start position — optionally every rotor order and reflector too — then ranks candidates by English-likeness (index of coincidence + frequency fit). Ring settings and the plugboard stay as configured above.",
    crackPlaceholder: "Ciphertext (letters only, 30+ recommended)",
    crackScopePos: "Start positions only (fast)",
    crackScopeFull: "Positions + rotor order + reflector (slow)",
    crackStart: "Crack",
    crackCancel: "Cancel",
    crackTooShort: "Need at least 30 letters of ciphertext.",
    crackRunning: "Cracking…",
    crackUse: "Apply",
    crackUseOutput: "Crack the current output",
    crackResultEmpty: "No candidates.",
    challenges: "Challenges",
    challengesTitle: "Historical intercepts",
    challengesIntro:
      "Real Wehrmacht messages intercepted in 1941 — keys recovered by modern cryptanalysis (Ostwald & Weierud, Cryptologia 2017). Read them with the day's key, or crack the start position where the text is long enough. The short ones defeat statistics alone; that is what cribs were for.",
    challengeDecrypt: "Load key & decrypt",
    challengeCrack: "Crack positions",
    challengeMeaning: "Meaning",
    challengeCrackCrib: "Crack with crib",
    crackModeStat: "Statistics (IoC)",
    crackModeCrib: "Crib (known plaintext)",
    crackCribPlaceholder: "Known plaintext fragment (crib), e.g. MELDUNG",
    crackCribOffsetPh: "Offset (blank = search all)",
    crackCribImpossible:
      "Impossible at that offset — a letter would encrypt to itself.",
    crackCribTooShort: "Crib needs at least 3 letters.",
    crackPreparing: "Preparing the engine…",
    crackWorkerError: "Cracker failed to run — see console",
    tryMe: "Try me",
    demoCancel: "Stop demo",
    replay: "Slow replay",
  },
  ko: {
    loading: "엔진 불러오는 중…",
    errorConfig: "설정 오류 — 로터·플러그 값을 확인해 주세요",
    rotors: "로터 (왼·가운데·오른쪽)",
    reflector: "리플렉터",
    ringSetting: "링 세팅",
    startPosition: "초기 위치",
    plugboard: "플러그보드",
    xray: "X-ray",
    lid: "뚜껑",
    rotorCover: "로터 덮개",
    lockView: "회전 잠금",
    unlockView: "잠금 해제",
    viewOverview: "전체",
    viewKeys: "키보드",
    viewPlugboard: "플러그보드",
    viewRotors: "로터",
    input: "입력",
    output: "출력",
    copy: "복사",
    copied: "복사됨",
    share: "링크 공유",
    clear: "지우기",
    group5: "5글자 묶음",
    quality: "품질",
    qAuto: "자동",
    qHigh: "높음",
    qLow: "낮음",
    guide: "가이드",
    crack: "크랙",
    guideTitle: "작동 원리",
    guideIntro:
      "에니그마 I은 2차 대전 당시 독일군이 사용한 로터식 암호기입니다. 이것은 실제로 동작하는 시뮬레이션입니다",
    guideUseTitle: "사용 방법",
    guideUse: [
      "키보드로 직접 타건하거나 3D 키를 눌러 보세요. 램프보드에 암호화된 글자가 켜집니다.",
      "플러그보드의 한 소켓에서 다른 소켓으로 케이블을 끌어다 꽂으면 두 글자가 암호화 전에 서로 뒤바뀝니다. 꽂힌 소켓을 탭하면 케이블이 빠집니다.",
      "오른쪽 버튼으로 뚜껑과 로터 덮개를 여닫을 수 있습니다. X-ray를 켜면 나무 케이스가 반투명해지며 26가닥의 내부 배선이 드러납니다.",
      "아래 뷰 버튼으로 카메라를 바로 이동시킬 수 있습니다. 회전 잠금을 켜면 타건 중 화면이 돌아가지 않습니다.",
    ],
    guideHowTitle: "암호가 동작하는 방식",
    guideHow: [
      "신호 경로: 키 → 플러그보드 → 엔트리 휠 → 로터 R·M·L → 리플렉터 → 로터 L·M·R → 플러그보드 → 램프.",
      "오른쪽 로터는 키를 누를 때마다 한 칸씩 회전합니다. 노치에 도달하면 가운데 로터를 밀고, 가운데가 왼쪽을 미는 유명한 더블 스텝까지 그대로 재현됩니다.",
      "리플렉터 덕분에 기계는 상호적입니다. 같은 설정이면 암호화도 복호화도 됩니다. 로터·링·초기 위치를 똑같이 맞추고 암호문을 타건하면 평문이 나옵니다.",
      "글자는 절대 자기 자신으로 암호화되지 않습니다. 그 단 하나의 결함이 연합군이 에니그마를 깨는 실마리였습니다.",
    ],
    guideXrayTitle: "X-ray 보는 법",
    guideXray: [
      "흐릿한 선 — 각 단계에서 가능한 26가닥 전체 배선.",
      "밝은 튜브와 움직이는 스파크 — 방금 누른 키의 실제 전류 경로.",
    ],
    crackTitle: "크랙 모드",
    crackIntro:
      "암호문을 넣으면 모든 초기 위치를 — 필요하면 로터 순서와 리플렉터까지 — 전수조사하고, 영어다움(일치 지수 + 빈도 적합도)으로 순위를 매깁니다. 링 세팅과 플러그보드는 위에 설정된 값을 그대로 씁니다.",
    crackPlaceholder: "암호문 (영문자만, 30자 이상 권장)",
    crackScopePos: "초기 위치만 (빠름)",
    crackScopeFull: "위치 + 로터 순서 + 리플렉터 (느림)",
    crackStart: "크랙 시작",
    crackCancel: "취소",
    crackTooShort: "암호문이 최소 30자는 필요합니다.",
    crackRunning: "크랙 중…",
    crackUse: "적용",
    crackUseOutput: "현재 출력 크랙",
    crackResultEmpty: "후보가 없습니다.",
    challenges: "챌린지",
    challengesTitle: "역사 실전 전문",
    challengesIntro:
      "1941년에 실제로 가로챈 독일 국방군 전문들 — 현대 암호해독으로 키가 복구된 것들입니다 (Ostwald & Weierud, Cryptologia 2017). 일일 키로 바로 읽거나, 문장이 충분히 긴 것은 초기 위치를 직접 크랙해 보세요. 짧은 것들은 통계만으로는 무리입니다 — 역사적으로 크리브가 필요했던 이유입니다.",
    challengeDecrypt: "일일 키로 복호",
    challengeCrack: "위치 크랙",
    challengeMeaning: "의미",
    challengeCrackCrib: "크리브로 크랙",
    crackModeStat: "통계 (IoC)",
    crackModeCrib: "크리브 (평문 조각)",
    crackCribPlaceholder: "알려진 평문 조각 — 예: MELDUNG",
    crackCribOffsetPh: "오프셋 (비우면 전체 탐색)",
    crackCribImpossible:
      "그 위치엔 올 수 없습니다 — 글자가 자기 자신으로 암호화됩니다.",
    crackCribTooShort: "크리브는 최소 3글자 필요합니다.",
    crackPreparing: "엔진 준비 중…",
    crackWorkerError: "크랙 워커 실행 실패 — 콘솔 확인",
    tryMe: "자동 시연",
    demoCancel: "시연 중지",
    replay: "슬로모션 재생",
  },
};

export type MsgKey = keyof Messages;

function detect(): Lang {
  try {
    const s = localStorage.getItem("enigma-lang");
    if (s === "en" || s === "ko") return s;
  } catch {}
  return "en";
}

export const lang = writable<Lang>(detect());
lang.subscribe((v) => {
  try {
    localStorage.setItem("enigma-lang", v);
  } catch {}
});

export const t = derived(lang, ($l) => dict[$l]);

export function msg(k: MsgKey): string {
  const v = dict[get(lang)][k];
  return typeof v === "string" ? v : v.join("\n");
}

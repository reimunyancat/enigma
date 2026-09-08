export interface Challenge {
  id: string;
  date: string;
  titleEn: string;
  titleKo: string;
  storyEn: string;
  storyKo: string;
  rotors: [string, string, string];
  reflector: string;
  rings: string;
  positions: string;
  plugs: string;
  cipher: string;
  crib: string;
  meaningEn: string;
  meaningKo: string;
  crackable: boolean;
}

export const challenges: Challenge[] = [
  {
    id: "tagesmeldung",
    date: "1941-08-26",
    titleEn: "Send the daily report by radio",
    titleKo: "일일 보고를 무선으로 보낼 것",
    storyEn:
      "Incoming message No. 65, 26 August 1941. Routine traffic at its most routine — an order to send in the daily report by radio.",
    storyKo:
      "1941년 8월 26일 수신 65번 전문. 가장 정례적인 지시 — 일일 보고를 무선으로 보내라.",
    rotors: ["III", "II", "I"],
    reflector: "B",
    rings: "XBM",
    positions: "DOF",
    plugs: "AEBTCFDKGJHMISLVOZUX",
    cipher: "UNXXISVILMHHKZPJZU",
    crib: "FUNKEN",
    meaningEn: "Send daily report by radio.",
    meaningKo: "일일 보고를 무선으로 보낼 것.",
    crackable: false,
  },
  {
    id: "wo-berta",
    date: "1941-07-08",
    titleEn: "Where is Roman One B?",
    titleKo: "로마자 1B 부대는 어디?",
    storyEn:
      "Incoming message No. 128, 8 July 1941. Someone in the field is looking for the Ib — the supply staff unit.",
    storyKo:
      "1941년 7월 8일 수신 128번 전문. 전선에서 보급 참모 부대(Ib)의 위치를 찾고 있습니다.",
    rotors: ["IV", "III", "II"],
    reflector: "B",
    rings: "PKF",
    positions: "SWV",
    plugs: "CYELFHGSIJKQMWPVRZTU",
    cipher: "XPDBQLJWFTULSZCDKQPSWIMGBYS",
    crib: "STAFFEL",
    meaningEn: "Where [is] Roman One B squadron? (Ib = chief of supply)",
    meaningKo: "로마자 1B 부대는 어디에? (Ib = 보급 참모)",
    crackable: false,
  },
  {
    id: "morgenmeldung",
    date: "1941-10-01",
    titleEn: "Morning report cancelled",
    titleKo: "아침 보고 취소",
    storyEn:
      "Incoming message No. 1, 1 October 1941 — three words of nothing happening.",
    storyKo: "1941년 10월 1일 수신 1번 전문 — 아무 일도 없다는 세 단어.",
    rotors: ["V", "I", "IV"],
    reflector: "B",
    rings: "KBU",
    positions: "DEI",
    plugs: "AGELFNHUJVKMOPQRSWTX",
    cipher: "HBCZFWXKBEJDLUXCODAAQV",
    crib: "MORGEN",
    meaningEn: "Morning report cancelled.",
    meaningKo: "아침 보고 취소됨.",
    crackable: false,
  },
  {
    id: "signals-officer",
    date: "1941-09-06",
    titleEn: "Signals officer not present",
    titleKo: "통신장교 부재",
    storyEn:
      "Outgoing message No. 36, 6 September 1941. The division's signals officer cannot be found — signed Steinecke, twice, to be sure.",
    storyKo:
      "1941년 9월 6일 발신 36번 전문. 사단 통신장교가 자리에 없습니다 — 서명은 슈타이네케, 두 번.",
    rotors: ["III", "II", "V"],
    reflector: "B",
    rings: "BYJ",
    positions: "SAU",
    plugs: "AXBHETFKGYIRJZMSOUQW",
    cipher: "ZLXAQIZTGHJYEECHRVPUSGYHYIVKYIBVAZDYNAPYNIDCUXRO",
    crib: "STEINECKE",
    meaningEn: "Division's Signals Officer [is] non-attendant. Steinecke.",
    meaningKo: "사단 통신장교 부재중. 슈타이네케.",
    crackable: false,
  },
  {
    id: "stop-relocation",
    date: "1941-09-24",
    titleEn: "Stop the baggage train",
    titleKo: "짐 열차 이동 중지",
    storyEn:
      "Outgoing message No. 94, 24 September 1941. Halt the relocation — a written order is already on its way. Schneider.",
    storyKo:
      "1941년 9월 24일 발신 94번 전문. 이동 중지 — 서면 명령이 뒤따릅니다. 슈나이더.",
    rotors: ["II", "III", "I"],
    reflector: "B",
    rings: "SZI",
    positions: "DRI",
    plugs: "AQBOCMDPEWFTHSJZKXLU",
    cipher:
      "PWCQFEZLPXGENCLBOXJFVWWPXOOGLRIPJKOUIOTCTNSLZDKYYJQNTVCTMPLUOAUNESZVKXRCTMHM",
    crib: "UMZUG",
    meaningEn:
      "Stop relocation of luggage train and last detachment. Written order is on its way. Schneider.",
    meaningKo: "짐 열차와 후발대의 이동을 중지. 서면 명령 전달 중. 슈나이더.",
    crackable: false,
  },
  {
    id: "pz-gruppe-4",
    date: "1941-07-13",
    titleEn: "To Tank Group 4 — SS Death's Head",
    titleKo: "제4기갑집단 앞 — SS 토텐코프 사단",
    storyEn:
      "Outgoing message No. 25, 13 July 1941. An SS tank division tells Panzer Group 4 it cannot reach its quarters — two other divisions are blocking the road. Long enough to crack.",
    storyKo:
      "1941년 7월 13일 발신 25번 전문. SS 기갑사단이 제4기갑집단에, 다른 두 사단이 길을 막아 숙영지에 들어가지 못한다고 보고합니다. 크랙이 먹힐 만큼 깁니다.",
    rotors: ["IV", "II", "III"],
    reflector: "B",
    rings: "GTO",
    positions: "SDV",
    plugs: "ADEHGYIMKNLROZQVTXUW",
    cipher:
      "FDZCJJDKVWPYFDWPOQZGTJQYYXAFRHSQESERKGJBWBYPEOOKFMMPOMKQDDOLCPKHYPGUZYXBZYANYSAXIPXVQCPJBFFFDRDXFIJJPPPEYALCYKVLKXQHWIRZANGWUJBWVJYCKESMJQRYKQHCQOKMMYWMCKVLZJDVZXRUMRMNWFDZBQGXJQAPFFFZTAHJQZPWQWNIVZWUIJTHOYXGDCOJUW",
    crib: "PANZXGRUPPE",
    meaningEn:
      "To Tank Group 4: SS Death's Head Division stands since 12 July 1100 hours with vanguard at the accommodation area. Cannot enter, as 3rd Infantry Division and 8th Tank Division are blocking and holding the place. — Division Commander",
    meaningKo:
      "제4기갑집단 앞: SS 토텐코프 사단은 7월 12일 1100시부터 선봉이 숙영지 앞에 서 있습니다. 제3보병사단과 제8기갑사단이 막고 점유 중이라 들어가지 못합니다. — 사단장",
    crackable: true,
  },
];

#include <bits/stdc++.h>

using namespace std;

inline int idx(char c) { return c - 'A'; }
inline char chr(int i) { return 'A' + (i % 26 + 26) % 26; }

struct RotorSpec {
    string name;
    string wiring;   // 26개의 알파벳으로 된 배선표 (입력 A는 wiring[0]으로 연결)
    char notch;      // 로터가 특정 위치에 도달했을 때 다음 로터를 한 칸 밀어주는 지점
};

struct ReflectorSpec {
    string name;
    string wiring; // 반사판의 배선표 (26자, 항상 대칭적으로 연결되어 있음)
};

// 로터와 반사판 정의
static const vector<RotorSpec> rotorSpecs = {
    {"I",   "EKMFLGDQVZNTOWYHXUSPAIBRCJ", 'Q'},
    {"II",  "AJDKSIRUXBLHWTMCQGZNPYFVOE", 'E'},
    {"III", "BDFHJLCPRTXVZNYEIWGAKMUSQO", 'V'},
    {"IV",  "ESOVPZJAYQUIRHXLNFTGKDCMWB", 'J'},
    {"V",   "VZBRGITYUPSDNHLXAWMJQOFECK", 'Z'}
};

static const vector<ReflectorSpec> reflectorSpecs = {
    {"A", "EJMZALYXVBWFCRQUONTSPIKHGD"},
    {"B", "YRUHQSLDPXNGOKMIEBFZCWVJAT"},
    {"C", "FVPJIAOYEDRZXWGCTKUQSBNMHL"}
};

struct Plugboard {
    array<int,26> map;
    Plugboard() { for(int i=0;i<26;i++) map[i]=i; }
    void addPair(char a, char b) {
        int ia = idx(a), ib = idx(b);
        map[ia] = ib; map[ib] = ia;
    }
    int forward(int c) const { return map[c]; }
};

class Rotor {
public:
    string name;
    array<int,26> forwardMap;  // 정방향 매핑 (입력 → 출력)
    array<int,26> backwardMap; // 역방향 매핑 (출력 → 입력)
    int ringSetting = 0;       // 링 설정(0~25). 사용자는 보통 1~26으로 입력 → 코드에서는 -1 해서 저장
    int pos = 0;               // 현재 로터의 물리적 위치 (0=A, 25=Z)
    char notch;                // 다음 로터를 움직이게 만드는 위치 표시

    Rotor() = default;

    Rotor(const RotorSpec &spec, int ringSetting1 = 1, char startPos = 'A') {
        name = spec.name;
        notch = spec.notch;
        setWiring(spec.wiring);
        setRingSetting(ringSetting1);
        setPosition(startPos);
    }

    void setWiring(const string &w) {
        // 정방향 매핑 저장
        for (int i=0;i<26;i++) forwardMap[i] = idx(w[i]);
        // 역방향 매핑 계산 (정방향의 반대)
        for (int i=0;i<26;i++) {
            for (int j=0;j<26;j++) if (forwardMap[j]==i) { backwardMap[i]=j; break; }
        }
    }
    void setRingSetting(int rs1) { // 사용자 입력(1~26)을 코드 내부(0~25)로 변환
        ringSetting = (rs1 - 1 + 26) % 26;
    }
    void setPosition(char p) { pos = idx(p); }

    // 로터를 한 칸 회전
    void step() { pos = (pos + 1) % 26; }

    // 현재 로터가 notch 위치에 있는지 확인
    bool atNotch() const { return chr(pos) == notch; }

    // 신호가 로터를 통과
    int forward(int c) const {
        // 실제 동작:
        // 1) 입력에 현재 위치(pos)와 링 설정(ringSetting)을 반영하여 보정
        // 2) 로터 배선(forwardMap) 통과
        // 3) 다시 위치 보정을 해줌
        int shifted = (c + pos - ringSetting + 26) % 26;
        int wired = forwardMap[shifted];
        int out = (wired - pos + ringSetting + 26) % 26;
        return out;
    }

    // 신호가 역방향으로 통과
    int backward(int c) const {
        int shifted = (c + pos - ringSetting + 26) % 26;
        int wired = backwardMap[shifted];
        int out = (wired - pos + ringSetting + 26) % 26;
        return out;
    }
};

// ---------- 반사판 ----------
class Reflector {
public:
    array<int,26> map;
    Reflector() { for (int i=0;i<26;i++) map[i]=i; }
    Reflector(const ReflectorSpec &spec) {
        for (int i=0;i<26;i++) map[i] = idx(spec.wiring[i]);
    }
    int reflect(int c) const { return map[c]; }
};

// ---------- 본체 ----------
class EnigmaMachine {
public:
    vector<Rotor> rotors;   // 왼쪽 → 오른쪽 순서
    Reflector reflector;
    Plugboard plugboard;

    // 기계 초기화
    // rotorNames: 사용 로터 이름 (예: {"I","II","III"})
    // reflectorName: 반사판 이름
    // ringSettings: 링 설정값들 (각각 1~26)
    // startPositions: 시작 위치 (예: "ABC")
    // plugPairs: 플러그보드 연결 쌍
    EnigmaMachine(const vector<string> &rotorNames,
                  const string &reflectorName,
                  const vector<int> &ringSettings,
                  const string &startPositions,
                  const vector<pair<char,char>> &plugPairs = {})
    {
        // 로터 생성
        for (size_t i=0;i<rotorNames.size();++i) {
            string rn = rotorNames[i];
            auto it = find_if(rotorSpecs.begin(), rotorSpecs.end(),
                [&](const RotorSpec &rs){ return rs.name==rn; });
            if (it==rotorSpecs.end()) throw runtime_error("Unknown rotor: "+rn);
            Rotor r(*it, ringSettings[i], startPositions[i]);
            rotors.push_back(r);
        }
        // 반사판 생성
        auto rit = find_if(reflectorSpecs.begin(), reflectorSpecs.end(),
                [&](const ReflectorSpec &rs){ return rs.name==reflectorName; });
        if (rit==reflectorSpecs.end()) throw runtime_error("Unknown reflector: "+reflectorName);
        reflector = Reflector(*rit);

        // 플러그보드 설정
        for (auto &p : plugPairs) plugboard.addPair(p.first, p.second);
    }

    // 로터 회전 규칙 (더블 스텝 포함)
    void stepRotors() {
        // 규칙:
        // 1) 오른쪽 로터는 항상 한 칸 전진
        // 2) 가운데 로터가 notch에 있으면, 가운데 + 왼쪽 로터가 같이 전진
        // 3) 오른쪽 로터가 notch에 있으면 가운데 로터도 전진
        if (rotors.size() == 1) { rotors[0].step(); return; }
        if (rotors.size() == 2) {
            // 2로터 모델: 오른쪽이 notch면 왼쪽도 전진
            if (rotors[1].atNotch()) rotors[0].step();
            rotors[1].step();
            return;
        }
        // 일반적인 3로터 모델
        bool rightAtNotch = rotors[rotors.size()-1].atNotch();
        bool middleAtNotch = rotors[rotors.size()-2].atNotch();

        if (middleAtNotch) { // 더블스텝: 가운데 + 왼쪽 이동
            rotors[rotors.size()-3].step();
            rotors[rotors.size()-2].step();
        }
        if (rightAtNotch) { // 오른쪽이 notch면 가운데 이동
            rotors[rotors.size()-2].step();
        }
        rotors[rotors.size()-1].step(); // 오른쪽은 항상 이동
    }

    // 문자 1개 처리 (A~Z만 변환, 나머지는 그대로)
    char processChar(char ch) {
        if (ch < 'A' || ch > 'Z') return ch;

        stepRotors(); // 문자를 암호화하기 전 로터 회전

        int c = idx(ch);
        // 플러그보드 통과 (입력)
        c = plugboard.forward(c);

        // 로터를 오른쪽→왼쪽으로 통과
        for (int i = (int)rotors.size()-1; i >= 0; --i) c = rotors[i].forward(c);

        // 반사판
        c = reflector.reflect(c);

        // 로터를 왼쪽→오른쪽으로 역방향 통과
        for (size_t i=0;i<rotors.size();++i) c = rotors[i].backward(c);

        // 플러그보드 통과 (출력)
        c = plugboard.forward(c);

        return chr(c);
    }

    // 문자열 처리
    string encrypt(const string &msg) {
        string up;
        up.reserve(msg.size());
        for (char ch : msg) {
            char C = ch;
            if ('a' <= C && C <= 'z') C = C - 'a' + 'A'; // 소문자는 대문자로 변환
            up.push_back(processChar(C));
        }
        return up;
    }

    // 플러그보드 쌍 추가
    void addPlugPair(char a, char b) { plugboard.addPair(a,b); }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // 예시: 3로터 (왼→오): I, II, III, 반사판 B
    // 링 설정: {1,1,1}
    // 시작 위치: "AAA"
    vector<string> rotorNames = {"I","II","III"};
    string reflectorName = "B";
    vector<int> ringSettings = {1,1,1};
    string startPositions = "AAA";

    // 플러그보드 설정
    vector<pair<char,char>> plugs = {{'A','B'},{'C','D'}};

    EnigmaMachine machine(rotorNames, reflectorName, ringSettings, startPositions, plugs);

    string plaintext = "HELLO WORLD";
    string cipher = machine.encrypt(plaintext);

    cout << "Plain : " << plaintext << "\n";
    cout << "Cipher: " << cipher << "\n";

    // 복호화: 같은 설정으로 기계를 다시 맞추고 같은 과정을 돌리면 원문이 복원됨
    EnigmaMachine machine2(rotorNames, reflectorName, ringSettings, startPositions, plugs);
    cout << "Decrypt: " << machine2.encrypt(cipher) << "\n";

    return 0;
}

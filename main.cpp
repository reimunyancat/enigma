#include <bits/stdc++.h>

using namespace std;

inline int idx(char c) { return c - 'A'; }
inline char chr(int i) { return 'A' + (i % 26 + 26) % 26; }

struct RotorSpec {
    string name;
    string wiring;   // 26 chars, mapping from A->wiring[0], ...
    char notch;      // 돌릴 때 다음 로터를 한 칸 이동시키는 위치(하나 또는 여러개인 경우 확장 가능)
};

struct ReflectorSpec {
    string name;
    string wiring; // 26 chars, symmetric mapping
};

// 몇 가지 전형적인 로터와 리플렉터(역사적 표준 매핑)
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
    array<int,26> forwardMap;  // 입력 인덱스 -> 출력 인덱 (wiring)
    array<int,26> backwardMap; // 역방향 매핑
    int ringSetting = 0;       // 0..25 (엔니그마 사용자 입력은 1..26이므로 코드에서 -1 해주기)
    int pos = 0;               // 현재 위치, 0..25 (A=0)
    char notch;                // notch 문자(예: 'Q')

    Rotor() = default;

    Rotor(const RotorSpec &spec, int ringSetting1 = 1, char startPos = 'A') {
        name = spec.name;
        notch = spec.notch;
        setWiring(spec.wiring);
        setRingSetting(ringSetting1);
        setPosition(startPos);
    }

    void setWiring(const string &w) {
        for (int i=0;i<26;i++) forwardMap[i] = idx(w[i]);
        for (int i=0;i<26;i++) {
            // backwardMap: find j where forwardMap[j] == i
            for (int j=0;j<26;j++) if (forwardMap[j]==i) { backwardMap[i]=j; break; }
        }
    }
    void setRingSetting(int rs1) { // rs1: 1..26 typical user interface
        ringSetting = (rs1 - 1 + 26) % 26;
    }
    void setPosition(char p) { pos = idx(p); }

    // rotor steps (한칸 전진)
    void step() { pos = (pos + 1) % 26; }

    // notch에 위치해 있는지 (다음 스텝에서 이 로터가 중간/왼쪽 로터를 밀어내는 조건 판정에 사용)
    bool atNotch() const { return chr(pos) == notch; }

    // 로터를 통과 (정방향)
    int forward(int c) const {
        // c: 0..25 전기적 입력
        // 실제 변환: (map[(c + pos - ring) mod 26] - pos + ring) mod 26
        int shifted = (c + pos - ringSetting + 26) % 26;
        int wired = forwardMap[shifted];
        int out = (wired - pos + ringSetting + 26) % 26;
        return out;
    }

    // 역방향 (반사 후 복귀)
    int backward(int c) const {
        int shifted = (c + pos - ringSetting + 26) % 26;
        int wired = backwardMap[shifted];
        int out = (wired - pos + ringSetting + 26) % 26;
        return out;
    }
};

// ---------- Reflector ----------
class Reflector {
public:
    array<int,26> map;
    Reflector() { for (int i=0;i<26;i++) map[i]=i; }
    Reflector(const ReflectorSpec &spec) {
        for (int i=0;i<26;i++) map[i] = idx(spec.wiring[i]);
    }
    int reflect(int c) const { return map[c]; }
};

// ---------- Enigma Machine ----------
class EnigmaMachine {
public:
    vector<Rotor> rotors;   // left .. right (rotors[0] is leftmost)
    Reflector reflector;
    Plugboard plugboard;

    // 생성: rotorNames: 예: {"I","II","III"} (left->right)
    EnigmaMachine(const vector<string> &rotorNames,
                  const string &reflectorName,
                  const vector<int> &ringSettings,    // same length as rotorNames, 1..26
                  const string &startPositions,       // same length, e.g. "ABC"
                  const vector<pair<char,char>> &plugPairs = {}) 
    {
        // 로터 객체 생성
        for (size_t i=0;i<rotorNames.size();++i) {
            string rn = rotorNames[i];
            auto it = find_if(rotorSpecs.begin(), rotorSpecs.end(),
                [&](const RotorSpec &rs){ return rs.name==rn; });
            if (it==rotorSpecs.end()) throw runtime_error("Unknown rotor: "+rn);
            Rotor r(*it, ringSettings[i], startPositions[i]);
            rotors.push_back(r);
        }
        // 리플렉터 설정
        auto rit = find_if(reflectorSpecs.begin(), reflectorSpecs.end(),
                [&](const ReflectorSpec &rs){ return rs.name==reflectorName; });
        if (rit==reflectorSpecs.end()) throw runtime_error("Unknown reflector: "+reflectorName);
        reflector = Reflector(*rit);

        // 플러그보드 설정
        for (auto &p : plugPairs) plugboard.addPair(p.first, p.second);
    }

    // 스텝 규칙 구현 (더블 스텝 포함)
    void stepRotors() {
        // 전형적인 3-rotor 엔니그마 규칙:
        // 1) 오른쪽(=rotors.back())는 매 문자를 처리하기 전에 항상 한칸 전진
        // 2) 만약 가운데(rotors[1])가 notch에 있으면(=다음 스텝에서) 왼쪽이 전진 (더블스텝 현상 유발)
        // 3) 만약 오른쪽이 notch에 있으면 가운데도 전진
        // 구현은 전통 방식: 오른쪽 먼저 전진, 그러나 더블스텝을 위해 체크 순서를 맞춤.
        if (rotors.size() == 1) { rotors[0].step(); return; }
        if (rotors.size() == 2) {
            // 2-rotor: 오른쪽이 notch에 있으면 왼쪽도 전진
            if (rotors[1].atNotch()) rotors[0].step();
            rotors[1].step();
            return;
        }
        // 3개 이상 (일반적으로 3개)
        // 더블스텝: 가운데가 notch에 있으면 가운데와 왼쪽이 전진
        // 또한 오른쪽이 notch면 가운데가 전진
        bool rightAtNotch = rotors[rotors.size()-1].atNotch();
        bool middleAtNotch = rotors[rotors.size()-2].atNotch();

        // 더블 스텝 효과: 가운데가 notch이면 가운데+왼쪽이 전진
        if (middleAtNotch) {
            rotors[rotors.size()-3].step();
            rotors[rotors.size()-2].step();
        }
        // 오른쪽이 notch면 가운데 전진
        if (rightAtNotch) {
            rotors[rotors.size()-2].step();
        }
        // 오른쪽은 항상 전진
        rotors[rotors.size()-1].step();
    }

    // 한 문자 처리 (대문자 A-Z만; 그 외는 그대로 반환)
    char processChar(char ch) {
        if (ch < 'A' || ch > 'Z') return ch;

        stepRotors();

        int c = idx(ch);
        // plugboard in
        c = plugboard.forward(c);

        // through rotors right-to-left (note: rotors vector is left..right)
        for (int i = (int)rotors.size()-1; i >= 0; --i) c = rotors[i].forward(c);

        // reflector
        c = reflector.reflect(c);

        // back through rotors left-to-right (inverse)
        for (size_t i=0;i<rotors.size();++i) c = rotors[i].backward(c);

        // plugboard out
        c = plugboard.forward(c);

        return chr(c);
    }

    string encrypt(const string &msg) {
        string up;
        up.reserve(msg.size());
        // convert to uppercase and pass through; preserve non-letters
        for (char ch : msg) {
            char C = ch;
            if ('a' <= C && C <= 'z') C = C - 'a' + 'A';
            up.push_back(processChar(C));
        }
        return up;
    }

    // 편의: 플러그보드 추가
    void addPlugPair(char a, char b) { plugboard.addPair(a,b); }
};

// ---------- 예제 사용(메인) ----------
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // 예: 3-rotor 구성 (왼->오): I II III, Reflector B
    // 링 설정: 1,1,1 (사용자는 1..26로 입력)
    // 초기 위치: "A", "A", "A"
    vector<string> rotorNames = {"I","II","III"};
    string reflectorName = "B";
    vector<int> ringSettings = {1,1,1};
    string startPositions = "AAA";

    // 플러그보드 예시: A<->B, C<->D
    vector<pair<char,char>> plugs = {{'A','B'},{'C','D'}};

    EnigmaMachine machine(rotorNames, reflectorName, ringSettings, startPositions, plugs);

    string plaintext = "HELLO WORLD";
    string cipher = machine.encrypt(plaintext);

    cout << "Plain : " << plaintext << "\n";
    cout << "Cipher: " << cipher << "\n";

    // 복호화: 같은 설정으로 기계를 재설정(동일 rotor, ring, start positions, plug) 후 다시 암호화하면 원문 복원
    EnigmaMachine machine2(rotorNames, reflectorName, ringSettings, startPositions, plugs);
    cout << "Decrypt: " << machine2.encrypt(cipher) << "\n";

    return 0;
}

#include <bits/stdc++.h>

using namespace std;

inline int idx(char c) { return c - 'A'; }
inline char chr(int i) { return 'A' + (i % 26 + 26) % 26; }

struct RotorSpec {
    string name;
    string wiring;
    char notch;
};

struct ReflectorSpec {
    string name;
    string wiring;
};

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
    array<int,26> forwardMap;  // 정방향
    array<int,26> backwardMap; // 역방향
    int ringSetting = 0;       // 링 설정(0~25). 1~26으로 입력 → 코드에서는 -1 해서 저장
    int pos = 0;               // 현재 로터의 물리적 위치 (0=A, 25=Z)
    char notch;                // 다음 로터를 움직이게 만드는 위치 표시

    Rotor() = default;

    Rotor(const RotorSpec &spec, int ringSetting1 = 1, int startPos = 0) {
        name = spec.name;
        notch = spec.notch;
        setWiring(spec.wiring);
        setRingSetting(ringSetting1);
        setPosition(startPos);
    }

    void setWiring(const string &w) {
        for (int i=0;i<26;i++) forwardMap[i] = idx(w[i]);
        for (int i=0;i<26;i++) {
            for (int j=0;j<26;j++) if (forwardMap[j]==i) { backwardMap[i]=j; break; }
        }
    }
    void setRingSetting(int rs1) { ringSetting = (rs1 - 1 + 26) % 26; }
    void setPosition(int p) { pos = p; }

    void step() { pos = (pos + 1) % 26; }

    bool atNotch() const { return chr(pos) == notch; }

    int forward(int c) const {
        int shifted = (c + pos - ringSetting + 26) % 26;
        int wired = forwardMap[shifted];
        int out = (wired - pos + ringSetting + 26) % 26;
        return out;
    }

    int backward(int c) const {
        int shifted = (c + pos - ringSetting + 26) % 26;
        int wired = backwardMap[shifted];
        int out = (wired - pos + ringSetting + 26) % 26;
        return out;
    }
};

class Reflector {
public:
    array<int,26> map;
    Reflector() { for (int i=0;i<26;i++) map[i]=i; }
    Reflector(const ReflectorSpec &spec) {
        for (int i=0;i<26;i++) map[i] = idx(spec.wiring[i]);
    }
    int reflect(int c) const { return map[c]; }
};

class EnigmaMachine {
public:
    vector<Rotor> rotors;
    Reflector reflector;
    Plugboard plugboard;

    EnigmaMachine(const vector<string> &rotorNames,
                  const string &reflectorName,
                  const vector<int> &ringSettings,
                  const vector<int> &startPositions,
                  const vector<pair<char,char>> &plugPairs = {})
    {
        for (size_t i=0;i<rotorNames.size();++i) {
            string rn = rotorNames[i];
            auto it = find_if(rotorSpecs.begin(), rotorSpecs.end(),
                [&](const RotorSpec &rs){ return rs.name==rn; });
            if (it==rotorSpecs.end()) throw runtime_error("Unknown rotor: "+rn);
            Rotor r(*it, ringSettings[i], startPositions[i]);
            rotors.push_back(r);
        }
        auto rit = find_if(reflectorSpecs.begin(), reflectorSpecs.end(),
                [&](const ReflectorSpec &rs){ return rs.name==reflectorName; });
        if (rit==reflectorSpecs.end()) throw runtime_error("Unknown reflector: "+reflectorName);
        reflector = Reflector(*rit);

        for (auto &p : plugPairs) plugboard.addPair(p.first, p.second);
    }

    void stepRotors() {
        if (rotors.size() == 1) { rotors[0].step(); return; }
        if (rotors.size() == 2) {
            if (rotors[1].atNotch()) rotors[0].step();
            rotors[1].step();
            return;
        }
        bool rightAtNotch = rotors[rotors.size()-1].atNotch();
        bool middleAtNotch = rotors[rotors.size()-2].atNotch();

        if (middleAtNotch) {
            rotors[rotors.size()-3].step();
            rotors[rotors.size()-2].step();
        }
        if (rightAtNotch) { rotors[rotors.size()-2].step(); }
        rotors[rotors.size()-1].step();
    }

    char processChar(char ch) {
        if (ch < 'A' || ch > 'Z') return ch;

        stepRotors();

        int c = idx(ch);
        c = plugboard.forward(c);

        for (int i = (int)rotors.size()-1; i >= 0; --i) c = rotors[i].forward(c);

        c = reflector.reflect(c);

        for (size_t i=0;i<rotors.size();++i) c = rotors[i].backward(c);

        c = plugboard.forward(c);

        return chr(c);
    }

    string encrypt(const string &msg) {
        string up;
        up.reserve(msg.size());
        for (char ch : msg) {
            char C = ch;
            if ('a' <= C && C <= 'z') C = C - 'a' + 'A';
            up.push_back(processChar(C));
        }
        return up;
    }

    void addPlugPair(char a, char b) { plugboard.addPair(a,b); }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cout.tie(nullptr);

    vector<string> rotorNames = {"I","II","III"};
    string reflectorName = "B";
    vector<int> ringSettings = {8,11,21};
    vector<int> startPositions = {19,14,20};

    vector<pair<char,char>> plugs = {{'A','B'},{'C','D'}, {'X', 'Z'}};

    EnigmaMachine machine(rotorNames, reflectorName, ringSettings, startPositions, plugs);

    string plaintext = "TOUHOU";
    string cipher = machine.encrypt(plaintext);

    cout << "Plain : " << plaintext << "\n";
    cout << "Cipher: " << cipher << "\n";

    EnigmaMachine machine2(rotorNames, reflectorName, ringSettings, startPositions, plugs);
    cout << "Decrypt: " << machine2.encrypt(cipher) << "\n";

    return 0;
}

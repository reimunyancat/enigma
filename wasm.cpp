#include <cstring>
#include <emscripten.h>
#include "enigma.hpp"

static EnigmaMachine* g_machine = nullptr;  

extern "C" {

EMSCRIPTEN_KEEPALIVE
int enigma_init(const char* rotors, const char* reflector,
                const char* rings, const char* positions,
                const char* plugs) {
    vector<string> rotorNames;
    string token;
    for (const char* p = rotors;; ++p) {
        if (*p == ' ' || *p == '\0') {
            if (!token.empty()) { rotorNames.push_back(token); token.clear(); }
            if (*p == '\0') break;
        } else {
            token += *p;
        }
    }

    vector<char> ringSettings(rings, rings + strlen(rings));
    vector<char> startPositions(positions, positions + strlen(positions));

    vector<pair<char,char>> plugPairs;
    for (size_t i = 0; plugs[i] != '\0' && plugs[i+1] != '\0'; i += 2) {
        plugPairs.push_back({plugs[i], plugs[i+1]});
    }

    try {
        EnigmaMachine* m = new EnigmaMachine(rotorNames, string(reflector),
                                             ringSettings, startPositions, plugPairs);
        delete g_machine;
        g_machine = m;
        return 1;
    } catch (...) {
        return 0;
    }
}

EMSCRIPTEN_KEEPALIVE
char enigma_press(char c) {
    if (!g_machine) return '?';
    return g_machine->processChar(c);
}

EMSCRIPTEN_KEEPALIVE
const char* enigma_positions() {
    static char buf[16];
    if (!g_machine) { buf[0] = '\0'; return buf; }
    size_t n = g_machine->rotors.size();
    if (n > 15) n = 15;
    for (size_t i = 0; i < n; ++i) buf[i] = chr(g_machine->rotors[i].pos);
    buf[n] = '\0';
    return buf;
}

EMSCRIPTEN_KEEPALIVE
const char* enigma_trace(char c) {
    static string buf;
    if (!g_machine) { buf = ""; return buf.c_str(); }
    buf = g_machine->tracePath(c);
    return buf.c_str();
}

}
#include <iostream>
#include "enigma.hpp"

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cout.tie(nullptr);

    vector<string> rotorNames = {"I","II","III"};
    string reflectorName = "B";
    vector<char> ringSettings   = {'T','O','U'};
    vector<char> startPositions = {'H','O','U'};
    vector<pair<char,char>> plugs = {{'A','B'},{'C','D'},{'X','Z'}};

    EnigmaMachine machine(rotorNames, reflectorName, ringSettings, startPositions, plugs);

    string plaintext = "TOUHOU";
    string cipher = machine.encrypt(plaintext);
    cout << "Plain : " << plaintext << "\n";
    cout << "Cipher: " << cipher << "\n";

    EnigmaMachine machine2(rotorNames, reflectorName, ringSettings, startPositions, plugs);
    cout << "Decrypt: " << machine2.encrypt(cipher) << "\n";
    return 0;
}
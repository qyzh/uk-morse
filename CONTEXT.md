# Morse Trainer

A browser practice console for learning Morse code: keying it, reading it, and hearing it.

## Language

### Morse

**Element**:
A dit or a dah, the smallest sound in Morse.
_Avoid_: symbol, dot, dash

**Code**:
The elements that make up one entry, such as `.-` for A.
_Avoid_: pattern, token, symbol

**Entry**:
One row of the Morse table: a letter, number, punctuation mark or prosign.
_Avoid_: symbol, character

**Prosign**:
An entry sent as one unbroken code, such as SOS.
_Avoid_: procedural signal

**Unknown input**:
A buffer or text character that matches no entry. It is a failed translation, never an entry, and in particular never the `?` entry.
_Avoid_: invalid symbol

### Keying

**Buffer**:
The elements keyed so far that have not been committed.
_Avoid_: input, active symbol

**Commit**:
Ending the buffer so it is translated into an entry or unknown input.
_Avoid_: submit

**Word gap**:
The pause separating two words, typed with Enter or the Spasi pad button.
_Avoid_: space

**Transcript**:
The entries and word gaps committed so far in the Trainer. A prosign stays one item in it.
_Avoid_: output, decoded text

### Practice

**Drill**:
A practice mode that shows one target at a time: Encode (key the code for an entry) or Decode (name the entry for a code).
_Avoid_: exercise, quiz

**Target**:
The entry the user is asked for right now.
_Avoid_: question, prompt

**Round**:
One target, from when it appears until the next one replaces it.
_Avoid_: attempt, turn

**Speed test**:
A timed run scoring correct entries, reported as WPM.
_Avoid_: timed drill

**Practice session**:
The drills and speed test from entering the Latihan view until leaving it. Its scores do not outlive it.

**Progress**:
What outlives a practice session: lifetime drill tally, best streak, and best WPM per speed-test duration.
_Avoid_: stats, history

**Streak**:
Consecutive correct drill answers, across both drills.

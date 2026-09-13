/**
 * Frontend Fuzzy Matching Engine for answer verification
 */
const FuzzyMatcher = {
  normalize(text) {
    if (!text) return '';
    let t = String(text).toLowerCase();
    t = t.replace(/\(\d{4}\)|\b\d{4}\b/g, '');
    t = t.replace(/[^\w\s]/g, '');
    t = t.replace(/^(the|a|an|el|la)\s+/i, '').trim();
    t = t.replace(/\s+/g, ' ');
    return t;
  },

  levenshtein(s1, s2) {
    if (s1.length < s2.length) return this.levenshtein(s2, s1);
    if (s2.length === 0) return s1.length;
    let prev = [];
    for (let i = 0; i <= s2.length; i++) prev[i] = i;
    for (let i = 0; i < s1.length; i++) {
      let curr = [i + 1];
      for (let j = 0; j < s2.length; j++) {
        let ins = prev[j + 1] + 1;
        let del = curr[j] + 1;
        let sub = prev[j] + (s1[i] === s2[j] ? 0 : 1);
        curr[j + 1] = Math.min(ins, del, sub);
      }
      prev = curr;
    }
    return prev[s2.length];
  },

  isMatch(guess, answer) {
    const nGuess = this.normalize(guess);
    const nAns = this.normalize(answer);
    if (!nGuess || !nAns) return false;
    if (nGuess === nAns) return true;

    const lenDiff = Math.abs(nGuess.length - nAns.length);
    if (lenDiff <= 2) {
      const dist = this.levenshtein(nGuess, nAns);
      if (nAns.length <= 4) {
        if (dist === 0) return true;
      } else if (nAns.length <= 8) {
        if (dist <= 1) return true;
      } else {
        if (dist <= 2) return true;
      }
    }

    if (answer.includes(':') || answer.includes(' - ') || answer.includes('–')) {
      const primaryPart = answer.split(/[:–]|\s-\s/)[0].trim();
      const nPrimary = this.normalize(primaryPart);
      if (nPrimary && nPrimary.length >= 6 && nPrimary.includes(' ')) {
        if (nGuess === nPrimary) return true;
        if (Math.abs(nGuess.length - nPrimary.length) <= 1 && this.levenshtein(nGuess, nPrimary) <= 1) {
          return true;
        }
      }
    } else {
      const words = nAns.split(' ');
      if (words.length >= 3) {
        const prefix2 = words.slice(0, 2).join(' ');
        if (prefix2.length >= 8 && (nGuess === prefix2 || (Math.abs(nGuess.length - prefix2.length) <= 1 && this.levenshtein(nGuess, prefix2) <= 1))) {
          return true;
        }
      }
    }

    return false;
  }
};

export { FuzzyMatcher };
export default FuzzyMatcher;

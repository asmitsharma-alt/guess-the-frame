# Project Rules & Instructions

## Guess the Movie by Plot - Exclusion Rule

Whenever the user asks to find, suggest, brainstorm, generate, or add movies for "Guess the Movie by Plot":
1. **Check `exclude.md`**: Before suggesting or selecting any movie for "Guess the Movie by Plot", always inspect [exclude.md](exclude.md).
2. **Never Return Excluded Movies**: Do not suggest, output, or select any movie that is already listed in `exclude.md`.
3. **Auto-Update on Round Addition**: Whenever any movie is added to a round in `index.html` (or `sites/guess-the-frame/index.html`), immediately append its title directly to `exclude.md` so the list remains continuously updated.

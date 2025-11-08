# 🤝 Contributing to AI Chat App

Welcome! 👋  
Even though this is currently a **solo-developed project**, it's being built with the goal of growing into an open, community-friendly codebase. If you're reading this — thank you for your interest in contributing!

---

## 🛠️ Setting Up the Development Environment

1. **Clone the repository**
```bash
   git clone https://github.com/alihasnain92/chat-ai-app
   cd chat-ai-app
```

2. **Install dependencies**
```bash
   cd server && npm install
   cd ../client && npm install
```

3. **Set up environment variables**
   - Copy `.env.example` → `.env` in both `/server` and `/client`
   - Fill in API keys and database credentials

4. **Run the project locally**
```bash
   # In separate terminals
   cd server && npm run dev
   cd client && npm run dev
```

---

## 🌿 Branch Naming Conventions

Use clear, descriptive branch names following this pattern:

| Type       | Example                    | Description                |
|------------|----------------------------|----------------------------|
| `feature/` | `feature/ai-reply-module`  | New feature or enhancement |
| `bugfix/`  | `bugfix/socket-timeout`    | Bug or issue fix           |
| `docs/`    | `docs/setup-instructions`  | Documentation changes only |

Keep branch names short, lowercase, and hyphen-separated.

---

## 🧾 Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:
```
<type>(scope): short description
```

**Examples:**
```
feat(server): add AI message summarization
fix(client): correct message timestamp format
docs: update README with setup steps
chore: bump dependencies
```

**Types:**  
`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## 🔄 Pull Request Process

Even as a solo developer, keeping a structured PR process builds good habits.

1. Ensure your branch is up to date with `main`
2. Run ESLint, Prettier, and tests locally
3. Open a PR with:
   - A clear title and description
   - Screenshots or console logs if relevant
   - Request review (or self-review if solo)
4. Merge only when:
   - All checks pass
   - The PR adds value or fixes a real issue

---

## 🧹 Code Style

This project uses:
- **Prettier** for consistent formatting
- **ESLint** for code quality

Before committing:
```bash
npm run lint
npm run format
```

Linting and formatting will be automated via Git hooks in future versions.

---

## ✅ Testing Requirements

- All tests must pass before merging
- Use **Jest + Supertest** for backend, **Vitest + RTL** for frontend
- Add or update tests for new features or bug fixes

Run tests:
```bash
npm test
```

---

## 💡 Tips for First-Time Contributors

- Keep commits small and focused
- Write clear comments for complex logic
- Use descriptive variable and function names
- Don't be afraid to refactor — clarity matters more than cleverness

---

Thank you for helping make AI Chat App better! 💬
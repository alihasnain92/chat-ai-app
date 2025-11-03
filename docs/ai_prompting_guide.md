# 🧠 AI Prompting Guide for Chat AI App

This guide explains how to write **effective prompts** for AI tools like ChatGPT or Claude to help with **coding, debugging, and documentation** in the `chat-ai-app` project.  
Use it whenever you want consistent, high-quality results from AI.

---

## 1. 🎯 Rules for Effective Prompts

### ✅ Be Specific
- Clearly define what you want the AI to do.
- Mention **which file**, **framework**, or **component** you're referring to.
- Include **desired format** (code, markdown, JSON, etc.).

**Example:**
> "Write a TypeScript service file `/server/src/services/userService.ts` that uses Prisma to create and fetch users."

---

### ✅ Include Context
AI performs best when it knows *where* the code fits in your project.

**Good:**
> "In my `/server` backend using Express + Prisma, add a new endpoint to get all users."

**Bad:**
> "Write a function to get users."

---

### ✅ Provide Examples
If you have an existing pattern or file structure, show it briefly.

**Example:**
> "Follow the same style as `/server/src/controllers/authController.ts` and use `try/catch` for error handling."

---

### ✅ Specify Output Type
Say explicitly what you want back — e.g.:
- "Just show me the final code block."
- "Explain step-by-step, no code."
- "Output should be a complete file I can paste."

---

### ✅ Use Sequential Prompts
Large or complex requests work better when broken into smaller, logical steps.

---

## 2. 🧩 Template: Code Generation Prompts

Use this structure when asking the AI to **write or extend code**.

```text
Task:
Explain what you want the code to do (be specific).

Context:
Describe the project section (frontend, backend, database, etc.).

Requirements:
- List frameworks, dependencies, or functions to use
- Mention any file paths
- Specify return types, error handling, etc.

Output Format:
Specify "Full file", "function only", or "code snippet".
```

**Example (for Chat AI App):**
```text
Write a new Express route in `/server/src/routes/userRoutes.ts`:
- GET `/api/users`
- Uses Prisma to fetch all users
- Returns JSON
- Include error handling
```

---

## 3. 🪲 Template: Debugging Prompts

Use this when something breaks, like a Prisma or Docker error.

```text
Problem:
Describe the issue and include the full error message.

Environment:
List what's running (Docker, Node, Prisma, etc.).

What I Tried:
Mention the commands or steps you've taken.

Goal:
What you expect to happen.
```

**Example:**
```text
Error: P1001: Can't reach database server at `localhost:5433`
- Docker is running
- Prisma schema located in `/server/prisma/schema.prisma`
- .env contains DATABASE_URL=postgresql://chatuser:chatpass@localhost:5433/chatdb
Goal: Fix connection so `npx prisma migrate dev` runs successfully.
```

---

## 4. 📚 Template: Documentation Prompts

When you want the AI to create or update docs.

```text
Task:
Explain what the documentation should describe.

Scope:
Specify whether it's a README, internal guide, or developer note.

Tone/Format:
Choose between formal (for team docs) or concise (for README sections).
```

**Example:**
```text
Create documentation for `/server/prisma/schema.prisma` explaining:
- The User model
- How to run migrations
- Example Prisma queries
```

---

## 5. ⚠️ Common Mistakes to Avoid

| ❌ Mistake | 🚀 Better Approach |
|-----------|-------------------|
| "Write code for users." | "Write a Prisma User model with id, email, and createdAt." |
| Asking for multiple unrelated things in one prompt | Split tasks: one for migration, another for API route |
| Missing file paths | Always mention `/server/`, `/client/`, or `/infra/` |
| Not showing errors | Paste the exact error message |
| Vague "it doesn't work" messages | Describe expected vs. actual behavior |
| Forgetting to include .env or Docker context | Always mention environment details for backend/database issues |

---

## 6. 🔁 How to Iterate When AI Gets It Wrong

1. **Clarify** – Point out what was incorrect ("This uses MySQL; we're using PostgreSQL.").
2. **Refocus** – Rephrase with exact file names, frameworks, or dependencies.
3. **Provide Examples** – Show a working pattern or snippet from your project.
4. **Ask Incrementally** – Build step-by-step rather than in one large request.
5. **Confirm Context** – "We're in `/server`, using Node + Express + Prisma."
6. **Request Fixes, Not Rewrites** – "Fix the bug in this snippet" instead of "rewrite everything."

**Example:**
```text
"The migration didn't create my User table. Here's my schema.prisma.
Please fix only what's needed to make the migration run."
```

---

## 💡 Quick Reference

| Task | Example Prompt |
|------|----------------|
| Create API endpoint | "In `/server/src/routes/chatRoutes.ts`, create a POST `/api/messages` endpoint that saves a message to Postgres using Prisma." |
| Debug Docker issue | "Docker Compose is running but Prisma can't connect to Postgres on port 5433. Help me fix it." |
| Generate documentation | "Write README.md instructions for setting up Prisma with Docker in this project." |
| Improve existing code | "Refactor `/server/src/services/chatService.ts` to handle async errors cleanly." |

---

## 🧭 Final Tip

**AI works like a junior developer who follows precise instructions.**

The clearer your prompt, the better the output.  
Always include **context**, **structure**, and **examples** — just like you would in a good code review comment.

---

**Maintained by:** chat-ai-app team  
**Last updated:** November 2025
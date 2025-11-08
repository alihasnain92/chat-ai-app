<!-- # 💬 AI Chat App

**AI Chat App** is a full-stack real-time messaging platform powered by **AI assistants** such as OpenAI and Claude.  
It enables users to chat in real time, get smart AI-generated replies, and view conversation summaries — all with a modern, responsive interface.

---

## 🚀 Features
- **Real-time messaging** using Socket.IO  
- **AI-powered smart replies** (OpenAI + Claude integration)  
- **Conversation summarization** on demand  
- **Message reactions & read receipts**  
- **Typing indicators & online status**  
- **Secure authentication & JWT-based sessions**  
- **Scalable backend with PostgreSQL + Prisma**

---

## 🧰 Tech Stack
**Frontend:** React (Vite + TypeScript)  
**Backend:** Node.js (Express + Socket.IO)  
**Database:** PostgreSQL (via Prisma ORM)  
**AI Integration:** OpenAI API, Claude API  
**Containerization:** Docker & Docker Compose

---

## ⚙️ Prerequisites
Before you begin, ensure you have:
- **Node.js** v18 or later  
- **npm** v9 or later  
- **Docker & Docker Compose** installed  
- **PostgreSQL** (optional if not using Docker)

---

## 🏃 Quick Start (Local Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-chat-app.git
   cd ai-chat-app
2. **Install dependencies**
    ```bash
    cd server && npm install
    cd ../client && npm install
3. **Set up environment variables**
- Copy .env.example → .env in both /server and /client
- Fill in your keys (OpenAI, Claude, database URL, etc.)

4. **Start the development servers**
    ```bash
    # In separate terminals
    cd server && npm run dev
    cd client && npm run dev
5. **Open your app**
    ```bash
    http://localhost:5173
---
# 📁 Project Structure

    ```bash
        ai-chat-app/
        ├── client/              # React (Vite + TypeScript) frontend
        │   ├── src/
        │   │   ├── components/
        │   │   ├── pages/
        │   │   ├── hooks/
        │   │   └── services/
        │   └── public/
        │
        ├── server/              # Node.js (Express + Socket.IO) backend
        │   ├── src/
        │   │   ├── controllers/
        │   │   ├── routes/
        │   │   ├── services/
        │   │   ├── sockets/
        │   │   └── utils/
        │   └── prisma/
        │
        ├── infra/               # Docker, Nginx, deployment configs
        ├── migrations/          # Database migration scripts
        ├── docs/                # Documentation and retrospectives
        └── README.md
---
# 🔐 Environment Variables
- Each service requires an .env file.
- Reference: .env.example

**Server variables**
```bash
    PORT=4000
    DATABASE_URL=postgresql://user:password@localhost:5432/ai_chat
    OPENAI_API_KEY=your_openai_key
    ANTHROPIC_API_KEY=your_claude_key
    JWT_SECRET=supersecretkey
```
**Client variables**
```bash
VITE_API_BASE_URL=http://localhost:4000
```
---
# 🧩 Development Workflow
1. Use feature branches: feature/<name>

2. Run TypeScript compiler checks:
```bash
npx tsc --noEmit
```
3. Format code with Prettier before commits.

4. Use .env.example to sync environment keys.

5. Test endpoints with Postman or curl before frontend integration.
---
# 🧪 Testing
- **Backend tests**: Jest + Supertest
- **Frontend tests**: React Testing Library + Vitest
- Run all tests:
```bash
npm test
```
- CI integration (GitHub Actions) recommended.

---
# 🚢 Deployment
- **Dockerized services** for both client and server
- Use **Docker Compose** for local or production setup:
```bash
docker compose up --build
```
- Environment variables should be set securely in your deployment platform (Render, Vercel, or AWS).

---
# 📄 License
This project is licensed under the **MIT License** — see the LICENSE for the details. -->
# 💬 AI Chat App

**AI Chat App** is a full-stack real-time messaging platform powered by **AI assistants** such as OpenAI and Claude. It enables users to chat in real time, get smart AI-generated replies, and view conversation summaries — all with a modern, responsive interface.

---

## 🚀 Features
- **Real-time messaging** using Socket.IO
- **AI-powered smart replies** (OpenAI + Claude integration)
- **Conversation summarization** on demand
- **Message reactions & read receipts**
- **Typing indicators & online status**
- **Secure authentication & JWT-based sessions**
- **Scalable backend with PostgreSQL + Prisma**

---

## 🧰 Tech Stack
**Frontend:** React (Vite + TypeScript)  
**Backend:** Node.js (Express + Socket.IO)  
**Database:** PostgreSQL (via Prisma ORM)  
**AI Integration:** OpenAI API, Claude API  
**Containerization:** Docker & Docker Compose

---

## ⚙️ Prerequisites
Before you begin, ensure you have:
- **Node.js** v18 or later
- **npm** v9 or later
- **Docker & Docker Compose** installed
- **PostgreSQL** (optional if not using Docker)

---

## 🏃 Quick Start (Local Development)

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
   - Fill in your keys (OpenAI, Claude, database URL, etc.)

4. **Start the development servers**
```bash
   # In separate terminals
   cd server && npm run dev
   cd client && npm run dev
```

5. **Open your app**
```
   http://localhost:5173
```

---

## 📁 Project Structure
```
ai-chat-app/
├── client/              # React (Vite + TypeScript) frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
│   └── public/
│
├── server/              # Node.js (Express + Socket.IO) backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── utils/
│   └── prisma/
│
├── infra/               # Docker, Nginx, deployment configs
├── migrations/          # Database migration scripts
├── docs/                # Documentation and retrospectives
└── README.md
```

---

## 🔐 Environment Variables

Each service requires an `.env` file. Reference: `.env.example`

**Server variables**
```bash
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/ai_chat
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_claude_key
JWT_SECRET=supersecretkey
```

**Client variables**
```bash
VITE_API_BASE_URL=http://localhost:4000
```

---

## 🧩 Development Workflow

1. Use feature branches: `feature/<name>`

2. Run TypeScript compiler checks:
```bash
   npx tsc --noEmit
```

3. Format code with Prettier before commits.

4. Use `.env.example` to sync environment keys.

5. Test endpoints with Postman or curl before frontend integration.

---

## 🧪 Testing

- **Backend tests**: Jest + Supertest
- **Frontend tests**: React Testing Library + Vitest
- Run all tests:
```bash
  npm test
```
- CI integration (GitHub Actions) recommended.

---

## 🚢 Deployment

- **Dockerized services** for both client and server
- Use **Docker Compose** for local or production setup:
```bash
  docker compose up --build
```
- Environment variables should be set securely in your deployment platform (Render, Vercel, or AWS).

---

## 📄 License

This project is licensed under the **MIT License** — see the LICENSE file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📧 Contact

For questions or support, please open an issue or contact the maintainers.
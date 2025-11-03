# 🧠 Day 0 Retrospective – Real-Time Chat App

## 1. What I Built
Describe what you accomplished today.  
Example:
- Set up the **Express + TypeScript** backend skeleton.  
- Added `/api/health` (GET) for status monitoring.  
- Added `/api/echo` (POST) for testing request/response handling.  
- Verified endpoints using **curl** or Postman.  

---

## 2. Prompts That Worked Well
List the AI prompts that gave you accurate or useful outputs.  
Example:
- “Create a minimal Express server in TypeScript with a single health check endpoint.”  
- “Add a POST endpoint to /server/src/index.ts that echoes back a message.”  
- “Generate a tsconfig.json for Node.js backend using TypeScript.”

You can add short notes about why they worked well.

---

## 3. Prompts That Needed Refinement
Mention any prompts that didn’t produce what you expected.  
Example:
- “Initial folder structure prompt missed a few backend subfolders — refined by adding Prisma + sockets.”
- “Needed to clarify Express version and TypeScript setup before generating package.json.”

Reflect on how you refined them to get better results.

---

## 4. Errors I Encountered & How I Fixed Them
Document any issues and resolutions.  
Example:
| Error Message  | Cause | Fix |
|----------------|--------|-----|
| `Cannot GET /` | Accessed root URL without a route | Added `/api/health` endpoint |
| `TypeError: Cannot read property 'message' of undefined` | Missing JSON middleware | Added `app.use(express.json())` |
| Prisma not recognized | Missing dev dependency | Installed with `npm i -D prisma` |

---

## 5. Lessons Learned for Day 1
Write down what you’ll do differently next time.  
Example:
- Always include middleware for JSON parsing before testing POST routes.  
- Keep AI prompts specific about **stack**, **versions**, and **file paths**.  
- Start documenting setup steps early to avoid confusion later.  
- Validate endpoints using curl before integrating with frontend.

---

🗓 **Next Steps (Preview for Day 1):**
- Initialize frontend (`/client`) with Vite + React + TypeScript.  
- Set up shared types and utility folders.  
- Connect frontend to `/api/health` endpoint.  
- Configure Docker for both client & server.


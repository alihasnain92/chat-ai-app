// import { Client } from "pg";
// import dotenv from "dotenv";

// // Load environment variables from .env
// dotenv.config();

// async function testConnection() {
//   const databaseUrl = process.env.DATABASE_URL;

//   if (!databaseUrl) {
//     console.error("❌ DATABASE_URL is not defined in the environment variables.");
//     process.exit(1);
//   }

//   const client = new Client({
//     connectionString: databaseUrl,
//   });

//   try {
//     console.log("🔄 Connecting to PostgreSQL...");
//     await client.connect();

//     const res = await client.query("SELECT version()");
//     console.log("✅ Connected successfully!");
//     console.log("PostgreSQL version:", res.rows[0].version);
//   } catch (err) {
//     console.error("❌ Database connection failed:");
//     console.error(err);
//   } finally {
//     await client.end();
//     console.log("🔌 Connection closed.");
//   }
// }

// testConnection();


// == NEW CODE ==
import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env
const envPath = path.resolve(__dirname, "../.env");
console.log("📁 Loading .env from:", envPath);
dotenv.config({ path: envPath });

async function testConnection() {
  // Try explicit connection parameters instead of connection string
    const client = new Client({
    host: "127.0.0.1",
    port: 5433,
    database: "chatdb",
    user: "chatuser",
    password: "chatpass",
  });


  console.log("🔗 Connecting to:");
  console.log("  Host: localhost");
  console.log("  port: 5433");
  console.log("  Database: chatdb");
  console.log("  User: chatuser");

  try {
    console.log("\n🔄 Connecting to PostgreSQL...");
    await client.connect();

    const res = await client.query("SELECT version()");
    console.log("✅ Connected successfully!");
    console.log("PostgreSQL version:", res.rows[0].version);
  } catch (err) {
    console.error("\n❌ Database connection failed:");
    console.error(err);
  } finally {
    await client.end();
    console.log("🔌 Connection closed.");
  }
}

testConnection();

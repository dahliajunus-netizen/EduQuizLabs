// lib/db.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Define where the users "database" file will be saved
const DB_PATH = path.join(process.cwd(), 'data', 'users.json');

// Ensure the data directory and users.json file exist
function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
  }
}

// Read all users
export function getUsers() {
  ensureDbExists();
  const fileData = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(fileData || '[]');
}

// Find user by email
export function findUserByEmail(email: string) {
  const users = getUsers();
  return users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
}

// Hash password using Node's built-in crypto module (no terminal installs!)
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Save a new user
export function saveUser(userData: any) {
  ensureDbExists();
  const users = getUsers();
  
  const newUser = {
    id: crypto.randomUUID(),
    fullName: userData.fullName,
    email: userData.email.toLowerCase(),
    country: userData.country,
    password: hashPassword(userData.password), // Secure hashed password
    role: userData.role || 'student',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
  
  return newUser;
}

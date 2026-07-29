import db, { STARTING_CASH } from '../db.js';

const insertUser = db.prepare(
  `INSERT INTO users (username, email, password_hash, cash, created_at) VALUES (?, ?, ?, ?, ?)`
);
const selectByUsername = db.prepare(`SELECT * FROM users WHERE username = ?`);
const selectByEmail = db.prepare(`SELECT * FROM users WHERE email = ?`);
const selectById = db.prepare(`SELECT * FROM users WHERE id = ?`);

export function createUser({ username, email, passwordHash }) {
  const result = insertUser.run(username, email, passwordHash, STARTING_CASH, Date.now());
  return selectById.get(result.lastInsertRowid);
}

export function findUserByUsername(username) {
  return selectByUsername.get(username);
}

export function findUserByEmail(email) {
  return selectByEmail.get(email);
}

export function findUserById(id) {
  return selectById.get(id);
}

export function toPublicUser(user) {
  return { id: user.id, username: user.username, email: user.email };
}

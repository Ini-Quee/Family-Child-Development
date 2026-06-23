const db = require('./connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function seed() {
  console.log('Seeding demo data...');

  // Create demo family
  const familyId = uuidv4();
  const inviteCode = 'DEMO2024';
  db.prepare('INSERT OR IGNORE INTO families (id, name, invite_code) VALUES (?, ?, ?)').run(
    familyId, 'The Johnson Family', inviteCode
  );

  // Get actual family
  const family = db.prepare('SELECT id FROM families WHERE invite_code = ?').get(inviteCode);
  const actualFamilyId = family.id;

  // Create demo parent
  const parentId = uuidv4();
  const passwordHash = bcrypt.hashSync('password123', 10);
  db.prepare('INSERT OR IGNORE INTO users (id, family_id, email, password_hash, name, role, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    parentId, actualFamilyId, 'sarah@demo.com', passwordHash, 'Sarah Johnson', 'parent', 1
  );

  // Create demo children
  const emmaId = uuidv4();
  const jakeId = uuidv4();
  const alexId = uuidv4();

  const insertChild = db.prepare('INSERT OR IGNORE INTO children (id, family_id, name, age, pin, current_level, total_xp, current_streak_days, longest_streak_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertChild.run(emmaId, actualFamilyId, 'Emma', 10, '1234', 5, 600, 8, 12);
  insertChild.run(jakeId, actualFamilyId, 'Jake', 13, '5678', 3, 250, 3, 5);
  insertChild.run(alexId, actualFamilyId, 'Alex', 16, '9012', 8, 1500, 22, 22);

  // Get actual children
  const children = db.prepare('SELECT id, name FROM children WHERE family_id = ?').all(actualFamilyId);

  // Create demo chores
  const choreData = [
    ['Make Bed', 'Tidy your bed before breakfast', 'cleaning', 'easy', 5, 0.50, 10, 0, 0, 'daily'],
    ['Brush Teeth', 'Morning and evening brushing', 'personal_hygiene', 'easy', 5, 0, 5, 0, 0, 'daily'],
    ['Clean Room', 'Pick up clothes, vacuum, tidy desk', 'cleaning', 'medium', 15, 1.50, 20, 1, 1, 'daily'],
    ['Do Dishes', 'Wash and dry dishes after dinner', 'kitchen', 'medium', 15, 1.50, 15, 1, 1, 'daily'],
    ['Homework', 'Complete all assigned homework', 'homework', 'hard', 25, 2.00, 45, 0, 1, 'daily'],
    ['Laundry', 'Sort, wash, fold, and put away', 'laundry', 'hard', 20, 2.00, 30, 1, 1, 'weekly'],
    ['Take Out Trash', 'Empty all trash cans', 'outdoor', 'easy', 10, 1.00, 10, 0, 1, 'weekly'],
    ['Walk the Dog', '30-minute walk around the block', 'pet_care', 'medium', 20, 1.50, 30, 0, 1, 'daily'],
  ];

  const insertChore = db.prepare('INSERT OR IGNORE INTO chores (id, family_id, title, description, category, difficulty, xp_value, money_value, estimated_minutes, requires_photo, requires_approval, recurrence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const choreIds = [];
  for (const c of choreData) {
    const id = uuidv4();
    insertChore.run(id, actualFamilyId, ...c);
    choreIds.push(id);
  }

  // Create today's assignments
  const today = new Date().toISOString().split('T')[0];
  const insertAssignment = db.prepare('INSERT OR IGNORE INTO chore_assignments (id, chore_id, child_id, assigned_date, status) VALUES (?, ?, ?, ?, ?)');

  for (const child of children) {
    const count = child.name === 'Emma' ? 5 : child.name === 'Jake' ? 4 : 3;
    for (let i = 0; i < count; i++) {
      insertAssignment.run(uuidv4(), choreIds[i], child.id, today, 'pending');
    }
  }

  // Create wallets
  const insertWallet = db.prepare('INSERT OR IGNORE INTO wallets (id, child_id, balance, total_earned) VALUES (?, ?, ?, ?)');
  for (const child of children) {
    const bal = child.name === 'Emma' ? 12.50 : child.name === 'Jake' ? 8.00 : 45.00;
    const earned = child.name === 'Emma' ? 25.00 : child.name === 'Jake' ? 15.00 : 80.00;
    insertWallet.run(uuidv4(), child.id, bal, earned);
  }

  // Create streaks
  const insertStreak = db.prepare('INSERT OR IGNORE INTO streaks (id, child_id, streak_type, current_count, longest_count, last_date) VALUES (?, ?, ?, ?, ?, ?)');
  for (const child of children) {
    const count = child.name === 'Emma' ? 8 : child.name === 'Jake' ? 3 : 22;
    const longest = child.name === 'Emma' ? 12 : child.name === 'Jake' ? 5 : 22;
    insertStreak.run(uuidv4(), child.id, 'chore', count, longest, today);
  }

  console.log('Demo data seeded!');
  console.log('---');
  console.log('Parent login: sarah@demo.com / password123');
  console.log('Child PINs: Emma=1234, Jake=5678, Alex=9012');
  console.log('---');
}

seed();

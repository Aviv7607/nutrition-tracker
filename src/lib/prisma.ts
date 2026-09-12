import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

const defaultDb = {
  settings: {
    id: 1, gender: "male", age: 29, height: 177, activityLevel: 1.55, targetDeficit: 500, proteinPerKg: 2.0
  },
  weightLogs: [
    { id: 1, date: new Date().toISOString(), weight: 110 }
  ],
  meals: []
};

export function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
    return defaultDb;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

export function writeDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Mock Prisma client interface
export const prisma = {
  settings: {
    async findFirst() {
      const db = readDb();
      return db.settings;
    },
    async create({ data }: any) {
      const db = readDb();
      db.settings = { ...db.settings, ...data, id: 1 };
      writeDb(db);
      return db.settings;
    },
    async update({ data }: any) {
      const db = readDb();
      db.settings = { ...db.settings, ...data, id: 1 };
      writeDb(db);
      return db.settings;
    }
  },
  weightLog: {
    async findMany({ orderBy }: any = {}) {
      const db = readDb();
      return db.weightLogs; 
    },
    async findFirst({ orderBy }: any = {}) {
      const db = readDb();
      return db.weightLogs[db.weightLogs.length - 1];
    },
    async create({ data }: any) {
      const db = readDb();
      const newLog = { ...data, id: Date.now(), date: data.date || new Date().toISOString() };
      db.weightLogs.push(newLog);
      writeDb(db);
      return newLog;
    }
  },
  meal: {
    async findMany({ where }: any = {}) {
      const db = readDb();
      if (!where || !where.date) return db.meals;
      const gte = new Date(where.date.gte).getTime();
      const lte = new Date(where.date.lte).getTime();
      return db.meals.filter((m: any) => {
        const time = new Date(m.date).getTime();
        return time >= gte && time <= lte;
      });
    },
    async create({ data }: any) {
      const db = readDb();
      const newMeal = { ...data, id: Date.now(), date: data.date || new Date().toISOString() };
      db.meals.push(newMeal);
      writeDb(db);
      return newMeal;
    },
    async update({ where, data }: any) {
      const db = readDb();
      const index = db.meals.findIndex((m: any) => m.id === where.id);
      if (index === -1) throw new Error("Meal not found");
      db.meals[index] = { ...db.meals[index], ...data };
      writeDb(db);
      return db.meals[index];
    },
    async delete({ where }: any) {
      const db = readDb();
      db.meals = db.meals.filter((m: any) => m.id !== where.id);
      writeDb(db);
      return { success: true };
    }
  }
};

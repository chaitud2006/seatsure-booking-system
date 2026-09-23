// In-memory Redis fallback (No external package required)
const memoryStore = new Map();

const mockRedis = {
  set: async (key, value, ...args) => {
    memoryStore.set(key, value);
    return 'OK';
  },
  get: async (key) => memoryStore.get(key) || null,
  del: async (key) => memoryStore.delete(key),
  on: (event, callback) => {}, // Dummy event listener
};

module.exports = mockRedis;
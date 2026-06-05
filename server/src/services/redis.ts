import Redis from 'ioredis';

let redis: Redis;

export async function initRedis(): Promise<void> {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('connect', () => console.log('Redis connected'));
  redis.on('error', (err) => console.error('Redis error:', err));
}

export function getRedis(): Redis {
  if (!redis) throw new Error('Redis not initialized');
  return redis;
}

// Exam session helpers
export const examSession = {
  async create(attemptId: string, data: Record<string, string>) {
    const r = getRedis();
    await r.hset(`exam:session:${attemptId}`, data);
    await r.expire(`exam:session:${attemptId}`, 10800); // 3 hours
  },

  async getAll(attemptId: string) {
    return getRedis().hgetall(`exam:session:${attemptId}`);
  },

  async updateAnswer(attemptId: string, questionId: string, answer: string) {
    await getRedis().hset(`exam:session:${attemptId}`, `answer:${questionId}`, answer);
  },

  async delete(attemptId: string) {
    await getRedis().del(`exam:session:${attemptId}`);
  },
};

// Leaderboard helpers
export const leaderboard = {
  async addScore(examId: string, userId: string, score: number) {
    await getRedis().zadd(`leaderboard:${examId}`, score, userId);
  },

  async getTop(examId: string, count = 50) {
    return getRedis().zrevrange(`leaderboard:${examId}`, 0, count - 1, 'WITHSCORES');
  },
};

// Active users tracking
export const activeExam = {
  async addUser(examId: string, userId: string) {
    await getRedis().sadd(`exam:active_users:${examId}`, userId);
  },

  async removeUser(examId: string, userId: string) {
    await getRedis().srem(`exam:active_users:${examId}`, userId);
  },

  async getCount(examId: string) {
    return getRedis().scard(`exam:active_users:${examId}`);
  },
};

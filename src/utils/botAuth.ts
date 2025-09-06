import {
  proto,
  BufferJSON,
  initAuthCreds,
  SignalDataTypeMap,
  AuthenticationCreds,
  AuthenticationState,
} from "baileys";
import { Redis } from "ioredis";

interface IDeleteHSetKeyOptions {
  redis: Redis;
  key: string;
}

const createKey = (key: string, prefix: string) => `${key}:${prefix}`;

export type BotAuth = {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  redis: Redis;
};

export async function useRedisAuthState(
  redis: Redis,
  prefix: string
): Promise<BotAuth> {
  const writeData = (key: string, field: string, data: any) => {
    return redis.hset(
      createKey(key, prefix),
      field,
      JSON.stringify(data, BufferJSON.replacer)
    );
  };

  const readData = async (key: string, field: string) => {
    const data = await redis.hget(createKey(key, prefix), field);
    return data ? JSON.parse(data, BufferJSON.reviver) : null;
  };

  const savedCreds = await readData("authState", "creds");
  const creds: AuthenticationCreds = savedCreds || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[]
        ) => {
          const hashKey = createKey("authState", prefix);
          const fieldsArray = ids.map((id) => `${type}-${id}`);
          const rawValues = await redis.hmget(hashKey, ...fieldsArray);
          const data: { [id: string]: SignalDataTypeMap[T] } = {};

          ids.forEach((id, index) => {
            const rawValue = rawValues[index];
            if (rawValue) {
              const value = JSON.parse(rawValue, BufferJSON.reviver);
              data[id] =
                type === "app-state-sync-key" && value
                  ? proto.Message.AppStateSyncKeyData.fromObject(value)
                  : value;
            }
          });
          return data;
        },
        set: async <T extends keyof SignalDataTypeMap>(data: {
          [id: string]: SignalDataTypeMap[T];
        }) => {
          const pipeline = redis.pipeline();
          for (const category in data) {
            for (const id in data[category]) {
              const field = `${category}-${id}`;
              const value = data[category][id];
              if (value) {
                pipeline.hset(
                  createKey("authState", prefix),
                  field,
                  JSON.stringify(value, BufferJSON.replacer)
                );
              } else {
                pipeline.hdel(createKey("authState", prefix), field);
              }
            }
          }
          await pipeline.exec();
        },
      },
    },
    saveCreds: async () => {
      await writeData("authState", "creds", creds);
    },
    redis,
  };
}

export const deleteHSetKeys = async ({
  redis,
  key,
}: IDeleteHSetKeyOptions): Promise<void> => {
  try {
    console.info("removing authState keys", key);
    await redis.del(createKey("authState", key));
  } catch (err) {
    console.info("Error deleting keys:", err.message);
  }
};

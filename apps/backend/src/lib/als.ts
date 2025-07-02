import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  actor: {
    id: string;
    name: string;
  };
}

// 宣告一個全域變數來緩存 als 實例
declare global {
  var als: AsyncLocalStorage<RequestContext> | undefined;
}

// 建立一個建立器函式
const createAls = () => new AsyncLocalStorage<RequestContext>();

// 使用與 prisma.ts 完全相同的模式：從 global 獲取，如果不存在則建立
export const als = global.als || createAls();

// 在開發環境中，將新建立的實例存回 global
if (process.env.NODE_ENV !== 'production') {
  global.als = als;
}

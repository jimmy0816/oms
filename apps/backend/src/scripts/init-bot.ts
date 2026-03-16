import { seedBitbucketBotUser } from '@/lib/bot-user';

export const seedBotUser = async () => {
  try {
    const botUser = await seedBitbucketBotUser();
    console.log('✅ Bitbucket Bot 用戶已創建或更新', botUser);
    return botUser;
  } catch (error) {
    console.error('❌ 創建 Bitbucket Bot 用戶時出錯:', error);
    throw error;
  }
};

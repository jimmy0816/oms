import { seedBitbucketBotUser, seedJiraBotUser } from '@/lib/bot-user';

export const seedBotUser = async () => {
  try {
    const [bitbucketBotUser, jiraBotUser] = await Promise.all([
      seedBitbucketBotUser(),
      seedJiraBotUser(),
    ]);
    console.log('✅ Bitbucket Bot 用戶已創建或更新', bitbucketBotUser);
    console.log('✅ Jira Bot 用戶已創建或更新', jiraBotUser);
    return { bitbucketBotUser, jiraBotUser };
  } catch (error) {
    console.error('❌ 創建整合 Bot 用戶時出錯:', error);
    throw error;
  }
};

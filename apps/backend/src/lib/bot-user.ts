import { prisma } from '@/lib/prisma';

const DEFAULT_BITBUCKET_BOT_EMAIL = 'bitbucket-bot@oms.local';
const DEFAULT_BITBUCKET_BOT_NAME = 'Bitbucket Bot';
const DEFAULT_JIRA_BOT_EMAIL = 'jira-bot@oms.local';
const DEFAULT_JIRA_BOT_NAME = 'Jira Bot';

export const getBitbucketBotIdentity = () => ({
  email: process.env.BITBUCKET_BOT_EMAIL || DEFAULT_BITBUCKET_BOT_EMAIL,
  name: process.env.BITBUCKET_BOT_NAME || DEFAULT_BITBUCKET_BOT_NAME,
});

export const getJiraBotIdentity = () => ({
  email: process.env.JIRA_BOT_EMAIL || DEFAULT_JIRA_BOT_EMAIL,
  name: process.env.JIRA_BOT_NAME || DEFAULT_JIRA_BOT_NAME,
});

const seedBotUserByIdentity = async (botIdentity: { email: string; name: string }) => {
  return prisma.user.upsert({
    where: { email: botIdentity.email },
    update: {
      name: botIdentity.name,
    },
    create: {
      email: botIdentity.email,
      name: botIdentity.name,
      password: null,
      isOidcLinked: false,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
};

export const seedBitbucketBotUser = async () => {
  const botIdentity = getBitbucketBotIdentity();

  return seedBotUserByIdentity(botIdentity);
};

export const seedJiraBotUser = async () => {
  const botIdentity = getJiraBotIdentity();

  return seedBotUserByIdentity(botIdentity);
};

export const getBitbucketBotUser = async () => {
  const { email } = getBitbucketBotIdentity();

  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
};

export const getJiraBotUser = async () => {
  const { email } = getJiraBotIdentity();

  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
};

export const getBitbucketBotUserOrThrow = async () => {
  const botUser = await getBitbucketBotUser();

  if (!botUser) {
    const { email } = getBitbucketBotIdentity();
    throw new Error(
      `Bitbucket Bot user not found for email ${email}. Please run setup/seed first.`
    );
  }

  return botUser;
};

export const getJiraBotUserOrThrow = async () => {
  const botUser = await getJiraBotUser();

  if (!botUser) {
    const { email } = getJiraBotIdentity();
    throw new Error(
      `Jira Bot user not found for email ${email}. Please run setup/seed first.`
    );
  }

  return botUser;
};

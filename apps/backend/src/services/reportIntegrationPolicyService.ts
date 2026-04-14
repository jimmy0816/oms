const SOFTWARE_CATEGORY_NAME = '軟體通報';

type CategoryWithAncestors = {
  name?: string | null;
  parent?: {
    name?: string | null;
    parent?: {
      name?: string | null;
    } | null;
  } | null;
};

/** 沿 parent 鏈取得最頂層分類名稱（最多支援 3 層） */
const getTopLevelCategoryName = (
  category?: CategoryWithAncestors | null
): string | null | undefined => {
  if (!category) return null;
  if (category.parent?.parent) return category.parent.parent.name;
  if (category.parent) return category.parent.name;
  return category.name;
};

const isSoftwareCategory = (category?: CategoryWithAncestors | null) =>
  getTopLevelCategoryName(category) === SOFTWARE_CATEGORY_NAME;

const JIRA_ENABLED = process.env.JIRA_ENABLED === 'true';

export const reportIntegrationPolicyService = {
  shouldEnableGoogleChat(report: { category?: CategoryWithAncestors | null }) {
    return isSoftwareCategory(report?.category);
  },

  shouldEnableBitbucket(report: { category?: CategoryWithAncestors | null }) {
    return isSoftwareCategory(report?.category);
  },

  shouldEnableJira(report: { category?: CategoryWithAncestors | null }) {
    return isSoftwareCategory(report?.category) && JIRA_ENABLED;
  },

  shouldEnableAnyIntegration(report: {
    category?: CategoryWithAncestors | null;
  }) {
    return (
      this.shouldEnableGoogleChat(report) ||
      this.shouldEnableBitbucket(report) ||
      this.shouldEnableJira(report)
    );
  },
};

export default reportIntegrationPolicyService;
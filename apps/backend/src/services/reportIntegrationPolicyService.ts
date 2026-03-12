const SOFTWARE_CATEGORY_NAME = '軟體通報';

const isSoftwareCategory = (categoryName?: string | null) =>
  categoryName === SOFTWARE_CATEGORY_NAME;

export const reportIntegrationPolicyService = {
  shouldEnableGoogleChat(report: { category?: { name?: string | null } | null }) {
    return isSoftwareCategory(report?.category?.name);
  },

  shouldEnableBitbucket(report: { category?: { name?: string | null } | null }) {
    return isSoftwareCategory(report?.category?.name);
  },

  shouldEnableAnyIntegration(report: {
    category?: { name?: string | null } | null;
  }) {
    return this.shouldEnableGoogleChat(report) || this.shouldEnableBitbucket(report);
  },
};

export default reportIntegrationPolicyService;
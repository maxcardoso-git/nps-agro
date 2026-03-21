import { CampaignService } from '../src/modules/campaign/campaign.service';
import { CampaignRepository } from '../src/modules/campaign/campaign.repository';

describe('CampaignService', () => {
  const actor = {
    sub: 'user-1',
    tenant_id: 'tenant-1',
    role: 'tenant_admin' as const,
    email: 'user@test.com',
  };

  it('blocks activation when questionnaire version is not published', async () => {
    const repository: Partial<CampaignRepository> = {
      getById: jest.fn().mockResolvedValue({
        id: 'campaign-1',
        tenant_id: 'tenant-1',
        name: 'Campaign',
        description: null,
        status: 'draft',
        segment: null,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        questionnaire_version_id: 'qv-1',
        channel_config_json: {},
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      isQuestionnaireVersionPublishedAndScoped: jest.fn().mockResolvedValue(false),
    };

    const service = new CampaignService(repository as CampaignRepository);

    await expect(service.activateCampaign(actor, 'campaign-1')).rejects.toMatchObject({
      response: {
        error_code: 'CAMPAIGN_QUESTIONNAIRE_NOT_PUBLISHED',
      },
    });
  });
});


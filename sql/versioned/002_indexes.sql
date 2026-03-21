CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_code ON core.tenant(code);
CREATE INDEX IF NOT EXISTS ix_tenant_status ON core.tenant(status);

CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_tenant_email ON core.app_user(tenant_id, email);
CREATE INDEX IF NOT EXISTS ix_app_user_tenant_role ON core.app_user(tenant_id, role);

CREATE INDEX IF NOT EXISTS ix_questionnaire_tenant_status ON core.questionnaire(tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_questionnaire_tenant_name ON core.questionnaire(tenant_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS ux_questionnaire_version_number
  ON core.questionnaire_version(questionnaire_id, version_number);
CREATE INDEX IF NOT EXISTS ix_questionnaire_version_status ON core.questionnaire_version(status);

CREATE INDEX IF NOT EXISTS ix_campaign_tenant_status ON core.campaign(tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_campaign_tenant_segment ON core.campaign(tenant_id, segment);
CREATE INDEX IF NOT EXISTS ix_campaign_questionnaire_version ON core.campaign(questionnaire_version_id);

CREATE INDEX IF NOT EXISTS ix_respondent_tenant_campaign ON core.respondent(tenant_id, campaign_id);
CREATE INDEX IF NOT EXISTS ix_respondent_external_id ON core.respondent(external_id);
CREATE INDEX IF NOT EXISTS ix_respondent_phone ON core.respondent(phone);
CREATE INDEX IF NOT EXISTS ix_respondent_region ON core.respondent(region);

CREATE INDEX IF NOT EXISTS ix_interview_tenant_campaign ON core.interview(tenant_id, campaign_id);
CREATE INDEX IF NOT EXISTS ix_interview_respondent ON core.interview(respondent_id);
CREATE INDEX IF NOT EXISTS ix_interview_status ON core.interview(status);
CREATE INDEX IF NOT EXISTS ix_interview_channel ON core.interview(channel);

CREATE UNIQUE INDEX IF NOT EXISTS ux_answer_interview_question ON core.answer(interview_id, question_id);
CREATE INDEX IF NOT EXISTS ix_answer_question_id ON core.answer(question_id);
CREATE INDEX IF NOT EXISTS ix_answer_campaign_question ON core.answer(campaign_id, question_id);

CREATE INDEX IF NOT EXISTS ix_audio_interview ON core.audio_asset(interview_id);
CREATE INDEX IF NOT EXISTS ix_audio_processed ON core.audio_asset(processed);

CREATE UNIQUE INDEX IF NOT EXISTS ux_enrichment_interview ON core.enrichment(interview_id);
CREATE INDEX IF NOT EXISTS ix_enrichment_campaign_nps_class ON core.enrichment(campaign_id, nps_class);
CREATE INDEX IF NOT EXISTS ix_enrichment_sentiment ON core.enrichment(sentiment);

CREATE INDEX IF NOT EXISTS ix_processing_job_status_type ON core.processing_job(status, job_type);
CREATE INDEX IF NOT EXISTS ix_processing_job_interview ON core.processing_job(interview_id);

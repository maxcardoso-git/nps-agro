import { Injectable } from '@nestjs/common';
import { QuestionnaireRepository } from './questionnaire.repository';

@Injectable()
export class VersioningService {
  constructor(private readonly questionnaireRepository: QuestionnaireRepository) {}

  getNextVersionNumber(questionnaireId: string): Promise<number> {
    return this.questionnaireRepository.getNextVersionNumber(questionnaireId);
  }
}


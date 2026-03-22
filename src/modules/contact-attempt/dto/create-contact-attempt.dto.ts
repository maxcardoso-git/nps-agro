import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateContactAttemptDto {
  @IsString()
  @IsIn(['success', 'no_answer', 'wrong_number', 'busy', 'scheduled', 'refused'])
  outcome!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}

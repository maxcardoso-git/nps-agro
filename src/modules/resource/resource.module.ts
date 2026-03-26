import { Module } from '@nestjs/common';
import { ResourceController } from './resource.controller';
import { ResourceRepository } from './resource.repository';
import { ResourceService } from './resource.service';

@Module({
  controllers: [ResourceController],
  providers: [ResourceService, ResourceRepository],
  exports: [ResourceService],
})
export class ResourceModule {}

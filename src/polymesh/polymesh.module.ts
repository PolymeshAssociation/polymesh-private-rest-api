/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { ConfidentialPolymesh as Polymesh } from '@polymeshassociation/polymesh-private-sdk';

import polymeshConfig from '~/polymesh/config/polymesh.config';
import { POLYMESH_API } from '~/polymesh/polymesh.consts';
import { PolymeshService } from '~/polymesh/polymesh.service';
import { ScheduleModule } from '~/polymesh-rest-api/src/schedule/schedule.module';

@Module({
  imports: [ConfigModule.forFeature(polymeshConfig), ScheduleModule],
  providers: [
    PolymeshService,
    {
      provide: POLYMESH_API,
      useFactory: async (configuration: ConfigType<typeof polymeshConfig>): Promise<Polymesh> => {
        return Polymesh.connect(configuration);
      },
      inject: [polymeshConfig.KEY],
    },
  ],
  exports: [PolymeshService],
})
export class PolymeshModule {}

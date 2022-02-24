/* istanbul ignore file */

import { forwardRef, Module } from '@nestjs/common';

import { AssetsController } from '~/assets/assets.controller';
import { AssetsService } from '~/assets/assets.service';
import { ComplianceModule } from '~/compliance/compliance.module';
import { PolymeshModule } from '~/polymesh/polymesh.module';
import { RelayerAccountsModule } from '~/relayer-accounts/relayer-accounts.module';

@Module({
  imports: [PolymeshModule, RelayerAccountsModule, forwardRef(() => ComplianceModule)],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}

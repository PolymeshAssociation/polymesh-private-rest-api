/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';

import { AccountsModule } from '~/accounts/accounts.module';
import { AssetsModule } from '~/assets/assets.module';
import { AuthorizationsModule } from '~/authorizations/authorizations.module';
import { CheckpointsModule } from '~/checkpoints/checkpoints.module';
import { ClaimsModule } from '~/claims/claims.module';
import { ComplianceModule } from '~/compliance/compliance.module';
import { CorporateActionsModule } from '~/corporate-actions/corporate-actions.module';
import { EventsModule } from '~/events/events.module';
import { IdentitiesModule } from '~/identities/identities.module';
import { NotificationsModule } from '~/notifications/notifications.module';
import { OfferingsModule } from '~/offerings/offerings.module';
import { PolymeshModule } from '~/polymesh/polymesh.module';
import { PortfoliosModule } from '~/portfolios/portfolios.module';
import { RelayerAccountsModule } from '~/relayer-accounts/relayer-accounts.module';
import { ScheduleModule } from '~/schedule/schedule.module';
import { SettlementsModule } from '~/settlements/settlements.module';
import { SubscriptionsModule } from '~/subscriptions/subscriptions.module';
import { TransactionsModule } from '~/transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        POLYMESH_NODE_URL: Joi.string().required(),
        POLYMESH_MIDDLEWARE_URL: Joi.string(),
        POLYMESH_MIDDLEWARE_API_KEY: Joi.string(),
        SUBSCRIPTIONS_TTL: Joi.number().default(60000),
        SUBSCRIPTIONS_MAX_HANDHSAKE_TRIES: Joi.number().default(5),
        SUBSCRIPTIONS_HANDSHAKE_RETRY_INTERVAL: Joi.number().default(5000),
        NOTIFICATIONS_MAX_TRIES: Joi.number().default(5),
        NOTIFICATIONS_RETRY_INTERVAL: Joi.number().default(5000),
      }).and('POLYMESH_MIDDLEWARE_URL', 'POLYMESH_MIDDLEWARE_API_KEY'),
    }),
    AssetsModule,
    PolymeshModule,
    IdentitiesModule,
    SettlementsModule,
    RelayerAccountsModule,
    AuthorizationsModule,
    PortfoliosModule,
    ClaimsModule,
    OfferingsModule,
    CheckpointsModule,
    CorporateActionsModule,
    ComplianceModule,
    AccountsModule,
    SubscriptionsModule,
    TransactionsModule,
    EventsModule,
    NotificationsModule,
    ScheduleModule,
  ],
})
export class AppModule {}

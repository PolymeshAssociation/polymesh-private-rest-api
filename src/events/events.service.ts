import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionStatus, TxTags } from '@polymathnetwork/polymesh-sdk/types';

import { TransactionType } from '~/common/types';
import { EventEntity } from '~/events/entities/event.entity';
import { EventType, TransactionUpdatePayload } from '~/events/types';
import { NotificationsService } from '~/notifications/notifications.service';
import { SubscriptionsService } from '~/subscriptions/subscriptions.service';
import { SubscriptionStatus } from '~/subscriptions/types';

@Injectable()
export class EventsService {
  private events: Record<number, EventEntity>;
  private currentId: number;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService
  ) {
    this.events = {
      1: new EventEntity<TransactionUpdatePayload>({
        scope: '0x01',
        type: EventType.TransactionUpdate,
        processed: true,
        id: 1,
        createdAt: new Date('10/14/1987'),
        payload: {
          type: TransactionType.Single,
          transactionTag: TxTags.asset.RegisterTicker,
          status: TransactionStatus.Unapproved,
        },
      }),
    };
    this.currentId = 1;
  }

  /**
   * Create an event and create notifications for all active subscriptions to the event
   */
  public async createEvent<EventType extends EventEntity>(
    eventData: Pick<EventType, 'type' | 'scope' | 'payload'>
  ): Promise<number> {
    const { events } = this;

    this.currentId += 1;
    const id = this.currentId;

    const event = new EventEntity({
      id,
      ...eventData,
      createdAt: new Date(),
      processed: false,
    });

    events[id] = event;

    await this.createEventNotifications(event);

    await this.markEventAsProcessed(id);

    return id;
  }

  public async findOne(id: number): Promise<EventEntity> {
    const event = this.events[id];

    if (!event) {
      throw new NotFoundException(`There is no event with ID "${id}"`);
    }

    return event;
  }

  private async createEventNotifications(event: EventEntity) {
    const { type: eventType, scope: eventScope, id: eventId } = event;

    const affectedSubscriptions = await this.subscriptionsService.findAll({
      eventType,
      eventScope,
      status: SubscriptionStatus.Active,
      excludeExpired: true,
    });

    const notifications = affectedSubscriptions.map(({ id: subscriptionId }) => ({
      subscriptionId,
      eventId,
    }));

    await this.notificationsService.createNotifications(notifications);
  }

  private async markEventAsProcessed(id: number): Promise<void> {
    this.events[id] = {
      ...this.events[id],
      processed: true,
    };
  }
}

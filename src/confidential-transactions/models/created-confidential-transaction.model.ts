/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';
import { ConfidentialTransaction } from '@polymeshassociation/polymesh-private-sdk/types';

import { FromEntity } from '~/polymesh-rest-api/src/common/decorators/transformation';
import { TransactionQueueModel } from '~/polymesh-rest-api/src/common/models/transaction-queue.model';

export class CreatedConfidentialTransactionModel extends TransactionQueueModel {
  @ApiProperty({
    type: 'string',
    description: 'ID of the newly created Confidential Transaction',
    example: '123',
  })
  @FromEntity()
  readonly confidentialTransaction: ConfidentialTransaction;

  constructor(model: CreatedConfidentialTransactionModel) {
    const { transactions, details, ...rest } = model;
    super({ transactions, details });

    Object.assign(this, rest);
  }
}

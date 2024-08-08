/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';
import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { ConfidentialLegAmountDto } from '~/confidential-transactions/dto/confidential-leg-amount.dto';
import { ToBigNumber } from '~/polymesh-rest-api/src/common/decorators/transformation';
import { IsBigNumber } from '~/polymesh-rest-api/src/common/decorators/validation';
import { TransactionBaseDto } from '~/polymesh-rest-api/src/common/dto/transaction-base-dto';

export class SenderAffirmConfidentialTransactionDto extends TransactionBaseDto {
  @ApiProperty({
    description: 'Index of the leg to be affirmed in the Confidential Transaction',
    type: 'string',
    example: '1',
  })
  @ToBigNumber()
  @IsBigNumber()
  readonly legId: BigNumber;

  @ApiProperty({
    description: 'List of confidential Asset IDs along with their transfer amount',
    type: ConfidentialLegAmountDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfidentialLegAmountDto)
  readonly legAmounts: ConfidentialLegAmountDto[];
}

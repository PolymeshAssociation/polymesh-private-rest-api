/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { FundMovesDto } from '~/confidential-accounts/dto/fund-moves.dto';
import { TransactionBaseDto } from '~/polymesh-rest-api/src/common/dto/transaction-base-dto';

export class MoveFundsDto extends TransactionBaseDto {
  @ApiProperty({
    description: 'Asset moves between Confidential Accounts owned by signing Identity',
    type: FundMovesDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FundMovesDto)
  fundMoves: FundMovesDto[];
}

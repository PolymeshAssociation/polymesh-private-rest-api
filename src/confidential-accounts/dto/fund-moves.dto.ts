/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

import { ConfidentialLegAmountDto } from '~/confidential-transactions/dto/confidential-leg-amount.dto';

export class FundMovesDto {
  @ApiProperty({
    description: 'The Confidential Account from which to move the funds',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
    type: 'string',
  })
  @IsString()
  readonly from: string;

  @ApiProperty({
    description: 'The Confidential Account to which to move the funds',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
    type: 'string',
  })
  @IsString()
  readonly to: string;

  @ApiProperty({
    description: 'Assets and their amounts to move',
    type: ConfidentialLegAmountDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfidentialLegAmountDto)
  assetMoves: ConfidentialLegAmountDto[];
}

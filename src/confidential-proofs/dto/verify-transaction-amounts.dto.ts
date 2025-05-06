/* istanbul ignore file */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

import { LegAmountsDto } from '~/confidential-proofs/dto/leg-amounts.dto';

export class VerifyTransactionAmountsDto {
  @ApiProperty({
    description:
      'The public key to decrypt transaction amounts for. Any leg with a provided sender proof involving this key as auditor or a receiver will be verified. The corresponding private key must be present in the proof server',
    type: 'string',
    example: '0x7e9cf42766e08324c015f183274a9e977706a59a28d64f707e410a03563be77d',
  })
  @IsString()
  readonly publicKey: string;

  @ApiPropertyOptional({
    description:
      'The expected amounts for each leg. Providing an amount is more efficient for the proof server',
    isArray: true,
    type: LegAmountsDto,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegAmountsDto)
  readonly legAmounts?: LegAmountsDto[];
}

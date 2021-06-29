import { ApiProperty } from '@nestjs/swagger';
import { BigNumber } from '@polymathnetwork/polymesh-sdk';
import { PortfolioLike } from '@polymathnetwork/polymesh-sdk/types';
import { Type } from 'class-transformer';
import { IsDateString, IsNumberString, IsOptional } from 'class-validator';

import { ToBigNumber, ToPortfolioLike } from '~/common/decorators/transformation';
import { IsTicker } from '~/common/decorators/validation';
import { PortfolioDto } from '~/common/dto/portfolio.dto';
import { SignerDto } from '~/common/dto/signer.dto';

// TODO @monitz87: add comments for documentation

class LegDto {
  @ApiProperty({
    type: 'string',
    example: '1000',
  })
  @IsNumberString()
  @ToBigNumber()
  readonly amount: BigNumber;

  @ApiProperty({
    type: () => PortfolioDto,
  })
  @Type(() => PortfolioDto)
  @ToPortfolioLike()
  readonly from: PortfolioLike;

  @ApiProperty({
    type: () => PortfolioDto,
  })
  @Type(() => PortfolioDto)
  @ToPortfolioLike()
  readonly to: PortfolioLike;

  @ApiProperty({
    description: 'Security Token ticker',
    example: 'MY_TOKEN',
  })
  @IsTicker()
  readonly token: string;
}

export class CreateInstructionDto extends SignerDto {
  @Type(() => LegDto)
  readonly legs: LegDto[];

  @ApiProperty({
    description: 'Date at which the trade was agreed upon (optional, for offchain trades)',
    example: new Date('10/14/1987').toISOString(),
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  readonly tradeDate?: Date;

  @ApiProperty({
    description: 'Date at which the trade was executed (optional, for offchain trades)',
    example: new Date('10/14/1987').toISOString(),
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  readonly valueDate?: Date;

  @ApiProperty({
    type: 'string',
    description:
      'Block at which the Instruction will be executed. If not passed, the Instruction will be executed when all parties affirm or as soon as one party rejects',
    example: '123',
    nullable: true,
  })
  @IsOptional()
  @IsNumberString()
  @ToBigNumber()
  readonly endBlock?: BigNumber;
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { ApiArrayResponse } from '~/common/decorators/swagger';
import { IdParamsDto } from '~/common/dto/id-params.dto';
import { PaginatedParamsDto } from '~/common/dto/paginated-params.dto';
import { SignerDto } from '~/common/dto/signer.dto';
import { PaginatedResultsModel } from '~/common/models/paginated-results.model';
import { TransactionQueueModel } from '~/common/models/transaction-queue.model';
import { createTransactionQueueModal } from '~/common/utils';
import { PortfolioDto } from '~/portfolios/dto/portfolio.dto';
import { CreateInstructionDto } from '~/settlements/dto/create-instruction.dto';
import { CreateVenueDto } from '~/settlements/dto/create-venue.dto';
import { LegValidationParamsDto } from '~/settlements/dto/leg-validation-params.dto';
import { ModifyVenueDto } from '~/settlements/dto/modify-venue.dto';
import { CreatedInstructionModel } from '~/settlements/model/created-instruction.model';
import { CreatedVenueModel } from '~/settlements/model/created-venue.model';
import { InstructionAffirmationModel } from '~/settlements/model/instruction-affirmation.model';
import { InstructionModel } from '~/settlements/model/instruction.model';
import { TransferBreakdownModel } from '~/settlements/model/transfer-breakdown.model';
import { VenueDetailsModel } from '~/settlements/model/venue-details.model';
import { SettlementsService } from '~/settlements/settlements.service';
import { createInstructionModel } from '~/settlements/settlements.util';

@ApiTags('settlements')
@Controller()
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @ApiTags('instructions')
  @ApiOperation({
    summary: 'Fetch Instruction details',
    description: 'This endpoint will provide the details of the Instruction',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Instruction',
    type: 'string',
    example: '123',
  })
  @ApiOkResponse({
    description: 'Details of the Instruction',
    type: InstructionModel,
  })
  @Get('instructions/:id')
  public async getInstruction(@Param() { id }: IdParamsDto): Promise<InstructionModel> {
    const instruction = await this.settlementsService.findInstruction(id);
    return createInstructionModel(instruction);
  }

  @ApiTags('venues', 'instructions')
  @ApiOperation({
    summary: 'Create a new Instruction',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Venue through which Settlement will be handled',
    type: 'string',
    example: '123',
  })
  @ApiOkResponse({
    description: 'The ID of the newly created Instruction',
    type: CreatedInstructionModel,
  })
  @Post('venues/:id/instructions')
  public async createInstruction(
    @Param() { id }: IdParamsDto,
    @Body() createInstructionDto: CreateInstructionDto
  ): Promise<CreatedInstructionModel> {
    const { result: instruction, transactions } = await this.settlementsService.createInstruction(
      id,
      createInstructionDto
    );

    return new CreatedInstructionModel({
      instruction,
      transactions: createTransactionQueueModal(transactions),
    });
  }

  @ApiTags('instructions')
  @ApiOperation({
    summary: 'Affirm an existing Instruction',
    description:
      'This endpoint will affirm a pending Instruction. All owners of involved portfolios must affirm for the Instruction to be executed',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Instruction to be affirmed',
    type: 'string',
    example: '123',
  })
  @ApiOkResponse({
    description: 'Details of the transaction',
    type: TransactionQueueModel,
  })
  @Post('instructions/:id/affirm')
  public async affirmInstruction(
    @Param() { id }: IdParamsDto,
    @Body() signerDto: SignerDto
  ): Promise<TransactionQueueModel> {
    const { transactions } = await this.settlementsService.affirmInstruction(id, signerDto);

    return new TransactionQueueModel({ transactions: createTransactionQueueModal(transactions) });
  }

  @ApiTags('instructions')
  @ApiOperation({
    summary: 'Reject an existing Instruction',
    description: 'This endpoint will reject a pending Instruction',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Instruction to be rejected',
    type: 'string',
    example: '123',
  })
  @ApiOkResponse({
    description: 'Details of the transaction',
    type: TransactionQueueModel,
  })
  @Post('instructions/:id/reject')
  public async rejectInstruction(
    @Param() { id }: IdParamsDto,
    @Body() signerDto: SignerDto
  ): Promise<TransactionQueueModel> {
    const { transactions } = await this.settlementsService.rejectInstruction(id, signerDto);

    return new TransactionQueueModel({ transactions: createTransactionQueueModal(transactions) });
  }

  @ApiTags('instructions')
  @ApiOperation({
    summary: 'List of affirmations',
    description:
      'This endpoint will provide the list of all affirmations generated by a Instruction',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Instruction whose affirmations are to be fetched',
    type: 'string',
    example: '123',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of affirmations to be fetched',
    type: 'string',
    required: false,
    example: '10',
  })
  @ApiQuery({
    name: 'start',
    description: 'Start index from which affirmations are to be fetched',
    type: 'string',
    required: false,
  })
  @ApiArrayResponse(InstructionAffirmationModel, {
    description: 'List of all affirmations related to the target Identity and their current status',
    paginated: true,
  })
  @Get('instructions/:id/affirmations')
  public async getAffirmations(
    @Param() { id }: IdParamsDto,
    @Query() { size, start }: PaginatedParamsDto
  ): Promise<PaginatedResultsModel<InstructionAffirmationModel>> {
    const { data, count, next } = await this.settlementsService.findAffirmations(
      id,
      size,
      start?.toString()
    );
    return new PaginatedResultsModel({
      results: data?.map(
        ({ identity, status }) =>
          new InstructionAffirmationModel({
            identity,
            status,
          })
      ),
      total: count,
      next,
    });
  }

  @ApiTags('venues')
  @ApiOperation({
    summary: 'Fetch details of a Venue',
    description: 'This endpoint will provide the basic details of a Venue',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Venue whose details are to be fetched',
    type: 'string',
    example: '123',
  })
  @ApiOkResponse({
    description: 'Details of the Venue',
    type: VenueDetailsModel,
  })
  @Get('venues/:id')
  public async getVenueDetails(@Param() { id }: IdParamsDto): Promise<VenueDetailsModel> {
    const venueDetails = await this.settlementsService.findVenueDetails(id);
    return new VenueDetailsModel(venueDetails);
  }

  @ApiTags('venues')
  @ApiOperation({
    summary: 'Create a Venue',
    description: 'This endpoint creates a new Venue',
  })
  @ApiCreatedResponse({
    description: 'Details about the newly created Venue',
    type: CreatedVenueModel,
  })
  @Post('/venues')
  public async createVenue(@Body() createVenueDto: CreateVenueDto): Promise<CreatedVenueModel> {
    const { result: venue, transactions } = await this.settlementsService.createVenue(
      createVenueDto
    );
    return new CreatedVenueModel({
      venue,
      transactions: createTransactionQueueModal(transactions),
    });
  }

  @ApiTags('venues')
  @ApiParam({
    type: 'string',
    name: 'id',
  })
  @ApiOperation({
    summary: "Modify a venue's details",
  })
  @Patch('venues/:id')
  public async modifyVenue(
    @Param() { id }: IdParamsDto,
    @Body() modifyVenueDto: ModifyVenueDto
  ): Promise<TransactionQueueModel> {
    const { transactions } = await this.settlementsService.modifyVenue(id, modifyVenueDto);
    return new TransactionQueueModel({ transactions: createTransactionQueueModal(transactions) });
  }

  @ApiTags('assets')
  @ApiOperation({
    summary: 'Check if a Leg meets the transfer requirements',
    description: 'This endpoint will provide transfer breakdown of an Asset transfer',
  })
  @ApiOkResponse({
    description:
      'Breakdown of every requirement that must be fulfilled for an Asset transfer to be executed successfully, and whether said requirement is met or not',
    type: TransferBreakdownModel,
  })
  @Get('leg-validations')
  public async validateLeg(
    @Query() { asset, amount, fromDid, fromPortfolio, toDid, toPortfolio }: LegValidationParamsDto
  ): Promise<TransferBreakdownModel> {
    const fromPortfolioLike = new PortfolioDto({
      did: fromDid,
      id: fromPortfolio,
    }).toPortfolioLike();
    const toPortfolioLike = new PortfolioDto({ did: toDid, id: toPortfolio }).toPortfolioLike();

    const transferBreakdown = await this.settlementsService.canTransfer(
      fromPortfolioLike,
      toPortfolioLike,
      asset,
      amount
    );

    return new TransferBreakdownModel(transferBreakdown);
  }
}

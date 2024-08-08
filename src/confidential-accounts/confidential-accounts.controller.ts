import { Body, Controller, Get, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import { IncomingConfidentialAssetBalance } from '@polymeshassociation/polymesh-private-sdk/types';

import { ConfidentialAccountsService } from '~/confidential-accounts/confidential-accounts.service';
import { ConfidentialAccountParamsDto } from '~/confidential-accounts/dto/confidential-account-params.dto';
import { MoveFundsDto } from '~/confidential-accounts/dto/move-funds.dto';
import { TransactionHistoryParamsDto } from '~/confidential-accounts/dto/transaction-history-params.dto';
import { AppliedConfidentialAssetBalanceModel } from '~/confidential-accounts/models/applied-confidential-asset-balance.model';
import { AppliedConfidentialAssetBalancesModel } from '~/confidential-accounts/models/applied-confidential-asset-balances.model';
import { ConfidentialAssetBalanceModel } from '~/confidential-accounts/models/confidential-asset-balance.model';
import { ConfidentialTransactionHistoryModel } from '~/confidential-accounts/models/confidential-transaction-history.model';
import { ConfidentialAssetIdParamsDto } from '~/confidential-assets/dto/confidential-asset-id-params.dto';
import { IdentityModel } from '~/extended-identities/models/identity.model';
import {
  ApiArrayResponse,
  ApiTransactionFailedResponse,
  ApiTransactionResponse,
} from '~/polymesh-rest-api/src/common/decorators/swagger';
import { TransactionBaseDto } from '~/polymesh-rest-api/src/common/dto/transaction-base-dto';
import { PaginatedResultsModel } from '~/polymesh-rest-api/src/common/models/paginated-results.model';
import { TransactionQueueModel } from '~/polymesh-rest-api/src/common/models/transaction-queue.model';
import {
  handleServiceResult,
  TransactionResolver,
  TransactionResponseModel,
} from '~/polymesh-rest-api/src/common/utils/functions';

@ApiTags('confidential-accounts')
@Controller('confidential-accounts')
export class ConfidentialAccountsController {
  constructor(private readonly confidentialAccountsService: ConfidentialAccountsService) {}

  @Post(':confidentialAccount/link')
  @ApiOperation({
    summary: 'Links a Confidential Account to an Identity',
    description: 'This endpoint links a given confidential Account to the signer on chain',
  })
  @ApiParam({
    name: 'confidentialAccount',
    description: 'The public key of the Confidential Account',
    type: 'string',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
  })
  @ApiTransactionResponse({
    description: 'Details about the transaction',
    type: TransactionQueueModel,
  })
  @ApiTransactionFailedResponse({
    [HttpStatus.UNPROCESSABLE_ENTITY]: [
      'The given Confidential Account is already linked to an Identity',
    ],
  })
  public async linkAccount(
    @Param() { confidentialAccount }: ConfidentialAccountParamsDto,
    @Body() params: TransactionBaseDto
  ): Promise<TransactionResponseModel> {
    const result = await this.confidentialAccountsService.linkConfidentialAccount(
      confidentialAccount,
      params
    );

    return handleServiceResult(result);
  }

  @ApiOperation({
    summary: 'Get owner of a Confidential Account',
    description:
      'This endpoint retrieves the DID to which a Confidential Account is linked to on chain',
  })
  @ApiParam({
    name: 'confidentialAccount',
    description: 'The public key of the Confidential Account',
    type: 'string',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
  })
  @ApiOkResponse({
    description: 'DID of the owner of the Confidential Account',
    type: IdentityModel,
  })
  @ApiNotFoundResponse({
    description: 'No owner exists for the Confidential Account',
  })
  @Get(':confidentialAccount/owner')
  public async getOwner(
    @Param() { confidentialAccount }: ConfidentialAccountParamsDto
  ): Promise<IdentityModel> {
    const { did } = await this.confidentialAccountsService.fetchOwner(confidentialAccount);

    return new IdentityModel({ did });
  }

  @ApiOperation({
    summary: 'Get all Confidential Asset balances',
    description:
      'This endpoint retrieves the balances of all the Confidential Assets held by a Confidential Account',
  })
  @ApiParam({
    name: 'confidentialAccount',
    description: 'The public key of the Confidential Account',
    type: 'string',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
  })
  @ApiOkResponse({
    description: 'List of all incoming Confidential Asset balances',
    type: ConfidentialAssetBalanceModel,
    isArray: true,
  })
  @Get(':confidentialAccount/balances')
  public async getAllBalances(
    @Param() { confidentialAccount }: ConfidentialAccountParamsDto
  ): Promise<ConfidentialAssetBalanceModel[]> {
    const results = await this.confidentialAccountsService.getAllBalances(confidentialAccount);

    return results.map(
      ({ confidentialAsset: { id: confidentialAsset }, balance }) =>
        new ConfidentialAssetBalanceModel({ confidentialAsset, balance })
    );
  }

  @ApiOperation({
    summary: 'Get the balance of a specific Confidential Asset',
    description:
      'This endpoint retrieves the existing balance of a specific Confidential Asset in the given Confidential Account',
  })
  @ApiParam({
    name: 'confidentialAccount',
    description: 'The public key of the Confidential Account',
    type: 'string',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
  })
  @ApiParam({
    name: 'confidentialAssetId',
    description: 'The ID of the Confidential Asset whose balance is to be fetched',
    type: 'string',
    example: '76702175-d8cb-e3a5-5a19-734433351e25',
  })
  @ApiOkResponse({
    description: 'The encrypted balance of the Confidential Asset',
    type: ConfidentialAssetBalanceModel,
  })
  @ApiNotFoundResponse({
    description: 'No balance was found for the given Confidential Asset',
  })
  @Get(':confidentialAccount/balances/:confidentialAssetId')
  public async getConfidentialAssetBalance(
    @Param()
    {
      confidentialAccount,
      confidentialAssetId,
    }: ConfidentialAccountParamsDto & ConfidentialAssetIdParamsDto
  ): Promise<ConfidentialAssetBalanceModel> {
    return this.confidentialAccountsService.getAssetBalance(
      confidentialAccount,
      confidentialAssetId
    );
  }

  @ApiOperation({
    summary: 'Get all incoming Confidential Asset balances',
    description:
      'This endpoint retrieves the incoming balances of all the Confidential Assets held by a Confidential Account',
  })
  @ApiParam({
    name: 'confidentialAccount',
    description: 'The public key of the Confidential Account',
    type: 'string',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
  })
  @ApiOkResponse({
    description: 'List of all incoming Confidential Asset balances',
    type: ConfidentialAssetBalanceModel,
    isArray: true,
  })
  @Get(':confidentialAccount/incoming-balances')
  public async getAllIncomingBalances(
    @Param() { confidentialAccount }: ConfidentialAccountParamsDto
  ): Promise<ConfidentialAssetBalanceModel[]> {
    const results = await this.confidentialAccountsService.getAllIncomingBalances(
      confidentialAccount
    );

    return results.map(
      ({ confidentialAsset: { id: confidentialAsset }, balance }) =>
        new ConfidentialAssetBalanceModel({ confidentialAsset, balance })
    );
  }

  @ApiOperation({
    summary: 'Get incoming balance of a specific Confidential Asset',
    description:
      'This endpoint retrieves the incoming balance of a specific Confidential Asset in the given Confidential Account',
  })
  @ApiParam({
    name: 'confidentialAssetId',
    description: 'The ID of the Confidential Asset for which the incoming balance is to be fetched',
    example: '76702175-d8cb-e3a5-5a19-734433351e25',
    type: 'string',
  })
  @ApiParam({
    name: 'confidentialAccount',
    description: 'The public key of the Confidential Account',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Encrypted incoming balance of the Confidential Asset',
    type: ConfidentialAssetBalanceModel,
  })
  @ApiNotFoundResponse({
    description: 'No incoming balance is found for the given Confidential Asset',
  })
  @Get(':confidentialAccount/incoming-balances/:confidentialAssetId')
  public async getIncomingConfidentialAssetBalance(
    @Param()
    {
      confidentialAccount,
      confidentialAssetId,
    }: ConfidentialAccountParamsDto & ConfidentialAssetIdParamsDto
  ): Promise<ConfidentialAssetBalanceModel> {
    return this.confidentialAccountsService.getIncomingAssetBalance(
      confidentialAccount,
      confidentialAssetId
    );
  }

  @Post(':confidentialAccount/incoming-balances/apply')
  @ApiOperation({
    summary: 'Deposit all incoming balances for a Confidential Account',
    description: 'This endpoint deposit all the incoming balances for a Confidential Account',
  })
  @ApiParam({
    name: 'confidentialAccount',
    description: 'The public key of the Confidential Account',
    type: 'string',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
  })
  @ApiTransactionResponse({
    description: 'Details about the transaction',
    type: AppliedConfidentialAssetBalancesModel,
  })
  @ApiTransactionFailedResponse({
    [HttpStatus.UNPROCESSABLE_ENTITY]: [
      'The Signing Identity cannot apply incoming balances in the specified Confidential Account',
    ],
    [HttpStatus.NOT_FOUND]: ['No incoming balance for the given the Confidential Account'],
  })
  public async applyAllIncomingAssetBalances(
    @Param() { confidentialAccount }: ConfidentialAccountParamsDto,
    @Body() params: TransactionBaseDto
  ): Promise<TransactionResponseModel> {
    const result = await this.confidentialAccountsService.applyAllIncomingAssetBalances(
      confidentialAccount,
      params
    );

    const resolver: TransactionResolver<IncomingConfidentialAssetBalance[]> = ({
      result: appliedAssetBalances,
      transactions,
      details,
    }) =>
      new AppliedConfidentialAssetBalancesModel({
        appliedAssetBalances: appliedAssetBalances.map(
          ({ asset: { id: confidentialAsset }, amount, balance }) =>
            new AppliedConfidentialAssetBalanceModel({ confidentialAsset, amount, balance })
        ),
        transactions,
        details,
      });

    return handleServiceResult(result, resolver);
  }

  @ApiOperation({
    summary: 'Get transaction history of a specific Confidential Account',
    description:
      'This endpoint retrieves the transaction history for the given Confidential Account',
  })
  @ApiParam({
    name: 'confidentialAccount',
    description: 'The public key of the Confidential Account',
    example: '0xdeadbeef00000000000000000000000000000000000000000000000000000000',
    type: 'string',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of transaction history entries to be fetched',
    type: 'string',
    required: false,
    example: '10',
  })
  @ApiQuery({
    name: 'start',
    description: 'Start index from which transaction history entries are to be fetched',
    type: 'string',
    required: false,
  })
  @ApiNotFoundResponse({
    description: 'No Confidential Account was found',
  })
  @ApiArrayResponse(ConfidentialTransactionHistoryModel)
  @Get(':confidentialAccount/transaction-history')
  public async getTransactionHistory(
    @Param()
    { confidentialAccount }: ConfidentialAccountParamsDto,
    @Query() { size, start, assetId, eventId }: TransactionHistoryParamsDto
  ): Promise<PaginatedResultsModel<ConfidentialTransactionHistoryModel>> {
    const { data, count, next } = await this.confidentialAccountsService.getTransactionHistory(
      confidentialAccount,
      { size, start: new BigNumber(start || 0), assetId, eventId }
    );

    return new PaginatedResultsModel({
      results: data?.map(
        ({ asset, amount, eventId: event, createdAt }) =>
          new ConfidentialTransactionHistoryModel({
            assetId: asset.toHuman(),
            amount,
            eventId: event,
            createdAt: createdAt?.blockDate,
          })
      ),
      total: count,
      next,
    });
  }

  @ApiOperation({
    summary: 'Move funds between Confidential Accounts owned by the signing Identity',
    description: 'This endpoint moves funds between Confidential Accounts of the Signing Identity',
  })
  @ApiNotFoundResponse({
    description: 'No Confidential Account was found',
  })
  @ApiTransactionFailedResponse({
    [HttpStatus.NOT_FOUND]: [
      'The sending Confidential Account does not exist',
      'The receiving Confidential Account does not exist',
    ],
    [HttpStatus.UNPROCESSABLE_ENTITY]: [
      'The provided accounts must have identities associated with them',
      'Only the owner of the sender account can move funds',
      'The provided accounts must have the same identity',
      'Confidential Assets that do not exist were provided',
      'Assets are frozen for trading',
      'The sender account is frozen for trading specified asset',
      'The receiver account is frozen for trading specified asset',
    ],
  })
  @ApiTransactionResponse({
    description: 'Details about the transaction',
  })
  @Post('move-funds')
  public async moveFunds(@Body() args: MoveFundsDto): Promise<TransactionResponseModel> {
    const result = await this.confidentialAccountsService.moveFunds(args);

    return handleServiceResult(result);
  }
}

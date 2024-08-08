import { Injectable, NotFoundException } from '@nestjs/common';
import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import {
  ConfidentialAccount,
  ConfidentialAsset,
  ConfidentialAssetBalance,
  ConfidentialAssetHistoryEntry,
  ConfidentialTransaction,
  EventIdEnum,
  Identity,
  IncomingConfidentialAssetBalance,
  MoveFundsParams,
  ResultSet,
} from '@polymeshassociation/polymesh-private-sdk/types';

import { FundMovesDto } from '~/confidential-accounts/dto/fund-moves.dto';
import { MoveFundsDto } from '~/confidential-accounts/dto/move-funds.dto';
import { ConfidentialAssetBalanceModel } from '~/confidential-accounts/models/confidential-asset-balance.model';
import { ConfidentialProofsService } from '~/confidential-proofs/confidential-proofs.service';
import { ConfidentialTransactionDirectionEnum } from '~/confidential-transactions/types';
import { PolymeshService } from '~/polymesh/polymesh.service';
import { TransactionBaseDto } from '~/polymesh-rest-api/src/common/dto/transaction-base-dto';
import { extractTxOptions, ServiceReturn } from '~/polymesh-rest-api/src/common/utils/functions';
import { TransactionsService } from '~/transactions/transactions.service';
import { handleSdkError } from '~/transactions/transactions.util';

@Injectable()
export class ConfidentialAccountsService {
  constructor(
    private readonly polymeshService: PolymeshService,
    private readonly transactionsService: TransactionsService,
    private readonly confidentialProofsService: ConfidentialProofsService
  ) {}

  public async findOne(publicKey: string): Promise<ConfidentialAccount> {
    return await this.polymeshService.polymeshApi.confidentialAccounts
      .getConfidentialAccount({ publicKey })
      .catch(error => {
        throw handleSdkError(error);
      });
  }

  public async fetchOwner(publicKey: string): Promise<Identity> {
    const account = await this.findOne(publicKey);

    const identity = await account.getIdentity();

    if (!identity) {
      throw new NotFoundException('No owner exists for the Confidential Account');
    }

    return identity;
  }

  public async linkConfidentialAccount(
    publicKey: string,
    base: TransactionBaseDto
  ): ServiceReturn<ConfidentialAccount> {
    const { options } = extractTxOptions(base);
    const createConfidentialAccount =
      this.polymeshService.polymeshApi.confidentialAccounts.createConfidentialAccount;

    return this.transactionsService.submit(createConfidentialAccount, { publicKey }, options);
  }

  public async getAllBalances(confidentialAccount: string): Promise<ConfidentialAssetBalance[]> {
    const account = await this.findOne(confidentialAccount);

    return account.getBalances();
  }

  public async getAssetBalance(
    confidentialAccount: string,
    asset: string
  ): Promise<ConfidentialAssetBalanceModel> {
    const account = await this.findOne(confidentialAccount);

    const balance = await account.getBalance({ asset }).catch(error => {
      throw handleSdkError(error);
    });

    return new ConfidentialAssetBalanceModel({
      confidentialAsset: asset,
      balance,
    });
  }

  public async getAllIncomingBalances(
    confidentialAccount: string
  ): Promise<ConfidentialAssetBalance[]> {
    const account = await this.findOne(confidentialAccount);

    return account.getIncomingBalances();
  }

  public async getIncomingAssetBalance(
    confidentialAccount: string,
    asset: string
  ): Promise<ConfidentialAssetBalanceModel> {
    const account = await this.findOne(confidentialAccount);

    const balance = await account.getIncomingBalance({ asset }).catch(error => {
      throw handleSdkError(error);
    });

    return new ConfidentialAssetBalanceModel({
      balance,
      confidentialAsset: asset,
    });
  }

  public async applyAllIncomingAssetBalances(
    confidentialAccount: string,
    base: TransactionBaseDto
  ): ServiceReturn<IncomingConfidentialAssetBalance[]> {
    const { options } = extractTxOptions(base);
    const applyIncomingBalances =
      this.polymeshService.polymeshApi.confidentialAccounts.applyIncomingBalances;

    return this.transactionsService.submit(applyIncomingBalances, { confidentialAccount }, options);
  }

  public async findHeldAssets(
    confidentialAccount: string,
    size?: BigNumber,
    start?: BigNumber
  ): Promise<ResultSet<ConfidentialAsset>> {
    const account = await this.findOne(confidentialAccount);

    return account.getHeldAssets({ size, start });
  }

  public async getAssociatedTransactions(
    confidentialAccount: string,
    direction: ConfidentialTransactionDirectionEnum,
    size: BigNumber,
    start?: BigNumber
  ): Promise<ResultSet<ConfidentialTransaction>> {
    const account = await this.findOne(confidentialAccount);

    return account.getTransactions({ direction, size, start });
  }

  public async getTransactionHistory(
    confidentialAccount: string,
    filters: {
      size?: BigNumber;
      start?: BigNumber;
      assetId?: string;
      eventId?:
        | EventIdEnum.AccountDeposit
        | EventIdEnum.AccountWithdraw
        | EventIdEnum.AccountDepositIncoming;
    }
  ): Promise<ResultSet<ConfidentialAssetHistoryEntry>> {
    const account = await this.findOne(confidentialAccount);

    return account.getTransactionHistory(filters);
  }

  public async moveFunds(params: MoveFundsDto): ServiceReturn<void> {
    const { options, args } = extractTxOptions(params);
    const { fundMoves } = args;

    const confidentialAccounts = this.polymeshService.polymeshApi.confidentialAccounts;

    const moves = await Promise.all(
      fundMoves.map(async fundMove => {
        const moveFundsParams = await this.fundMoveToMoveFundsParams(fundMove);

        return moveFundsParams;
      })
    );

    return this.transactionsService.submit(confidentialAccounts.moveFunds, moves, options);
  }

  private async fundMoveToMoveFundsParams(fundMove: FundMovesDto): Promise<MoveFundsParams> {
    const { from, to, assetMoves } = fundMove;

    const [fromAccount, toAccount] = await Promise.all([this.findOne(from), this.findOne(to)]);

    const proofs = await Promise.all(
      assetMoves.map(async ({ confidentialAsset, amount }) => {
        const assetBalance = await this.getAssetBalance(from, confidentialAsset);
        const asset =
          await this.polymeshService.polymeshApi.confidentialAssets.getConfidentialAsset({
            id: confidentialAsset,
          });

        const { auditors } = await asset.getAuditors();

        const proof = await this.confidentialProofsService.generateSenderProof(
          fromAccount.publicKey,
          {
            amount,
            auditors: auditors.map(auditor => auditor.publicKey),
            receiver: toAccount.publicKey,
            encryptedBalance: assetBalance.balance,
          }
        );

        return {
          asset,
          amount,
          proof,
        };
      })
    );

    return {
      from: fromAccount,
      to: toAccount,
      proofs,
    };
  }
}

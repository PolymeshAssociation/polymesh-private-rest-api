import { DeepMocked } from '@golevelup/ts-jest';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import { Order, TransactionOrderFields } from '@polymeshassociation/polymesh-sdk/middleware/types';
import { PermissionType, TxGroup, TxTags } from '@polymeshassociation/polymesh-sdk/types';
import { Response } from 'express';

import { AccountsController } from '~/accounts/accounts.controller';
import { AccountsService } from '~/accounts/accounts.service';
import { PermissionedAccountDto } from '~/accounts/dto/permissioned-account.dto';
import { ExtrinsicModel } from '~/common/models/extrinsic.model';
import { PaginatedResultsModel } from '~/common/models/paginated-results.model';
import { PermissionsLikeDto } from '~/identities/dto/permissions-like.dto';
import { AccountModel } from '~/identities/models/account.model';
import {
  createMockResponseObject,
  MockAsset,
  MockPortfolio,
  MockSubsidy,
} from '~/test-utils/mocks';
import { MockAccountsService } from '~/test-utils/service-mocks';

describe('AccountsController', () => {
  let controller: AccountsController;

  const mockAccountsService = new MockAccountsService();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [AccountsService],
    })
      .overrideProvider(AccountsService)
      .useValue(mockAccountsService)
      .compile();

    controller = module.get<AccountsController>(AccountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAccountBalance', () => {
    it('should return the POLYX balance of an Account', async () => {
      const mockResult = {
        free: new BigNumber(10),
        locked: new BigNumber(1),
        total: new BigNumber(11),
      };
      mockAccountsService.getAccountBalance.mockResolvedValue(mockResult);

      const result = await controller.getAccountBalance({ account: '5xdd' });

      expect(result).toEqual(mockResult);
    });
  });

  describe('transferPolyx', () => {
    it('should return the transaction details on transferring POLYX balance', async () => {
      const transactions = ['transaction'];
      mockAccountsService.transferPolyx.mockResolvedValue({ transactions });

      const body = {
        signer: '0x6'.padEnd(66, '0'),
        to: 'address',
        amount: new BigNumber(10),
        memo: 'Sample memo',
      };

      const result = await controller.transferPolyx(body);

      expect(result).toEqual({
        transactions,
      });
    });
  });

  describe('getTransactionHistory', () => {
    const mockTransaction = {
      blockHash: 'blockHash',
      blockNumber: new BigNumber(1000000),
      extrinsicIdx: new BigNumber(1),
      address: 'someAccount',
      nonce: new BigNumber(123456),
      txTag: TxTags.asset.RegisterTicker,
      params: [
        {
          name: 'ticker',
          value: 'TICKER',
        },
      ],
      success: true,
      specVersionId: new BigNumber(3002),
      extrinsicHash: 'extrinsicHash',
    };

    const mockTransactions = {
      data: [mockTransaction],
      next: null,
      count: new BigNumber(1),
    };

    it('should return the list of Asset documents', async () => {
      mockAccountsService.getTransactionHistory.mockResolvedValue(mockTransactions);

      const result = await controller.getTransactionHistory(
        { account: 'someAccount' },
        { field: TransactionOrderFields.BlockId, order: Order.Desc }
      );

      expect(result).toEqual(
        new PaginatedResultsModel({
          results: [new ExtrinsicModel(mockTransaction)],
          total: new BigNumber(1),
          next: null,
        })
      );
    });
  });

  describe('getPermissions', () => {
    const mockPermissions = {
      assets: {
        type: PermissionType.Include,
        values: [new MockAsset()],
      },
      portfolios: {
        type: PermissionType.Include,
        values: [new MockPortfolio()],
      },
      transactions: {
        type: PermissionType.Include,
        values: [TxTags.asset.AddDocuments],
      },
      transactionGroups: [TxGroup.Issuance, TxGroup.StoManagement],
    };

    it('should return the Account Permissions', async () => {
      mockAccountsService.getPermissions.mockResolvedValue(mockPermissions);

      const result = await controller.getPermissions({ account: 'someAccount' });

      expect(result).toEqual({
        assets: {
          type: PermissionType.Include,
          values: ['TICKER'],
        },
        portfolios: {
          type: PermissionType.Include,
          values: [
            {
              id: '1',
              did: '0x06'.padEnd(66, '0'),
            },
          ],
        },
        transactions: {
          type: PermissionType.Include,
          values: [TxTags.asset.AddDocuments],
        },
        transactionGroups: [TxGroup.Issuance, TxGroup.StoManagement],
      });
    });
  });

  describe('getSubsidy', () => {
    let mockResponse: DeepMocked<Response>;

    beforeEach(() => {
      mockResponse = createMockResponseObject();
    });
    it(`should return the ${HttpStatus.NO_CONTENT} if the Account has no subsidy`, async () => {
      mockAccountsService.getSubsidy.mockResolvedValue(null);

      await controller.getSubsidy({ account: 'someAccount' }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
    });

    it('should return the Account Subsidy', async () => {
      const subsidyWithAllowance = {
        subsidy: new MockSubsidy(),
        allowance: new BigNumber(10),
      };
      mockAccountsService.getSubsidy.mockResolvedValue(subsidyWithAllowance);

      await controller.getSubsidy({ account: 'someAccount' }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        beneficiary: new AccountModel({ address: 'beneficiary' }),
        subsidizer: new AccountModel({ address: 'subsidizer' }),
        allowance: new BigNumber(10),
      });
    });
  });

  describe('freezeSecondaryAccounts', () => {
    it('should freeze secondary accounts', async () => {
      const transactions = ['transaction'];
      mockAccountsService.freezeSecondaryAccounts.mockResolvedValue({ transactions });
      const body = {
        signer: '0x6'.padEnd(66, '0'),
      };

      const result = await controller.freezeSecondaryAccounts(body);

      expect(result).toEqual({
        transactions,
      });
    });
  });

  describe('unfreezeSecondaryAccounts', () => {
    it('should unfreeze secondary accounts', async () => {
      const transactions = ['transaction'];
      mockAccountsService.unfreezeSecondaryAccounts.mockResolvedValue({ transactions });
      const body = {
        signer: '0x6'.padEnd(66, '0'),
      };

      const result = await controller.unfreezeSecondaryAccounts(body);

      expect(result).toEqual({
        transactions,
      });
    });
  });

  describe('revokePermissions', () => {
    it('should call the service and return the transaction details', async () => {
      const transactions = ['transaction'];
      mockAccountsService.revokePermissions.mockResolvedValue({ transactions });

      const body = {
        signer: '0x6'.padEnd(66, '0'),
        secondaryAccounts: ['someAddress'],
      };

      const result = await controller.revokePermissions(body);

      expect(result).toEqual({
        transactions,
      });
    });
  });

  describe('modifyPermissions', () => {
    it('should call the service and return the transaction details', async () => {
      const transactions = ['transaction'];
      mockAccountsService.modifyPermissions.mockResolvedValue({ transactions });

      const body = {
        signer: '0x6'.padEnd(66, '0'),
        secondaryAccounts: [
          new PermissionedAccountDto({
            secondaryAccount: 'someAddress',
            permissions: new PermissionsLikeDto({
              assets: null,
              portfolios: null,
              transactionGroups: [TxGroup.PortfolioManagement],
            }),
          }),
        ],
      };

      const result = await controller.modifyPermissions(body);

      expect(result).toEqual({
        transactions,
      });
    });
  });
});
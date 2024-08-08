import { DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import {
  ConfidentialAccount,
  ConfidentialAssetBalance,
  ConfidentialAssetHistoryEntry,
  EventIdEnum,
  ResultSet,
  TxTags,
} from '@polymeshassociation/polymesh-private-sdk/types';
import { when } from 'jest-when';

import { ConfidentialAccountsService } from '~/confidential-accounts/confidential-accounts.service';
import { ConfidentialProofsService } from '~/confidential-proofs/confidential-proofs.service';
import { ConfidentialTransactionDirectionEnum } from '~/confidential-transactions/types';
import { POLYMESH_API } from '~/polymesh/polymesh.consts';
import { PolymeshModule } from '~/polymesh/polymesh.module';
import { PolymeshService } from '~/polymesh/polymesh.service';
import { testValues } from '~/test-utils/consts';
import {
  createMockConfidentialAccount,
  createMockConfidentialAsset,
  createMockConfidentialTransaction,
  MockPolymesh,
  MockTransaction,
} from '~/test-utils/mocks';
import {
  mockConfidentialProofsServiceProvider,
  mockTransactionsProvider,
  MockTransactionsService,
} from '~/test-utils/service-mocks';
import { TransactionsService } from '~/transactions/transactions.service';
import * as transactionsUtilModule from '~/transactions/transactions.util';

const { signer } = testValues;

describe('ConfidentialAccountsService', () => {
  let service: ConfidentialAccountsService;
  let mockPolymeshApi: MockPolymesh;
  let polymeshService: PolymeshService;
  let mockTransactionsService: MockTransactionsService;
  let mockConfidentialProofsService: DeepMocked<ConfidentialProofsService>;
  const confidentialAccount = 'SOME_PUBLIC_KEY';

  beforeEach(async () => {
    mockPolymeshApi = new MockPolymesh();

    const module: TestingModule = await Test.createTestingModule({
      imports: [PolymeshModule],
      providers: [
        ConfidentialAccountsService,
        mockTransactionsProvider,
        mockConfidentialProofsServiceProvider,
      ],
    })
      .overrideProvider(POLYMESH_API)
      .useValue(mockPolymeshApi)
      .compile();

    mockPolymeshApi = module.get<MockPolymesh>(POLYMESH_API);
    polymeshService = module.get<PolymeshService>(PolymeshService);
    mockTransactionsService = module.get<MockTransactionsService>(TransactionsService);
    mockConfidentialProofsService =
      module.get<typeof mockConfidentialProofsService>(ConfidentialProofsService);

    service = module.get<ConfidentialAccountsService>(ConfidentialAccountsService);
  });

  afterEach(async () => {
    await polymeshService.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a Confidential Account for a valid publicKey', async () => {
      const account = createMockConfidentialAccount();
      mockPolymeshApi.confidentialAccounts.getConfidentialAccount.mockResolvedValue(account);

      const result = await service.findOne(confidentialAccount);

      expect(result).toEqual(account);
    });

    it('should call handleSdkError and throw an error', async () => {
      const mockError = new Error('Some Error');
      mockPolymeshApi.confidentialAccounts.getConfidentialAccount.mockRejectedValue(mockError);

      const handleSdkErrorSpy = jest.spyOn(transactionsUtilModule, 'handleSdkError');

      await expect(service.findOne(confidentialAccount)).rejects.toThrowError();

      expect(handleSdkErrorSpy).toHaveBeenCalledWith(mockError);
    });
  });

  describe('fetchOwner', () => {
    it('should return the owner of Confidential Account', async () => {
      const mockConfidentialAccount = createMockConfidentialAccount();

      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockConfidentialAccount);

      const result = await service.fetchOwner(confidentialAccount);

      expect(result).toEqual(expect.objectContaining({ did: 'SOME_OWNER' }));
    });

    it('should throw an error if no owner exists', async () => {
      const mockConfidentialAccount = createMockConfidentialAccount();
      mockConfidentialAccount.getIdentity.mockResolvedValue(null);

      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockConfidentialAccount);

      await expect(service.fetchOwner(confidentialAccount)).rejects.toThrow(
        'No owner exists for the Confidential Account'
      );
    });
  });

  describe('linkConfidentialAccount', () => {
    it('should link a given public key to the signer', async () => {
      const input = {
        signer,
      };
      const mockTransactions = {
        blockHash: '0x1',
        txHash: '0x2',
        blockNumber: new BigNumber(1),
        tag: TxTags.confidentialAsset.CreateAccount,
      };
      const mockTransaction = new MockTransaction(mockTransactions);
      const mockAccount = createMockConfidentialAccount();

      mockTransactionsService.submit.mockResolvedValue({
        result: mockAccount,
        transactions: [mockTransaction],
      });

      const result = await service.linkConfidentialAccount(confidentialAccount, input);

      expect(result).toEqual({
        result: mockAccount,
        transactions: [mockTransaction],
      });
    });
  });

  describe('getAllBalances and getAllIncomingBalances', () => {
    let account: DeepMocked<ConfidentialAccount>;
    let balances: ConfidentialAssetBalance[];

    beforeEach(() => {
      balances = [
        {
          confidentialAsset: createMockConfidentialAsset(),
          balance: '0xsomebalance',
        },
      ];

      account = createMockConfidentialAccount();
    });

    describe('getAllBalances', () => {
      it('should return all balances for a Confidential Account', async () => {
        account.getBalances.mockResolvedValue(balances);

        jest.spyOn(service, 'findOne').mockResolvedValue(account);

        const result = await service.getAllBalances(confidentialAccount);

        expect(result).toEqual(balances);
      });
    });

    describe('getAllIncomingBalances', () => {
      it('should return all incoming balances for a Confidential Account', async () => {
        account.getIncomingBalances.mockResolvedValue(balances);

        jest.spyOn(service, 'findOne').mockResolvedValue(account);

        const result = await service.getAllIncomingBalances(confidentialAccount);

        expect(result).toEqual(balances);
      });
    });
  });

  describe('getAssetBalance and getIncomingAssetBalance', () => {
    let account: DeepMocked<ConfidentialAccount>;
    let balance: string;
    let confidentialAssetId: string;

    beforeEach(() => {
      balance = '0xsomebalance';
      confidentialAssetId = 'SOME_ASSET_ID';

      account = createMockConfidentialAccount();
      account.getBalance.mockResolvedValue(balance);
      account.getIncomingBalance.mockResolvedValue(balance);
    });

    describe('getAssetBalance', () => {
      it('should return balance for a specific Confidential Asset', async () => {
        jest.spyOn(service, 'findOne').mockResolvedValue(account);

        const result = await service.getAssetBalance(confidentialAccount, confidentialAssetId);

        expect(result).toEqual({ balance, confidentialAsset: confidentialAssetId });
      });

      it('should call handleSdkError and throw an error', async () => {
        const mockError = new Error('Some Error');
        account.getBalance.mockRejectedValue(mockError);
        jest.spyOn(service, 'findOne').mockResolvedValue(account);

        const handleSdkErrorSpy = jest.spyOn(transactionsUtilModule, 'handleSdkError');

        await expect(
          service.getAssetBalance(confidentialAccount, confidentialAssetId)
        ).rejects.toThrowError();

        expect(handleSdkErrorSpy).toHaveBeenCalledWith(mockError);
      });
    });

    describe('getIncomingAssetBalance', () => {
      it('should return the incoming balance for a specific Confidential Asset', async () => {
        jest.spyOn(service, 'findOne').mockResolvedValue(account);

        const result = await service.getIncomingAssetBalance(
          confidentialAccount,
          confidentialAssetId
        );

        expect(result).toEqual({ balance, confidentialAsset: confidentialAssetId });
      });

      it('should call handleSdkError and throw an error', async () => {
        const mockError = new Error('Some Error');
        account.getIncomingBalance.mockRejectedValue(mockError);
        jest.spyOn(service, 'findOne').mockResolvedValue(account);

        const handleSdkErrorSpy = jest.spyOn(transactionsUtilModule, 'handleSdkError');

        await expect(
          service.getIncomingAssetBalance(confidentialAccount, confidentialAssetId)
        ).rejects.toThrowError();

        expect(handleSdkErrorSpy).toHaveBeenCalledWith(mockError);
      });
    });
  });

  describe('applyAllIncomingAssetBalances', () => {
    it('should deposit all incoming balances for a Confidential Account', async () => {
      const input = {
        signer,
      };
      const mockTransactions = {
        blockHash: '0x1',
        txHash: '0x2',
        blockNumber: new BigNumber(1),
        tag: TxTags.confidentialAsset.ApplyIncomingBalances,
      };
      const mockTransaction = new MockTransaction(mockTransactions);
      const mockIncomingAssetBalances = [
        {
          asset: createMockConfidentialAsset(),
          amount: '0xAmount',
          balance: '0xBalance',
        },
      ];

      mockTransactionsService.submit.mockResolvedValue({
        result: mockIncomingAssetBalances,
        transactions: [mockTransaction],
      });

      const result = await service.applyAllIncomingAssetBalances(confidentialAccount, input);

      expect(result).toEqual({
        result: mockIncomingAssetBalances,
        transactions: [mockTransaction],
      });
    });
  });

  describe('findHeldAssets', () => {
    it('should return the list of Confidential Assets held by an Confidential Account', async () => {
      const mockAssets = {
        data: [
          createMockConfidentialAsset({ id: 'SOME_ASSET_ID_1' }),
          createMockConfidentialAsset({ id: 'SOME_ASSET_ID_2' }),
        ],
        next: new BigNumber(2),
        count: new BigNumber(2),
      };
      const mockAccount = createMockConfidentialAccount();

      jest.spyOn(service, 'findOne').mockResolvedValue(mockAccount);

      mockAccount.getHeldAssets.mockResolvedValue(mockAssets);

      const result = await service.findHeldAssets(
        'SOME_PUBLIC_KEY',
        new BigNumber(2),
        new BigNumber(0)
      );
      expect(result).toEqual(mockAssets);
    });
  });

  describe('getAssociatedTransactions', () => {
    it('should return the list of transactions associated to a Confidential Account', async () => {
      const mockTransactions = {
        data: [
          createMockConfidentialTransaction({ id: new BigNumber(10) }),
          createMockConfidentialTransaction({ id: new BigNumber(12) }),
        ],
        next: new BigNumber(2),
        count: new BigNumber(2),
      };
      const mockAccount = createMockConfidentialAccount();

      jest.spyOn(service, 'findOne').mockResolvedValue(mockAccount);

      mockAccount.getTransactions.mockResolvedValue(mockTransactions);

      const result = await service.getAssociatedTransactions(
        'SOME_PUBLIC_KEY',
        ConfidentialTransactionDirectionEnum.All,
        new BigNumber(2),
        new BigNumber(0)
      );
      expect(result).toEqual(mockTransactions);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return the list of Transaction Histories for an Confidential Account', async () => {
      const mockHistory: ResultSet<ConfidentialAssetHistoryEntry> = {
        data: [
          {
            asset: createMockConfidentialAsset({ id: '0xassetId' }),
            amount:
              '0x46247c432a2632d23644aab44da0457506cbf7e712cea7158eeb4324f932161b54b44b6e87ca5028099745482c1ef3fc9901ae760a08f925c8e68c1511f6f77e',
            eventId: EventIdEnum.AccountDeposit,
            createdAt: {
              blockHash: '0xblockhash',
              blockNumber: new BigNumber(1),
              blockDate: new Date('05/23/2021'),
              eventIndex: new BigNumber(1),
            },
          },
        ],
        next: new BigNumber(2),
        count: new BigNumber(2),
      };
      const mockAccount = createMockConfidentialAccount();

      jest.spyOn(service, 'findOne').mockResolvedValue(mockAccount);

      mockAccount.getTransactionHistory.mockResolvedValue(mockHistory);

      const result = await service.getTransactionHistory('SOME_PUBLIC_KEY', {
        start: new BigNumber(0),
        size: new BigNumber(10),
      });

      expect(result).toEqual(mockHistory);
    });
  });

  describe('moveFunds', () => {
    it('create a transaction and return service result', async () => {
      const mockFromAccount = createMockConfidentialAccount();
      const mockToAccount = createMockConfidentialAccount();
      const mockAuditorAccount = createMockConfidentialAccount();
      const amount = new BigNumber(1000);
      const balance = '0x0';

      const mockAsset = createMockConfidentialAsset({
        id: '0xassetId',
        getAuditors: jest.fn().mockResolvedValue({ auditors: [mockAuditorAccount] }),
      });

      jest.spyOn(service, 'findOne').mockResolvedValue(mockFromAccount);
      when(service.findOne).calledWith(mockToAccount.uuid).mockResolvedValue(mockToAccount);

      jest
        .spyOn(service, 'getAssetBalance')
        .mockResolvedValue({ confidentialAsset: mockAsset.id, balance });

      when(polymeshService.polymeshApi.confidentialAssets.getConfidentialAsset)
        .calledWith({ id: mockAsset.id })
        .mockResolvedValue(mockAsset);
      when(mockConfidentialProofsService.generateSenderProof)
        .calledWith(mockFromAccount.publicKey, {
          amount,
          encryptedBalance: balance,
          auditors: [mockAuditorAccount.publicKey],
          receiver: mockToAccount.publicKey,
        })
        .mockResolvedValue('proof');

      const input = {
        signer,
        fundMoves: [
          {
            from: mockFromAccount.uuid,
            to: mockToAccount.uuid,
            assetMoves: [{ confidentialAsset: mockAsset.id, amount }],
          },
        ],
      };

      const mockTransactions = {
        blockHash: '0x1',
        txHash: '0x2',
        blockNumber: new BigNumber(1),
        tag: TxTags.confidentialAsset.MoveAssets,
      };
      const mockTransaction = new MockTransaction(mockTransactions);

      mockTransactionsService.submit.mockResolvedValue({
        result: undefined,
        transactions: [mockTransaction],
      });

      const result = await service.moveFunds(input);

      expect(result).toEqual({
        result: undefined,
        transactions: [mockTransaction],
      });
    });
  });
});

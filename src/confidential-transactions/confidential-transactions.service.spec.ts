import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import {
  ConfidentialAccount,
  ConfidentialAffirmParty,
  ConfidentialTransaction,
  ConfidentialTransactionStatus,
  TxTags,
} from '@polymeshassociation/polymesh-private-sdk/types';
import { when } from 'jest-when';

import { ConfidentialAccountsService } from '~/confidential-accounts/confidential-accounts.service';
import { ConfidentialAccountModel } from '~/confidential-accounts/models/confidential-account.model';
import { ConfidentialAssetModel } from '~/confidential-assets/models/confidential-asset.model';
import { ConfidentialProofsService } from '~/confidential-proofs/confidential-proofs.service';
import { ConfidentialTransactionsService } from '~/confidential-transactions/confidential-transactions.service';
import * as confidentialTransactionsUtilModule from '~/confidential-transactions/confidential-transactions.util';
import { ObserverAffirmConfidentialTransactionDto } from '~/confidential-transactions/dto/observer-affirm-confidential-transaction.dto';
import { SenderAffirmConfidentialTransactionDto } from '~/confidential-transactions/dto/sender-affirm-confidential-transaction.dto';
import { ConfidentialAssetAuditorModel } from '~/confidential-transactions/models/confidential-asset-auditor.model';
import { ConfidentialTransactionModel } from '~/confidential-transactions/models/confidential-transaction.model';
import { ExtendedIdentitiesService } from '~/extended-identities/identities.service';
import { POLYMESH_API } from '~/polymesh/polymesh.consts';
import { PolymeshModule } from '~/polymesh/polymesh.module';
import { PolymeshService } from '~/polymesh/polymesh.service';
import { TransactionBaseDto } from '~/polymesh-rest-api/src/common/dto/transaction-base-dto';
import { ProcessMode } from '~/polymesh-rest-api/src/common/types';
import { testValues } from '~/test-utils/consts';
import {
  createMockConfidentialAccount,
  createMockConfidentialTransaction,
  createMockConfidentialVenue,
  createMockIdentity,
  MockIdentity,
  MockPolymesh,
  MockTransaction,
} from '~/test-utils/mocks';
import {
  mockConfidentialAccountsServiceProvider,
  mockConfidentialProofsServiceProvider,
  MockIdentitiesService,
  mockTransactionsProvider,
  MockTransactionsService,
} from '~/test-utils/service-mocks';
import { TransactionsService } from '~/transactions/transactions.service';
import * as transactionsUtilModule from '~/transactions/transactions.util';

const { signer } = testValues;

describe('ConfidentialTransactionsService', () => {
  let service: ConfidentialTransactionsService;
  let mockPolymeshApi: MockPolymesh;
  let polymeshService: PolymeshService;
  let mockTransactionsService: MockTransactionsService;
  let mockConfidentialProofsService: DeepMocked<ConfidentialProofsService>;
  let mockConfidentialAccountsService: ConfidentialAccountsService;
  let mockIdentitiesService: MockIdentitiesService;
  const id = new BigNumber(1);

  beforeEach(async () => {
    mockPolymeshApi = new MockPolymesh();

    mockIdentitiesService = new MockIdentitiesService();

    const module: TestingModule = await Test.createTestingModule({
      imports: [PolymeshModule],
      providers: [
        ConfidentialTransactionsService,
        mockTransactionsProvider,
        mockConfidentialProofsServiceProvider,
        mockConfidentialAccountsServiceProvider,
        ExtendedIdentitiesService,
      ],
    })
      .overrideProvider(POLYMESH_API)
      .useValue(mockPolymeshApi)
      .overrideProvider(ExtendedIdentitiesService)
      .useValue(mockIdentitiesService)
      .compile();

    mockPolymeshApi = module.get<MockPolymesh>(POLYMESH_API);
    polymeshService = module.get<PolymeshService>(PolymeshService);
    mockConfidentialAccountsService = module.get<typeof mockConfidentialAccountsService>(
      ConfidentialAccountsService
    );
    mockConfidentialProofsService =
      module.get<typeof mockConfidentialProofsService>(ConfidentialProofsService);
    mockTransactionsService = module.get<MockTransactionsService>(TransactionsService);

    service = module.get<ConfidentialTransactionsService>(ConfidentialTransactionsService);
  });

  afterEach(async () => {
    await polymeshService.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a Confidential Transaction for a valid ID', async () => {
      const transaction = createMockConfidentialTransaction();
      mockPolymeshApi.confidentialSettlements.getTransaction.mockResolvedValue(transaction);

      const result = await service.findOne(id);

      expect(result).toEqual(transaction);
    });

    it('should call handleSdkError and throw an error', async () => {
      const mockError = new Error('Some Error');
      mockPolymeshApi.confidentialSettlements.getTransaction.mockRejectedValue(mockError);

      const handleSdkErrorSpy = jest.spyOn(transactionsUtilModule, 'handleSdkError');

      await expect(() => service.findOne(id)).rejects.toThrowError();

      expect(handleSdkErrorSpy).toHaveBeenCalledWith(mockError, {
        id: id.toString(),
        resource: 'Confidential Transaction',
      });
    });
  });

  describe('findVenue', () => {
    it('should return a Confidential Venue for a valid ID', async () => {
      const venue = createMockConfidentialVenue();
      mockPolymeshApi.confidentialSettlements.getVenue.mockResolvedValue(venue);

      const result = await service.findVenue(id);

      expect(result).toEqual(venue);
    });

    it('should call handleSdkError and throw an error', async () => {
      const mockError = new Error('Some Error');
      mockPolymeshApi.confidentialSettlements.getVenue.mockRejectedValue(mockError);

      const handleSdkErrorSpy = jest.spyOn(transactionsUtilModule, 'handleSdkError');

      await expect(() => service.findVenue(id)).rejects.toThrowError();

      expect(handleSdkErrorSpy).toHaveBeenCalledWith(mockError);
    });
  });

  describe('getVenueCreator', () => {
    it('should return the creator of the Venue', async () => {
      const venue = createMockConfidentialVenue();

      jest.spyOn(service, 'findVenue').mockResolvedValue(venue);

      const result = await service.getVenueCreator(id);

      expect(result).toEqual(expect.objectContaining({ did: 'SOME_OWNER' }));
    });
  });

  describe('createConfidentialVenue', () => {
    it('should create the Confidential Venue', async () => {
      const input = {
        signer,
      };
      const mockTransactions = {
        blockHash: '0x1',
        txHash: '0x2',
        blockNumber: new BigNumber(1),
        tag: TxTags.confidentialAsset.CreateVenue,
      };
      const mockTransaction = new MockTransaction(mockTransactions);
      const mockVenue = createMockConfidentialVenue();

      mockTransactionsService.submit.mockResolvedValue({
        result: mockVenue,
        transactions: [mockTransaction],
      });

      const result = await service.createConfidentialVenue(input);

      expect(result).toEqual({
        result: mockVenue,
        transactions: [mockTransaction],
      });
    });
  });

  describe('createConfidentialTransaction', () => {
    it('should call the addTransaction procedure in the venue where the transaction is to be created', async () => {
      const args = {
        legs: [
          {
            assets: ['SOME_CONFIDENTIAL_ASSET'],
            sender: 'SENDER_CONFIDENTIAL_ACCOUNT',
            receiver: 'RECEIVER_CONFIDENTIAL_ACCOUNT',
            auditors: [],
            mediators: [],
          },
        ],
        memo: 'SOME_MEMO',
      };

      const mockVenue = createMockConfidentialVenue();
      jest.spyOn(service, 'findVenue').mockResolvedValue(mockVenue);

      const mockTransactions = {
        blockHash: '0x1',
        txHash: '0x2',
        blockNumber: new BigNumber(1),
        tag: TxTags.confidentialAsset.AddTransaction,
      };

      const mockTransaction = new MockTransaction(mockTransactions);
      const mockConfidentialTransaction = createMockConfidentialTransaction();

      when(mockTransactionsService.submit)
        .calledWith(mockVenue.addTransaction, args, { signer, processMode: ProcessMode.Submit })
        .mockResolvedValue({
          result: mockConfidentialTransaction,
          transactions: [mockTransaction],
        });

      const result = await service.createConfidentialTransaction(new BigNumber(1), {
        signer,
        ...args,
      });

      expect(result).toEqual({
        result: mockConfidentialTransaction,
        transactions: [mockTransaction],
      });
    });
  });

  describe('observerAffirmLeg', () => {
    it('should call the affirmLeg procedure for the transaction being approved by Receiver/Mediator', async () => {
      const args = {
        legId: new BigNumber(0),
        party: ConfidentialAffirmParty.Receiver,
      } as ObserverAffirmConfidentialTransactionDto;

      const mockConfidentialTransaction = createMockConfidentialTransaction();
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConfidentialTransaction);

      const mockTransactions = {
        blockHash: '0x1',
        txHash: '0x2',
        blockNumber: new BigNumber(1),
        tag: TxTags.confidentialAsset.AffirmTransactions,
      };

      const mockTransaction = new MockTransaction(mockTransactions);

      when(mockTransactionsService.submit)
        .calledWith(mockConfidentialTransaction.affirmLeg, args, {
          signer,
          processMode: ProcessMode.Submit,
        })
        .mockResolvedValue({
          result: mockConfidentialTransaction,
          transactions: [mockTransaction],
        });

      const result = await service.observerAffirmLeg(new BigNumber(1), { ...args, signer });

      expect(result).toEqual({
        result: mockConfidentialTransaction,
        transactions: [mockTransaction],
      });
    });
  });

  describe('senderAffirmLeg', () => {
    let mockConfidentialTransaction: ConfidentialTransaction;
    let mockConfidentialTransactionModel: ConfidentialTransactionModel;
    let body: Omit<SenderAffirmConfidentialTransactionDto, keyof TransactionBaseDto>;
    let sender: ConfidentialAccount;

    beforeEach(() => {
      mockConfidentialTransaction = createMockConfidentialTransaction();
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConfidentialTransaction);

      mockConfidentialTransactionModel = new ConfidentialTransactionModel({
        id: new BigNumber(1),
        venueId: new BigNumber(1),
        createdAt: new BigNumber(100000),
        status: ConfidentialTransactionStatus.Pending,
        memo: 'Some transfer memo',
        legs: [
          {
            id: new BigNumber(0),
            sender: new ConfidentialAccountModel({ publicKey: 'SENDER_CONFIDENTIAL_ACCOUNT' }),
            receiver: new ConfidentialAccountModel({ publicKey: 'RECEIVER_CONFIDENTIAL_ACCOUNT' }),
            mediators: [],
            assetAuditors: [
              new ConfidentialAssetAuditorModel({
                asset: new ConfidentialAssetModel({ id: 'SOME_ASSET_ID' }),
                auditors: [
                  new ConfidentialAccountModel({ publicKey: 'AUDITOR_CONFIDENTIAL_ACCOUNT' }),
                ],
              }),
            ],
          },
        ],
      });

      jest
        .spyOn(confidentialTransactionsUtilModule, 'createConfidentialTransactionModel')
        .mockResolvedValue(mockConfidentialTransactionModel);

      body = {
        legId: new BigNumber(0),
        legAmounts: [
          {
            confidentialAsset: 'SOME_ASSET_ID',
            amount: new BigNumber(100),
          },
        ],
      };

      sender = createMockConfidentialAccount();
      when(mockConfidentialAccountsService.findOne)
        .calledWith('SENDER_CONFIDENTIAL_ACCOUNT')
        .mockResolvedValue(sender);

      when(mockConfidentialProofsService.generateSenderProof)
        .calledWith('SENDER_CONFIDENTIAL_ACCOUNT', {
          amount: new BigNumber(100),
          auditors: ['AUDITOR_CONFIDENTIAL_ACCOUNT'],
          receiver: 'RECEIVER_CONFIDENTIAL_ACCOUNT',
          encryptedBalance: '0x0ceabalance',
        })
        .mockResolvedValue('some_proof');
    });

    it('should throw an error for an invalid legId', () => {
      return expect(
        service.senderAffirmLeg(new BigNumber(1), { signer, ...body, legId: new BigNumber(10) })
      ).rejects.toThrow('Invalid leg ID received');
    });

    it('should throw an error if leg amounts has an invalid Asset ID', () => {
      return expect(
        service.senderAffirmLeg(new BigNumber(1), {
          signer,
          ...body,
          legAmounts: [
            {
              confidentialAsset: 'RANDOM_ASSET_ID',
              amount: new BigNumber(100),
            },
          ],
        })
      ).rejects.toThrow('Asset not found in the leg');
    });

    it('should call the affirmLeg procedure for the transaction being approved by Sender', async () => {
      const mockTransactions = {
        blockHash: '0x1',
        txHash: '0x2',
        blockNumber: new BigNumber(1),
        tag: TxTags.confidentialAsset.AffirmTransactions,
      };

      const mockTransaction = new MockTransaction(mockTransactions);

      when(mockTransactionsService.submit)
        .calledWith(
          mockConfidentialTransaction.affirmLeg,
          {
            legId: new BigNumber(0),
            party: ConfidentialAffirmParty.Sender,
            proofs: [
              {
                asset: 'SOME_ASSET_ID',
                proof: 'some_proof',
              },
            ],
          },
          { signer, processMode: ProcessMode.Submit }
        )
        .mockResolvedValue({
          result: mockConfidentialTransaction,
          transactions: [mockTransaction],
        });

      const result = await service.senderAffirmLeg(new BigNumber(1), { ...body, signer });

      expect(result).toEqual({
        result: mockConfidentialTransaction,
        transactions: [mockTransaction],
      });
    });
  });

  describe('rejectTransaction', () => {
    it('should call the reject procedure for the transaction being rejected', async () => {
      const mockConfidentialTransaction = createMockConfidentialTransaction();
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConfidentialTransaction);

      const mockTransactions = {
        blockHash: '0x1',
        txHash: '0x2',
        blockNumber: new BigNumber(1),
        tag: TxTags.confidentialAsset.RejectTransaction,
      };

      const mockTransaction = new MockTransaction(mockTransactions);

      when(mockTransactionsService.submit)
        .calledWith(
          mockConfidentialTransaction.reject,
          {},
          { signer, processMode: ProcessMode.Submit }
        )
        .mockResolvedValue({
          result: mockConfidentialTransaction,
          transactions: [mockTransaction],
        });

      const result = await service.rejectTransaction(new BigNumber(1), { signer });

      expect(result).toEqual({
        result: mockConfidentialTransaction,
        transactions: [mockTransaction],
      });
    });
  });

  describe('rejectTransaction', () => {
    it('should call the reject procedure for the transaction being rejected', async () => {
      const mockConfidentialTransaction = createMockConfidentialTransaction();
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConfidentialTransaction);

      const mockTransactions = {
        blockHash: '0x1',
        txHash: '0x2',
        blockNumber: new BigNumber(1),
        tag: TxTags.confidentialAsset.ExecuteTransaction,
      };

      const mockTransaction = new MockTransaction(mockTransactions);

      when(mockTransactionsService.submit)
        .calledWith(
          mockConfidentialTransaction.execute,
          {},
          { signer, processMode: ProcessMode.Submit }
        )
        .mockResolvedValue({
          result: mockConfidentialTransaction,
          transactions: [mockTransaction],
        });

      const result = await service.executeTransaction(new BigNumber(1), { signer });

      expect(result).toEqual({
        result: mockConfidentialTransaction,
        transactions: [mockTransaction],
      });
    });
  });

  describe('getInvolvedParties', () => {
    it('should return the involved parties in a transaction', async () => {
      const expectedResult = [createMockIdentity()];
      const mockConfidentialTransaction = createMockConfidentialTransaction();
      mockConfidentialTransaction.getInvolvedParties.mockResolvedValue(expectedResult);

      jest.spyOn(service, 'findOne').mockResolvedValue(mockConfidentialTransaction);

      const result = await service.getInvolvedParties(new BigNumber(1));

      expect(result).toEqual(expectedResult);
    });
  });

  describe('findVenuesByOwner', () => {
    it('should return the confidential venues for an identity', async () => {
      const mockIdentity = new MockIdentity();
      const mockConfidentialVenues = [createMockConfidentialVenue()];
      mockIdentity.getConfidentialVenues.mockResolvedValue(mockConfidentialVenues);
      mockIdentitiesService.findOne.mockResolvedValue(mockIdentity);

      const result = await service.findVenuesByOwner('SOME_DID');

      expect(result).toEqual(mockConfidentialVenues);
    });
  });

  describe('getPendingAffirmsCount', () => {
    it('should return the pending affirms count for a transaction', async () => {
      const expectedResult = new BigNumber(3);

      const mockConfidentialTransaction = createMockConfidentialTransaction();
      mockConfidentialTransaction.getPendingAffirmsCount.mockResolvedValue(expectedResult);

      jest.spyOn(service, 'findOne').mockResolvedValue(mockConfidentialTransaction);

      const result = await service.getPendingAffirmsCount(new BigNumber(1));

      expect(result).toEqual(expectedResult);
    });
  });

  describe('verifyTransactionAmounts', () => {
    const publicKey = '0x123';
    const assetId = 'someAssetId';
    const legId = new BigNumber(1);

    let mockConfidentialTransaction: DeepMocked<ConfidentialTransaction>;

    beforeEach(() => {
      mockConfidentialTransaction = createMockConfidentialTransaction();
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConfidentialTransaction);
    });

    it('should return results when the public key is an auditor for unproven legs', async () => {
      mockConfidentialTransaction.getProofDetails.mockResolvedValue({
        proved: [],
        pending: [
          {
            legId,
            sender: createMock<ConfidentialAccount>(),
            receiver: createMock<ConfidentialAccount>(),
            proofs: [
              {
                assetId,
                auditors: [createMock<ConfidentialAccount>({ publicKey })],
              },
            ],
          },
        ],
      });

      const result = await service.verifyTransactionAmounts(mockConfidentialTransaction.id, {
        publicKey,
      });

      expect(result).toEqual([
        {
          assetId,
          amount: null,
          legId,
          isAuditor: true,
          isProved: false,
          isReceiver: false,
          amountDecrypted: false,
          isValid: null,
          errMsg: null,
        },
      ]);
    });

    it('should return results when the public key is the receiver for unproven legs', async () => {
      mockConfidentialTransaction.getProofDetails.mockResolvedValue({
        proved: [],
        pending: [
          {
            legId,
            sender: createMock<ConfidentialAccount>(),
            receiver: createMock<ConfidentialAccount>({ publicKey }),
            proofs: [
              {
                assetId,
                auditors: [],
              },
            ],
          },
        ],
      });

      const result = await service.verifyTransactionAmounts(mockConfidentialTransaction.id, {
        publicKey,
      });

      expect(result).toEqual([
        {
          assetId,
          amount: null,
          legId,
          isAuditor: false,
          isProved: false,
          isReceiver: true,
          amountDecrypted: false,
          isValid: null,
          errMsg: null,
        },
      ]);
    });

    it('should return results when the public key is not an auditor for unproven legs', async () => {
      mockConfidentialTransaction.getProofDetails.mockResolvedValue({
        proved: [],
        pending: [
          {
            legId,
            sender: createMock<ConfidentialAccount>(),
            receiver: createMock<ConfidentialAccount>(),
            proofs: [
              {
                assetId,
                auditors: [createMockConfidentialAccount({ publicKey: 'someOtherKey' })],
              },
            ],
          },
        ],
      });

      const result = await service.verifyTransactionAmounts(mockConfidentialTransaction.id, {
        publicKey,
      });

      expect(result).toEqual([
        {
          assetId,
          amount: null,
          legId,
          isAuditor: false,
          isProved: false,
          isReceiver: false,
          amountDecrypted: false,
          isValid: null,
          errMsg: null,
        },
      ]);
    });

    it('should return results when the public key is an auditor for a proven legs', async () => {
      mockConfidentialTransaction.getProofDetails.mockResolvedValue({
        proved: [
          {
            legId,
            sender: createMock<ConfidentialAccount>(),
            receiver: createMock<ConfidentialAccount>(),
            proofs: [
              {
                assetId,
                proof: 'someProof',
                auditors: [createMock<ConfidentialAccount>({ publicKey })],
              },
            ],
          },
        ],
        pending: [],
      });

      mockConfidentialProofsService.verifySenderProofAsAuditor.mockResolvedValue({
        amount: new BigNumber(100),
        isValid: true,
        errMsg: null,
      });

      const result = await service.verifyTransactionAmounts(mockConfidentialTransaction.id, {
        publicKey,
      });

      expect(result).toEqual([
        {
          assetId,
          amount: new BigNumber(100),
          legId: new BigNumber(1),
          isAuditor: true,
          isProved: true,
          isReceiver: false,
          amountDecrypted: true,
          isValid: true,
          errMsg: null,
        },
      ]);
    });

    it('should return results when the public key is the receiver for a proven legs', async () => {
      mockConfidentialTransaction.getProofDetails.mockResolvedValue({
        proved: [
          {
            legId,
            sender: createMock<ConfidentialAccount>(),
            receiver: createMock<ConfidentialAccount>({ publicKey }),
            proofs: [
              {
                assetId,
                proof: 'someProof',
                auditors: [createMock<ConfidentialAccount>()],
              },
            ],
          },
        ],
        pending: [],
      });

      mockConfidentialProofsService.verifySenderProofAsReceiver.mockResolvedValue({
        amount: new BigNumber(100),
        isValid: true,
        errMsg: null,
      });

      const result = await service.verifyTransactionAmounts(mockConfidentialTransaction.id, {
        publicKey,
      });

      expect(result).toEqual([
        {
          assetId,
          amount: new BigNumber(100),
          legId: new BigNumber(1),
          isAuditor: false,
          isProved: true,
          isReceiver: true,
          amountDecrypted: true,
          isValid: true,
          errMsg: null,
        },
      ]);
    });

    it('should return results when the public key is not an auditor for a proven leg', async () => {
      mockConfidentialTransaction.getProofDetails.mockResolvedValue({
        proved: [
          {
            legId,
            sender: createMock<ConfidentialAccount>(),
            receiver: createMock<ConfidentialAccount>(),
            proofs: [
              {
                assetId,
                proof: 'someProof',
                auditors: [createMock<ConfidentialAccount>()],
              },
            ],
          },
        ],
        pending: [],
      });

      mockConfidentialProofsService.verifySenderProofAsAuditor.mockResolvedValue({
        amount: new BigNumber(100),
        isValid: true,
        errMsg: null,
      });

      const result = await service.verifyTransactionAmounts(mockConfidentialTransaction.id, {
        publicKey,
      });

      expect(result).toEqual([
        {
          assetId,
          amount: null,
          legId,
          isAuditor: false,
          isProved: true,
          isReceiver: false,
          amountDecrypted: false,
          isValid: null,
          errMsg: null,
        },
      ]);
    });

    it('should return results where auditor is only specified for some assets', async () => {
      const otherAssetId = 'otherAssetId';

      mockConfidentialTransaction.getProofDetails.mockResolvedValue({
        proved: [
          {
            legId,
            sender: createMock<ConfidentialAccount>(),
            receiver: createMock<ConfidentialAccount>(),
            proofs: [
              {
                assetId,
                proof: 'someProof',
                auditors: [createMock<ConfidentialAccount>({ publicKey })],
              },
              {
                assetId: otherAssetId,
                proof: 'otherProof',
                auditors: [createMock<ConfidentialAccount>()],
              },
            ],
          },
        ],
        pending: [
          {
            legId: new BigNumber(2),
            sender: createMock<ConfidentialAccount>(),
            receiver: createMock<ConfidentialAccount>(),
            proofs: [
              {
                assetId: otherAssetId,
                auditors: [createMock<ConfidentialAccount>({ publicKey })],
              },
            ],
          },
        ],
      });

      mockConfidentialProofsService.verifySenderProofAsAuditor.mockResolvedValue({
        amount: new BigNumber(100),
        isValid: true,
        errMsg: null,
      });

      const result = await service.verifyTransactionAmounts(mockConfidentialTransaction.id, {
        publicKey,
      });

      expect(result).toEqual(
        expect.arrayContaining([
          {
            assetId,
            amount: new BigNumber(100),
            legId,
            isAuditor: true,
            amountDecrypted: true,
            isReceiver: false,
            isProved: true,
            isValid: true,
            errMsg: null,
          },
          {
            assetId: otherAssetId,
            amount: null,
            legId: new BigNumber(1),
            isAuditor: false,
            isProved: true,
            amountDecrypted: false,
            isReceiver: false,
            isValid: null,
            errMsg: null,
          },
          {
            assetId: otherAssetId,
            amount: null,
            legId: new BigNumber(2),
            isAuditor: true,
            isProved: false,
            isReceiver: false,
            amountDecrypted: false,
            isValid: null,
            errMsg: null,
          },
        ])
      );
    });
  });

  describe('createdAt', () => {
    it('should return creation event details for a Confidential Transaction', async () => {
      const mockResult = {
        blockHash: 'someHash',
        eventIndex: new BigNumber(1),
        blockNumber: new BigNumber('2719172'),
        blockDate: new Date('2023-06-26T01:47:45.000Z'),
      };
      const transaction = createMockConfidentialTransaction();

      transaction.createdAt.mockResolvedValue(mockResult);

      jest.spyOn(service, 'findOne').mockResolvedValue(transaction);

      const result = await service.createdAt(new BigNumber(10));

      expect(result).toEqual(mockResult);
    });
  });
});

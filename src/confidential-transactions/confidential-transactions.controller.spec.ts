import { DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import {
  ConfidentialAffirmParty,
  ConfidentialTransaction,
  ConfidentialTransactionStatus,
} from '@polymeshassociation/polymesh-private-sdk/types';
import { when } from 'jest-when';

import { ConfidentialTransactionsController } from '~/confidential-transactions/confidential-transactions.controller';
import { ConfidentialTransactionsService } from '~/confidential-transactions/confidential-transactions.service';
import { ObserverAffirmConfidentialTransactionDto } from '~/confidential-transactions/dto/observer-affirm-confidential-transaction.dto';
import { ServiceReturn } from '~/polymesh-rest-api/src/common/utils/functions';
import { processedTxResult, testValues } from '~/test-utils/consts';
import {
  createMockConfidentialAccount,
  createMockConfidentialAsset,
  createMockConfidentialTransaction,
  createMockIdentity,
} from '~/test-utils/mocks';
import { mockConfidentialTransactionsServiceProvider } from '~/test-utils/service-mocks';

const { signer, txResult } = testValues;

describe('ConfidentialTransactionsController', () => {
  let controller: ConfidentialTransactionsController;
  let mockConfidentialTransactionsService: DeepMocked<ConfidentialTransactionsService>;
  const id = new BigNumber(1);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfidentialTransactionsController],
      providers: [mockConfidentialTransactionsServiceProvider],
    }).compile();

    mockConfidentialTransactionsService = module.get<typeof mockConfidentialTransactionsService>(
      ConfidentialTransactionsService
    );
    controller = module.get<ConfidentialTransactionsController>(ConfidentialTransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDetails', () => {
    it('should return the details of Confidential Transaction', async () => {
      const details = {
        status: ConfidentialTransactionStatus.Pending,
        createdAt: new BigNumber(100000),
        memo: 'SOME_MEMO',
        venueId: new BigNumber(1),
      };
      const mockLeg = {
        id: new BigNumber(0),
        sender: createMockConfidentialAccount({ publicKey: 'SENDER' }),
        receiver: createMockConfidentialAccount({ publicKey: 'RECEIVER' }),
        mediators: [createMockIdentity({ did: 'MEDIATOR' })],
        assetAuditors: [
          {
            asset: createMockConfidentialAsset({ id: 'SOME_ASSET_ID' }),
            auditors: [createMockConfidentialAccount({ publicKey: 'AUDITOR' })],
          },
        ],
      };
      const mockConfidentialTransaction = createMockConfidentialTransaction();

      mockConfidentialTransaction.details.mockResolvedValue(details);
      mockConfidentialTransaction.getLegs.mockResolvedValue([mockLeg]);

      mockConfidentialTransactionsService.findOne.mockResolvedValue(mockConfidentialTransaction);

      const result = await controller.getDetails({ id });

      const expectedLegs = [
        {
          id: mockLeg.id,
          sender: expect.objectContaining({ publicKey: 'SENDER' }),
          receiver: expect.objectContaining({ publicKey: 'RECEIVER' }),
          mediators: expect.arrayContaining([{ did: 'MEDIATOR' }]),
          assetAuditors: expect.arrayContaining([
            {
              asset: expect.objectContaining({ id: 'SOME_ASSET_ID' }),
              auditors: expect.arrayContaining([{ publicKey: 'AUDITOR' }]),
            },
          ]),
        },
      ];

      expect(result).toEqual({
        id,
        ...details,
        legs: expectedLegs,
      });
    });
  });

  describe('observerAffirmLeg', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
        legId: new BigNumber(0),
        party: ConfidentialAffirmParty.Receiver,
      } as ObserverAffirmConfidentialTransactionDto;

      const transactionId = new BigNumber(1);

      when(mockConfidentialTransactionsService.observerAffirmLeg)
        .calledWith(transactionId, input)
        .mockResolvedValue(txResult as unknown as ServiceReturn<ConfidentialTransaction>);

      const result = await controller.observerAffirmLeg({ id: transactionId }, input);
      expect(result).toEqual(processedTxResult);
    });
  });

  describe('rejectTransaction', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
      };

      const transactionId = new BigNumber(1);

      when(mockConfidentialTransactionsService.rejectTransaction)
        .calledWith(transactionId, input)
        .mockResolvedValue(txResult as unknown as ServiceReturn<ConfidentialTransaction>);

      const result = await controller.rejectConfidentialTransaction({ id: transactionId }, input);
      expect(result).toEqual(processedTxResult);
    });
  });

  describe('executeTransaction', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
      };

      const transactionId = new BigNumber(1);

      when(mockConfidentialTransactionsService.executeTransaction)
        .calledWith(transactionId, input)
        .mockResolvedValue(txResult as unknown as ServiceReturn<ConfidentialTransaction>);

      const result = await controller.executeConfidentialTransaction({ id: transactionId }, input);
      expect(result).toEqual(processedTxResult);
    });
  });

  describe('getInvolvedParties', () => {
    it('should call the service and return the result', async () => {
      const transactionId = new BigNumber(1);
      when(mockConfidentialTransactionsService.getInvolvedParties)
        .calledWith(transactionId)
        .mockResolvedValue([createMockIdentity({ did: 'INVOLVED_PARTY_DID' })]);

      const result = await controller.getInvolvedParties({ id: transactionId });

      expect(result).toEqual([
        expect.objectContaining({
          did: 'INVOLVED_PARTY_DID',
        }),
      ]);
    });
  });

  describe('getPendingAffirmsCount', () => {
    it('should call the service and return the result', async () => {
      const transactionId = new BigNumber(1);
      when(mockConfidentialTransactionsService.getPendingAffirmsCount)
        .calledWith(transactionId)
        .mockResolvedValue(new BigNumber(3));

      const result = await controller.getPendingAffirmsCount({ id: transactionId });

      expect(result).toEqual(3);
    });
  });
});

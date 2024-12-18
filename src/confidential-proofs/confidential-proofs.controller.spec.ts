import { DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import {
  ConfidentialAffirmParty,
  ConfidentialAsset,
  ConfidentialTransaction,
} from '@polymeshassociation/polymesh-private-sdk/types';
import { when } from 'jest-when';

import { ConfidentialAccountModel } from '~/confidential-accounts/models/confidential-account.model';
import { ConfidentialAssetsService } from '~/confidential-assets/confidential-assets.service';
import { ConfidentialProofsController } from '~/confidential-proofs/confidential-proofs.controller';
import { ConfidentialProofsService } from '~/confidential-proofs/confidential-proofs.service';
import { ConfidentialAccountEntity } from '~/confidential-proofs/entities/confidential-account.entity';
import { SenderAffirmationModel } from '~/confidential-proofs/models/sender-affirmation.model';
import { ConfidentialTransactionsService } from '~/confidential-transactions/confidential-transactions.service';
import { VerifyAndAffirmDto } from '~/confidential-transactions/dto/verify-and-affirm.dto';
import { ServiceReturn } from '~/polymesh-rest-api/src/common/utils/functions';
import { processedTxResult, testValues, txResult } from '~/test-utils/consts';
import {
  mockConfidentialAssetsServiceProvider,
  mockConfidentialProofsServiceProvider,
  mockConfidentialTransactionsServiceProvider,
} from '~/test-utils/service-mocks';

const { signer } = testValues;

describe('ConfidentialProofsController', () => {
  let controller: ConfidentialProofsController;
  let mockConfidentialProofsService: DeepMocked<ConfidentialProofsService>;
  let mockConfidentialTransactionsService: DeepMocked<ConfidentialTransactionsService>;
  let mockConfidentialAssetsService: DeepMocked<ConfidentialAssetsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfidentialProofsController],
      providers: [
        mockConfidentialProofsServiceProvider,
        mockConfidentialTransactionsServiceProvider,
        mockConfidentialAssetsServiceProvider,
      ],
    }).compile();

    mockConfidentialProofsService =
      module.get<typeof mockConfidentialProofsService>(ConfidentialProofsService);
    mockConfidentialTransactionsService = module.get<typeof mockConfidentialTransactionsService>(
      ConfidentialTransactionsService
    );
    mockConfidentialAssetsService =
      module.get<typeof mockConfidentialAssetsService>(ConfidentialAssetsService);
    controller = module.get<ConfidentialProofsController>(ConfidentialProofsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAccounts', () => {
    it('should get the owner of a Confidential Account', async () => {
      when(mockConfidentialProofsService.getConfidentialAccounts)
        .calledWith()
        .mockResolvedValue([
          {
            confidentialAccount: 'SOME_PUBLIC_KEY',
          } as ConfidentialAccountEntity,
        ]);

      const result = await controller.getAccounts();

      expect(result).toEqual([new ConfidentialAccountModel({ publicKey: 'SOME_PUBLIC_KEY' })]);
    });
  });

  describe('createAccount', () => {
    it('should call the service and return the results', async () => {
      const mockAccount = {
        confidentialAccount: 'SOME_PUBLIC_KEY',
      };

      mockConfidentialProofsService.createConfidentialAccount.mockResolvedValue(
        mockAccount as unknown as ConfidentialAccountEntity
      );

      const result = await controller.createAccount();

      expect(result).toEqual(new ConfidentialAccountModel({ publicKey: 'SOME_PUBLIC_KEY' }));
    });
  });

  describe('senderAffirmLeg', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
        legId: new BigNumber(0),
        legAmounts: [
          {
            confidentialAsset: 'SOME_ASSET_ID',
            amount: new BigNumber(100),
          },
        ],
      };

      const transactionId = new BigNumber(1);

      when(mockConfidentialTransactionsService.senderAffirmLeg)
        .calledWith(transactionId, input)
        .mockResolvedValue({
          result: txResult as unknown as Awaited<ServiceReturn<ConfidentialTransaction>>,
          proofs: [{ asset: 'someId', proof: 'someProof' }],
        });

      const result = await controller.senderAffirmLeg({ id: transactionId }, input);
      expect(result).toEqual(
        new SenderAffirmationModel({
          ...processedTxResult,
          proofs: [{ asset: 'someId', proof: 'someProof' }],
        })
      );
    });
  });

  describe('verifySenderProofAsAuditor', () => {
    it('should call the service and return the results', async () => {
      const mockResponse = {
        isValid: true,
        amount: new BigNumber(10),
        errMsg: null,
      };

      mockConfidentialProofsService.verifySenderProofAsAuditor.mockResolvedValue(mockResponse);

      const result = await controller.verifySenderProofAsAuditor(
        { confidentialAccount: 'SOME_PUBLIC_KEY' },
        {
          amount: new BigNumber(10),
          auditorId: new BigNumber(1),
          senderProof: '0xproof',
        }
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('verifySenderProofAsReceiver', () => {
    it('should call the service and return the results', async () => {
      const mockResponse = {
        isValid: true,
        amount: new BigNumber(10),
        errMsg: null,
      };

      mockConfidentialProofsService.verifySenderProofAsReceiver.mockResolvedValue(mockResponse);

      const result = await controller.verifySenderProofAsReceiver(
        { confidentialAccount: 'SOME_PUBLIC_KEY' },
        {
          amount: new BigNumber(10),
          senderProof: '0xproof',
        }
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('decryptBalance', () => {
    it('should call the service and return the results', async () => {
      const mockResponse = {
        value: new BigNumber(10),
      };

      mockConfidentialProofsService.decryptBalance.mockResolvedValue(mockResponse);

      const result = await controller.decryptBalance(
        { confidentialAccount: 'SOME_PUBLIC_KEY' },
        {
          encryptedValue: '0xsomebalance',
        }
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('burnConfidentialAsset', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
        amount: new BigNumber(1),
        confidentialAccount: 'SOME_PUBLIC_KEY',
      };

      const confidentialAssetId = 'SOME_ASSET_ID';

      when(mockConfidentialAssetsService.burnConfidentialAsset)
        .calledWith(confidentialAssetId, input)
        .mockResolvedValue(txResult as unknown as ServiceReturn<ConfidentialAsset>);

      const result = await controller.burnConfidentialAsset({ confidentialAssetId }, input);
      expect(result).toEqual(processedTxResult);
    });
  });

  describe('auditorVerifyTransaction', () => {
    it('should call the service and return the results', async () => {
      const input = {
        publicKey: 'SOME_PUBLIC_KEY',
      };
      const id = new BigNumber(1);

      when(mockConfidentialTransactionsService.verifyTransactionAmounts)
        .calledWith(id, input)
        .mockResolvedValue([]);

      const result = await controller.verifyAmounts({ id }, input);
      expect(result).toEqual({ verifications: [] });
    });
  });

  describe('verifyAndAffirmLeg', () => {
    it('should call the service and return the results', async () => {
      const input: VerifyAndAffirmDto = {
        publicKey: 'SOME_PUBLIC_KEY',
        legId: new BigNumber(0),
        expectedAmounts: [],
        party: ConfidentialAffirmParty.Receiver,
      };
      const id = new BigNumber(1);

      when(mockConfidentialTransactionsService.verifyAndAffirmLeg)
        .calledWith(id, input)
        .mockResolvedValue(txResult as unknown as ServiceReturn<ConfidentialTransaction>);

      const result = await controller.verifyAndAffirmLeg({ id }, input);

      expect(result).toEqual(processedTxResult);
    });
  });
});

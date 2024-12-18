import { DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import {
  ConfidentialAsset,
  ConfidentialAssetDetails,
  TxTags,
} from '@polymeshassociation/polymesh-private-sdk/types';
import { when } from 'jest-when';

import { ConfidentialAssetsController } from '~/confidential-assets/confidential-assets.controller';
import { ConfidentialAssetsService } from '~/confidential-assets/confidential-assets.service';
import { CreatedConfidentialAssetModel } from '~/confidential-assets/models/created-confidential-asset.model';
import { ServiceReturn } from '~/polymesh-rest-api/src/common/utils/functions';
import { getMockTransaction, processedTxResult, testValues } from '~/test-utils/consts';
import {
  createMockConfidentialAccount,
  createMockConfidentialAsset,
  createMockConfidentialVenue,
  createMockIdentity,
  createMockTransactionResult,
} from '~/test-utils/mocks';
import { mockConfidentialAssetsServiceProvider } from '~/test-utils/service-mocks';

const { signer, txResult } = testValues;

describe('ConfidentialAssetsController', () => {
  let controller: ConfidentialAssetsController;
  let mockConfidentialAssetsService: DeepMocked<ConfidentialAssetsService>;
  const id = '76702175-d8cb-e3a5-5a19-734433351e25';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfidentialAssetsController],
      providers: [mockConfidentialAssetsServiceProvider],
    }).compile();

    mockConfidentialAssetsService =
      module.get<typeof mockConfidentialAssetsService>(ConfidentialAssetsService);
    controller = module.get<ConfidentialAssetsController>(ConfidentialAssetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDetails', () => {
    it('should return the details', async () => {
      const mockAssetDetails = {
        data: 'SOME_DATA',
        owner: {
          did: 'SOME_DID',
        },
        totalSupply: new BigNumber(1),
      } as ConfidentialAssetDetails;
      const mockAuditorInfo = {
        auditors: [createMockConfidentialAccount({ publicKey: 'SOME_AUDITOR' })],
        mediators: [createMockIdentity({ did: 'MEDIATOR_DID' })],
      };
      const mockConfidentialAsset = createMockConfidentialAsset();

      mockConfidentialAsset.details.mockResolvedValue(mockAssetDetails);
      mockConfidentialAsset.getAuditors.mockResolvedValue(mockAuditorInfo);
      mockConfidentialAsset.isFrozen.mockResolvedValue(false);

      mockConfidentialAssetsService.findOne.mockResolvedValue(mockConfidentialAsset);

      const result = await controller.getDetails({ confidentialAssetId: id });

      expect(result).toEqual({
        ...mockAssetDetails,
        isFrozen: false,
        auditors: expect.arrayContaining([expect.objectContaining({ publicKey: 'SOME_AUDITOR' })]),
        mediators: expect.arrayContaining([expect.objectContaining({ did: 'MEDIATOR_DID' })]),
      });
    });
  });

  describe('createConfidentialAsset', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
        data: 'SOME_DATA',
        auditors: ['SOME_PUBLIC_KEY'],
        mediators: [],
      };

      const mockConfidentialAsset = createMockConfidentialAsset();
      const transaction = getMockTransaction(TxTags.confidentialAsset.CreateAsset);

      const testTxResult = createMockTransactionResult<ConfidentialAsset>({
        ...txResult,
        transactions: [transaction],
        result: mockConfidentialAsset,
      });

      when(mockConfidentialAssetsService.createConfidentialAsset)
        .calledWith(input)
        .mockResolvedValue(testTxResult);

      const result = await controller.createConfidentialAsset(input);
      expect(result).toEqual(
        new CreatedConfidentialAssetModel({
          ...processedTxResult,
          transactions: [transaction],
          confidentialAsset: mockConfidentialAsset,
        })
      );
    });
  });

  describe('issueConfidentialAsset', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
        amount: new BigNumber(1000),
        confidentialAccount: 'SOME_PUBLIC_KEY',
      };
      mockConfidentialAssetsService.issue.mockResolvedValue(
        txResult as unknown as ServiceReturn<ConfidentialAsset>
      );

      const result = await controller.issueConfidentialAsset({ confidentialAssetId: id }, input);
      expect(result).toEqual(processedTxResult);
    });
  });

  describe('getVenueFilteringDetails', () => {
    it('should return the venue filtering details for a Confidential Asset', async () => {
      mockConfidentialAssetsService.getVenueFilteringDetails.mockResolvedValueOnce({
        enabled: false,
      });

      let result = await controller.getVenueFilteringDetails({ confidentialAssetId: id });

      expect(result).toEqual(expect.objectContaining({ enabled: false }));

      mockConfidentialAssetsService.getVenueFilteringDetails.mockResolvedValueOnce({
        enabled: true,
        allowedConfidentialVenues: [createMockConfidentialVenue({ id: new BigNumber(1) })],
      });

      result = await controller.getVenueFilteringDetails({ confidentialAssetId: id });

      expect(result).toEqual(
        expect.objectContaining({
          enabled: true,
          allowedConfidentialVenues: expect.arrayContaining([{ id: new BigNumber(1) }]),
        })
      );
    });
  });

  describe('toggleConfidentialVenueFiltering', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
        enabled: true,
      };
      mockConfidentialAssetsService.setVenueFilteringDetails.mockResolvedValue(
        txResult as unknown as ServiceReturn<void>
      );

      const result = await controller.toggleConfidentialVenueFiltering(
        { confidentialAssetId: id },
        input
      );
      expect(result).toEqual(processedTxResult);
    });
  });

  describe('addAllowedVenues and removeAllowedVenues', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
        confidentialVenues: [new BigNumber(1)],
      };
      mockConfidentialAssetsService.setVenueFilteringDetails.mockResolvedValue(
        txResult as unknown as ServiceReturn<void>
      );

      let result = await controller.addAllowedVenues({ confidentialAssetId: id }, input);
      expect(result).toEqual(processedTxResult);

      result = await controller.removeAllowedVenues({ confidentialAssetId: id }, input);
      expect(result).toEqual(processedTxResult);
    });
  });

  describe('freezeConfidentialAsset and unfreezeConfidentialAsset', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
      };
      mockConfidentialAssetsService.toggleFreezeConfidentialAsset.mockResolvedValue(
        txResult as unknown as ServiceReturn<void>
      );

      let result = await controller.freezeConfidentialAsset({ confidentialAssetId: id }, input);
      expect(result).toEqual(processedTxResult);

      result = await controller.unfreezeConfidentialAsset({ confidentialAssetId: id }, input);
      expect(result).toEqual(processedTxResult);
    });
  });

  describe('freezeConfidentialAccount and unfreezeConfidentialAccount', () => {
    it('should call the service and return the results', async () => {
      const input = {
        signer,
        confidentialAccount: 'SOME_PUBLIC_KEY',
      };
      mockConfidentialAssetsService.toggleFreezeConfidentialAccountAsset.mockResolvedValue(
        txResult as unknown as ServiceReturn<void>
      );

      let result = await controller.freezeConfidentialAccount({ confidentialAssetId: id }, input);
      expect(result).toEqual(processedTxResult);

      result = await controller.unfreezeConfidentialAccount({ confidentialAssetId: id }, input);
      expect(result).toEqual(processedTxResult);
    });
  });

  describe('isConfidentialAccountFrozen', () => {
    it('should call the service and return the results', async () => {
      mockConfidentialAssetsService.isConfidentialAccountFrozen.mockResolvedValue(true);

      const result = await controller.isConfidentialAccountFrozen({
        confidentialAssetId: 'SOME_ASSET_ID',
        confidentialAccount: 'SOME_PUBLIC_KEY',
      });
      expect(result).toEqual(true);
    });
  });
});

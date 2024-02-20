import { Injectable } from '@nestjs/common';
import {
  ConfidentialAsset,
  ConfidentialVenueFilteringDetails,
} from '@polymeshassociation/polymesh-sdk/types';

import { extractTxBase, ServiceReturn } from '~/common/utils';
import { CreateConfidentialAssetDto } from '~/confidential-assets/dto/create-confidential-asset.dto';
import { IssueConfidentialAssetDto } from '~/confidential-assets/dto/issue-confidential-asset.dto';
import { PolymeshService } from '~/polymesh/polymesh.service';
import { TransactionsService } from '~/transactions/transactions.service';
import { handleSdkError } from '~/transactions/transactions.util';

@Injectable()
export class ConfidentialAssetsService {
  constructor(
    private readonly polymeshService: PolymeshService,
    private readonly transactionsService: TransactionsService
  ) {}

  public async findOne(id: string): Promise<ConfidentialAsset> {
    return await this.polymeshService.polymeshApi.confidentialAssets
      .getConfidentialAsset({ id })
      .catch(error => {
        throw handleSdkError(error);
      });
  }

  public async findOneByTicker(ticker: string): Promise<ConfidentialAsset> {
    return await this.polymeshService.polymeshApi.confidentialAssets
      .getConfidentialAssetFromTicker({ ticker })
      .catch(error => {
        throw handleSdkError(error);
      });
  }

  public async createConfidentialAsset(
    params: CreateConfidentialAssetDto
  ): ServiceReturn<ConfidentialAsset> {
    const { base, args } = extractTxBase(params);

    const createConfidentialAsset =
      this.polymeshService.polymeshApi.confidentialAssets.createConfidentialAsset;
    return this.transactionsService.submit(createConfidentialAsset, args, base);
  }

  public async issue(
    assetId: string,
    params: IssueConfidentialAssetDto
  ): ServiceReturn<ConfidentialAsset> {
    const { base, args } = extractTxBase(params);
    const asset = await this.findOne(assetId);

    return this.transactionsService.submit(asset.issue, args, base);
  }

  public async getVenueFilteringDetails(
    assetId: string
  ): Promise<ConfidentialVenueFilteringDetails> {
    const asset = await this.findOne(assetId);

    return asset.getVenueFilteringDetails();
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { BigNumber } from '@polymathnetwork/polymesh-sdk';
import {
  Asset,
  AssetDocument,
  ErrorCode,
  IdentityBalance,
  ResultSet,
} from '@polymathnetwork/polymesh-sdk/types';
import { isPolymeshError } from '@polymathnetwork/polymesh-sdk/utils';

import { CreateAssetDto } from '~/assets/dto/create-asset.dto';
import { IssueDto } from '~/assets/dto/issue.dto';
import { processQueue, QueueResult } from '~/common/utils';
import { PolymeshService } from '~/polymesh/polymesh.service';
import { RelayerAccountsService } from '~/relayer-accounts/relayer-accounts.service';

@Injectable()
export class AssetsService {
  constructor(
    private readonly polymeshService: PolymeshService,
    private readonly relayerAccountsService: RelayerAccountsService
  ) {}

  public async findOne(ticker: string): Promise<Asset> {
    try {
      return await this.polymeshService.polymeshApi.assets.getAsset({ ticker });
    } catch (err: unknown) {
      if (isPolymeshError(err)) {
        const { code, message } = err;
        if (
          code === ErrorCode.DataUnavailable &&
          message.startsWith('There is no Asset with ticker')
        ) {
          throw new NotFoundException(`There is no Asset with ticker "${ticker}"`);
        }
      }

      throw err;
    }
  }

  public async findAllByOwner(owner: string): Promise<Asset[]> {
    const {
      polymeshService: { polymeshApi },
    } = this;
    const isDidValid = await polymeshApi.identities.isIdentityValid({ identity: owner });

    if (!isDidValid) {
      throw new NotFoundException(`There is no identity with DID ${owner}`);
    }

    return polymeshApi.assets.getAssets({ owner });
  }

  public async findHolders(
    ticker: string,
    size: BigNumber,
    start?: string
  ): Promise<ResultSet<IdentityBalance>> {
    const asset = await this.findOne(ticker);
    return asset.assetHolders.get({ size, start });
  }

  public async findDocuments(
    ticker: string,
    size: BigNumber,
    start?: string
  ): Promise<ResultSet<AssetDocument>> {
    const asset = await this.findOne(ticker);
    return asset.documents.get({ size, start });
  }

  public async createAsset(params: CreateAssetDto): Promise<QueueResult<Asset>> {
    const { signer, ...rest } = params;
    const address = this.relayerAccountsService.findAddressByDid(signer);
    const createAsset = this.polymeshService.polymeshApi.assets.createAsset;
    return processQueue(createAsset, rest, { signer: address });
  }

  public async issue(ticker: string, params: IssueDto): Promise<QueueResult<Asset>> {
    const { signer, ...rest } = params;
    const asset = await this.findOne(ticker);
    const address = this.relayerAccountsService.findAddressByDid(signer);
    return processQueue(asset.issuance.issue, rest, { signer: address });
  }
}

import { Injectable } from '@nestjs/common';
import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import {
  AddConfidentialTransactionParams,
  AffirmConfidentialTransactionParams,
  ConfidentialAffirmParty,
  ConfidentialTransaction,
  ConfidentialVenue,
  EventIdentifier,
  Identity,
} from '@polymeshassociation/polymesh-private-sdk/types';

import { ConfidentialAccountsService } from '~/confidential-accounts/confidential-accounts.service';
import { ConfidentialProofsService } from '~/confidential-proofs/confidential-proofs.service';
import { AuditorVerifySenderProofDto } from '~/confidential-proofs/dto/auditor-verify-sender-proof.dto';
import { VerifyTransactionAmountsDto } from '~/confidential-proofs/dto/auditor-verify-transaction.dto';
import { ReceiverVerifySenderProofDto } from '~/confidential-proofs/dto/receiver-verify-sender-proof.dto';
import { AuditorVerifyProofModel } from '~/confidential-proofs/models/auditor-verify-proof.model';
import { createConfidentialTransactionModel } from '~/confidential-transactions/confidential-transactions.util';
import { CreateConfidentialTransactionDto } from '~/confidential-transactions/dto/create-confidential-transaction.dto';
import { ObserverAffirmConfidentialTransactionDto } from '~/confidential-transactions/dto/observer-affirm-confidential-transaction.dto';
import { SenderAffirmConfidentialTransactionDto } from '~/confidential-transactions/dto/sender-affirm-confidential-transaction.dto';
import { ExtendedIdentitiesService } from '~/extended-identities/identities.service';
import { PolymeshService } from '~/polymesh/polymesh.service';
import { TransactionBaseDto } from '~/polymesh-rest-api/src/common/dto/transaction-base-dto';
import { AppValidationError } from '~/polymesh-rest-api/src/common/errors';
import { extractTxOptions, ServiceReturn } from '~/polymesh-rest-api/src/common/utils/functions';
import { TransactionsService } from '~/transactions/transactions.service';
import { handleSdkError } from '~/transactions/transactions.util';

@Injectable()
export class ConfidentialTransactionsService {
  constructor(
    private readonly polymeshService: PolymeshService,
    private readonly transactionsService: TransactionsService,
    private readonly confidentialAccountsService: ConfidentialAccountsService,
    private readonly confidentialProofsService: ConfidentialProofsService,
    private readonly extendedIdentitiesService: ExtendedIdentitiesService
  ) {}

  public async findOne(id: BigNumber): Promise<ConfidentialTransaction> {
    return await this.polymeshService.polymeshApi.confidentialSettlements
      .getTransaction({ id })
      .catch(error => {
        throw handleSdkError(error, { id: id.toString(), resource: 'Confidential Transaction' });
      });
  }

  public async findVenue(id: BigNumber): Promise<ConfidentialVenue> {
    return await this.polymeshService.polymeshApi.confidentialSettlements
      .getVenue({ id })
      .catch(error => {
        throw handleSdkError(error);
      });
  }

  public async getVenueCreator(id: BigNumber): Promise<Identity> {
    const venue = await this.findVenue(id);
    return venue.creator();
  }

  public async createConfidentialVenue(
    baseParams: TransactionBaseDto
  ): ServiceReturn<ConfidentialVenue> {
    const { options } = extractTxOptions(baseParams);
    const createVenue = this.polymeshService.polymeshApi.confidentialSettlements.createVenue;
    return this.transactionsService.submit(createVenue, {}, options);
  }

  public async createConfidentialTransaction(
    venueId: BigNumber,
    createConfidentialTransactionDto: CreateConfidentialTransactionDto
  ): ServiceReturn<ConfidentialTransaction> {
    const venue = await this.findVenue(venueId);

    const { options, args } = extractTxOptions(createConfidentialTransactionDto);

    return this.transactionsService.submit(
      venue.addTransaction,
      args as AddConfidentialTransactionParams,
      options
    );
  }

  public async observerAffirmLeg(
    transactionId: BigNumber,
    body: ObserverAffirmConfidentialTransactionDto
  ): ServiceReturn<ConfidentialTransaction> {
    const transaction = await this.findOne(transactionId);

    const { options, args } = extractTxOptions(body);

    return this.transactionsService.submit(
      transaction.affirmLeg,
      args as AffirmConfidentialTransactionParams,
      options
    );
  }

  public async senderAffirmLeg(
    transactionId: BigNumber,
    body: SenderAffirmConfidentialTransactionDto
  ): ServiceReturn<ConfidentialTransaction> {
    const tx = await this.findOne(transactionId);

    const transaction = await createConfidentialTransactionModel(tx);

    const { options, args } = extractTxOptions(body);

    const { legId, legAmounts } = args as SenderAffirmConfidentialTransactionDto;

    if (legId.gte(transaction.legs.length)) {
      throw new AppValidationError('Invalid leg ID received');
    }

    const { receiver, sender, assetAuditors } = transaction.legs[legId.toNumber()];

    const senderConfidentialAccount = await this.confidentialAccountsService.findOne(
      sender.publicKey
    );

    const proofs = [];

    for (const legAmount of legAmounts) {
      const { amount, confidentialAsset } = legAmount;
      const assetAuditor = assetAuditors.find(({ asset }) => asset.id === confidentialAsset);

      if (!assetAuditor) {
        throw new AppValidationError('Asset not found in the leg');
      }

      const encryptedBalance = await senderConfidentialAccount.getBalance({
        asset: confidentialAsset,
      });

      const proof = await this.confidentialProofsService.generateSenderProof(sender.publicKey, {
        amount,
        auditors: assetAuditor.auditors.map(({ publicKey }) => publicKey),
        receiver: receiver.publicKey,
        encryptedBalance,
      });

      proofs.push({ asset: confidentialAsset, proof });
    }

    return this.transactionsService.submit(
      tx.affirmLeg,
      {
        legId,
        party: ConfidentialAffirmParty.Sender,
        proofs,
      },
      options
    );
  }

  public async rejectTransaction(
    transactionId: BigNumber,
    base: TransactionBaseDto
  ): ServiceReturn<ConfidentialTransaction> {
    const { options } = extractTxOptions(base);
    const transaction = await this.findOne(transactionId);

    return this.transactionsService.submit(transaction.reject, {}, options);
  }

  public async executeTransaction(
    transactionId: BigNumber,
    base: TransactionBaseDto
  ): ServiceReturn<ConfidentialTransaction> {
    const { options } = extractTxOptions(base);
    const transaction = await this.findOne(transactionId);

    return this.transactionsService.submit(transaction.execute, {}, options);
  }

  public async getInvolvedParties(transactionId: BigNumber): Promise<Identity[]> {
    const transaction = await this.findOne(transactionId);

    return transaction.getInvolvedParties();
  }

  public async findVenuesByOwner(did: string): Promise<ConfidentialVenue[]> {
    const identity = await this.extendedIdentitiesService.findOne(did);

    return identity.getConfidentialVenues();
  }

  public async getPendingAffirmsCount(transactionId: BigNumber): Promise<BigNumber> {
    const transaction = await this.findOne(transactionId);

    return transaction.getPendingAffirmsCount();
  }

  /**
   * Given an ElGamal public key this method decrypts all asset amounts with the corresponding private key
   */
  public async verifyTransactionAmounts(
    transactionId: BigNumber,
    params: VerifyTransactionAmountsDto
  ): Promise<AuditorVerifyProofModel[]> {
    const transaction = await this.findOne(transactionId);
    const { proved, pending } = await transaction.getProofDetails();
    const publicKey = params.publicKey;

    const response: AuditorVerifyProofModel[] = [];

    pending.forEach(value => {
      let isReceiver = false;
      if (value.receiver.publicKey === publicKey) {
        isReceiver = true;
      }

      value.proofs.forEach(assetProof => {
        const isAuditor = assetProof.auditors.map(auditor => auditor.publicKey).includes(publicKey);

        response.push({
          isProved: false,
          isAuditor,
          isReceiver,
          amountDecrypted: false,
          legId: value.legId,
          assetId: assetProof.assetId,
          amount: null,
          isValid: null,
          errMsg: null,
        });
      });
    });

    const auditorRequests: {
      confidentialAccount: string;
      params: AuditorVerifySenderProofDto;
      trackers: { legId: BigNumber; assetId: string };
    }[] = [];

    const receiverRequests: {
      confidentialAccount: string;
      params: ReceiverVerifySenderProofDto;
      trackers: { legId: BigNumber; assetId: string; isAuditor: boolean };
    }[] = [];

    proved.forEach(value => {
      let isReceiver = false;
      if (value.receiver.publicKey === publicKey) {
        isReceiver = true;
      }

      value.proofs.forEach(assetProof => {
        const auditorIndex = assetProof.auditors.findIndex(
          auditorKey => auditorKey.publicKey === publicKey
        );

        const isAuditor = auditorIndex >= 0;

        if (isReceiver) {
          receiverRequests.push({
            confidentialAccount: publicKey,
            params: {
              senderProof: assetProof.proof,
              amount: null,
            },
            trackers: { assetId: assetProof.assetId, legId: value.legId, isAuditor },
          });
        } else if (isAuditor) {
          auditorRequests.push({
            confidentialAccount: publicKey,
            params: {
              senderProof: assetProof.proof,
              auditorId: new BigNumber(auditorIndex),
              amount: null,
            },
            trackers: { assetId: assetProof.assetId, legId: value.legId },
          });
        } else {
          response.push({
            isProved: true,
            isAuditor: false,
            isReceiver: false,
            amountDecrypted: false,
            legId: value.legId,
            assetId: assetProof.assetId,
            amount: null,
            isValid: null,
            errMsg: null,
          });
        }
      });
    });

    const auditorResponses = await Promise.all(
      auditorRequests.map(async ({ confidentialAccount, params: proofParams, trackers }) => {
        const proofResponse = await this.confidentialProofsService.verifySenderProofAsAuditor(
          confidentialAccount,
          proofParams
        );

        return {
          proofResponse,
          trackers,
        };
      })
    );

    const receiverResponses = await Promise.all(
      receiverRequests.map(async ({ confidentialAccount, params: proofParams, trackers }) => {
        const proofResponse = await this.confidentialProofsService.verifySenderProofAsReceiver(
          confidentialAccount,
          proofParams
        );

        return {
          proofResponse,
          trackers,
        };
      })
    );

    auditorResponses.forEach(({ proofResponse, trackers: { assetId, legId } }) => {
      response.push({
        isProved: true,
        isAuditor: true,
        isReceiver: false,
        amountDecrypted: true,
        amount: proofResponse.amount,
        assetId,
        legId,
        errMsg: proofResponse.errMsg,
        isValid: proofResponse.isValid,
      });
    });

    receiverResponses.forEach(({ proofResponse, trackers: { assetId, legId, isAuditor } }) => {
      response.push({
        isProved: true,
        isAuditor,
        isReceiver: true,
        amountDecrypted: true,
        amount: proofResponse.amount,
        assetId,
        legId,
        errMsg: proofResponse.errMsg,
        isValid: proofResponse.isValid,
      });
    });

    return response.sort((a, b) => a.legId.minus(b.legId).toNumber());
  }

  public async createdAt(id: BigNumber): Promise<EventIdentifier | null> {
    const transaction = await this.findOne(id);

    return transaction.createdAt();
  }
}

import { BigNumber } from '@polymeshassociation/polymesh-private-sdk';
import {
  ConfidentialProcedureMethod,
  ErrorCode,
  Fees,
  GenericPolymeshTransaction,
  MultiSigProposal,
  NoArgsProcedureMethod,
  PayingAccountType,
  ProcedureOpts,
  TransactionPayload,
  TransactionStatus,
} from '@polymeshassociation/polymesh-private-sdk/types';
import {
  isPolymeshError,
  isPolymeshTransaction,
  isPolymeshTransactionBatch,
} from '@polymeshassociation/polymesh-private-sdk/utils';

import { TransactionOptionsDto } from '~/polymesh-rest-api/src/common/dto/transaction-options.dto';
import {
  AppError,
  AppInternalError,
  AppNotFoundError,
  AppUnauthorizedError,
  AppUnprocessableError,
  AppValidationError,
  isAppError,
} from '~/polymesh-rest-api/src/common/errors';
import { BatchTransactionModel } from '~/polymesh-rest-api/src/common/models/batch-transaction.model';
import { TransactionModel } from '~/polymesh-rest-api/src/common/models/transaction.model';
import { ProcessMode } from '~/polymesh-rest-api/src/common/types';
import { ResultType } from '~/polymesh-rest-api/src/transactions/types';

export type TransactionDetails = {
  status: TransactionStatus;
  fees: Fees;
  supportsSubsidy: boolean;
  payingAccount: {
    type: PayingAccountType;
    address: string;
    balance: BigNumber;
  };
};

export interface MultiSigProposalResult {
  result: MultiSigProposal;
  resultType: ResultType.MultiSigProposal;
  transactions: (TransactionModel | BatchTransactionModel)[];
  details: TransactionDetails;
}

export type DirectTransactionResult<T> = {
  result: T;
  resultType: ResultType.Direct;
  transactions: (TransactionModel | BatchTransactionModel)[];
  details: TransactionDetails;
};

export type TransactionResult<T> = DirectTransactionResult<T> | MultiSigProposalResult;

export type TransactionPayloadResult = {
  details: TransactionDetails;
  transactionPayload: TransactionPayload;
};

type WithArgsProcedureMethod<T> = T extends NoArgsProcedureMethod<unknown, unknown> ? never : T;

export type Method<M, R, T> = WithArgsProcedureMethod<ConfidentialProcedureMethod<M, R, T>>;

/**
 * a helper function to handle when procedures have args and those without args
 */
export async function prepareProcedure<MethodArgs, ReturnType, TransformedReturnType = ReturnType>(
  method: Method<MethodArgs, ReturnType, TransformedReturnType>,
  args: MethodArgs,
  opts: ProcedureOpts
): Promise<GenericPolymeshTransaction<ReturnType, TransformedReturnType>> {
  try {
    if (method.length === 0) {
      return await method(opts as MethodArgs);
    } else {
      return await method(args, opts);
    }
  } catch (error) {
    throw handleSdkError(error);
  }
}

export async function processTransaction<
  MethodArgs,
  ReturnType,
  TransformedReturnType = ReturnType
>(
  method: Method<MethodArgs, ReturnType, TransformedReturnType>,
  args: MethodArgs,
  opts: ProcedureOpts,
  transactionOptions: TransactionOptionsDto
): Promise<TransactionResult<TransformedReturnType> | TransactionPayloadResult> {
  const { processMode, metadata } = transactionOptions;

  try {
    const procedure = await prepareProcedure(method, args, opts);

    const supportsSubsidy = procedure.supportsSubsidy();

    const [totalFees, result] = await Promise.all([
      procedure.getTotalFees(),
      processMode === 'submit' ? procedure.run() : ({} as TransformedReturnType),
    ]);

    const {
      fees,
      payingAccountData: { balance, type, account },
    } = totalFees;

    const details: TransactionDetails = {
      status: procedure.status,
      fees,
      supportsSubsidy,
      payingAccount: {
        balance,
        type,
        address: account.address,
      },
    };

    if (processMode === ProcessMode.DryRun) {
      if (procedure.multiSig) {
        const multiSigAddress = procedure.multiSig.address;

        return {
          details,
          // provide a fake proposal entity
          result: { toHuman: () => ({ multiSigAddress, id: '-1' }) } as unknown as MultiSigProposal,
          resultType: ResultType.MultiSigProposal,
          transactions: [],
        };
      } else {
        return {
          details,
          result: {} as TransformedReturnType,
          resultType: ResultType.Direct,
          transactions: [],
        };
      }
    }

    if (processMode === ProcessMode.Offline) {
      const transactionPayload = await procedure.toSignablePayload(metadata);
      return { details, transactionPayload };
    }

    const assembleTransactionResponse = <T, R = T>(
      transaction: GenericPolymeshTransaction<T, R>
    ): TransactionModel | BatchTransactionModel => {
      let tagDetails;
      if (isPolymeshTransaction(transaction)) {
        const { tag } = transaction;
        tagDetails = { transactionTag: tag };
      } else if (isPolymeshTransactionBatch(transaction)) {
        const { transactions } = transaction;
        tagDetails = {
          transactionTags: transactions.map(({ tag }) => tag),
        };
      } else {
        throw new AppInternalError(
          'Unsupported transaction details received. Please report this issue to the Polymesh team'
        );
      }
      const { blockHash, txHash, blockNumber } = transaction;
      const constructorParams = {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        blockHash: blockHash!,
        transactionHash: txHash!,
        blockNumber: blockNumber!,
        ...tagDetails,
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
      };

      if ('transactionTag' in constructorParams) {
        return new TransactionModel(constructorParams);
      }
      return new BatchTransactionModel(constructorParams);
    };

    return {
      result,
      resultType: ResultType.Direct,
      transactions: [assembleTransactionResponse(procedure)],
      details,
    };
  } catch (err) {
    throw handleSdkError(err);
  }
}

export function handleSdkError(err: unknown, args?: { id: string; resource: string }): AppError {
  if (isAppError(err)) {
    // don't transform App level errors
    return err;
  }

  if (isPolymeshError(err)) {
    const { message, code } = err;

    // catch address not present error from the signing manager
    if (
      code === ErrorCode.General &&
      message.includes('not part of the Signing Manager attached to the SDK')
    ) {
      throw new AppValidationError(message);
    }

    switch (code) {
      case ErrorCode.NoDataChange:
      case ErrorCode.ValidationError:
      case ErrorCode.EntityInUse:
        return new AppValidationError(message);
      case ErrorCode.InsufficientBalance:
      case ErrorCode.UnmetPrerequisite:
      case ErrorCode.LimitExceeded:
        return new AppUnprocessableError(message);
      case ErrorCode.DataUnavailable:
        if (args) {
          return new AppNotFoundError(args.id, args.resource);
        }
        return new AppNotFoundError(message, '');
      case ErrorCode.NotAuthorized:
        return new AppUnauthorizedError(message);
      default:
        return new AppInternalError(message);
    }
  }

  if (err instanceof Error) {
    return new AppInternalError(err.message);
  }

  return new AppInternalError('An unexpected error occurred');
}

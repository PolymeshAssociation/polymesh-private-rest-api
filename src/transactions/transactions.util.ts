import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import {
  ErrorCode,
  Fees,
  GenericPolymeshTransaction,
  NoArgsProcedureMethod,
  PayingAccountType,
  ProcedureMethod,
  ProcedureOpts,
  TransactionStatus,
} from '@polymeshassociation/polymesh-sdk/types';
import {
  isPolymeshError,
  isPolymeshTransaction,
  isPolymeshTransactionBatch,
} from '@polymeshassociation/polymesh-sdk/utils';

import {
  AppError,
  AppInternalError,
  AppNotFoundError,
  AppUnprocessableError,
  AppValidationError,
  isAppError,
} from '~/common/errors';
import { BatchTransactionModel } from '~/common/models/batch-transaction.model';
import { TransactionModel } from '~/common/models/transaction.model';

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

export type TransactionResult<T> = {
  result: T;
  transactions: (TransactionModel | BatchTransactionModel)[];
  details: TransactionDetails;
};

type WithArgsProcedureMethod<T> = T extends NoArgsProcedureMethod<unknown, unknown> ? never : T;

export type Method<M, R, T> = WithArgsProcedureMethod<ProcedureMethod<M, R, T>>;

/**
 * a helper function to handle when procedures have args and those without args
 */
export async function prepareProcedure<MethodArgs, ReturnType, TransformedReturnType = ReturnType>(
  method: Method<MethodArgs, ReturnType, TransformedReturnType>,
  args: MethodArgs,
  opts: ProcedureOpts
): Promise<GenericPolymeshTransaction<ReturnType, TransformedReturnType>> {
  try {
    if (!args || Object.keys(args).length === 0) {
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
  dryRun = false
): Promise<TransactionResult<TransformedReturnType>> {
  try {
    const procedure = await prepareProcedure(method, args, opts);

    const supportsSubsidy = procedure.supportsSubsidy();

    const [totalFees, result] = await Promise.all([
      procedure.getTotalFees(),
      dryRun ? ({} as TransformedReturnType) : procedure.run(),
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

    if (dryRun) {
      return { details, result, transactions: [] };
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
        throw new Error(
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
      transactions: [assembleTransactionResponse(procedure)],
      details,
    };
  } catch (err) {
    throw handleSdkError(err);
  }
}

export function handleSdkError(err: unknown): AppError {
  if (isAppError(err)) {
    // don't transform App level errors
    return err;
  }

  if (isPolymeshError(err)) {
    const { message, code } = err;
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
        return new AppNotFoundError(message, '');
      default:
        return new AppInternalError(message);
    }
  }

  if (err instanceof Error) {
    return new AppInternalError(err.message);
  }

  return new AppInternalError('An unexpected error occurred');
}

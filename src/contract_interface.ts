import { nat } from '@oxheadalpha/fa2-interfaces';
import {
  ContractAbstraction,
  ContractMethod,
  ContractProvider
} from '@taquito/taquito';
import { mutez } from './utils';

export type ChangeFeeParam = {
  old_fee: mutez;
  new_fee: mutez;
};

export interface ExchangeAdminContract {
  withdrawFees: () => ContractMethod<ContractProvider>;
  changeFee: (param: ChangeFeeParam) => ContractMethod<ContractProvider>;
}

export interface MinterContract {
  mint: (expected_fee: mutez) => ContractMethod<ContractProvider>;
  burn: (ntokens: nat) => ContractMethod<ContractProvider>;
}

export const ExchangeAdmin = (
  contract: ContractAbstraction<ContractProvider>
): ExchangeAdminContract => ({
  withdrawFees: () => contract.methods.withdraw_fees(),
  changeFee: (param: ChangeFeeParam) => contract.methods.change_fee(param)
});

export const Minter = (
  contract: ContractAbstraction<ContractProvider>
): MinterContract => ({
  mint: (expected_fee: mutez) => contract.methods.mint(expected_fee),
  burn: (ntokens: nat) => contract.methods.burn(ntokens)
});

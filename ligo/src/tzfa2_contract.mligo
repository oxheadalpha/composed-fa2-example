#include "base_ft_contract.mligo"

type tzfa2_storage = {
  asset : asset_storage;
  fee_percent : nat;
  collected_fees: tez;
}


type burn_param = {
  fee_percent: nat;
  tokens : nat;
}

type change_fee_param = {
  old_fee_percent : nat;
  new_fee_percent : nat;
}

type tzfa2_entrypoints =
  | Mint of nat (* accepts desired exchange fee percent *)
  | Burn of burn_param
  | Change_fee of change_fee_param
  | Withdraw_fees (* the admin withdraws collected fees *)

type tzfa2_main_entrypoint =
  | Asset of asset_entrypoints
  | Tzfa2 of tzfa2_entrypoints

[@inline]
let assert_fee (expected_fee, current_fee : nat * nat) : unit =
  if expected_fee <> current_fee
  then failwith "UNEXPECTED_FEE"
  else unit

let withdraw_fees (storage : tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let new_s = { storage with collected_fees = 0mutez; } in
  let callback : unit contract option =
    Tezos.get_contract_opt Tezos.sender in
  let op = match callback with
  | Some c -> Tezos.transaction unit storage.collected_fees c
  | None -> (failwith "NO_CALLBACK" : operation)
  in
  [op], new_s

let change_fee (param, storage : change_fee_param * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let _ = assert_fee (storage.fee_percent, param.old_fee_percent) in
  let new_s = { storage with fee_percent = param.new_fee_percent; } in
  ([] : operation list), new_s

let custom_entrypoints (param, storage : tzfa2_entrypoints * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  match param with
  | Mint _fee ->
    let _ = fail_if_paused storage.asset.admin in
    let _ = fail_if_not_minter storage.asset in
    ([] : operation list), storage

  | Burn _p ->
    let _ = fail_if_paused storage.asset.admin in
    let _ = fail_if_not_minter storage.asset in
    ([] : operation list), storage

  | Change_fee p ->
    let _ = fail_if_not_admin storage.asset.admin in
    change_fee (p, storage)
    
  | Withdraw_fees ->
    let _ = fail_if_not_admin storage.asset.admin in
    withdraw_fees storage

let tzfa2_main (param, storage: tzfa2_main_entrypoint * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  match param with
  | Asset asset ->
    (* dispatch call to the generated contract main function implementation *)
    let ops, new_asset = asset_main (asset, storage.asset) in
    let new_s = { storage with asset = new_asset } in
    (ops, new_s)
  | Tzfa2 tzfa2_param  -> custom_entrypoints (tzfa2_param, storage)
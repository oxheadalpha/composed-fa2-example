#include "base_ft_contract.mligo"
#include "../fa2_lib/fa2/fa2_errors.mligo"

type tzfa2_storage = {
  asset : asset_storage;
  fee : tez;
  collected_fees: tez;
}

type change_fee_param =
[@layout:comb]
{
  old_fee : tez;
  new_fee : tez;
}

type tzfa2_entrypoints =
  | Mint of tez (* param is expected exchange fee *)
  | Burn of nat (* param is the number of tokens to burn *)
  | Change_fee of change_fee_param
  | Withdraw_fees (* the admin withdraws collected fees *)

type tzfa2_main_entrypoint =
  | Asset of asset_entrypoints
  | Tzfa2 of tzfa2_entrypoints

[@inline]
let assert_fee (expected_fee, current_fee : tez * tez) : unit =
  if expected_fee <> current_fee
  then failwith "UNEXPECTED_FEE"
  else unit

let mint (expected_fee, storage : tez * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let _ = assert_fee (expected_fee, storage.fee) in
  let tz : tez option = (Tezos.get_amount ()) - expected_fee in
  let ntokens : nat = match tz with
  | None -> (failwith "INSUFFICIENT_AMOUNT" : nat)
  | Some tz -> tz / 1mutez
  in

  let sender = Tezos.get_sender () in
  let new_ledger = FungibleToken.inc_balance
    (sender, ntokens, storage.asset.assets.ledger) in
  let new_supply = storage.asset.assets.total_supply + ntokens in
  let new_assets : Token.storage = { storage.asset.assets with
    ledger = new_ledger;
    total_supply = new_supply;
  } in 
  let new_s = { storage with 
    collected_fees = storage.collected_fees + storage.fee;
    asset.assets = new_assets;
  } in
  ([] : operation list), new_s

let burn (ntokens, storage : nat * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let _ = assert_fee ((Tezos.get_amount ()), storage.fee) in

  let sender = Tezos.get_sender () in
  let new_ledger = FungibleToken.dec_balance
      (sender, ntokens, storage.asset.assets.ledger) in
  let new_supply_opt = is_nat (storage.asset.assets.total_supply - ntokens) in
  let new_supply = match  new_supply_opt with
  | Some s -> s
  | None -> (failwith fa2_insufficient_balance : nat)
  in

  let new_assets : Token.storage = { storage.asset.assets with
    ledger = new_ledger;
    total_supply = new_supply;
  } in 

  let new_s = { storage with 
    collected_fees = storage.collected_fees + storage.fee;
    asset.assets = new_assets;
  } in

  let callback : unit contract option = Tezos.get_contract_opt sender in
  let op = match callback with
  | Some c -> Tezos.transaction unit (ntokens * 1mutez) c
  | None -> (failwith "NO_CALLBACK" : operation)
  in
  [op], new_s

let withdraw_fees (storage : tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let new_s = { storage with collected_fees = 0mutez; } in
  let callback : unit contract option =
    Tezos.get_contract_opt (Tezos.get_sender ()) in
  let op = match callback with
  | Some c -> Tezos.transaction unit storage.collected_fees c
  | None -> (failwith "NO_CALLBACK" : operation)
  in
  [op], new_s

let change_fee (param, storage : change_fee_param * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  let _ = assert_fee (storage.fee, param.old_fee) in
  let new_s = { storage with fee = param.new_fee; } in
  ([] : operation list), new_s

let custom_entrypoints (param, storage : tzfa2_entrypoints * tzfa2_storage)
    : (operation list) * tzfa2_storage =
  match param with
  | Mint expected_fee ->
    let _ = Admin.fail_if_paused storage.asset.admin in
    let _ = fail_if_not_minter storage.asset in
    mint (expected_fee, storage)

  | Burn ntokens ->
    let _ = Admin.fail_if_paused storage.asset.admin in
    let _ = fail_if_not_minter storage.asset in
    burn (ntokens, storage)

  | Change_fee p ->
    let _ = Admin.fail_if_not_admin storage.asset.admin in
    change_fee (p, storage)
    
  | Withdraw_fees ->
    let _ = Admin.fail_if_not_admin storage.asset.admin in
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
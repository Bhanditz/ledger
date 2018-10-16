
/* MAPPING From the Current Production API TO THE NEW LEDGER
*
* PS: Today a Collective has just a balance, but after this migration
* each Collective will have wallets, and those wallets will be the ones with balances
* Which means that the migration won't be accurate
*** FromWalletId proposition: We can try to create and reuse the wallets from a combination
*   of the "FromCollectiveId" and "PaymentMethodId"("FromCollectiveId_PaymentMethodId")
*** ToWalletId: in this case it's harder trying to "guess" what would be a good combination
*   as there is not even a Payment Method of the "CollectiveId" Field, so for now I will
*   try just to create/reuse the combination of the "CollectiveId" Field with a simple
*   suffix "_Wallet"('CollectiveId_Wallet')

select t."FromCollectiveId" as "FromAccountId", t."FromCollectiveId" || '_' || t."PaymentMethodId" as "FromWalletId", t."CollectiveId" as "ToAccountId", t."CollectiveId" || '_Wallet' as "ToWalletId", t.amount, t.currency, t."amountInHostCurrency" as "destinationAmount", t."hostCurrency" as "destinationCurrency", t."hostFeeInHostCurrency" as "walletProviderFee", t."HostCollectiveId" as "walletProviderAccountId", t."HostCollectiveId" || '_' || t."PaymentMethodId" as "walletProviderWalletId", t."platformFeeInHostCurrency" as "platformFee", t."paymentProcessorFeeInHostCurrency" as "paymentProviderFee", p.service as "paymentProviderAccountId", p.service as "paymentProviderWalletId", t.id as "LegacyTransactionId" from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE "TransactionGroup"='9d7ad496-55c3-4934-8472-780c152ade88' and t.type='CREDIT';

--  #. FromAccountId, FromWalletId, ToAccountId, ToWalletId, amount, currency, transactionGroupTotalAmount, transactionGroupTotalAmountInDestinationCurrency,  category                               
-- #1   10506          10506_8960.    stripe       stripe      751    GBP              751                                1000                                Conversion
-- #2   stripe          stripe        10506      10506_8960.   1000   USD              751                                1000                                Conversion
-- #3   10506          10506_8960.    8974        8974_Wallet  1000   USD              751                                1000                                Acc2Acc
-- #4   10506          10506_8960.    platform    platform     38     GBP              751                                1000                                Platform fee
-- #5   10506          10506_8960.    stripe      stripe       31     GBP              751                                1000                                paymentp fee
-- #6   10506          10506_8960.    8975        8975_8960    38     GBP              751                                1000                                walletP fee
-- Where t is Transactions table and p is PaymentMethods table
*/
export const mapping = Object.freeze({
    FromAccountId: 'FromCollectiveId',
    FromWalletId: 'FromCollectiveId_PaymentMethodId',
    ToAccountId: 'CollectiveId',
    ToWalletId: 'CollectiveId_Wallet', // We should THINK more on how we are going to set this field up(There is no similar thing in the current production API)
    amount: 'amount',
    currency: 'currency',
    destinationAmount: 'amountInHostCurrency', // ONLY for FOREX transactions(currency != hostCurrency)
    destinationCurrency: 'hostCurrency', // ONLY for FOREX transactions(currency != hostCurrency)
    walletProviderFee: 'hostFeeInHostCurrency',
    walletProviderAccountId: 'HostCollectiveId',
    walletProviderWalletId: 'HostCollectiveId_PaymentMethodId',
    platformFee: 'platformFeeInHostCurrency',
    paymentProviderFee: 'paymentProcessorFeeInHostCurrency',
    paymentProviderAccountId: 'p.service',
    paymentProviderWalletId: 'p.service_p.type',
    LegacyTransactionId: 'id',
});

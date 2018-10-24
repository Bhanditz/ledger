
# migration query

```sql
select 
    t.id, t."FromCollectiveId", t."CollectiveId", t."amountInHostCurrency", t."hostCurrency", t.amount, t.currency, t."hostFeeInHostCurrency",
    t."platformFeeInHostCurrency",t."paymentProcessorFeeInHostCurrency", t."PaymentMethodId", t."HostCollectiveId", t."ExpenseId", t."OrderId",
    f.slug as "fromCollectiveSlug",
    c.slug as "collectiveSlug",
    h.slug as "hostCollectiveSlug",
    p.service as "paymentMethodService", 
    p.type as "paymentMethodType",
    pmc.id as "paymentMethodCollectiveId",
    pmc.slug as "paymentMethodCollectiveSlug",
    ofc.id as "orderFromCollectiveId", 
    ofc.slug as "orderFromCollectiveSlug",
    opmc.id as "orderPaymentMethodCollectiveId",
    opmc.slug as "orderPaymentMethodCollectiveSlug",
    e."UserId" as "expenseUserId", 
    e."CollectiveId" as "expenseCollectiveId", 
    e."payoutMethod" as "expensePayoutMethod",
    ec.slug as "expenseCollectiveSlug",
    eu."paypalEmail" as "expenseUserPaypalEmail",
    euc.slug as "expenseUserCollectiveSlug"
    from "Transactions" t 
    left join "Collectives" f on t."FromCollectiveId" =f.id
    left join "Collectives" c on t."CollectiveId" =c.id
    left join "Collectives" h on t."HostCollectiveId" =h.id
    left join "PaymentMethods" p on t."PaymentMethodId"=p.id
    left join "Collectives" pmc on p."CollectiveId" =pmc.id
    left join "Expenses" e on t."ExpenseId" =e.id
    left join "Collectives" ec on e."CollectiveId"=ec.id
    left join "Users" eu on e."UserId"=eu.id
    left join "Collectives" euc on eu."CollectiveId"=euc.id
    left join "Orders" o on t."OrderId"=o.id
    left join "Collectives" ofc on o."FromCollectiveId"=ofc.id
    left join "PaymentMethods" opm on o."PaymentMethodId"=opm.id
    left join "Collectives" opmc on opm."CollectiveId"=opmc.id
WHERE t.type='CREDIT' and t."deletedAt" is null 
order by t.id desc;
```


```js
const test = `
select 
    t.id, t."FromCollectiveId", t."CollectiveId", t."amountInHostCurrency", t."hostCurrency", t.amount, t.currency, t."hostFeeInHostCurrency",
    t."platformFeeInHostCurrency",t."paymentProcessorFeeInHostCurrency", t."PaymentMethodId", t."HostCollectiveId", t."ExpenseId", t."OrderId",
    f.slug as "fromCollectiveSlug",
    c.slug as "collectiveSlug",
    h.slug as "hostCollectiveSlug",
    p.service as "paymentMethodService", 
    p.type as "paymentMethodType",
    pmc.id as "paymentMethodCollectiveId",
    pmc.slug as "paymentMethodCollectiveSlug",
    ofc.id as "orderFromCollectiveId", 
    ofc.slug as "orderFromCollectiveSlug",
    opmc.id as "orderPaymentMethodCollectiveId",
    opmc.slug as "orderPaymentMethodCollectiveSlug",
    e."UserId" as "expenseUserId", 
    e."CollectiveId" as "expenseCollectiveId", 
    e."payoutMethod" as "expensePayoutMethod",
    ec.slug as "expenseCollectiveSlug",
    eu."paypalEmail" as "expenseUserPaypalEmail",
    euc.slug as "expenseUserCollectiveSlug"
    from "Transactions" t 
    left join "Collectives" f on t."FromCollectiveId" =f.id
    left join "Collectives" c on t."CollectiveId" =c.id
    left join "Collectives" h on t."HostCollectiveId" =h.id
    left join "PaymentMethods" p on t."PaymentMethodId"=p.id
    left join "Collectives" pmc on p."CollectiveId" =pmc.id
    left join "Expenses" e on t."ExpenseId" =e.id
    left join "Collectives" ec on e."CollectiveId"=ec.id
    left join "Users" eu on e."UserId"=eu.id
    left join "Collectives" euc on eu."CollectiveId"=euc.id
    left join "Orders" o on t."OrderId"=o.id
    left join "Collectives" ofc on o."FromCollectiveId"=ofc.id
    left join "PaymentMethods" opm on o."PaymentMethodId"=opm.id
    left join "Collectives" opmc on opm."CollectiveId"=opmc.id
WHERE t.type='CREDIT' and t."deletedAt" is null and t."ExpenseId" is not null
order by t.id desc;
`;

t.id, t."FromCollectiveId", t."CollectiveId", t."amountInHostCurrency", t."hostCurrency", t.amount, t.currency, t."hostFeeInHostCurrency", t."platformFeeInHostCurrency",t."paymentProcessorFeeInHostCurrency", t."PaymentMethodId", t."HostCollectiveId", t."ExpenseId", t."OrderId",  

transaction.id, // NO JOIN
transaction.FromCollectiveId, // NO JOIN
transaction.CollectiveId, // NO JOIN
transaction.amountInHostCurrency, // NO JOIN
transaction.hostCurrency, // NO JOIN
transaction.amount, // NO JOIN
transaction.currency, // NO JOIN
transaction.hostFeeInHostCurrency, // NO JOIN
transaction.platformFeeInHostCurrency, // NO JOIN
transaction.paymentProcessorFeeInHostCurrency, // NO JOIN        
transaction.PaymentMethodId, // NO JOIN
transaction.HostCollectiveId, // NO JOIN
transaction.ExpenseId,  // NO JOIN
transaction.OrderId,  // NO JOIN
transaction.fromCollectiveSlug // left join collectives f
transaction.collectiveSlug, // left join collectives c
transaction.hostCollectiveSlug, // left join collectives h
transaction.paymentMethodService // left join paymentmethods
transaction.paymentMethodType // left join paymentmethods
transaction.paymentMethodCollectiveSlug // left join paymentmethods left join collectives
transaction.paymentMethodCollectiveId // left join paymentmethods left join collectives
transaction.orderPaymentMethodCollectiveSlug // left join orders left join paymentMethods          
transaction.expensePayoutMethod // left join expenses
transaction.expenseUserPaypalEmail // left join expenses left join users
transaction.expenseUserCollectiveSlug // left join expenses left join users left join collectives
      
      
```

# Queries to fix on the legacy DB

We will list all cases we've found along the migration which we've concluded we will need to update the current database(the production one).

## 1. look for all payment methods that have service but don't have type and fix them manually

We've found Payment methods(table `PaymentMethods`) that have a service(for example `stripe`) but don't have a type, when they should.

- Query to find all Payment methods without type.
```sql
select * from "PaymentMethods" where service is not null and type is null;
```    
- Selecting distinct services, we see the we have the services `paypal` and `stripe` with *types* null.
```sql
  select distinct(service) from "PaymentMethods" where service is not null and type is null;
```

Paypal
-

If we compare the field `PaymentMethods.data` on the different types found(*adaptive*, *payment* and *null* ) for MOST(not all cases) cases we have this "average" result for the `data` field:

- type **adaptive**

```sql
select data from "PaymentMethods" where service='paypal' and type='adaptive'; -- 372 rows
-- data field result: 
-- {"response":{"responseEnvelope":{"timestamp":"2017-06-26T03:33:15.693-07:00","ack":"Success","correlationId":"59c59b8f7d355","build":"34789162"},"approved":"true","cancelUrl":"https://opencollective.com/talkwellington-host/settings/?paypalApprovalStatus=cancel","curPayments":"0","curPaymentsAmount":"0.00","curPeriodAttempts":"0","currencyCode":"USD","dateOfMonth":"0","dayOfWeek":"NO_DAY_SPECIFIED","endingDate":"2018-06-26T10:19:56.000Z","maxAmountPerPayment":"2000.00","maxTotalAmountOfAllPayments":"2000.00","paymentPeriod":"NO_PERIOD_SPECIFIED","pinType":"NOT_REQUIRED","returnUrl":"https://opencollective.com/talkwellington-host/settings/?paypalApprovalStatus=success&preapprovalKey=${preapprovalKey}","senderEmail":"talkwellington@gmail.com","startingDate":"2017-06-26T10:19:56.000Z","status":"ACTIVE","feesPayer":"SENDER","displayMaxTotalAmount":"false","sender":{"accountId":"GWVUUK85FEWAS"},"httpStatusCode":200}}
```    

- type **payment**

```sql
select data from "PaymentMethods" where service='paypal' and type='payment'; -- 337 rows
-- data field result:
-- {"paymentToken":"EC-8CL94348111527147","orderID":"EC-8CL94348111527147","payerID":"3HWTHZTDAMAJU","paymentID":"PAY-52H80579U6930915XLMXKG6I","intent":"sale","returnUrl":"https://opencollective.com/?paymentId=PAY-52H80579U6930915XLMXKG6I&token=EC-8CL94348111527147&PayerID=3HWTHZTDAMAJU"}
```

- type **null**

```sql
select data from "PaymentMethods" where service='paypal' and type is null; -- 209 rows
-- data field result:
-- {"redirect":"https://opencollective.com/foundation/collectives/expenses","response":{"responseEnvelope":{"timestamp":"2018-02-09T09:18:53.036-08:00","ack":"Success","correlationId":"f0314bead9987","build":"42045853"},"approved":"true","cancelUrl":"https://api.opencollective.com/connected-accounts/paypal/callback?paypalApprovalStatus=error&preapprovalKey=${preapprovalKey}","curPayments":"0","curPaymentsAmount":"0.00","curPeriodAttempts":"0","currencyCode":"USD","dateOfMonth":"0","dayOfWeek":"NO_DAY_SPECIFIED","endingDate":"2019-02-09T17:18:29.000Z","maxAmountPerPayment":"2000.00","maxTotalAmountOfAllPayments":"2000.00","paymentPeriod":"NO_PERIOD_SPECIFIED","pinType":"NOT_REQUIRED","returnUrl":"https://api.opencollective.com/connected-accounts/paypal/callback?paypalApprovalStatus=success&preapprovalKey=${preapprovalKey}","senderEmail":"host+c3@opencollective.org","startingDate":"2018-02-09T17:18:29.000Z","status":"ACTIVE","feesPayer":"SENDER","displayMaxTotalAmount":"false","sender":{"accountId":"L64767V76TYBQ"},"httpStatusCode":200}}
```

Analyzing all data types, we can see that other than the field `data.redirect` in **null** types, both **null** and **adaptive** data are quite similar so I would recommend updating all rows with **null** type to become **adaptive** type with the following query:

```sql
update "PaymentMethods" set type='adaptive' where service='paypal' and type is null;
```

Stripe
-

We only have one Payment Method(Id 9082) with service `stripe` and type *NULL*. and through the data field of this payment method we can clearly see it was supposed to be a `creditcard` type:

```json
{"fullName":"XXX","expMonth":X,"expYear":XXXX,"brand":"MasterCard","country":"RU"}
```

to solve this a simple update will get the job done:

```sql
update "PaymentMethods" set type='creditcard' where service='stripe' and type is null;
```


## 2. Transactions with HostCollectiveId null

When the field `HostCollectiveId` is *null*, we either have an `ExpenseId` or an `OrderId`.

### HostCollectiveId null but has ExpenseId

This happens in most cases


```sql
-- HostCollectiveId is null and/or hostCurrency is null(first id(DESC by id) it shows up is 99531) 
-- most of cases: Paying expenses and users dont have host sometimes FromWalletId Paypal account of host, ToWalletId create a new wallet based on paypal
    select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."HostCollectiveId" is null and t."deletedAt" is null and t.type='CREDIT'  order by t.id DESC; -- 4320
-- if there is expenseId look for paymentmethod inside expense and look for paypal email
select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."ExpenseId" is not null and t."HostCollectiveId" is null and t."deletedAt" is null and t.type='CREDIT'  order by t.id DESC; -- 4315
-- OrderId is not null - We do have PaymentMethodId here so simpler to create wallet..
select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."OrderId" is not null and t."HostCollectiveId" is null and t."deletedAt" is null and t.type='CREDIT'  order by t.id DESC;
-- OrderId is null - 3 Docker tx manually fix it.
select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."OrderId" is not null and t."HostCollectiveId"  is null and t."PaymentMethodId" is null and t."deletedAt" is null and t.type='CREDIT'  order by t.id DESC;

```


## Other cases

```sql

-- 1. PaymentMethodId is null 
  select * from "Transactions" t WHERE "PaymentMethodId" is null and t."deletedAt" is null and t.type='CREDIT' order by t.id DESC ;
   -- EITHER when people marking expenses as paid, no pmid but has ExpenseId
    select * from "Transactions" t WHERE "PaymentMethodId" is null and t."ExpenseId" is not null and t."deletedAt" is null and t.type='CREDIT' order by t.id DESC ; -- total 2131 rows
   -- OR when adding funds, no pmid but has OrderId
   select * from "Transactions" t WHERE "PaymentMethodId" is null and t."OrderId" is not null and t."deletedAt" is null and t.type='CREDIT' order by t.id DESC ; -- 736
   
-- 2. PaymentMethods table has service(stripe) defined but does NOT have type creditcard(NULL) defined
   -- all txs - look for all payment methods that don't have a type through a query or script
   select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."PaymentMethodId" is not NULL and p.type is NULL;
   -- if we do select distinct(p.service) we will figure out that only the PMs with service paypal or stripe show this problem
   -- paypal txs 
   select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."PaymentMethodId" is not NULL and p.type is NULL and p.service='paypal' and t.type='CREDIT';
   -- stripe txs
   select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."PaymentMethodId" is not NULL and p.type is NULL and p.service='stripe' and t.type='CREDIT';
   
-- 3. FromCollectiveId is null(first id(DESC by id) it shows up is 100784)
   select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."FromCollectiveId" is null and t."deletedAt" is not null and t.type='CREDIT' order by t.id DESC;
   
-- 4. HostCollectiveId is null and/or hostCurrency is null(first id(DESC by id) it shows up is 99531) 
   -- most of cases: Paying expenses and users dont have host sometimes FromWalletId Paypal account of host, ToWalletId create a new wallet based on paypal
      select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."HostCollectiveId" is null and t."deletedAt" is null and t.type='CREDIT'  order by t.id DESC; -- 4320
   -- if there is expenseId look for paymentmethod inside expense and look for paypal email
   select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."ExpenseId" is not null and t."HostCollectiveId" is null and t."deletedAt" is null and t.type='CREDIT'  order by t.id DESC; -- 4315
   -- OrderId is not null - We do have PaymentMethodId here so simpler to create wallet..
      select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."OrderId" is not null and t."HostCollectiveId" is null and t."deletedAt" is null and t.type='CREDIT'  order by t.id DESC;
      -- OrderId is null - 3 Docker tx manually fix it.
      select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."OrderId" is not null and t."HostCollectiveId"  is null and t."PaymentMethodId" is null and t."deletedAt" is null and t.type='CREDIT'  order by t.id DESC;

--Not a Problem, just a PS: Collectives with a currency that have Hosts with different currencies, In this case we are converting the fees that the collective paid in the host currency to the collective's currency. This may cause small differences on the result due to Math rounds.
    -- WWcodeBerlin example: collective is EUR, host is USD, collective pays the fees in USD even though it's a EUR Collective.
    -- Create a USD Wallet for wwcodeberlin because it actually doesnt have EUR wallet, its just a frontend conversion not a backend
       -- expenses paid in EUR
  select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id 
        WHERE t."FromCollectiveId" in (select id from "Collectives" where slug='wwcodeberlin') 
        or t."CollectiveId" in (select id from "Collectives" where slug='wwcodeberlin');
 
-- queries to fix on the legacy DB
-- 1. look for all payment methods that have service but don't have type and fix them manually
    select distinct(service) from "PaymentMethods" where service is not null and type is null; -- paypal and stripe
    select * from "PaymentMethods" where service='stripe' and type is null; 
        select distinct(service, type) from "PaymentMethods" where service='paypal'; -- adaptive and payment
        select * from "PaymentMethods" where service='paypal'; -- total 918
        select data from "PaymentMethods" where service='paypal' and type='adaptive'; -- 372 adaptives
        select data from "PaymentMethods" where service='paypal' and type='payment'; -- 337 payments  
        select data from "PaymentMethods" where service='paypal' and type is null; -- 209 payments  

```
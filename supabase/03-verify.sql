-- Kiểm tra sau import; chỉ đọc. Các cột violations phải bằng 0.
SELECT
  (SELECT count(*) FROM public."User" WHERE id LIKE 'bt-%') AS accounts,
  (SELECT count(*) FROM public."ArtisanProfile" WHERE id LIKE 'bt-shop-%') AS workshops,
  (SELECT count(*) FROM public."Product" WHERE id LIKE 'bt-product-%') AS products,
  (SELECT count(*) FROM public."ProductionBatch" WHERE id LIKE 'bt-batch-%') AS batches,
  (SELECT count(*) FROM public."ProductionLog" WHERE id LIKE 'bt-batch-%') AS milestones,
  (SELECT count(*) FROM public."QuoteRequest" WHERE id LIKE 'bt-order-%') AS requests,
  (SELECT count(*) FROM public."QuoteRecipient" WHERE "requestId" LIKE 'bt-order-%') AS invitations,
  (SELECT count(*) FROM public."QuoteBid" WHERE id LIKE 'bt-order-%') AS bids,
  (SELECT count(*) FROM public."CommunityNews" WHERE id LIKE 'bt-news-%') AS news;

SELECT state, count(*) AS requests FROM public."QuoteRequest"
WHERE id LIKE 'bt-order-%' GROUP BY state ORDER BY state;

WITH orders AS (
  SELECT q.id,q.state,q.quantity,coalesce(sum(b."acceptedQuantity"),0) AS allocated,
    coalesce(sum(b."deliveredQuantity"),0) AS delivered
  FROM public."QuoteRequest" q LEFT JOIN public."QuoteBid" b ON b."requestId"=q.id
  WHERE q.id LIKE 'bt-order-%' GROUP BY q.id
)
SELECT
  count(*) FILTER (WHERE state IN ('BUYER_ACCEPTED','IN_PRODUCTION','DELIVERED') AND allocated<>quantity
    OR state IN ('DRAFT_REQUEST','SENT_TO_ARTISANS','ARTISANS_BIDDING') AND allocated<>0
    OR state='DELIVERED' AND delivered<>quantity) AS allocation_violations,
  (SELECT count(*) FROM public."QuoteBid" b JOIN public."QuoteRequest" q ON q.id=b."requestId"
    WHERE q.id LIKE 'bt-order-%' AND (b."completionDate">q.deadline OR b."createdAt"<q."createdAt")) AS timeline_violations,
  (SELECT count(*) FROM public."ProductionBatch" b WHERE b.id LIKE 'bt-batch-%'
    AND (SELECT count(*) FROM public."ProductionLog" l WHERE l."batchId"=b.id
      AND l."occurredAt" BETWEEN b."createdAt" AND b."qrIssuedAt")<>6) AS trace_violations
FROM orders;

SELECT relname AS table_name, relrowsecurity AS rls_enabled FROM pg_class
WHERE relnamespace='public'::regnamespace AND relname IN
 ('User','CraftVillage','ArtisanProfile','Product','ProductionBatch','ProductionLog',
  'QuoteRequest','QuoteRecipient','QuoteBid','CommunityNews','LoginSession','AuthAttempt','MediaAsset')
ORDER BY relname;

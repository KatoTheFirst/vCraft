BEGIN;
SET LOCAL search_path TO public, pg_catalog;
CREATE SCHEMA IF NOT EXISTS "public";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ARTISAN', 'BUYER');
CREATE TYPE "Approval" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');
CREATE TYPE "QuoteState" AS ENUM ('DRAFT_REQUEST', 'SENT_TO_ARTISANS', 'ARTISANS_BIDDING', 'BUYER_ACCEPTED', 'IN_PRODUCTION', 'DELIVERED');
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "passwordHash" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CraftVillage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CraftVillage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ArtisanProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "story" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certificates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "approval" "Approval" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ArtisanProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(14,0) NOT NULL,
    "story" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProductionLog" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "title" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ProductionLog_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "deadline" TIMESTAMPTZ(3) NOT NULL,
    "state" "QuoteState" NOT NULL DEFAULT 'DRAFT_REQUEST',
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QuoteRecipient" (
    "requestId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,

    CONSTRAINT "QuoteRecipient_pkey" PRIMARY KEY ("requestId","artisanId")
);
CREATE TABLE "QuoteBid" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,0) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "completionDate" TIMESTAMPTZ(3) NOT NULL,
    "acceptedQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteBid_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CommunityNews" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CommunityNews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "CraftVillage_slug_key" ON "CraftVillage"("slug");
CREATE UNIQUE INDEX "ArtisanProfile_userId_key" ON "ArtisanProfile"("userId");
CREATE UNIQUE INDEX "ArtisanProfile_slug_key" ON "ArtisanProfile"("slug");
CREATE INDEX "ArtisanProfile_villageId_approval_idx" ON "ArtisanProfile"("villageId", "approval");
CREATE INDEX "Product_artisanId_published_idx" ON "Product"("artisanId", "published");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE UNIQUE INDEX "ProductionBatch_code_key" ON "ProductionBatch"("code");
CREATE INDEX "ProductionBatch_productId_idx" ON "ProductionBatch"("productId");
CREATE INDEX "ProductionLog_batchId_occurredAt_idx" ON "ProductionLog"("batchId", "occurredAt");
CREATE INDEX "QuoteRequest_buyerId_state_idx" ON "QuoteRequest"("buyerId", "state");
CREATE INDEX "QuoteRecipient_artisanId_idx" ON "QuoteRecipient"("artisanId");
CREATE INDEX "QuoteBid_artisanId_idx" ON "QuoteBid"("artisanId");
CREATE UNIQUE INDEX "QuoteBid_requestId_artisanId_key" ON "QuoteBid"("requestId", "artisanId");
CREATE INDEX "CommunityNews_publishedAt_idx" ON "CommunityNews"("publishedAt");
CREATE INDEX "CommunityNews_authorId_idx" ON "CommunityNews"("authorId");
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "CraftVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteRecipient" ADD CONSTRAINT "QuoteRecipient_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "QuoteRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteRecipient" ADD CONSTRAINT "QuoteRecipient_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteBid" ADD CONSTRAINT "QuoteBid_requestId_artisanId_fkey" FOREIGN KEY ("requestId", "artisanId") REFERENCES "QuoteRecipient"("requestId", "artisanId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteBid" ADD CONSTRAINT "QuoteBid_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityNews" ADD CONSTRAINT "CommunityNews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArtisanProfile" ADD CHECK (("latitude" IS NULL) = ("longitude" IS NULL)), ADD CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);
ALTER TABLE "Product" ADD CHECK ("price" >= 0);
ALTER TABLE "ProductionBatch" ADD CHECK ("quantity" > 0);
ALTER TABLE "QuoteRequest" ADD CHECK ("quantity" > 0);
ALTER TABLE "QuoteBid" ADD CHECK ("unitPrice" >= 0 AND "quantity" > 0 AND "acceptedQuantity" BETWEEN 0 AND "quantity");
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;
ALTER TABLE "ArtisanProfile" ADD COLUMN     "familyHistory" TEXT;
CREATE TABLE "LoginSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LoginSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuthAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("key")
);
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginSession_expiresAt_idx" ON "LoginSession"("expiresAt");
CREATE INDEX "LoginSession_userId_idx" ON "LoginSession"("userId");
CREATE INDEX "AuthAttempt_expiresAt_idx" ON "AuthAttempt"("expiresAt");
CREATE INDEX "MediaAsset_artisanId_purpose_idx" ON "MediaAsset"("artisanId", "purpose");
ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArtisanProfile" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ArtisanProfile" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Product" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ProductionBatch" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "qrIssuedAt" TIMESTAMPTZ(3),
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "QuoteRequest" ADD COLUMN     "budget" DECIMAL(16,0),
ADD COLUMN     "category" TEXT,
ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "QuoteBid" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deliveredQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "producedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CommunityNews" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "ArtisanProfile_reviewedById_idx" ON "ArtisanProfile"("reviewedById");
CREATE INDEX "ArtisanProfile_villageId_approval_isOpen_idx" ON "ArtisanProfile"("villageId", "approval", "isOpen");
CREATE INDEX "QuoteRequest_state_createdAt_idx" ON "QuoteRequest"("state", "createdAt");
CREATE INDEX "CommunityNews_pinned_publishedAt_idx" ON "CommunityNews"("pinned", "publishedAt");
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuoteRequest" ADD CONSTRAINT "quote_budget_nonnegative" CHECK ("budget" >= 0);
ALTER TABLE "QuoteBid" ADD CONSTRAINT "bid_progress_order" CHECK (
  0 <= "deliveredQuantity" AND "deliveredQuantity" <= "producedQuantity"
  AND "producedQuantity" <= "acceptedQuantity"
);
CREATE FUNCTION check_bid_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE capacity integer;
BEGIN
  UPDATE "QuoteRequest" SET "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = NEW."requestId" RETURNING "quantity" INTO capacity;
  IF (SELECT sum("acceptedQuantity") FROM "QuoteBid" WHERE "requestId" = NEW."requestId") > capacity THEN
    RAISE EXCEPTION 'Assigned quantity exceeds request quantity' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER check_bid_allocation AFTER INSERT OR UPDATE OF "requestId", "acceptedQuantity"
ON "QuoteBid" FOR EACH ROW EXECUTE FUNCTION check_bid_allocation();

CREATE FUNCTION check_request_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT sum("acceptedQuantity") FROM "QuoteBid" WHERE "requestId" = NEW."id") > NEW."quantity" THEN
    RAISE EXCEPTION 'Request quantity is below assigned quantity' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_request_capacity BEFORE UPDATE OF "quantity" ON "QuoteRequest"
FOR EACH ROW EXECUTE FUNCTION check_request_capacity();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "QuoteBid" b JOIN "QuoteRequest" r ON r.id = b."requestId"
    GROUP BY r.id, r.quantity HAVING SUM(b."acceptedQuantity") > r.quantity) THEN
    RAISE EXCEPTION 'Existing order exceeds its requested quantity';
  END IF;
END $$;

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CraftVillage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ArtisanProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductionBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuoteRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuoteRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuoteBid" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CommunityNews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoginSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuthAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MediaAsset" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE api_role text; table_name text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = api_role) THEN
      FOREACH table_name IN ARRAY ARRAY['User','CraftVillage','ArtisanProfile','Product','ProductionBatch','ProductionLog','QuoteRequest','QuoteRecipient','QuoteBid','CommunityNews','LoginSession','AuthAttempt','MediaAsset'] LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, api_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;

SET LOCAL search_path TO public, pg_catalog;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';
CREATE TEMP TABLE bt_workshops ON COMMIT DROP AS
SELECT ord::int AS n, name,
       (ARRAY['Nguyễn Văn','Trần Thị','Đặng Minh','Phạm Thanh','Lê Hoài','Vũ Ngọc'])[(ord-1)%6+1]
       || ' ' || (ARRAY['An','Hương','Phúc','Thảo'])[(ord-1)/6+1] AS owner,
       CASE WHEN ord<=20 THEN 'APPROVED' WHEN ord<=22 THEN 'PENDING'
            WHEN ord=23 THEN 'SUSPENDED' ELSE 'REJECTED' END::"Approval" AS approval
FROM unnest(ARRAY['Lam Giang','Mộc Liên','Nâu Phù Sa','An Thổ','Sen Trắng','Ngọc Thủy',
 'Vân Khói','Lửa Hồng','Mộc Nhiên','Hiên Gốm','Trà Vân','Sắc Đất',
 'Thanh Diệp','Mây Lam','Gốm Bên Sông','Hoa Đất','Liên Trì','Trúc Xanh',
 'Đất Mùa','Lò Tháng Ba','Sân Nắng','Vệt Men','Mộc Trầm','Lam Chiều']) WITH ORDINALITY AS w(name,ord);

CREATE TEMP TABLE bt_catalog(k int PRIMARY KEY, category text, item text, detail text, price int) ON COMMIT DROP;
INSERT INTO bt_catalog VALUES
 (1,'Trà cụ','Ấm trà quai mây','450 ml, lọc gốm liền thân',320000),
 (2,'Đồ bàn ăn','Bát cơm chân cao','đường kính 12 cm, lòng sâu',65000),
 (3,'Bình hoa','Bình hoa dáng tỏi','cao 24 cm, miệng loe nhẹ',390000),
 (4,'Cốc và tách','Cốc cà phê quai vuông','280 ml, miệng bo tròn',85000),
 (5,'Đồ bàn ăn','Đĩa bầu dục','dài 28 cm, vành thấp',145000),
 (6,'Trà cụ','Chén tống','220 ml, vòi rót vát tay',155000),
 (7,'Gốm trang trí','Lọ cắm một cành','cao 14 cm, cổ nhỏ',125000),
 (8,'Đồ bàn ăn','Tô phở miệng loe','đường kính 20 cm',135000),
 (9,'Chậu cây','Chậu bonsai chữ nhật','dài 26 cm, đáy có lỗ thoát nước',230000),
 (10,'Cốc và tách','Tách espresso kèm đĩa','80 ml, đĩa kê 11 cm',120000),
 (11,'Đồ gia dụng','Hũ đựng trà','300 g, nắp gốm vừa miệng',195000),
 (12,'Bình hoa','Bình vai ngang','cao 30 cm, vuốt tay hai đoạn',485000);

INSERT INTO "CraftVillage"(id,slug,name) VALUES ('bt-village','bat-trang','Làng gốm Bát Tràng')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO "User"(id,email,name,role,"createdAt","updatedAt")
VALUES ('bt-admin','banquanly@bat-trang.example.test','Ban quản lý triển lãm','ADMIN','2024-01-02','2024-01-02');
INSERT INTO "User"(id,email,name,role,"createdAt","updatedAt")
SELECT 'bt-artisan-'||n,'xuong.'||n||'@bat-trang.example.test',owner,'ARTISAN','2024-02-01'::date+n,'2024-02-01'::date+n
FROM bt_workshops;
INSERT INTO "User"(id,email,name,role,"createdAt","updatedAt")
SELECT 'bt-buyer-'||n,'khach.'||n||'@bat-trang.example.test',
 (ARRAY['Nguyễn','Trần','Phạm','Lê','Đỗ','Hoàng'])[(n-1)%6+1]||' '||
 (ARRAY['Minh','Thanh','Ngọc','Thùy','Đức','Hoài','Khánh','Hải','Thế','Quang'])[((n-1)/6)%10+1]||' '||
 (ARRAY['Anh','Châu','Giang','Linh'])[(n-1)/60+1],
 'BUYER','2024-08-01'::date+n,'2024-08-01'::date+n FROM generate_series(1,240) n;

INSERT INTO "ArtisanProfile"(id,"userId","villageId",slug,name,approval,"reviewedById","reviewedAt",
 "familyHistory",story,latitude,longitude,"isOpen","createdAt","updatedAt")
SELECT 'bt-shop-'||n,'bt-artisan-'||n,(SELECT id FROM "CraftVillage" WHERE slug='bat-trang'),
 'bat-trang-'||lpad(n::text,2,'0'),'Xưởng '||name,approval,
 CASE WHEN approval<>'PENDING' THEN 'bt-admin' END,
 CASE WHEN approval<>'PENDING' THEN '2024-04-01'::date+n END,
 format((ARRAY[
 'Gia đình %s giữ lại bộ dưỡng tre để sửa miệng bát cho đều trước khi phơi.',
 'Từ một bàn xoay của cha mẹ, %s mở rộng gian tạo hình để nhận các đơn theo bộ.',
 'Trong xưởng của %s, người lớn sửa phôi buổi sớm, lớp trẻ ghi chép số men và lịch nung.',
 'Gia đình %s dành riêng một giá gỗ để giữ mẫu đầu tiên của mỗi đơn đặt hàng.',
 'Sau nhiều năm làm chung lò, %s dựng một gian nhỏ bên sân để thử men theo mẻ.',
 'Xưởng của %s duy trì sổ tay phối đất và truyền cách đọc màu lửa qua các đời.'
 ])[(n-1)%6+1],owner),
 (ARRAY['Xưởng dành một góc sân để hong phôi chậm trước khi sửa chân.',
 'Mỗi mẫu mới được thử màu trên các mảnh đất nhỏ trước khi lên men cả mẻ.',
 'Khách ghé xưởng có thể quan sát nghệ nhân vẽ nét đầu tiên lên xương gốm.',
 'Xưởng lưu lại mẫu men của từng mẻ nung để đối chiếu khi khách đặt lại.'])[(n-1)%4+1],
 20.9738+(n%6)*0.00071+(n%3)*0.00008,105.9098+(n/6)*0.00107+(n%5)*0.00021,
 approval='APPROVED' AND n%4<>0,'2024-02-01'::date+n,'2024-04-01'::date+n FROM bt_workshops;

CREATE TEMP TABLE bt_products ON COMMIT DROP AS
SELECT w.n AS workshop,c.k, v, format('bt-product-%s-%s-%s',w.n,c.k,v) AS id,
 c.category,c.item||' · '|| (ARRAY['men lam','men ngọc','men nâu','men trắng ngà','men rạn','men tro'])[(w.n+c.k+v)%6+1] AS title,
 c.detail,c.price+(w.n%4)*5000+v*10000 AS price, w.approval='APPROVED' AND (w.n+c.k+v)%17<>0 AS published
FROM bt_workshops w CROSS JOIN bt_catalog c CROSS JOIN generate_series(0,3) v
WHERE (w.n+c.k)%7<>0 AND (
  c.category IN ('Đồ bàn ăn','Trà cụ') OR (w.n+c.k)%3<>0
);
INSERT INTO "Product"(id,"artisanId",name,category,story,price,published,"createdAt","updatedAt")
SELECT id,'bt-shop-'||workshop,title,category,detail||'. Hoàn thiện theo từng mẻ nhỏ tại '||w.name||'.',
 price,published,'2024-06-01'::date+k,'2025-01-01'::date+k FROM bt_products p JOIN bt_workshops w ON w.n=p.workshop;

CREATE TEMP TABLE bt_batches ON COMMIT DROP AS
SELECT p.id AS product,format('bt-batch-%s-%s-%s-%s',workshop,k,v,b) AS id,
 format('BT-%s-%s-%s%s-%s',2025,lpad(workshop::text,2,'0'),lpad(k::text,2,'0'),v,b) AS code,
 '2025-02-01 08:00+07'::timestamptz+(workshop+k+v+b*32)*interval '1 day' AS started,
 24+12*((workshop+k+b)%8) AS quantity FROM bt_products p CROSS JOIN generate_series(1, 2+(workshop+k+v)%4) b WHERE published;
INSERT INTO "ProductionBatch"(id,"productId",code,quantity,"qrIssuedAt","createdAt","updatedAt")
SELECT id,product,code,quantity,started+interval '13 days',started,started+interval '13 days' FROM bt_batches;
INSERT INTO "ProductionLog"(id,"batchId","occurredAt",title)
SELECT b.id||'-step-'||i,b.id,started+d*interval '1 day',stage FROM bt_batches b
CROSS JOIN (VALUES(1,0,'Lọc và luyện đất'),(2,1,'Tạo hình và sửa chân'),(3,5,'Phơi khô và kiểm tra phôi'),
 (4,7,'Trang trí và phủ men'),(5,10,'Xếp lò và nung'),(6,13,'Ra lò, phân loại thành phẩm')) s(i,d,stage);

CREATE TEMP TABLE bt_orders ON COMMIT DROP AS
SELECT n, 'bt-order-'||n AS id, 1+((n*17+n/6)%12) AS k, 120+60*((n*13+n/6)%24) AS qty,
 ((n*7+n/6)%20)+1 AS first_shop, (n-1)%6 AS phase,
 '2026-11-24 09:00+07'::timestamptz -
 (CASE (n-1)%6 WHEN 0 THEN n%5 WHEN 1 THEN 5+n%4 WHEN 2 THEN 10+n%6
  WHEN 3 THEN 15+n%8 WHEN 4 THEN 20+n%13 ELSE 46+(n*7)%320 END)*interval '1 day' AS opened
FROM generate_series(1,1440) n;
INSERT INTO "QuoteRequest"(id,"buyerId",description,quantity,deadline,state,budget,category,"createdAt","updatedAt")
SELECT o.id,'bt-buyer-'||(1+(n-1)%240),format('%s chiếc %s cho %s; %s. Đóng thùng có vách ngăn, giao theo lô.',
 qty,lower(c.item),(ARRAY['quà tri ân','phòng trà','khách sạn','nhà hàng','hội nghị'])[(n-1)%5+1],c.detail),
 qty,opened+interval '45 days',(enum_range(NULL::"QuoteState"))[phase+1],
 qty*c.price,c.category,opened,least(opened+phase*interval '4 days', timestamptz '2026-11-24 09:00+07') FROM bt_orders o JOIN bt_catalog c USING(k);
CREATE TEMP TABLE bt_offers ON COMMIT DROP AS
SELECT o.*,matched.slot,'bt-shop-'||matched.workshop AS shop
FROM bt_orders o
CROSS JOIN LATERAL (
  SELECT ranked.workshop, row_number() OVER (ORDER BY ranked.distance) AS slot
  FROM (
    SELECT DISTINCT p.workshop, (p.workshop-o.first_shop+20)%20 AS distance
    FROM bt_products p WHERE p.k=o.k AND p.published
    ORDER BY distance LIMIT 3
  ) ranked
) matched WHERE phase>=1;
INSERT INTO "QuoteRecipient"("requestId","artisanId") SELECT id,shop FROM bt_offers;
INSERT INTO "QuoteBid"(id,"requestId","artisanId","unitPrice",quantity,"completionDate","acceptedQuantity",
 "producedQuantity","deliveredQuantity","createdAt","updatedAt")
SELECT o.id||'-bid-'||slot,o.id,shop,round(c.price*(0.79+slot*0.025)),
 CASE slot WHEN 1 THEN qty*2/3 ELSE qty/2 END,opened+(30+slot)*interval '1 day',
 accepted,CASE phase WHEN 5 THEN accepted WHEN 4 THEN accepted/2 ELSE 0 END,
 CASE phase WHEN 5 THEN accepted ELSE 0 END,opened+slot*interval '1 day',least(opened+phase*interval '4 days', timestamptz '2026-11-24 09:00+07')
FROM bt_offers o JOIN bt_catalog c USING(k)
CROSS JOIN LATERAL (SELECT CASE WHEN phase<3 OR slot=3 THEN 0 WHEN slot=1 THEN qty*2/3 ELSE qty/3 END AS accepted) a
WHERE phase>=2 AND (phase>2 OR slot<=2);
UPDATE "QuoteRequest" q SET "updatedAt"=least(o.opened+o.phase*interval '4 days', timestamptz '2026-11-24 09:00+07')
FROM bt_orders o WHERE q.id=o.id;

INSERT INTO "CommunityNews"(id,"authorId",title,content,pinned,"publishedAt","createdAt","updatedAt")
SELECT 'bt-news-'||n,'bt-admin',topic||' · tháng '||to_char(day,'MM/YYYY'),body,n=48,
 CASE WHEN n%13<>0 THEN day END,day,day
FROM generate_series(1,48) n
CROSS JOIN LATERAL (SELECT date '2025-01-05'+((n-1)/4)*30+((n-1)%4)*6 AS day) t
JOIN (VALUES(0,'Lịch mở xưởng cuối tuần','Các hộ đăng ký khung giờ trải nghiệm bàn xoay và bố trí người hướng dẫn.'),
 (1,'Thu gom vật liệu đóng gói','Các xưởng tập kết thùng carton và tấm ngăn để tái sử dụng cho chuyến giao hàng tiếp theo.'),
 (2,'Đăng ký trưng bày mẫu men','Ban quản lý tiếp nhận mẫu gốm kèm mã lô và mô tả kỹ thuật hoàn thiện.'),
 (3,'Đối chiếu kế hoạch giao hàng','Hộ nhận đơn sỉ kiểm tra số lượng đạt chuẩn và cập nhật tiến độ trước khi đóng kiện.')
) m(i,topic,body) ON i=(n-1)%4;
COMMIT;

-- Bộ dữ liệu mô phỏng cho triển lãm Bát Tràng. Chạy một lần sau 01-schema.sql.
-- Mọi tên, địa điểm xưởng, giá và đơn hàng là dữ liệu minh họa. Đơn vị giá: VND.
BEGIN;
SET LOCAL search_path TO public, pg_catalog;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';

-- Mã cố định để chia sẻ cùng bộ dữ liệu giữa các máy. Một lần chạy trùng sẽ
-- rollback toàn bộ thay vì ghi đè dữ liệu đã được chỉnh sửa.
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
 format('Gia đình %s bắt đầu với một bàn xoay nhỏ. Đến nay hai thế hệ cùng đảm nhiệm khâu tạo hình và hoàn thiện.',owner),
 (ARRAY['Xưởng dành một góc sân để hong phôi chậm trước khi sửa chân.',
 'Mỗi mẫu mới được thử màu trên các mảnh đất nhỏ trước khi lên men cả mẻ.',
 'Khách ghé xưởng có thể quan sát nghệ nhân vẽ nét đầu tiên lên xương gốm.',
 'Xưởng lưu lại mẫu men của từng mẻ nung để đối chiếu khi khách đặt lại.'])[(n-1)%4+1],
 20.9738+(n%6)*0.00071+(n%3)*0.00008,105.9098+(n/6)*0.00107+(n%5)*0.00021,
 approval='APPROVED' AND n%4<>0,'2024-02-01'::date+n,'2024-04-01'::date+n FROM bt_workshops;

CREATE TEMP TABLE bt_products ON COMMIT DROP AS
SELECT w.n AS workshop,c.k, v, format('bt-product-%s-%s-%s',w.n,c.k,v) AS id,
 c.category,c.item||' · '|| (ARRAY['men lam','men ngọc','men nâu','men trắng ngà','men rạn','men tro'])[(w.n+c.k+v*3)%6+1] AS title,
 c.detail,c.price+(w.n%4)*5000+v*10000 AS price, w.approval='APPROVED' AND (w.n+c.k+v)%17<>0 AS published
FROM bt_workshops w CROSS JOIN bt_catalog c CROSS JOIN generate_series(0,1) v;
INSERT INTO "Product"(id,"artisanId",name,category,story,price,published,"createdAt","updatedAt")
SELECT id,'bt-shop-'||workshop,title,category,detail||'. Hoàn thiện theo từng mẻ nhỏ tại '||w.name||'.',
 price,published,'2024-06-01'::date+k,'2025-01-01'::date+k FROM bt_products p JOIN bt_workshops w ON w.n=p.workshop;

CREATE TEMP TABLE bt_batches ON COMMIT DROP AS
SELECT p.id AS product,format('bt-batch-%s-%s-%s-%s',workshop,k,v,b) AS id,
 format('BT-%s-%s-%s%s-%s',2025,lpad(workshop::text,2,'0'),lpad(k::text,2,'0'),v,b) AS code,
 '2025-02-01 08:00+07'::timestamptz+(workshop+k+v+b*32)*interval '1 day' AS started,
 24+12*((workshop+k+b)%8) AS quantity FROM bt_products p CROSS JOIN generate_series(1,3) b WHERE published;
INSERT INTO "ProductionBatch"(id,"productId",code,quantity,"qrIssuedAt","createdAt","updatedAt")
SELECT id,product,code,quantity,started+interval '13 days',started,started+interval '13 days' FROM bt_batches;
INSERT INTO "ProductionLog"(id,"batchId","occurredAt",title)
SELECT b.id||'-step-'||i,b.id,started+d*interval '1 day',stage FROM bt_batches b
CROSS JOIN (VALUES(1,0,'Lọc và luyện đất'),(2,1,'Tạo hình và sửa chân'),(3,5,'Phơi khô và kiểm tra phôi'),
 (4,7,'Trang trí và phủ men'),(5,10,'Xếp lò và nung'),(6,13,'Ra lò, phân loại thành phẩm')) s(i,d,stage);

CREATE TEMP TABLE bt_orders ON COMMIT DROP AS
SELECT n, 'bt-order-'||n AS id, 1+(n-1)%12 AS k, 120+60*(n%24) AS qty,
 ((n-1)/6)%20+1 AS first_shop, (n-1)%6 AS phase,
 -- Snapshot on 24 Nov 2026: open requests are recent, deliveries span the preceding year.
 '2026-11-24 09:00+07'::timestamptz -
 (CASE (n-1)%6 WHEN 0 THEN n%5 WHEN 1 THEN 5+n%4 WHEN 2 THEN 10+n%6
  WHEN 3 THEN 15+n%8 WHEN 4 THEN 20+n%13 ELSE 46+(n*7)%320 END)*interval '1 day' AS opened
FROM generate_series(1,720) n;
INSERT INTO "QuoteRequest"(id,"buyerId",description,quantity,deadline,state,budget,category,"createdAt","updatedAt")
SELECT o.id,'bt-buyer-'||(1+(n-1)%240),format('%s chiếc %s cho %s; %s. Đóng thùng có vách ngăn, giao theo lô.',
 qty,lower(c.item),(ARRAY['quà tri ân','phòng trà','khách sạn','nhà hàng','hội nghị'])[(n-1)%5+1],c.detail),
 qty,opened+interval '45 days',(enum_range(NULL::"QuoteState"))[phase+1],
 qty*c.price,c.category,opened,opened+phase*interval '5 days' FROM bt_orders o JOIN bt_catalog c USING(k);
CREATE TEMP TABLE bt_offers ON COMMIT DROP AS
SELECT o.*,slot,'bt-shop-'||(1+(first_shop+slot-2)%20) AS shop
FROM bt_orders o CROSS JOIN generate_series(1,3) slot WHERE phase>=1;
INSERT INTO "QuoteRecipient"("requestId","artisanId") SELECT id,shop FROM bt_offers;
INSERT INTO "QuoteBid"(id,"requestId","artisanId","unitPrice",quantity,"completionDate","acceptedQuantity",
 "producedQuantity","deliveredQuantity","createdAt","updatedAt")
SELECT o.id||'-bid-'||slot,o.id,shop,round(c.price*(0.79+slot*0.025)),
 CASE slot WHEN 1 THEN qty*2/3 ELSE qty/2 END,opened+(30+slot)*interval '1 day',
 accepted,CASE phase WHEN 5 THEN accepted WHEN 4 THEN accepted/2 ELSE 0 END,
 CASE phase WHEN 5 THEN accepted ELSE 0 END,opened+slot*interval '1 day',opened+phase*interval '5 days'
FROM bt_offers o JOIN bt_catalog c USING(k)
CROSS JOIN LATERAL (SELECT CASE WHEN phase<3 OR slot=3 THEN 0 WHEN slot=1 THEN qty*2/3 ELSE qty/3 END AS accepted) a
WHERE phase>=2 AND (phase>2 OR slot<=2);
-- The allocation trigger timestamps writes at import time. Restore the sample order timeline.
UPDATE "QuoteRequest" q SET "updatedAt"=o.opened+o.phase*interval '5 days'
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

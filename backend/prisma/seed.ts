import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with realistic stores and menus...');

  // Owner addresses (Movement testnet addresses)
  const owners = [
    '0x60a2f32cde9ddf5b3e73e207f124642390ef839d8b76d05d009235b0dc4b20ce',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  ];

  // Store 1: 명동교자 (Korean Dumpling Restaurant)
  const store1 = await prisma.store.create({
    data: {
      name: '명동교자 본점',
      description: '1966년부터 이어온 칼국수와 만두 전문점. 서울 명동의 대표 맛집으로 진한 멸치 육수와 쫄깃한 수제 면발이 특징입니다.',
      price: '8.00',
      menu: '칼국수, 만두, 비빔국수, 콩국수',
      image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
      owner: owners[0],
      walletAddress: owners[0],
      menuItems: {
        create: [
          { name: '칼국수', description: '진한 멸치 육수에 쫄깃한 수제 면발', price: '8.00', category: '면류' },
          { name: '만두', description: '고기와 야채가 가득한 수제 만두 (10개)', price: '10.00', category: '만두' },
          { name: '비빔국수', description: '새콤달콤 매콤한 비빔국수', price: '9.00', category: '면류' },
          { name: '콩국수', description: '고소한 콩물에 시원한 면', price: '10.00', category: '면류' },
          { name: '만두국', description: '뜨끈한 육수에 푸짐한 만두', price: '9.00', category: '국물' },
          { name: '수육', description: '부드러운 돼지고기 수육', price: '25.00', category: '안주' },
        ],
      },
    },
  });

  // Store 2: 스타벅스 (Coffee Shop)
  const store2 = await prisma.store.create({
    data: {
      name: '스타벅스 강남역점',
      description: '전 세계인이 사랑하는 프리미엄 커피 전문점. 고품질 아라비카 원두와 다양한 음료, 디저트를 제공합니다.',
      price: '5.00',
      menu: '커피, 음료, 디저트, 푸드',
      image: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800',
      owner: owners[0],
      walletAddress: owners[0],
      menuItems: {
        create: [
          { name: '아메리카노', description: '진한 에스프레소와 물의 조화 (Tall)', price: '4.50', category: '커피' },
          { name: '카페라떼', description: '에스프레소와 스팀 밀크 (Tall)', price: '5.00', category: '커피' },
          { name: '카라멜 마끼아또', description: '바닐라 시럽과 카라멜 드리즐 (Tall)', price: '5.90', category: '커피' },
          { name: '자바칩 프라푸치노', description: '초콜릿 칩이 들어간 시원한 음료 (Tall)', price: '6.30', category: '프라푸치노' },
          { name: '녹차 프라푸치노', description: '제주 녹차의 깊은 맛 (Tall)', price: '6.30', category: '프라푸치노' },
          { name: '치즈케이크', description: '뉴욕 스타일 클래식 치즈케이크', price: '6.50', category: '디저트' },
          { name: '크루아상', description: '버터 풍미 가득한 프랑스식 크루아상', price: '4.00', category: '베이커리' },
          { name: '햄&치즈 샌드위치', description: '햄, 치즈, 야채가 들어간 샌드위치', price: '6.00', category: '푸드' },
        ],
      },
    },
  });

  // Store 3: 본죽 (Korean Porridge)
  const store3 = await prisma.store.create({
    data: {
      name: '본죽 역삼점',
      description: '정성껏 끓인 건강한 죽 전문점. 신선한 재료로 매일 아침 직접 끓여 영양과 맛을 동시에 잡았습니다.',
      price: '9.00',
      menu: '죽, 비빔밥, 국밥',
      image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800',
      owner: owners[1],
      walletAddress: owners[1],
      menuItems: {
        create: [
          { name: '전복죽', description: '싱싱한 전복이 들어간 영양죽', price: '13.00', category: '프리미엄죽' },
          { name: '쇠고기야채죽', description: '신선한 야채와 쇠고기의 조화', price: '9.00', category: '기본죽' },
          { name: '닭죽', description: '부드러운 닭살이 들어간 담백한 죽', price: '8.00', category: '기본죽' },
          { name: '호박죽', description: '달콤하고 부드러운 단호박죽', price: '8.00', category: '기본죽' },
          { name: '참치야채죽', description: '고소한 참치와 야채의 조합', price: '8.50', category: '기본죽' },
          { name: '낙지죽', description: '쫄깃한 낙지가 들어간 얼큰한 죽', price: '11.00', category: '프리미엄죽' },
          { name: '불고기비빔밥', description: '달콤한 불고기와 야채 비빔밥', price: '10.00', category: '비빔밥' },
        ],
      },
    },
  });

  // Store 4: 버거킹 (Fast Food)
  const store4 = await prisma.store.create({
    data: {
      name: '버거킹 신촌점',
      description: '불에 직접 구운 100% 순 쇠고기 패티의 와퍼가 시그니처인 글로벌 버거 브랜드.',
      price: '7.00',
      menu: '버거, 사이드, 음료',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
      owner: owners[1],
      walletAddress: owners[1],
      menuItems: {
        create: [
          { name: '와퍼', description: '불에 직접 구운 100% 순 쇠고기 패티', price: '7.90', category: '버거' },
          { name: '와퍼 주니어', description: '작지만 맛있는 와퍼', price: '5.50', category: '버거' },
          { name: '치즈와퍼', description: '치즈가 추가된 클래식 와퍼', price: '8.50', category: '버거' },
          { name: '불고기와퍼', description: '한국식 불고기 소스의 와퍼', price: '8.20', category: '버거' },
          { name: '치킨버거', description: '바삭한 치킨 패티 버거', price: '6.50', category: '버거' },
          { name: '프렌치프라이 (L)', description: '바삭한 감자튀김', price: '3.50', category: '사이드' },
          { name: '어니언링', description: '바삭하게 튀긴 양파링', price: '3.00', category: '사이드' },
          { name: '콜라 (L)', description: '시원한 코카콜라', price: '2.50', category: '음료' },
          { name: '와퍼 세트', description: '와퍼 + 프렌치프라이(L) + 콜라(L)', price: '10.90', category: '세트메뉴' },
        ],
      },
    },
  });

  // Store 5: 이삭토스트 (Korean Toast)
  const store5 = await prisma.store.create({
    data: {
      name: '이삭토스트 홍대입구점',
      description: '달콤하고 고소한 한국식 토스트 전문점. 갓 구운 따뜻한 토스트와 신선한 재료의 조합.',
      price: '4.00',
      menu: '토스트, 음료',
      image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800',
      owner: owners[2],
      walletAddress: owners[2],
      menuItems: {
        create: [
          { name: '햄치즈 토스트', description: '클래식 햄과 치즈 토스트', price: '3.50', category: '토스트' },
          { name: '베이컨 베스트 토스트', description: '바삭한 베이컨이 들어간 베스트셀러', price: '4.50', category: '토스트' },
          { name: '불고기 토스트', description: '달콤한 불고기가 가득', price: '4.80', category: '토스트' },
          { name: '치즈 베이컨 포테이토', description: '감자와 베이컨, 치즈의 조합', price: '5.00', category: '토스트' },
          { name: '딸기잼 토스트', description: '달콤한 딸기잼 토스트', price: '2.50', category: '토스트' },
          { name: '아메리카노 (ICE)', description: '시원한 아이스 아메리카노', price: '2.50', category: '음료' },
          { name: '딸기 스무디', description: '상큼한 딸기 스무디', price: '4.00', category: '음료' },
        ],
      },
    },
  });

  // Store 6: 교촌치킨 (Korean Fried Chicken)
  const store6 = await prisma.store.create({
    data: {
      name: '교촌치킨 건대점',
      description: '1991년 창업 이래 변함없는 간장 소스 치킨의 원조. 바삭하고 촉촉한 치킨 전문점.',
      price: '18.00',
      menu: '치킨, 사이드, 음료',
      image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800',
      owner: owners[2],
      walletAddress: owners[2],
      menuItems: {
        create: [
          { name: '교촌 오리지날', description: '간장 소스의 원조 교촌치킨 (한마리)', price: '18.00', category: '치킨' },
          { name: '교촌 레드', description: '매콤한 빨간 양념의 레드치킨 (한마리)', price: '18.00', category: '치킨' },
          { name: '교촌 허니콤보', description: '달콤한 허니 소스 치킨 (한마리)', price: '19.00', category: '치킨' },
          { name: '교촌 반반', description: '오리지날 + 레드 반반 (한마리)', price: '19.00', category: '치킨' },
          { name: '치킨무', description: '새콤달콤 치킨무', price: '1.00', category: '사이드' },
          { name: '웨지감자', description: '바삭한 웨지감자', price: '4.00', category: '사이드' },
          { name: '콜라 1.25L', description: '대용량 콜라', price: '3.00', category: '음료' },
          { name: '맥주 500ml', description: '시원한 생맥주', price: '5.00', category: '음료' },
        ],
      },
    },
  });

  console.log('✅ Created stores:');
  console.log(`   - ${store1.name}`);
  console.log(`   - ${store2.name}`);
  console.log(`   - ${store3.name}`);
  console.log(`   - ${store4.name}`);
  console.log(`   - ${store5.name}`);
  console.log(`   - ${store6.name}`);
  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

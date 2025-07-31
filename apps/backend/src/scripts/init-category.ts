import { prisma } from '@/lib/prisma';

// Define category types locally for seeding
interface CategoryLevel3 {
  id: string;
  name: string;
}

interface CategoryLevel2 {
  id: string;
  name: string;
  children: CategoryLevel3[];
}

interface CategoryLevel1 {
  id: string;
  name: string;
  children: CategoryLevel2[];
}

// Default categories data (copied from CategorySelector.tsx)
const defaultCategories: CategoryLevel1[] = [
  {
    id: '1',
    name: '我發現東西破損、損壞、故障',
    children: [
      {
        id: '1.1',
        name: '冷氣 / 空調 / 遙控器',
        children: [
          { id: '1.1.1', name: '冷氣無法啟動、運作' },
          { id: '1.1.2', name: '冷氣啟動後會自動停止' },
          { id: '1.1.3', name: '冷氣啟動，但感覺不冷' },
          { id: '1.1.4', name: '冷氣滴水、漏水' },
          { id: '1.1.5', name: '冷氣的遙控器有異常' },
        ],
      },
      {
        id: '1.2',
        name: '投影機 / 電視機 / 遙控器 / HDMI',
        children: [
          { id: '1.2.1', name: '投影機、電視機無聲音' },
          { id: '1.2.2', name: '投影機、電視機顯示無訊號' },
          { id: '1.2.3', name: '投影機、電視機畫面模糊、閃爍' },
          { id: '1.2.4', name: '投影機、電視機無法開啟（黑屏）' },
          { id: '1.2.5', name: '投影機、電視機的遙控器有異常' },
        ],
      },
      {
        id: '1.3',
        name: '音響 / 麥克風',
        children: [
          { id: '1.3.1', name: '音響沒有聲音' },
          { id: '1.3.2', name: '音響無法供電' },
          { id: '1.3.3', name: '麥克風沒有收音' },
          { id: '1.3.4', name: '麥克風無法供電' },
        ],
      },
      {
        id: '1.4',
        name: '椅子 / 桌子 / 邊桌 / 凳子',
        children: [
          { id: '1.4.1', name: '傢俱表面刮傷' },
          { id: '1.4.2', name: '傢俱鬆動、不穩固' },
          { id: '1.4.3', name: '傢俱損壞、無法使用' },
        ],
      },
      {
        id: '1.5',
        name: '收納櫃 / 備品櫃',
        children: [
          { id: '1.5.1', name: '櫃子的門無法關閉、門板歪斜、鎖孔移位' },
          { id: '1.5.2', name: '櫃子內的層架脫落、損壞' },
          { id: '1.5.3', name: '櫃子損壞、無法使用' },
        ],
      },
      {
        id: '1.6',
        name: '插座 / 延長線',
        children: [
          { id: '1.6.1', name: '插座鬆脫' },
          { id: '1.6.2', name: '插座無法供電' },
          { id: '1.6.3', name: '插座表面損壞、燒焦' },
          { id: '1.6.4', name: '延長線插頭毀損' },
          { id: '1.6.5', name: '延長線無法供電' },
          { id: '1.6.6', name: '延長線表面損壞、燒焦' },
        ],
      },
      {
        id: '1.7',
        name: '燈泡 / 燈管 / 照明',
        children: [
          { id: '1.7.1', name: '燈具亮度不足' },
          { id: '1.7.2', name: '燈具閃爍' },
          { id: '1.7.3', name: '燈具未亮' },
          { id: '1.7.4', name: '燈具搖晃、脫落、掉落' },
        ],
      },
      {
        id: '1.8',
        name: '飲水機',
        children: [
          { id: '1.8.1', name: '飲水機無法供電' },
          { id: '1.8.2', name: '飲水機面板、按鈕異常' },
          { id: '1.8.3', name: '飲水機無法出水' },
          { id: '1.8.4', name: '飲水機漏水' },
        ],
      },
      {
        id: '1.9',
        name: '廁所',
        children: [
          { id: '1.9.1', name: '馬桶堵塞' },
          { id: '1.9.2', name: '馬桶水量太小、無法沖水' },
          { id: '1.9.3', name: '馬桶溢水、漏水、水流不停' },
          { id: '1.9.4', name: '地上排水孔堵塞、地板積水' },
          { id: '1.9.5', name: '水龍頭水量太小' },
          { id: '1.9.6', name: '水龍頭鬆動、水流不停' },
        ],
      },
      {
        id: '1.10',
        name: '牆面 / 地板',
        children: [
          { id: '1.10.1', name: '牆面有裂痕' },
          { id: '1.10.2', name: '牆面油漆剝落' },
          { id: '1.10.3', name: '牆面發霉' },
          { id: '1.10.4', name: '地板鬆動、凸起' },
        ],
      },
      {
        id: '1.11',
        name: '門鎖 / 門禁機',
        children: [
          { id: '1.11.1', name: '門鎖警報聲無法關閉' },
          { id: '1.11.2', name: '門鎖、門禁機面板閃爍' },
          { id: '1.11.3', name: '門鎖顯示低電量' },
          { id: '1.11.4', name: '門鎖、門禁機無法使用' },
          { id: '1.11.5', name: '門鎖、門禁機輸入密碼無法開啟' },
          { id: '1.11.6', name: '門鎖、門禁機遠端無法開啟' },
        ],
      },
      {
        id: '1.12',
        name: '網路',
        children: [
          { id: '1.12.1', name: '我的設備搜尋不到 Wi-Fi' },
          { id: '1.12.2', name: '我的設備搜尋到 Wi-Fi 但無法連接' },
          { id: '1.12.3', name: 'Wi-Fi 會不定時斷網' },
          { id: '1.12.4', name: 'Wi-Fi 速度太慢' },
        ],
      },
    ],
  },
  {
    id: '2',
    name: '我覺得空間不乾淨、有異味',
    children: [
      {
        id: '2.1',
        name: '空間內',
        children: [
          { id: '2.1.1', name: '空間內有異味' },
          { id: '2.1.2', name: '空間內牆壁發霉' },
          { id: '2.1.3', name: '空間內地板上有垃圾' },
          { id: '2.1.4', name: '桌子、椅子不乾淨' },
          { id: '2.1.5', name: '沙發有臭味' },
          { id: '2.1.6', name: '沙發有污漬' },
          { id: '2.1.7', name: '沙發發霉' },
          { id: '2.1.8', name: '抱枕有臭味' },
          { id: '2.1.9', name: '抱枕有污漬' },
          { id: '2.1.10', name: '抱枕發霉' },
          { id: '2.1.11', name: '坐墊有臭味' },
          { id: '2.1.12', name: '坐墊有污漬' },
          { id: '2.1.13', name: '坐墊發霉' },
        ],
      },
      {
        id: '2.2',
        name: '廁所內',
        children: [
          { id: '2.2.1', name: '廁所內有異味' },
          { id: '2.2.2', name: '廁所內牆壁發霉' },
          { id: '2.2.3', name: '廁所內馬桶不乾淨' },
          { id: '2.2.4', name: '廁所內洗手台不乾淨' },
          { id: '2.2.5', name: '廁所內地板上有垃圾' },
          { id: '2.2.6', name: '廁所內垃圾桶滿了' },
        ],
      },
      {
        id: '2.3',
        name: '公共區 / 走道 / 垃圾集中區',
        children: [
          { id: '2.3.1', name: '公共區有異味' },
          { id: '2.3.2', name: '公共區牆壁發霉' },
          { id: '2.3.3', name: '公共區地板上有垃圾' },
          { id: '2.3.4', name: '公共區垃圾桶滿了' },
        ],
      },
    ],
  },
  {
    id: '3',
    name: '我發現大樓/分館有公告/問題',
    children: [
      {
        id: '3.1',
        name: '同分館小樹屋空間 & 公共區',
        children: [
          { id: '3.1.1', name: '全部/部分空間冷氣保養' },
          { id: '3.1.2', name: '全部/部分空間有傢俱設備保養清洗' },
          { id: '3.1.3', name: '全部/部分空間有改裝修繕工程' },
        ],
      },
      {
        id: '3.2',
        name: '大樓其他鄰居 & 公共區',
        children: [
          { id: '3.2.1', name: '大樓鄰居裝潢 樓層在正負2層樓內' },
          { id: '3.2.2', name: '大樓鄰居裝潢 樓層超過正負兩層樓' },
          { id: '3.2.3', name: '鄰居反應用戶噪音問題' },
          { id: '3.2.4', name: '鄰居反應公共區域髒亂問題' },
        ],
      },
      {
        id: '3.3',
        name: '大樓公共設施',
        children: [
          { id: '3.3.1', name: '台電修繕停電' },
          { id: '3.3.2', name: '清洗水塔停水' },
          { id: '3.3.3', name: '大樓消防檢查作業' },
          { id: '3.3.4', name: '大樓病媒防治消毒' },
          { id: '3.3.5', name: '大樓電梯例行保養' },
          { id: '3.3.6', name: '大樓公共廁所封閉無法使用' },
          { id: '3.3.7', name: '大樓垃圾回收處理' },
          { id: '3.3.8', name: '其他問題' },
        ],
      },
    ],
  },
  {
    id: '4',
    name: '我遺失了東西、撿到了別人的東西',
    children: [
      {
        id: '4.1',
        name: '遺失物',
        children: [
          { id: '4.1.1', name: '我拾獲別人的東西' },
          { id: '4.1.2', name: '我遺失了東西，如果有撿到請聯繫我' },
        ],
      },
    ],
  },
  {
    id: '5',
    name: '我發現東西不足',
    children: [
      {
        id: '5.1',
        name: '白板筆 / 白板擦',
        children: [
          { id: '5.1.1', name: '白板筆沒水' },
          { id: '5.1.2', name: '白板筆數量缺少' },
          { id: '5.1.3', name: '白板筆顏色缺少' },
          { id: '5.1.4', name: '白板擦沒了' },
          { id: '5.1.5', name: '白板擦無法使用' },
        ],
      },
      {
        id: '5.2',
        name: '衛生紙',
        children: [{ id: '5.2.1', name: '衛生紙沒了' }],
      },
      {
        id: '5.3',
        name: '洗手液',
        children: [{ id: '5.3.1', name: '洗手液沒了' }],
      },
      {
        id: '5.4',
        name: '酒精',
        children: [
          { id: '5.4.1', name: '找不到酒精瓶' },
          { id: '5.4.2', name: '酒精瓶內沒酒精' },
        ],
      },
      {
        id: '5.5',
        name: '備品櫃內物品',
        children: [
          { id: '5.5.1', name: '電池沒了' },
          { id: '5.5.2', name: '燈泡沒了' },
          { id: '5.5.3', name: '白板筆沒了' },
        ],
      },
    ],
  },
  {
    id: '6',
    name: '我發現資訊不一致、有錯誤',
    children: [
      {
        id: '6.1',
        name: '官網資訊',
        children: [
          { id: '6.1.1', name: '官網資訊與現場不符' },
          { id: '6.1.2', name: '官網照片與現場不符' },
        ],
      },
      {
        id: '6.2',
        name: '現場資訊',
        children: [{ id: '6.2.1', name: '告示內容有錯誤' }],
      },
    ],
  },
  {
    id: '7',
    name: '我發現牆壁漏水、滲水問題',
    children: [
      {
        id: '7.1',
        name: '天花板',
        children: [
          { id: '7.1.1', name: '天花板滲水' },
          { id: '7.1.2', name: '天花板漏水' },
        ],
      },
      {
        id: '7.2',
        name: '牆面',
        children: [
          { id: '7.2.1', name: '牆面滲水' },
          { id: '7.2.2', name: '牆面漏水' },
        ],
      },
      {
        id: '7.3',
        name: '地板',
        children: [
          { id: '7.3.1', name: '地板滲水' },
          { id: '7.3.2', name: '地板漏水' },
          { id: '7.3.3', name: '地板積水' },
        ],
      },
      {
        id: '7.4',
        name: '窗戶',
        children: [
          { id: '7.4.1', name: '窗戶滲水' },
          { id: '7.4.2', name: '窗戶漏水' },
        ],
      },
    ],
  },
  {
    id: '8',
    name: '我覺得空間隔音不好',
    children: [
      {
        id: '8.1',
        name: '隔壁 / 公共區 / 街上',
        children: [
          { id: '8.1.1', name: '公共區的聲音打擾了' },
          { id: '8.1.2', name: '隔壁活動的聲音打擾了' },
          { id: '8.1.3', name: '樓上、樓下的聲音打擾了' },
          { id: '8.1.4', name: '路上交通工具的聲音打擾了' },
        ],
      },
    ],
  },
  {
    id: '9',
    name: '我找不到適合的回報、我有建議',
    children: [
      {
        id: '9.1',
        name: '回報與建議',
        children: [{ id: '9.1.1', name: '請填寫備注' }],
      },
    ],
  },
];

export async function seedCategories() {
  console.log('Clearing existing categories...');
  await prisma.category.deleteMany({});
  console.log('Existing categories cleared.');
  console.log('Seeding categories...');

  for (const [l1Index, level1] of defaultCategories.entries()) {
    const createdLevel1 = await prisma.category.create({
      data: {
        name: level1.name,
        level: 1,
        displayOrder: l1Index,
        parentId: null,
      },
    });

    for (const [l2Index, level2] of level1.children.entries()) {
      const createdLevel2 = await prisma.category.create({
        data: {
          name: level2.name,
          level: 2,
          displayOrder: l2Index,
          parentId: createdLevel1.id,
        },
      });

      for (const [l3Index, level3] of level2.children.entries()) {
        await prisma.category.create({
          data: {
            name: level3.name,
            level: 3,
            displayOrder: l3Index,
            parentId: createdLevel2.id,
          },
        });
      }
    }
  }
  console.log('Categories seeded successfully.');
}

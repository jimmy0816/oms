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
    name: '我發現東西破損、損壞、故障｜損壞相關',
    children: [
      {
        id: '1.1',
        name: '冷氣 / 空調 / 遙控器',
        children: [
          { id: '1.1.1', name: '冷氣無法運作、運轉後自動停止 → 找廠商修繕' },
          { id: '1.1.2', name: '冷氣不冷 → 檢測溫度後行動' },
          { id: '1.1.3', name: '遙控器故障 → 更換萬用遙控器' },
        ],
      },
      {
        id: '1.2',
        name: '投影機 / 電視機 / 遙控器 / HDMI',
        children: [
          { id: '1.2.1', name: '設備無聲音 → 更換設備' },
          { id: '1.2.2', name: '設備無法開啟、黑屏 → 檢測電源後行動' },
          { id: '1.2.3', name: '投影畫面模糊、閃爍 → 檢測設備後行動' },
          { id: '1.2.4', name: '設備顯示無訊號 → 檢測線材後行動' },
        ],
      },
      {
        id: '1.3',
        name: '音響 / 麥克風',
        children: [
          { id: '1.3.1', name: '音響沒有聲音 → 找廠商修繕' },
          { id: '1.3.2', name: '音響無法供電 → 檢測電源後行動' },
          { id: '1.3.3', name: '麥克風沒有收音 → 找廠商修繕' },
          { id: '1.3.4', name: '麥克風無法供電 → 檢測電源後行動' },
        ],
      },
      {
        id: '1.4',
        name: '椅子 / 桌子 / 邊桌 / 凳子',
        children: [
          { id: '1.4.1', name: '傢俱鬆動、不穩固 → 修繕' },
          { id: '1.4.2', name: '傢俱表面刮傷 → 列管' },
          { id: '1.4.3', name: '傢俱損壞、無法使用 → 確認修繕可能性後報廢' },
        ],
      },
      {
        id: '1.5',
        name: '插座 / 延長線',
        children: [
          { id: '1.5.1', name: '插座鬆脫 → 簡易修繕' },
          { id: '1.5.2', name: '插座無法供電 → 檢測電源後行動' },
          { id: '1.5.3', name: '插座表面損壞、燒焦 → 簡易修繕' },
          { id: '1.5.4', name: '延長線插頭毀損 → 更換' },
          { id: '1.5.5', name: '延長線無法供電 → 更換' },
          { id: '1.5.6', name: '延長線表面損壞、燒焦 → 更換' },
        ],
      },
      {
        id: '1.6',
        name: '燈泡 / 燈管 / 照明',
        children: [
          { id: '1.6.1', name: '燈具亮度不足 → 檢測亮度後行動' },
          { id: '1.6.2', name: '燈具持續或不定期閃爍 → 更換燈泡' },
          { id: '1.6.3', name: '燈具故障、無法使用 → 檢測電源後行動' },
          { id: '1.6.4', name: '燈具搖晃、脫落、掉落 → 簡易修繕' },
        ],
      },
      {
        id: '1.7',
        name: '收納櫃 / 備品櫃',
        children: [
          { id: '1.7.1', name: '櫃子無法關閉、門板歪斜 → 簡易修繕' },
          { id: '1.7.2', name: '櫃子內層架脫落、損壞 → 簡易修繕' },
          { id: '1.7.3', name: '櫃子損壞、無法使用 → 確認修繕可能性後報廢' },
        ],
      },
      {
        id: '1.8',
        name: '飲水機',
        children: [
          { id: '1.8.1', name: '飲水機疑似未供電' },
          { id: '1.8.2', name: '飲水機面板、按鈕異常' },
          { id: '1.8.3', name: '飲水機無法出水' },
          { id: '1.8.4', name: '飲水機漏水' },
        ],
      },
      {
        id: '1.9',
        name: '廁所',
        children: [
          { id: '1.9.1', name: '馬桶堵塞 → 通馬桶' },
          { id: '1.9.2', name: '馬桶無法沖水 → 簡易修繕' },
          { id: '1.9.3', name: '馬桶漏水、水流不停 → 檢測原因後行動' },
          { id: '1.9.4', name: '排水孔堵塞、地板積水' },
          { id: '1.9.5', name: '水龍頭鬆動、水流不停' },
        ],
      },
      {
        id: '1.10',
        name: '牆面 / 地板',
        children: [
          { id: '1.10.1', name: '牆面有裂痕 → 列管' },
          { id: '1.10.2', name: '牆面剝落 → 檢測安全後行動' },
          { id: '1.10.3', name: '牆面發霉 → 檢測漏水及潮濕後行動' },
          { id: '1.10.4', name: '地板鬆動、凸起 → 檢測安全後行動' },
        ],
      },
      {
        id: '1.11',
        name: '門鎖 / 門禁機',
        children: [
          { id: '1.11.1', name: '門鎖面板閃爍' },
          { id: '1.11.2', name: '門鎖、門禁機無法使用' },
          { id: '1.11.3', name: '門鎖警報聲無法關閉' },
          { id: '1.11.4', name: '輸入密碼無法開啟' },
        ],
      },
    ],
  },
  {
    id: '2',
    name: '我發現東西不足｜備品消耗品相關',
    children: [
      {
        id: '2.1',
        name: '白板筆',
        children: [
          { id: '2.1.1', name: '白板筆沒水' },
          { id: '2.1.2', name: '白板筆數量缺少' },
          { id: '2.1.3', name: '白板筆顏色缺少' },
        ],
      },
      {
        id: '2.2',
        name: '衛生紙',
        children: [{ id: '2.2.1', name: '衛生紙沒了' }],
      },
      {
        id: '2.3',
        name: '洗手液',
        children: [{ id: '2.3.1', name: '洗手液沒了' }],
      },
      {
        id: '2.4',
        name: '酒精',
        children: [
          { id: '2.4.1', name: '找不到酒精瓶' },
          { id: '2.4.2', name: '酒精瓶內沒酒精' },
        ],
      },
      {
        id: '2.5',
        name: '電池',
        children: [{ id: '2.5.1', name: '電池沒了' }],
      },
    ],
  },
  {
    id: '3',
    name: '我發現網路有問題｜網路相關',
    children: [
      {
        id: '3.1',
        name: '設備搜尋不到 Wi-Fi',
        children: [{ id: '3.1.1', name: '空白填寫' }],
      },
      {
        id: '3.2',
        name: '設備搜尋到 Wi-Fi 但無法連接',
        children: [{ id: '3.2.1', name: '空白填寫' }],
      },
      {
        id: '3.3',
        name: 'Wi-Fi 速度太慢',
        children: [{ id: '3.3.1', name: '空白填寫' }],
      },
      {
        id: '3.4',
        name: 'Wi-Fi 會不定時斷網',
        children: [{ id: '3.4.1', name: '空白填寫' }],
      },
    ],
  },
  {
    id: '4',
    name: '我覺得空間不乾淨、有異味｜感受相關',
    children: [
      {
        id: '4.1',
        name: '沙發',
        children: [
          { id: '4.1.1', name: '有臭味' },
          { id: '4.1.2', name: '有污漬' },
          { id: '4.1.3', name: '發霉' },
        ],
      },
      {
        id: '4.2',
        name: '抱枕',
        children: [
          { id: '4.2.1', name: '有臭味' },
          { id: '4.2.2', name: '有污漬' },
          { id: '4.2.3', name: '發霉' },
        ],
      },
      {
        id: '4.3',
        name: '坐墊',
        children: [
          { id: '4.3.1', name: '有臭味' },
          { id: '4.3.2', name: '有污漬' },
          { id: '4.3.3', name: '發霉' },
        ],
      },
      {
        id: '4.4',
        name: '空間內',
        children: [
          { id: '4.4.1', name: '有臭味' },
          { id: '4.4.2', name: '牆壁發霉' },
          { id: '4.4.3', name: '桌子、椅子不乾淨' },
          { id: '4.4.4', name: '角落不乾淨' },
          { id: '4.4.5', name: '地板上有垃圾' },
        ],
      },
      {
        id: '4.5',
        name: '廁所內',
        children: [
          { id: '4.5.1', name: '有臭味' },
          { id: '4.5.2', name: '牆壁發霉' },
          { id: '4.5.3', name: '馬桶不乾淨' },
          { id: '4.5.4', name: '地板上有垃圾' },
          { id: '4.5.5', name: '垃圾桶的垃圾滿了' },
        ],
      },
      {
        id: '4.6',
        name: '公共區 / 走道 / 垃圾集中區',
        children: [
          { id: '4.6.1', name: '有臭味' },
          { id: '4.6.2', name: '牆壁發霉' },
          { id: '4.6.3', name: '地板上有垃圾' },
          { id: '4.6.4', name: '垃圾桶的垃圾滿了' },
        ],
      },
    ],
  },
  {
    id: '5',
    name: '我覺得空間隔音不好｜隔音相關',
    children: [
      {
        id: '5.1',
        name: '隔壁活動的聲音',
        children: [{ id: '5.1.1', name: '空白填寫' }],
      },
      {
        id: '5.2',
        name: '公共區的聲音',
        children: [{ id: '5.2.1', name: '空白填寫' }],
      },
      {
        id: '5.3',
        name: '樓上、樓下的施工噪音',
        children: [{ id: '5.3.1', name: '空白填寫' }],
      },
      {
        id: '5.4',
        name: '路上交通工具的聲音',
        children: [{ id: '5.4.1', name: '空白填寫' }],
      },
    ],
  },
  {
    id: '6',
    name: '我發現漏水、滲水問題｜漏水相關',
    children: [
      {
        id: '6.1',
        name: '天花板',
        children: [
          { id: '6.1.1', name: '有滲水的痕跡' },
          { id: '6.1.2', name: '正在漏水' },
        ],
      },
      {
        id: '6.2',
        name: '牆面',
        children: [
          { id: '6.2.1', name: '有滲水的痕跡' },
          { id: '6.2.2', name: '正在漏水' },
        ],
      },
      {
        id: '6.3',
        name: '地板',
        children: [
          { id: '6.3.1', name: '有滲水的痕跡' },
          { id: '6.3.2', name: '正在漏水' },
          { id: '6.3.3', name: '正在積水' },
        ],
      },
      {
        id: '6.4',
        name: '冷氣',
        children: [{ id: '6.4.1', name: '正在漏水' }],
      },
    ],
  },
  {
    id: '7',
    name: '我遺失了東西、撿到了別人的東西｜遺失物相關',
    children: [
      {
        id: '7.1',
        name: '尋求遺失物',
        children: [{ id: '7.1.1', name: '空白填寫' }],
      },
      {
        id: '7.2',
        name: '拾獲遺失物',
        children: [{ id: '7.2.1', name: '空白填寫' }],
      },
    ],
  },
  {
    id: '8',
    name: '我發現資訊不一致、有錯誤｜資訊相關',
    children: [
      {
        id: '8.1',
        name: '官網資訊、照片與現場不符',
        children: [{ id: '8.1.1', name: '空白填寫' }],
      },
      {
        id: '8.2',
        name: '指標、公告內容有錯誤',
        children: [{ id: '8.2.1', name: '空白填寫' }],
      },
    ],
  },
  {
    id: '9',
    name: '我找不到適合的回報、我有建議',
    children: [
      {
        id: '9.1',
        name: '其他回饋',
        children: [{ id: '9.1.1', name: '空白填寫' }],
      },
    ],
  },
];

export async function seedCategories() {
  console.log('Seeding categories...');

  for (const level1 of defaultCategories) {
    const existingCategoriesWithName = await prisma.category.findMany({
      where: {
        name: level1.name,
      },
    });

    let currentLevel1 = existingCategoriesWithName.find(
      (cat) => cat.parentId === null || cat.parentId === ''
    );

    if (!currentLevel1) {
      currentLevel1 = await prisma.category.create({
        data: {
          name: level1.name,
          level: 1,
          parentId: null,
        },
      });
    }

    for (const level2 of level1.children) {
      const createdLevel2 = await prisma.category.upsert({
        where: {
          name_parentId: { name: level2.name, parentId: currentLevel1.id },
        },
        update: {},
        create: {
          name: level2.name,
          level: 2,
          parentId: currentLevel1.id,
        },
      });

      for (const level3 of level2.children) {
        await prisma.category.upsert({
          where: {
            name_parentId: { name: level3.name, parentId: createdLevel2.id },
          },
          update: {},
          create: {
            name: level3.name,
            level: 3,
            parentId: createdLevel2.id,
          },
        });
      }
    }
  }
  console.log('Categories seeded successfully.');
}

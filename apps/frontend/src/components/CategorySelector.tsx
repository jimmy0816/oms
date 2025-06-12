import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// 定義分類結構的類型
export interface CategoryLevel3 {
  id: string;
  name: string;
}

export interface CategoryLevel2 {
  id: string;
  name: string;
  children: CategoryLevel3[];
}

export interface CategoryLevel1 {
  id: string;
  name: string;
  children: CategoryLevel2[];
}

// 預設分類結構
export const defaultCategories: CategoryLevel1[] = [
  {
    id: '1',
    name: '設備設施類',
    children: [
      {
        id: '1.1',
        name: '空調系統',
        children: [
          { id: '1.1.1', name: '冷氣無冷風 / 不冷' },
          { id: '1.1.2', name: '冷氣出現錯誤代碼（E7、F0）' },
          { id: '1.1.3', name: '空調滴水 / 滲水' },
          { id: '1.1.4', name: '空調遙控器故障' }
        ]
      },
      {
        id: '1.2',
        name: '投影 / 電視 / 音響',
        children: [
          { id: '1.2.1', name: '投影黑屏 / 閃爍' },
          { id: '1.2.2', name: '無訊號 / HDMI 連接問題' },
          { id: '1.2.3', name: '投影模糊 / 無法對焦' },
          { id: '1.2.4', name: '電視無聲音 / 畫面異常' },
          { id: '1.2.5', name: '音響無聲 / 接觸不良' }
        ]
      },
      {
        id: '1.3',
        name: '傢俱 / 空間設備',
        children: [
          { id: '1.3.1', name: '椅子損壞 / 不穩' },
          { id: '1.3.2', name: '沙發污漬 / 發霉 / 坐墊損壞' },
          { id: '1.3.3', name: '桌腳鬆動 / 桌面刮傷' },
          { id: '1.3.4', name: '收納櫃損壞 / 門板歪斜' }
        ]
      },
      {
        id: '1.4',
        name: '供電 / 插座 / 照明',
        children: [
          { id: '1.4.1', name: '插座鬆脫 / 無電' },
          { id: '1.4.2', name: '插座燒焦 / 短路' },
          { id: '1.4.3', name: '延長線無效 / 壞掉' },
          { id: '1.4.4', name: '燈泡故障 / 閃爍' },
          { id: '1.4.5', name: '燈具搖晃 / 掉落' }
        ]
      },
      {
        id: '1.5',
        name: '衛浴 / 飲水設備',
        children: [
          { id: '1.5.1', name: '飲水機不出水 / 漏水' },
          { id: '1.5.2', name: '水龍頭鬆動 / 滲水' },
          { id: '1.5.3', name: '馬桶堵塞 / 沖水異常' },
          { id: '1.5.4', name: '排水孔堵塞 / 異味' }
        ]
      }
    ]
  },
  {
    id: '2',
    name: '空間建築環境類',
    children: [
      {
        id: '2.1',
        name: '建築結構',
        children: [
          { id: '2.1.1', name: '牆面裂痕 / 剝落 / 發霉' },
          { id: '2.1.2', name: '地板鬆動 / 積水 / 髒污' },
          { id: '2.1.3', name: '天花板漏水 / 起泡' }
        ]
      },
      {
        id: '2.2',
        name: '門窗系統',
        children: [
          { id: '2.2.1', name: '門鎖卡住 / 損壞' },
          { id: '2.2.2', name: '自動門異常 / 無法關閉' },
          { id: '2.2.3', name: '窗戶損壞 / 玻璃破裂' }
        ]
      },
      {
        id: '2.3',
        name: '標示 / 公告系統',
        children: [
          { id: '2.3.1', name: '指示牌破損 / 歪斜' },
          { id: '2.3.2', name: '公告位置錯誤 / 被遮擋' },
          { id: '2.3.3', name: '標示資訊錯誤 / 遺漏' }
        ]
      }
    ]
  },
  {
    id: '3',
    name: '清潔維護類',
    children: [
      {
        id: '3.1',
        name: '清潔狀況',
        children: [
          { id: '3.1.1', name: '空間清潔不足 / 地面有髒污' },
          { id: '3.1.2', name: '有異味 / 廁所臭味' },
          { id: '3.1.3', name: '死角髒亂 / 特殊污漬' }
        ]
      },
      {
        id: '3.2',
        name: '備品與耗材',
        children: [
          { id: '3.2.1', name: '垃圾袋未更換 / 垃圾滿出' },
          { id: '3.2.2', name: '衛生紙 / 清潔劑缺少' },
          { id: '3.2.3', name: '除濕盒滿水 / 發霉' }
        ]
      },
      {
        id: '3.3',
        name: '清潔器具',
        children: [
          { id: '3.3.1', name: '清潔工具遺失 / 壞掉' },
          { id: '3.3.2', name: '工具擺放位置錯誤' }
        ]
      }
    ]
  },
  {
    id: '4',
    name: '其他與系統問題類',
    children: [
      {
        id: '4.1',
        name: '空間設計與動線',
        children: [
          { id: '4.1.1', name: '空間太擁擠 / 不好移動' },
          { id: '4.1.2', name: '動線標示不清楚' }
        ]
      },
      {
        id: '4.2',
        name: '安全與消防',
        children: [
          { id: '4.2.1', name: '消防器材缺失 / 遮蔽' },
          { id: '4.2.2', name: '緊急照明故障' },
          { id: '4.2.3', name: '電器暴露 / 有安全疑慮' }
        ]
      },
      {
        id: '4.3',
        name: '網路與智慧門禁',
        children: [
          { id: '4.3.1', name: 'Wifi 不穩 / 無法連線' },
          { id: '4.3.2', name: '門禁系統無反應 / 密碼無效' }
        ]
      },
      {
        id: '4.4',
        name: '其他回饋',
        children: [
          { id: '4.4.1', name: '備品遺失' },
          { id: '4.4.2', name: '使用建議 / 優化需求' },
          { id: '4.4.3', name: '特殊狀況（請描述）' }
        ]
      }
    ]
  }
];

interface CategorySelectorProps {
  onCategorySelect: (categoryId: string, categoryPath: string) => void;
  selectedCategoryId?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ onCategorySelect, selectedCategoryId }) => {
  // 預設展開第一大類
  const [expandedLevel1, setExpandedLevel1] = useState<string[]>(
    defaultCategories.length > 0 ? [defaultCategories[0].id] : []
  );
  const [allExpanded, setAllExpanded] = useState(false);

  // 切換一級分類的展開/收合，一次只展開一個大類
  const toggleLevel1 = (categoryId: string) => {
    if (expandedLevel1.includes(categoryId)) {
      setExpandedLevel1([]);
    } else {
      setExpandedLevel1([categoryId]);
    }
  };

  // 全部展開/收合
  const toggleAllCategories = () => {
    if (allExpanded) {
      // 全部收合
      setExpandedLevel1([]);
    } else {
      // 展開第一大類（因為一次只能展開一個大類）
      if (defaultCategories.length > 0) {
        setExpandedLevel1([defaultCategories[0].id]);
      }
    }
    setAllExpanded(!allExpanded);
  };

  // 處理三級分類的選擇
  const handleCategorySelect = (category: CategoryLevel3, level1Name: string, level2Name: string) => {
    const categoryPath = `${level1Name} > ${level2Name} > ${category.name}`;
    onCategorySelect(category.id, categoryPath);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">通報類別 <span className="text-red-500">*</span></h3>
        <button
          type="button"
          onClick={() => setExpandedLevel1([])}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          全部收合
          <ChevronDownIcon className="h-4 w-4 ml-1 transform rotate-180" />
        </button>
      </div>

      <div className="space-y-2">
        {defaultCategories.map((category1) => (
          <div key={category1.id} className="border border-gray-200 rounded-md overflow-hidden mb-2">
            {/* 一級分類標題 */}
            <div 
              className="bg-gray-50 px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-gray-100"
              onClick={() => toggleLevel1(category1.id)}
            >
              <div className="font-medium text-gray-800">{category1.id}. {category1.name}</div>
              {expandedLevel1.includes(category1.id) ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-500" />
              )}
            </div>

            {/* 一級分類內容 */}
            {expandedLevel1.includes(category1.id) && (
              <div className="pl-4">
                {category1.children.map((category2) => (
                  <div key={category2.id} className="border-t border-gray-100">
                    {/* 二級分類標題 */}
                    <div className="px-4 py-2 bg-gray-50">
                      <div className="font-medium text-gray-700">{category2.id} {category2.name}</div>
                    </div>

                    {/* 三級分類選項，直接顯示 */}
                    <div className="pl-4 py-2 grid grid-cols-1 gap-2">
                      {category2.children.map((category3) => (
                        <div key={category3.id} className="flex items-center py-1">
                          <input
                            type="radio"
                            id={category3.id}
                            name="category"
                            className="form-radio h-4 w-4 text-blue-600"
                            checked={selectedCategoryId === category3.id}
                            onChange={() => handleCategorySelect(category3, category1.name, category2.name)}
                          />
                          <label htmlFor={category3.id} className="ml-2 text-sm text-gray-700 cursor-pointer">
                            {category3.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategorySelector;
